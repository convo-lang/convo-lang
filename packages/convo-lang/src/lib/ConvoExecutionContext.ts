import { getValueByAryPath, isPromise } from '@iyio/common';
import { ZodObject, ZodType } from 'zod';
import { ConvoError } from './ConvoError';
import { defaultConvoVars } from "./convo-default-vars";
import { convoArgsName, convoBodyFnName, convoGlobalRef, convoLabeledScopeParamsToObj, convoMapFnName, convoStructFnName, createConvoScopeFunction, createOptionalConvoValue, defaultConvoPrintFunction, setConvoScopeError } from './convo-lib';
import { ConvoExecuteResult, ConvoFlowController, ConvoFlowControllerDataRef, ConvoFunction, ConvoGlobal, ConvoMessage, ConvoPrintFunction, ConvoScope, ConvoScopeFunction, ConvoStatement, convoFlowControllerKey, convoScopeFnKey } from "./convo-types";
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

    public print:ConvoPrintFunction=defaultConvoPrintFunction;

    public dynamicFunctionCallback:ConvoScopeFunction|undefined;

    public constructor(convo?:Partial<ConvoGlobal>)
    {
        this.convo={
            ...convo,
            exe:this,
            convoPipeSink:convo?.convoPipeSink??((value:any)=>{
                this.print('CONVO_PIPE <<',value);
            })
        }
        this.sharedVars={...defaultConvoVars,[convoGlobalRef]:this.convo}
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
        const parsed=scheme.safeParse(args);
        if(parsed.success===false){
            throw new ConvoError(
                'invalid-args',
                {fn},
                `Invalid args passed to convo function. fn = ${fn.name}, message = ${parsed.error.message}`
            );
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
            const callee=(this.sharedVars[fn.name]?.[convoFlowControllerKey] as ConvoFlowController|undefined)?.sourceFn;
            if(!callee){
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

    public getVarEx(name:string,path?:string[],scope?:ConvoScope,throwUndefined=true):any{
        let value=scope?.vars[name]??this.sharedVars[name];
        if(value===undefined && (scope?!(name in scope.vars):true) && !(name in this.sharedVars)){
            if(throwUndefined){
                setConvoScopeError(scope,`reference to undefined var - ${name}`);
            }
        }else if(path){
            value=getValueByAryPath(value,path);
        }
        return value;
    }

    public getVar(nameOrPath:string,scope?:ConvoScope|null,defaultValue?:any):any{
        let path:string[]|undefined=undefined;
        if(nameOrPath.includes('.')){
            path=nameOrPath.split('.');
            nameOrPath=path.shift()??'';
        }
        return this.getVarEx(nameOrPath,path,scope??undefined,false)??defaultValue;
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
                setConvoScopeError(scope,`reference to undefined var for setting path - ${name}`);
                return value;
            }
            if(path.length>1){
                obj=getValueByAryPath(obj,path,undefined,path.length-1);
                if(obj===undefined || obj===null){
                    setConvoScopeError(scope,`reference to undefined var at path - ${name}.${path.join('.')}`);
                    return value;
                }
            }
            obj[path[path.length-1]??'']=value;
        }else{
            vars[name]=value;
        }

        return value;
    }

}

const emptyAry:any[]=[];
