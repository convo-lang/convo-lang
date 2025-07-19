import { getErrorMessage, getValueByAryPath, isPromise, zodCoerceObject } from '@iyio/common';
import { parseJson5 } from '@iyio/json5';
import { ZodObject, ZodType } from 'zod';
import { Conversation, ConversationOptions } from './Conversation';
import { ConvoError } from './ConvoError';
import { parseConvoType } from './convo-cached-parsing';
import { defaultConvoVars } from "./convo-default-vars";
import { convoArgsName, convoBodyFnName, convoGlobalRef, convoLabeledScopeParamsToObj, convoMapFnName, convoStructFnName, convoTags, convoVars, createConvoScopeFunction, createOptionalConvoValue, defaultConvoPrintFunction, escapeConvo, getConvoSystemMessage, getConvoTag, isConvoScopeFunction, parseConvoJsonMessage, setConvoScopeError } from './convo-lib';
import { doesConvoContentHaveMessage } from './convo-parser';
import { ConvoCompletion, ConvoCompletionMessage, ConvoExecuteResult, ConvoFlowController, ConvoFlowControllerDataRef, ConvoFunction, ConvoGlobal, ConvoMessage, ConvoPrintFunction, ConvoScope, ConvoScopeFunction, ConvoStatement, ConvoTag, FlatConvoConversation, InlineConvoPrompt, StandardConvoSystemMessage, convoFlowControllerKey, convoScopeFnKey, isConvoMessageModification } from "./convo-types";
import { convoValueToZodType } from './convo-zod';


const argsCacheKey=Symbol('argsCacheKey');
const returnCacheKey=Symbol('returnCacheKey');


export const executeConvoFunction=(fn:ConvoFunction,args:Record<string,any>={}):Promise<any>|any=>{
    const exe=new ConvoExecutionContext();
    const r=exe.executeFunction(fn,args);
    return r.valuePromise??r.value;
}

const createDefaultScope=(vars:Record<string,any>):ConvoScope=>{
    return {
        _d:true,
        vars,
        i:0,
        s:{s:0,e:0},
    }
}

const copyDefaultScope=(scope:ConvoScope):ConvoScope=>{
    if(scope._d){
        scope={...scope};
        delete scope._d;
    }

    return scope;
}

export class ConvoExecutionContext
{
    public readonly sharedVars:Record<string,any>;

    private nextSuspendId=1;

    private readonly suspendedScopes:Record<string,ConvoScope>={};

    public readonly sharedSetters:string[]=[];

    public readonly convo:ConvoGlobal;

    private readonly parentConvo?:Conversation;

    public print:ConvoPrintFunction=defaultConvoPrintFunction;

    public dynamicFunctionCallback:ConvoScopeFunction|undefined;

    public defaultThrowOnUndefined=false;

    public disableInlinePrompts=false;

    public maxInlinePromptDepth=10;

    public isReadonly=0;

    public flat?:FlatConvoConversation;

    public constructor(convo?:Partial<ConvoGlobal>,parentConvo?:Conversation)
    {
        this.convo={
            ...convo,
            exe:this,
            convoPipeSink:convo?.convoPipeSink??((value:any)=>{
                this.print('CONVO_PIPE <<',value);
            })
        }
        this.sharedVars={...defaultConvoVars,[convoGlobalRef]:this.convo}
        this.parentConvo=parentConvo;
    }

    public getUserSharedVars(){
        const vars={...this.sharedVars}
        delete vars['convo'];
        delete vars['graphCtrl'];
        delete vars['evalJavascript'];
        for(const e in defaultConvoVars){
            delete vars[e];
        }
        return vars;
    }

    public getUserSharedVarsExcludeTypes(){
        const vars=this.getUserSharedVars();
        for(const e in vars){
            if(e[0]===e[0]?.toUpperCase() || (typeof vars[e] === 'function')){
                delete vars[e];
            }
        }
        return vars;
    }

    public loadFunctions(messages:ConvoMessage[],externFunctions?:Record<string,ConvoScopeFunction>)
    {
        for(const msg of messages){
            if(msg.fn && !msg.fn.call && !msg.fn.topLevel){
                this.setVar(true,createConvoScopeFunction({
                    usesLabels:true,
                    catchReturn:true,
                    sourceFn:msg.fn
                },(scope,ctx)=>{
                    if(msg.fn?.body){
                        const r=this.executeFunction(msg.fn,convoLabeledScopeParamsToObj(scope));
                        return r.valuePromise??r.value;
                    }else{
                        const externFn=externFunctions?.[msg.fn?.name??''];
                        if(!externFn){
                            setConvoScopeError(scope,`No extern function provided for ${msg.fn?.name}`);
                            return;
                        }
                        return externFn(scope,ctx);
                    }
                }),msg.fn.name);
            }
        }
        if(externFunctions){
            for(const e in externFunctions){
                const fn=externFunctions[e];
                if(!fn || this.sharedVars[e]!==undefined){
                    continue;
                }
                this.setVar(true,createConvoScopeFunction(fn),e);

            }
        }
    }

    public clearSharedSetters(){
        this.sharedSetters.splice(0,this.sharedSetters.length);
    }

    public executeStatement(statement:ConvoStatement):ConvoExecuteResult
    {

        const vars:Record<string,any>={}
        const scope:ConvoScope={
            i:0,
            vars,
            s:statement,
        }

        return this.execute(scope,vars);
    }

    public executeFunction(fn:ConvoFunction,args:Record<string,any>={}):ConvoExecuteResult
    {
        if(fn.call){
            throw new ConvoError(
                'proxy-call-not-supported',
                {fn},
                'executeFunction does not support proxy calls. Use executeFunctionAsync instead'
            )
        }

        const scheme=this.getConvoFunctionArgsScheme(fn);
        let parsed=scheme.safeParse(args);
        if(parsed.success===false){
            const r=zodCoerceObject(scheme,args);
            if(r.result){
                parsed={data:r.result,success:true};
            }else{
                throw new ConvoError(
                    'invalid-args',
                    {fn},
                    `Invalid args passed to convo function. fn = ${fn.name}, message = ${parsed.error.message}`
                );
            }
        }

        args=parsed.data;

        const vars:Record<string,any>={
            [convoArgsName]:args
        }

        let scope:ConvoScope;
        if(fn.body){
            scope={
                i:0,
                vars,
                s:{
                    fn:convoBodyFnName,
                    params:fn.body,
                    s:0,
                    e:0,
                },
            }

            for(const e in args){
                this.setVar(false,args[e],e,undefined,scope);
            }
            if(scheme.shape){
                for(const e in scheme.shape){
                    if(vars[e]===undefined){
                        this.setVar(false,undefined,e,undefined,scope);
                    }
                }
            }
        }else{
            if(typeof this.sharedVars[fn.name] !== 'function'){
                throw new ConvoError('function-not-defined',{fn},`No function defined by name ${fn.name}`)
            }
            const params:ConvoStatement[]=[];
            for(const e in args){
                params.push({
                    s:0,
                    e:0,
                    label:e,
                    value:args[e]
                })
            }
            scope={
                i:0,
                vars,
                s:{
                    fn:fn.name,
                    params,
                    s:0,
                    e:0,
                },
            }
        }

        return this.execute(scope,vars,this.getConvoFunctionReturnScheme(fn));
    }

    public async executeFunctionAsync(fn:ConvoFunction,args:Record<string,any>={}):Promise<any>
    {

        const result=await this.executeFunctionResultAsync(fn,args);

        if(result.valuePromise){
            return await result.valuePromise
        }else{
            return result.value;
        }
    }

    public async executeFunctionResultAsync(fn:ConvoFunction,args:Record<string,any>={}):Promise<ConvoExecuteResult>
    {

        if(fn.call){
            const v=this.sharedVars[fn.name];
            const callee=(v?.[convoFlowControllerKey] as ConvoFlowController|undefined)?.sourceFn;

            if(!callee && isConvoScopeFunction(v)){
                args=await this.paramsToObjAsync(fn.params);
                const paramValues:any[]=[];
                const labels:Record<string,number>={};
                for(const e in args){
                    const value=args[e];
                    labels[e]=paramValues.length;
                    paramValues.push(value);
                }
                const scope:ConvoScope={
                    i:0,
                    s:{
                        s:0,
                        e:0,
                        fn:fn.name,
                    },
                    vars:{
                        [convoArgsName]:args,
                    },
                    paramValues,
                    labels,
                    [convoScopeFnKey]:v,
                }
                const r=v(scope,this);
                const isP=isPromise(r);
                return {
                    scope,
                    value:isP?undefined:r,
                    valuePromise:isP?r:undefined,
                }
            }
            if(!callee){
                // add exception for "responseWithText" function
                throw new ConvoError(
                    'function-not-defined',
                    {fn},
                    `executeFunctionResultAsync - No function defined by the name ${fn.name}`);
            }
            args=await this.paramsToObjAsync(fn.params);
            fn=callee;

        }

        return this.executeFunction(fn,args);
    }

    public getConvoFunctionArgsValue(fn:ConvoFunction):any{
        const r=this.paramsToObj(fn.params??[]);
        if(r.valuePromise){
            throw new ConvoError('function-call-args-suspended')
        }
        return r.value;
    }

    public getConvoFunctionArgsScheme(fn:ConvoFunction,cache=true):ZodObject<any>{
        if(cache){
            const s=(fn as any)[argsCacheKey];
            if(s){
                return s;
            }
        }
        let scheme:ZodObject<any>;
        if(fn.paramType){
            const type=this.getVarAsType(fn.paramType);
            if(!type){
                throw new ConvoError('function-args-type-not-defined',{fn});
            }
            if(!(type instanceof ZodObject)){
                throw new ConvoError('function-args-type-not-an-object',{fn})
            }
            scheme=type;
        }else{
            scheme=this.paramsToScheme(fn.params??[]);
        }
        if(cache){
            (fn as any)[argsCacheKey]=scheme;
        }
        return scheme;
    }

    public getConvoFunctionReturnScheme(fn:ConvoFunction,cache=true):ZodType<any>|undefined{
        if(!fn.returnType){
            return undefined;
        }
        if(cache){
            const s=(fn as any)[returnCacheKey];
            if(s){
                return s;
            }
        }

        const typeVar=this.sharedVars[fn.returnType];
        if(!typeVar){
            throw new ConvoError(
                'function-return-type-not-defined',
                {fn},
                `Function return type not defined. function = ${fn.name}, returnType = ${fn.returnType}`
            );
        }
        const scheme=convoValueToZodType(typeVar);
        if(cache){
            (fn as any)[returnCacheKey]=scheme;
        }
        return scheme;
    }

    public getVarAsType(name:string):ZodType<any>|undefined
    {
        const typeVar=this.sharedVars[name];
        if(!typeVar){
            return undefined;
        }
        return convoValueToZodType(typeVar);
    }

    public paramsToObj(params:ConvoStatement[]):ConvoExecuteResult{
        const vars:Record<string,any>={}
        const scope=this.executeScope({
            i:0,
            vars,
            s:{
                fn:convoMapFnName,
                params,
                s:0,
                e:0,
            }
        },undefined,createDefaultScope(vars));

        return this.execute(scope,vars);
    }

    public async paramsToObjAsync(params:ConvoStatement[]):Promise<Record<string,any>>{
        const r=this.paramsToObj(params);
        if(r.valuePromise){
            return await r.valuePromise;
        }else{
            return r.value;
        }
    }

    public paramsToScheme(params:ConvoStatement[]):ZodObject<any>{

        const vars:Record<string,any>={}
        const scope=this.executeScope({
            i:0,
            vars,
            s:{
                fn:convoStructFnName,
                params,
                s:0,
                e:0,
            }
        },undefined,createDefaultScope(vars));

        if(scope.si){
            throw new ConvoError(
                'suspended-scheme-statements-not-supported',
                {statements:params},
                'scheme statements should not be suspended'
            );
        }

        const zType=convoValueToZodType(scope.v);

        if(!(zType instanceof ZodObject)){
            throw new ConvoError(
                'zod-object-expected',
                {statements:params},
                'ZodObject expected when converting ConvoStatements to zod type'
            );
        }

        return zType;
    }

    private execute(scope:ConvoScope,vars:Record<string,any>,resultScheme?:ZodType<any>):ConvoExecuteResult
    {
        scope=this.executeScope(scope,undefined,createDefaultScope(vars));

        if(scope.si){
            return {scope,valuePromise:new Promise((r,j)=>{
                if(!scope.onComplete){
                    scope.onComplete=[];
                }
                if(!scope.onError){
                    scope.onError=[];
                }
                scope.onError.push(j);
                if(resultScheme){
                    scope.onComplete.push(value=>{
                        const parsed=resultScheme.safeParse(value);
                        if(parsed.success===true){
                            r(parsed.data);
                        }else if(parsed.success===false){
                            j(new ConvoError(
                                'invalid-return-value-type',
                                {statement:scope.s},
                                `Invalid result value - ${parsed.error.message}`
                            ));
                        }else{
                            r(value);
                        }
                    })
                }else{
                    scope.onComplete.push(r);
                }
            })}
        }else{
            if(scope.error){
                throw scope.error;
            }else{
                if(resultScheme){
                    const parsed=resultScheme.safeParse(scope.v);
                    if(parsed.success===true){
                        return {scope,value:parsed.data}
                    }else if(parsed.success===false){
                        throw new ConvoError(
                            'invalid-return-value-type',
                            {statement:scope.s},
                            `Invalid result value - ${parsed.error.message}`
                        );
                    }
                }
                return {scope,value:scope.v};
            }
        }
    }

    private executeScope(scope:ConvoScope,parent:ConvoScope|undefined,defaultScope:ConvoScope,resumeParamScope?:ConvoScope):ConvoScope{

        const statement=scope.s;

        let value:any=undefined;

        if(statement.fn){
            scope=copyDefaultScope(scope);
            const fn=scope[convoScopeFnKey]??(scope[convoScopeFnKey]=statement.fnPath?
                getValueByAryPath(this.sharedVars,statement.fnPath)?.[statement.fn]:
                this.sharedVars[statement.fn]
            )??this.dynamicFunctionCallback??this.convo.conversation?.dynamicFunctionCallback;
            if(typeof fn !== 'function'){
                const errPath=statement.fnPath?statement.fnPath.join('.')+'.'+statement.fn:statement.fn;
                setConvoScopeError(scope,`${errPath} is not a function`);
                value=undefined;
                return scope;
            }

            if(!scope.paramValues){
                scope.paramValues=[];
            }
            const flowCtrl=fn[convoFlowControllerKey] as ConvoFlowController|undefined;
            const parentStartIndex=parent?.i??0;
            if(flowCtrl?.keepData && parent?.childCtrlData){
                const dr:ConvoFlowControllerDataRef|undefined=parent.childCtrlData[parentStartIndex.toString()];
                if(dr){
                    scope.ctrlData=dr.ctrlData;
                    scope.childCtrlData=dr.childCtrlData;
                }
            }
            const shouldExecute=flowCtrl?.shouldExecute?.(scope,parent,this)??true;
            if(shouldExecute){
                delete scope.li;
                if(flowCtrl?.startParam){
                    const startI=flowCtrl.startParam(scope,parent,this);
                    if(startI===false){
                        scope.i=statement.params?.length??0;
                    }else{
                        scope.i=Math.max(0,startI);
                    }
                }
                if(statement.params?.length){
                    if(flowCtrl?.usesLabels && !scope.labels){
                        scope.labels={}
                    }
                    while(scope.i<statement.params.length && (scope.bi!==scope.i)){
                        const paramStatement=statement.params[scope.i];

                        if(paramStatement){

                            let paramScope:ConvoScope;
                            if(resumeParamScope){
                                paramScope=resumeParamScope;
                                resumeParamScope=undefined;
                            }else{
                                const d=defaultScope;
                                d.s=paramStatement;
                                paramScope=this.executeScope(d,scope,defaultScope);
                            }

                            if(paramScope.error){
                                setConvoScopeError(scope,paramScope.error);
                                return scope;
                            }

                            if(paramScope.si){
                                this.suspendScope(scope,paramScope);
                                paramScope.pi=scope.si;
                                return scope;
                            }

                            if(flowCtrl?.discardParams){
                                scope.paramValues[0]=paramScope.v;
                            }else{
                                scope.paramValues.push(paramScope.v);
                            }

                            if(paramScope.r){
                                value=paramScope.v;
                                scope.r=true;
                                break;
                            }

                            if(paramScope.bl){
                                if(flowCtrl?.catchBreak){
                                    break;
                                }else if(scope.li===scope.i){
                                    delete scope.fromIndex;
                                    delete scope.gotoIndex;
                                    delete scope.li;
                                }else{
                                    scope.bl=true;
                                    return scope;
                                }
                            }


                            if(scope.fromIndex===scope.i && scope.gotoIndex!==undefined){
                                scope.i=scope.gotoIndex;
                                delete scope.fromIndex;
                                delete scope.gotoIndex;
                            }else if(flowCtrl?.nextParam){
                                const f=flowCtrl.nextParam(scope,parent,paramStatement,this);
                                if(f===false){
                                    break;
                                }
                                scope.i=f;
                            }else{
                                scope.i++;
                            }

                        }else{
                            setConvoScopeError(scope,'Parameter expected');
                            return scope
                        }
                    }
                }
                if(!scope.r){
                    if(statement.fnPath){
                        value=getValueByAryPath(this.sharedVars,statement.fnPath)?.[statement.fn]?.(...(scope.paramValues??emptyAry))
                    }else{
                        value=fn(scope,this);
                    }
                    if(statement.prompt){
                        if(this.disableInlinePrompts){
                            setConvoScopeError(scope,{
                                message:`Inline prompts not allowed in current content. Inline prompts can not be used in content messages or top level statements`,
                                statement,
                            });
                            return scope;
                        }
                        if(statement.prompt.isStatic){
                            value=this.executeStaticPrompt(statement.prompt,value,scope);
                        }else{
                            value=this.executePromptAsync(statement.prompt,scope);
                        }
                    }
                }
            }
            if(scope.r){
                if(flowCtrl?.catchReturn){
                    scope.r=false;
                }
            }else if(flowCtrl){
                if(flowCtrl.keepData && parent){
                    if(!parent.childCtrlData){
                        parent.childCtrlData={}
                    }
                    const dr:ConvoFlowControllerDataRef={
                        ctrlData:scope.ctrlData,
                        childCtrlData:scope.childCtrlData,
                    }
                    parent.childCtrlData[parentStartIndex.toString()]=dr;
                }
                if(flowCtrl.transformResult){
                    value=flowCtrl.transformResult(value,scope,parent,this);
                }
            }

        }else if(statement.ref){
            value=this.getVarEx(statement.ref,statement.refPath,scope);
        }else if(statement.prompt){
            if(this.disableInlinePrompts){
                setConvoScopeError(scope,{
                    message:`Inline prompts not allowed in current content. Inline prompts can not be used in content messages or top level statements`,
                    statement,
                });
                return scope;
            }
            if(statement.prompt.isStatic){
                value=this.executeStaticPrompt(statement.prompt,statement.value,scope);
            }else{
                value=this.executePromptAsync(statement.prompt,scope);
            }
        }else{
            value=statement.value;
        }

        if(scope.error){
            return scope;
        }

        if(isPromise(value)){
            scope=copyDefaultScope(scope);
            this.suspendScope(scope);
            value.then(v=>{
                scope.v=v;
                this.completeScope(scope,parent,defaultScope);
            }).catch(e=>{
                setConvoScopeError(scope,{
                    message:`Promise throw error - ${e?.message}`,
                    error:e,
                    statement,
                });
                this.completeScope(scope,parent,defaultScope);
            })
        }else{
            scope.v=value;
            this.completeScope(scope,parent,defaultScope);
        }

        return scope;
    }

    private lastInlineConversation?:Conversation;

    private async executeStaticPrompt(prompt:InlineConvoPrompt,value:any,scope:ConvoScope)
    {
        this.beforeHandlePromptResult(prompt);

        const valueIsString=typeof value ==='string';
        if((prompt.continue && prompt.isStatic) && valueIsString){
            if(!this.lastInlineConversation){
                this.lastInlineConversation=this.createInlineConversation(prompt);
            }
            this.applyInlinePrompt(prompt,this.lastInlineConversation,scope);
            this.lastInlineConversation.append((prompt.hasRole?'':'> user\n')+value,{addTags:[{name:convoTags.disableModifiers}]});
        }
        if(prompt.jsonType && valueIsString){
            value=parseJson5(value);
        }
        return this.handlePromptResult(prompt,value,scope);
    }

    private createInlineConversation(prompt:InlineConvoPrompt)
    {
        const options:ConversationOptions={disableAutoFlatten:true,disableTriggers:true,disableTransforms:!prompt.transforms}
        return (this.parentConvo??new Conversation(options))?.clone({inlinePrompt:prompt,triggerName:this.getVar(convoVars.__trigger)},options)

    }

    private applyInlinePrompt(prompt:InlineConvoPrompt,convo:Conversation,scope:ConvoScope){
        convo.inlinePrompt=prompt;
        for(const e in convo.defaultVars){
            delete convo.defaultVars[e];
        }
        const vars=this.getUserSharedVars();

        for(const e in vars){
            convo.defaultVars[e]=vars[e];
        }
        for(const e in scope.vars){
            if(e in defaultConvoVars){
                continue;
            }
            convo.defaultVars[e]=scope.vars[e];
        }
    }

    private async executePromptAsync(prompt:InlineConvoPrompt,scope:ConvoScope)
    {
        if(this.parentConvo && this.parentConvo.childDepth>this.maxInlinePromptDepth){
            throw new Error('Max inline prompt depth reached');
        }

        const sub=(prompt.continue && this.lastInlineConversation)?
            this.lastInlineConversation:this.createInlineConversation(prompt);
        this.applyInlinePrompt(prompt,sub,scope);

        if(prompt.continue || prompt.extend){
            this.lastInlineConversation=sub;
        }


        if(prompt.messages?.length){
            sub.appendMessageObject(prompt.messages);
        }

        this.beforeHandlePromptResult(prompt);

        const disposeTask=prompt.task?this.parentConvo?.addTask(prompt.task):undefined;
        let r:ConvoCompletion;
        try{
            r=await sub.completeAsync();
        }finally{
            disposeTask?.();
        }
        let value:any;
        if(r.message?.format==='json'){
            value=parseJson5(r.message.content??'');
            if(r.message.formatTypeName==='TrueFalse'){
                value=value?.isTrue;
            }
        }else{
            value=r.message?.content;
        }
        return this.handlePromptResult(prompt,value,scope);
    }

    private beforeHandlePromptResult(prompt:InlineConvoPrompt){
        // systemMessages
        if(prompt.systemMessages){
            const append=(convo:Conversation,type:StandardConvoSystemMessage)=>{
                if(!convo.findMessage({tag:convoTags.stdSystem,tagValue:type})){
                    convo.append(getConvoSystemMessage(type),{disableAutoFlatten:true});
                }
            }
            for(const s of prompt.systemMessages){
                if(this.parentConvo){
                    append(this.parentConvo,s);
                }
                if(this.lastInlineConversation){
                    append(this.lastInlineConversation,s);
                }
            }
        }
    }

    private handlePromptResult(prompt:InlineConvoPrompt,value:any,scope:ConvoScope){

        if(prompt?.not){
            value=!value;
        }

        if(prompt.assignOutputTo){
            this.setVar(undefined,value,prompt.assignOutputTo,undefined,scope);
        }

        if(this.parentConvo){

            // appendOutput
            if(prompt.appendOutput){
                const output=typeof value === 'string'?value:JSON.stringify(value);
                this.parentConvo.append(
                    (doesConvoContentHaveMessage(output)?'':'> user\n')+output,
                    {disableAutoFlatten:true}
                );
            }
            // action
            if(prompt.action){
                let content=value;
                if(typeof content !== 'string'){
                    try{
                        content=JSON.stringify(content);
                    }catch{
                        content=content+'';
                    }
                }
                if(isConvoMessageModification(prompt.action)){
                    this.parentConvo.appendModification(prompt.action,content,this.flat);
                }else if(prompt.action==='respond' && this.flat){
                    this.parentConvo.appendResponse(prompt.hasRole?content:`> assistant\n${escapeConvo(content)}`,this.flat)
                }
            }
        }



        return value;
    }


    private suspendScope(scope:ConvoScope,waitFor?:ConvoScope){
        if(!scope.si){
            scope.si=(this.nextSuspendId++).toString();
        }
        this.suspendedScopes[scope.si]=scope;
        if(waitFor){
            scope.wi=waitFor.si;
        }
    }

    private completeScope(scope:ConvoScope,parent:ConvoScope|undefined,defaultScope:ConvoScope){

        if(scope.wi){
            throw new ConvoError('scope-waiting',{statement:scope.s},`scope waiting on scope(${scope.wi}) before resuming`);
        }

        const statement=scope.s;
        if(statement.set){
            this.setVar(statement.shared,scope.v,statement.set,statement.setPath,scope);
        }

        if(statement.label && parent?.labels){
            parent.labels[statement.label]=statement.opt?createOptionalConvoValue(parent.i):parent.i;
        }

        delete scope.pi;

        const resume:ConvoScope[]|null=scope.si?[]:null;

        if(scope.si){
            const si=scope.si;
            delete scope.si;
            delete this.suspendedScopes[si];
            for(const e in this.suspendedScopes){
                const ss=this.suspendedScopes[e];
                if(ss?.wi===si){
                    delete this.suspendedScopes[e];
                    delete ss.wi;
                    (resume as ConvoScope[]).push(ss);
                }
            }
        }

        if(scope.onComplete){
            const oc=scope.onComplete;
            delete scope.onComplete;
            delete scope.onError;
            for(let i=0;i<oc.length;i++){
                oc[i]?.(scope.v);
            }
        }

        if(resume){
            for(const r of resume){
                const parent=r.pi?this.suspendedScopes[r.pi]:undefined;
                if(r.pi && !parent){
                    throw new ConvoError('suspension-parent-not-found',{statement:scope.s});
                }
                delete r.pi;
                this.executeScope(r,parent,defaultScope,scope);
            }
        }
    }

    public getRefValue(statement:ConvoStatement|null|undefined,scope?:ConvoScope,throwUndefined=true):any{
        if(!statement){
            return undefined;
        }
        if(!statement.ref){
            throw new ConvoError('variable-ref-required',{statement});
        }
        return this.getVarEx(statement.ref,statement.refPath,scope,throwUndefined);
    }

    public getVarEx(name:string,path?:string[],scope?:ConvoScope,throwUndefined=this.defaultThrowOnUndefined):any{
        let value=scope?.vars[name]??this.sharedVars[name];
        if(value===undefined && (scope?!(name in scope.vars):true) && !(name in this.sharedVars)){
            if(throwUndefined){
                setConvoScopeError(scope,`reference to undefined var - ${name}`);
            }
        }else if(path){
            value=getValueByAryPath(value,path);
        }
        if(!path && value===undefined){
            return this.getVarAlias(name);
        }else{
            return value;
        }
    }

    public getVar(nameOrPath:string,scope?:ConvoScope|null,defaultValue?:any):any{
        let path:string[]|undefined=undefined;
        if(nameOrPath.includes('.')){
            path=nameOrPath.split('.');
            nameOrPath=path.shift()??'';
        }
        return this.getVarEx(nameOrPath,path,scope??undefined,false)??defaultValue;
    }

    public getStringVar(nameOrPath:string,scope?:ConvoScope|null,defaultValue?:string):string|undefined{
        const val=this.getVar(nameOrPath,scope,defaultValue);
        return (typeof val === 'string')?val:undefined;
    }

    public setRefValue(statement:ConvoStatement|null|undefined,value:any,scope?:ConvoScope):any{
        if(!statement){
            return value;
        }

        if(!statement.ref){
            throw new ConvoError('variable-ref-required',{statement});
        }

        this.setVar(statement.shared,value,statement.ref,statement.refPath,scope);

        return value;
    }

    public setDefaultVarValue(value:any,name:string,path?:string[]):any{

        if(name in defaultConvoVars){
            setConvoScopeError(null,`Overriding builtin var not allowed - ${name}`);
            return value;
        }

        if(this.sharedVars[name]!==undefined){
            return this.sharedVars[name];
        }

        return this.setVar(true,value,name,path);
    }

    public setVar(shared:boolean|undefined,value:any,name:string,path?:string[],scope?:ConvoScope){

        if(name in defaultConvoVars){
            setConvoScopeError(scope,`Overriding builtin var not allowed - ${name}`);
            return value;
        }

        if(this.isReadonly){
            const msg=`Current context is readonly. Unable to set ${name}`;
            if(scope){
                setConvoScopeError(scope,msg);
                return value;
            }else{
                throw new Error(msg);
            }
        }

        const vars=(
            shared ||
            !scope ||
            (scope && scope.vars[name]===undefined && this.sharedVars[name]!==undefined)
        )?this.sharedVars:scope.vars;

        if(shared!==false && vars===this.sharedVars && (typeof value !== 'function') && !this.sharedSetters.includes(name)){
            this.sharedSetters.push(name);
        }

        if(path){
            let obj=vars[name];
            if(obj===undefined || obj===null){
                if(this.defaultThrowOnUndefined){
                    setConvoScopeError(scope,`reference to undefined var for setting path - ${name}`);
                }
                return value;
            }
            if(path.length>1){
                obj=getValueByAryPath(obj,path,undefined,path.length-1);
                if(obj===undefined || obj===null){
                    if(this.defaultThrowOnUndefined){
                        setConvoScopeError(scope,`reference to undefined var at path - ${name}.${path.join('.')}`);
                    }
                    return value;
                }
            }
            obj[path[path.length-1]??'']=value;
        }else{
            vars[name]=value;
        }

        return value;
    }

    public setVarUsingCompletionMessage(
        shared:boolean|undefined,
        msg:ConvoCompletionMessage,
        name:string,
        path?:string[],
        scope?:ConvoScope
    ){
        if(msg.format==='json'){
            try{
                this.setVar(shared,msg.content?parseConvoJsonMessage(msg.content):null,name,path,scope);
            }catch(ex){
                this.setVar(shared,getErrorMessage(ex),name,path,scope);
            }
        }else{
            this.setVar(shared,msg.content??'',name,path,scope);
        }
    }

    public consumeVars(otherExec:ConvoExecutionContext|null|undefined){
        if(!otherExec){
            return;
        }
        for(const e in otherExec.sharedVars){
            if(this.sharedVars[e]===undefined){
                this.sharedVars[e]=otherExec.sharedVars[e];
            }
        }
    }

    public getTagValueByName(msg:ConvoMessage|null|undefined,tagName:string,defaultValue?:any):any{
        const tag=getConvoTag(msg?.tags,tagName);
        if(!tag){
            return defaultValue;
        }
        return this.getTagValue(tag,defaultValue);
    }

    public getTagValue(tag:ConvoTag,defaultValue?:any):any{
        let value:any;
        if(tag.statement){
            const r=this.getTagStatementValue(tag);
            value=r.length>1?r:r[0];
        }else{
            value=tag.value;
        }
        return value===undefined?defaultValue:value;
    }

    public isTagConditionTrueByName(msg:ConvoMessage|null|undefined,tagName:string,defaultValue=false):boolean{
        const tag=getConvoTag(msg?.tags,tagName);
        if(!tag){
            return false;
        }
        return this.isTagConditionTrue(tag,defaultValue);
    }

    public isTagConditionTrue(tag:ConvoTag,defaultValue=false):boolean{

        if(tag.statement){
            return this.getTagStatementValue(tag).every(v=>v);

        }else if(tag.value!==undefined){
            let tagValue=tag.value.trim();
            if(!tagValue){
                return true;
            }
            const not=tagValue.startsWith('!');
            if(not){
                tagValue=tagValue.substring(1).trim();
            }
            const parts=tagValue.split(/\s+/);
            if(parts.length<1){
                return false;
            }
            let value=this.getVar(parts[0]??'');
            if(not){
                value=!value;
            }
            if(parts.length===1){
                return value?true:false;
            }
            let v2:any;
            if(parts.length>2){
                parts.shift();
                v2=parts.join(' ');
            }else{
                v2=parts[1];
            }
            return value?.toString()===v2;
        }else{
            return defaultValue;
        }

    }

    public getTagStatementValue(tag:ConvoTag):any[]{
        if(!tag.statement?.length){
            return [];
        }
        this.isReadonly++;
        try{
            const values=tag.statement.map(s=>{
                const r=this.executeStatement(s);
                if(r.valuePromise){
                    throw new Error('Tag value statements are not allowed to return promises');
                }
                return r.value;
            });
            return values;
        }finally{
            this.isReadonly--;
        }
    }

    /**
     * Gets built-in type aliases by name. Used to provide predefined types
     * that are commonly used in Convo-Lang but not explicitly defined in user code.
     *
     * @param name - The name of the type alias to retrieve
     * @returns The type definition, or undefined if the alias doesn't exist
     */
    public getVarAlias(name:string)
    {
        switch(name){
            case 'TrueFalse':
                return parseConvoType('TrueFalse',/*convo*/`
                    > define
                    TrueFalse=struct(
                        isTrue:boolean
                    )
                `);

            default:
                return undefined;

        }

    }

}

const emptyAry:any[]=[];
