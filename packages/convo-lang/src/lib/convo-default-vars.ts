import { SceneCtrl, aryRandomize, base64Encode, base64EncodeMarkdownImage, base64EncodeUrl, createJsonRefReplacer, deepClone, deepCompare, escapeHtml, escapeHtmlKeepDoubleQuote, getContentType, getErrorMessage, getFileNameNoExt, httpClient, joinPaths, markdownLineToString, objectToMarkdownBuffer, shortUuid, starStringTest, toCsvLines, uuid, valueIsZodObject } from "@iyio/common";
import { vfs } from "@iyio/vfs";
import { format } from "date-fns";
import { ConvoError } from "./ConvoError.js";
import { ConvoExecutionContext } from "./ConvoExecutionContext.js";
import { ConvoForm } from "./convo-forms-types.js";
import { convoArgsName, convoArrayFnName, convoBodyFnName, convoCaseFnName, convoDateFormat, convoDefaultFnName, convoEnumFnName, convoFunctions, convoGlobalRef, convoJsonArrayFnName, convoJsonMapFnName, convoLabeledScopeParamsToObj, convoMapFnName, convoMetadataKey, convoParamsToObj, convoPipeFnName, convoStructFnName, convoSwitchFnName, convoTestFnName, convoVars, createConvoBaseTypeDef, createConvoMetadataForStatement, createConvoScopeFunction, createConvoType, isConvoTypeArray, makeAnyConvoType } from "./convo-lib.js";
import { ConvoRuntimeNodeInfo } from "./convo-node-graph-types.js";
import { convoPipeScopeFunction } from "./convo-pipe.js";
import { createConvoSceneDescription } from "./convo-scene-lib.js";
import { ConvoIterator, ConvoMultiReadOptions, ConvoScope, isConvoMarkdownLine } from "./convo-types.js";
import { convoTypeToJsonScheme, convoValueToZodType, describeConvoScheme } from "./convo-zod.js";
import { convoScopeFunctionReadDoc } from "./scope-functions/convoScopeFunctionReadDoc.js";

const ifFalse=Symbol();
const ifTrue=Symbol();
const breakIteration=Symbol();

const getNodeInfo=(scope:ConvoScope,ctx:ConvoExecutionContext):ConvoRuntimeNodeInfo|undefined=>{

    const stack:ConvoRuntimeNodeInfo[]=ctx.getVar(convoVars.__nodeStack);
    if(!Array.isArray(stack)){
        return undefined;
    }
    let n=scope.paramValues?.[0];
    if(n===undefined){
        n=stack.length-1;
    }

    switch(typeof n){

        case 'number':
            if(n<0){
                return stack[stack.length+n];
            }else{
                return stack[n];
            }

        case 'string':
            for(let i=stack.length-1;i>=0;i--){
                const node=stack[i];
                if(node?.nodeId===n){
                    return node;
                }
            }
            break;
    }

    return undefined;
}

const mdImg=createConvoScopeFunction(async (scope,ctx)=>{
    const [
        url,
        description=getFileNameNoExt(url)?.trim().replace(/[^\w-. ]/g,'_')||'image',
        contentType=getContentType(url)
    ]=scope.paramValues??[];
    try{
        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64Url expects first argument to be a string');
        }
        if(typeof description !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64Url expects second argument to be a string');
        }
        if(typeof contentType !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64Url expects third argument to be a string');
        }
        const path=ctx.getFullPath(url,scope);

        const data=await vfs().readBufferAsync(path);
        return base64EncodeMarkdownImage(description,contentType,data);
    }catch(ex){
        console.error('ERROR',ex);
        return ''
    }
})


const mapFn=makeAnyConvoType('map',createConvoScopeFunction({
    usesLabels:true,
},convoLabeledScopeParamsToObj))

const arrayFn=makeAnyConvoType('array',(scope:ConvoScope)=>{
    return scope.paramValues??[]
})

const and=createConvoScopeFunction({
    discardParams:true,
    nextParam(scope){
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        if(value){
            return scope.i+1;
        }else{
            return false;
        }
    }
},scope=>{
    const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
    return value?true:false
})

const or=createConvoScopeFunction({
    discardParams:true,
    nextParam(scope){
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        if(value){
            return false;
        }else{
            return scope.i+1;
        }
    }
},scope=>{
    return scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
})

const describeStruct=createConvoScopeFunction(scope=>{
    const type=convoValueToZodType(scope.paramValues?.[0]);
    if(!valueIsZodObject(type)){
        throw new ConvoError('invalid-args',{statement:scope.s},'The first arg of new should be a type variable')
    }
    return describeConvoScheme(type,scope.paramValues?.[1]);
});

export const defaultConvoVarsBase={

    [convoBodyFnName]:createConvoScopeFunction({
        discardParams:true,
        catchReturn:true,
    }),

    string:createConvoBaseTypeDef('string'),
    number:createConvoBaseTypeDef('number'),
    int:createConvoBaseTypeDef('int'),
    time:createConvoBaseTypeDef('time'),
    void:createConvoBaseTypeDef('void'),
    boolean:createConvoBaseTypeDef('boolean'),
    any:createConvoBaseTypeDef('any'),
    object:createConvoBaseTypeDef('object'),

    ['true']:true,
    ['false']:false,
    ['null']:null,
    ['undefined']:undefined,
    [convoGlobalRef]:undefined,

    [convoPipeFnName]:convoPipeScopeFunction,

    [convoStructFnName]:makeAnyConvoType('map',createConvoScopeFunction({
        usesLabels:true,
    },(scope)=>{
        scope.cm=true;
        return convoLabeledScopeParamsToObj(scope);
    })),
    [convoMapFnName]:mapFn,
    [convoArrayFnName]:arrayFn,
    [convoJsonMapFnName]:mapFn,
    [convoJsonArrayFnName]:arrayFn,
    [convoArgsName]:undefined,

    [convoEnumFnName]:createConvoScopeFunction(scope=>{
        const type=createConvoType({
            type:'enum',
            enumValues:scope.paramValues??[],
        })
        const metadata=createConvoMetadataForStatement(scope.s);
        (type as any)[convoMetadataKey]=metadata;
        return type;
    }),
    [convoFunctions.mapWithCapture]:createConvoScopeFunction({usesLabels:true},(scope)=>{
        return convoParamsToObj(scope,undefined,'_');
    }),
    is:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const type=scope.paramValues[scope.paramValues.length-1];
        if(!type || (typeof type !== 'object')){
            return false;
        }

        const scheme=convoValueToZodType(type);

        for(let i=0;i<scope.paramValues.length-1;i++){
            const p=scheme.safeParse(scope.paramValues[i]);
            if(!p.success){
                return false;
            }
        }
        return true;
    }),
    and,
    or,
    not:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return true;
        }
        for(let i=0;i<scope.paramValues.length;i++){
            if(scope.paramValues[i]){
                return false;
            }
        }
        return true;
    }),

    if:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope,parentScope){
            const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
            if(value){
                return scope.i+1;
            }else{
                if(parentScope){
                    parentScope.i++;
                }
                return false;
            }
        }
    },(scope)=>{
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        return value?ifTrue:ifFalse;
    }),

    elif:createConvoScopeFunction({
        discardParams:true,
        shouldExecute(scope,parentScope){
            const prev=(parentScope?.paramValues && parentScope.paramValues[parentScope.paramValues.length-1]);
            return prev===ifFalse;
        },
        nextParam(scope){
            const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
            if(value){
                return scope.i+1;
            }else{
                return false;
            }
        }
    },scope=>{
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        return value?ifTrue:ifFalse;
    }),

    else:createConvoScopeFunction({
        discardParams:true,
        shouldExecute(scope,parentScope){
            const prev=(parentScope?.paramValues && parentScope.paramValues[parentScope.paramValues.length-1]);
            return prev===ifFalse;
        },
    },()=>{
        return ifTrue;
    }),

    then:createConvoScopeFunction({
        discardParams:true,
        shouldExecute(scope,parentScope){
            const prev=(parentScope?.paramValues && parentScope.paramValues[parentScope.paramValues.length-1]);
            return prev===ifTrue;
        },
    },()=>{
        return ifTrue;
    }),

    while:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope,parentScope){
            const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
            if(scope.i===0 && parentScope){
                delete parentScope.fromIndex;
            }
            if(scope.s.params && scope.i===scope.s.params.length-1 && parentScope){
                if(value){
                    parentScope.fromIndex=parentScope.i+1;
                    parentScope.gotoIndex=parentScope.i;
                    parentScope.li=parentScope.i+1;
                }
            }
            if(value){
                return scope.i+1;
            }else{
                if(parentScope){
                    parentScope.i++;
                }
                return false;
            }
        }
    },(scope)=>{
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        if(value){
            scope.ctrlData=ifTrue;
        }
        return scope.ctrlData??ifFalse;
    }),

    foreach:createConvoScopeFunction({
        discardParams:true,
        keepData:true,
        startParam(scope,parentScope){
            if(!scope.s.params?.length){
                if(parentScope){
                    parentScope.i++;
                }
                return false;
            }
            return 0;
        },
        nextParam(scope,parentScope){
            if(scope.paramValues?.[0]===breakIteration){
                if(parentScope){
                    parentScope.i++;
                }
                return false;
            }
            if(parentScope && scope.i+1===scope.s.params?.length){
                parentScope.fromIndex=parentScope.i+1;
                parentScope.gotoIndex=parentScope.i;
                parentScope.li=parentScope.i+1;
            }
            return scope.i+1;
        }
    },(scope)=>{
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        if(value){
            scope.ctrlData=ifTrue;
        }
        return scope.ctrlData??ifFalse;
    }),

    in:createConvoScopeFunction({
        discardParams:true,
        keepData:true,
        nextParam(scope){

            const value=scope.paramValues?.[0];

            if(!value || (typeof value !== 'object')){
                return false;
            }
            let it:ConvoIterator=scope.ctrlData;
            if(!it){
                it={i:0}
                if(!Array.isArray(value)){
                    it.keys=Object.keys(value);
                }
                scope.ctrlData=it;
            }

            return false;
        }
    },(scope)=>{
        const it=scope.ctrlData as ConvoIterator|undefined;
        if(!it){
            return breakIteration;
        }

        const value=scope.paramValues?.[0];
        const isArray=Array.isArray(value);
        const ary:any[]=it.keys??value;

        if(it.i>=ary.length){
            return breakIteration;
        }

        const r=isArray?value[it.i]:{key:ary[it.i],value:value[ary[it.i]]};
        it.i++;

        return r;

    }),

    break:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope,parentScope){
            if(parentScope?.paramValues){
                scope.ctrlData=parentScope.paramValues[parentScope.paramValues.length-1];
            }
            return scope.i+1;
        }
    },(scope)=>{
        if(!scope.paramValues?.length){
            scope.bl=true;
            return scope.ctrlData;
        }
        for(let i=0;i<scope.paramValues.length;i++){
            if(scope.paramValues[i]){
                scope.bl=true;
                return scope.ctrlData;
            }
        }
        return scope.ctrlData;
    }),

    do:createConvoScopeFunction({
        discardParams:true,
    },scope=>{
        return scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
    }),

    fn:createConvoScopeFunction({
        discardParams:true,
        catchReturn:true,
    },()=>{
        return undefined;
    }),

    return:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
        scope.r=true;
        return value;
    }),

    eq:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        for(let i=1;i<scope.paramValues.length;i++){
            if(scope.paramValues[i-1]!==scope.paramValues[i]){
                return false;
            }
        }
        return true;
    }),

    gt:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        for(let i=1;i<scope.paramValues.length;i++){
            if(!(scope.paramValues[i-1]>scope.paramValues[i])){
                return false;
            }
        }
        return true;
    }),

    gte:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        for(let i=1;i<scope.paramValues.length;i++){
            if(!(scope.paramValues[i-1]>=scope.paramValues[i])){
                return false;
            }
        }
        return true;
    }),

    lt:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        for(let i=1;i<scope.paramValues.length;i++){
            if(!(scope.paramValues[i-1]<scope.paramValues[i])){
                return false;
            }
        }
        return true;
    }),

    lte:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        for(let i=1;i<scope.paramValues.length;i++){
            if(!(scope.paramValues[i-1]<=scope.paramValues[i])){
                return false;
            }
        }
        return true;
    }),

    isIn:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const value=scope.paramValues[0];
        const condValue=scope.paramValues[1];

        if((typeof value === 'string') && (typeof condValue === 'string')){
            return value.includes(condValue);
        }else if(Array.isArray(value)){
            return value.includes(condValue);
        }else{
            return false;
        }
    }),

    contains:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const value=scope.paramValues[0];
        const condValue=scope.paramValues[1];

        if((typeof value === 'string') && (typeof condValue === 'string')){
            return condValue.includes(value);
        }else if(Array.isArray(condValue)){
            return condValue.includes(value);
        }else{
            return false;
        }
    }),

    regexMatch:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const value=scope.paramValues[0];
        const condValue=scope.paramValues[1];

        try{
            if(typeof condValue === 'string'){
                const reg=new RegExp(condValue);
                return reg.test(value);
            }else if (condValue instanceof RegExp){
                return condValue.test(value);
            }else{
                return false;
            }
        }catch{
            return false;
        }
    }),

    starMatch:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const value=scope.paramValues[0];
        const condValue=scope.paramValues[1];

        if((typeof value !== 'string') || (typeof condValue !== 'string')){
            return false;
        }else{
            return starStringTest(condValue,value);
        }
    }),

    deepCompare:createConvoScopeFunction(scope=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return false;
        }
        const value=scope.paramValues[0];
        const condValue=scope.paramValues[1];

        return deepCompare(value,condValue,scope.paramValues[2]);
    }),

    aryRandomize:createConvoScopeFunction(scope=>{
        const ary=scope.paramValues?.[0];
        if(Array.isArray(ary)){
            return aryRandomize(ary);
        }
        return ary;
    }),

    aryAdd:createConvoScopeFunction(scope=>{
        let ary=scope.paramValues?.[0];
        if(!scope.paramValues || !Array.isArray(ary)){
            return ary;
        }
        ary=[...ary];
        for(let i=1;i<scope.paramValues.length;i++){
            ary.push(scope.paramValues[i]);
        }
        return ary;
    }),

    aryRemove:createConvoScopeFunction(scope=>{
        let ary=scope.paramValues?.[0];
        if(!scope.paramValues || !Array.isArray(ary)){
            return [];
        }
        ary=[...ary];
        for(let i=1;i<scope.paramValues.length;i++){
            const index=ary.indexOf(scope.paramValues[i]);
            if(index===-1){
                continue;
            }
            ary.splice(index,1);
            i--;
        }
        return ary;
    }),

    aryConcat:createConvoScopeFunction(scope=>{
        const ary:any[]=[];
        if(!scope.paramValues?.length){
            return ary;
        }
        for(const v of scope.paramValues){
            if(Array.isArray(v)){
                ary.push(...v)
            }else if(v!==undefined){
                ary.push(v);
            }
        }
        return ary;
    }),

    aryDistinct:createConvoScopeFunction(scope=>{
        const ary:any[]=[];
        if(!scope.paramValues?.length){
            return ary;
        }
        for(const v of scope.paramValues){
            if(Array.isArray(v)){
                for(const a of v){
                    if(!ary.includes(a)){
                        ary.push(a);
                    }
                }
            }else if(v!==undefined && !ary.includes(v)){
                ary.push(v);
            }
        }
        return ary;
    }),

    aryJoin:createConvoScopeFunction(scope=>{
        const ary=scope.paramValues?.[0];
        if(!scope.paramValues || !Array.isArray(ary)){
            return [];
        }
        if(scope.paramValues.length>2){
            const out:any[]=[];
            for(let i=0;i<ary.length-1;i++){
                out.push(ary[i]);
                out.push(scope.paramValues[1+(i%(scope.paramValues.length-1))])
            }
            if(ary.length){
                out.push(ary[ary.length-1]);
            }
            return out.join('');
        }else{
            return ary.join(scope.paramValues[1]??', ')
        }
    }),



    add:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value+=v;
                }
            }
        }
        return value;
    }),

    sub:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value-=v;
                }
            }
        }
        return value;
    }),

    mul:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value*=v;
                }
            }
        }
        return value;
    }),

    div:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value/=v;
                }
            }
        }
        return value;
    }),

    mod:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value%=v;
                }
            }
        }
        return value;
    }),

    pow:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            const v=scope.paramValues[i];
            if(v!==undefined){
                if(value===undefined){
                    value=v;
                }else{
                    value=Math.pow(value,v);
                }
            }
        }
        return value;
    }),

    print:createConvoScopeFunction((scope,ctx)=>{
        if(scope.paramValues){
            ctx.print(...scope.paramValues);
        }
        return scope.paramValues?.[scope.paramValues?.length??0];
    }),

    inc:createConvoScopeFunction({
        discardParams:true,
        startParam(){
            return 1;
        }
    },(scope,ctx)=>{
        if(!scope.s.params){
            return undefined;
        }
        const value=scope.paramValues?.[0]??1;
        let lastValue=value;
        const s=scope.s.params[0];
        const sv=ctx.getRefValue(s,scope,false);
        lastValue=sv===undefined?value:sv+value;
        ctx.setRefValue(s,lastValue,scope);

        return lastValue;
    }),

    dec:createConvoScopeFunction({
        discardParams:true,
        startParam(){
            return 1;
        }
    },(scope,ctx)=>{
        if(!scope.s.params){
            return undefined;
        }
        const value=scope.paramValues?.[0]??1;
        let lastValue=value;
        const s=scope.s.params[0];
        const sv=ctx.getRefValue(s,scope,false);
        lastValue=sv===undefined?-value:sv-value;
        ctx.setRefValue(s,lastValue,scope);

        return lastValue;
    }),

    [convoSwitchFnName]:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope){

            if(scope.i===0){
                if(scope.s.hmc){
                    scope.sv=scope.paramValues?.[0];
                    return 1;
                }else{
                    return scope.paramValues?.[0]?1:2;
                }
            }

            if(scope.s.hmc){
                if(scope.s.params && !scope.s.params[scope.i]?.mc){
                    scope.sv=scope.paramValues?.[0];
                }
                const nextIndex=scope.ctrlData;
                if(nextIndex===undefined){
                    return scope.i+1;
                }else{
                    delete scope.ctrlData;
                    return nextIndex;
                }
            }else{
                return false;
            }


        }
    },scope=>{
        return scope.paramValues?.[0];
    }),

    [convoCaseFnName]:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope,parentScope){

            if(parentScope?.s.fn!==convoSwitchFnName || !scope.s.params?.length){
                return false;
            }

            const isMatch=parentScope.sv===scope.paramValues?.[0];
            if(isMatch){// let control flow move to next statement and do not check anymore statements
                parentScope.bi=parentScope.i+2;
                return false;
            }

            if(scope.i===scope.s.params.length-1){// no matches found, skip next statement
                parentScope.ctrlData=parentScope.i+2;
                return false;
            }
            return scope.i+1;
        }
    },()=>{
        return undefined;
    }),

    [convoDefaultFnName]:createConvoScopeFunction({
        discardParams:true,
        startParam(scope,parentScope){
            if(parentScope?.s.fn!==convoSwitchFnName){
                return false;
            }
            parentScope.bi=parentScope.i+2;
            return false;
        }
    },()=>{
        return undefined;
    }),

    [convoTestFnName]:createConvoScopeFunction({
        discardParams:true,
        nextParam(scope,parentScope){

            if(parentScope?.s.fn!==convoSwitchFnName || !scope.s.params?.length){
                return false;
            }

            const isMatch=scope.paramValues?.[0]?true:false;
            if(isMatch){// let control flow move to next statement and do not check anymore statements
                parentScope.bi=parentScope.i+2;
                return false;
            }

            if(scope.i===scope.s.params.length-1){// no matches found, skip next statement
                parentScope.ctrlData=parentScope.i+2;
                return false;
            }
            return scope.i+1;
        }
    },()=>{
        return undefined;
    }),

    sleep:createConvoScopeFunction(scope=>{
        const start=Date.now();
        const delay=scope.paramValues?.[0];
        return new Promise<number>(r=>{
            setTimeout(()=>{
                r(Date.now()-start);
            },typeof delay==='number'?delay:0);
        })
    }),

    rand:createConvoScopeFunction(scope=>{
        const range=scope.paramValues?.[0];
        if(typeof range=== 'number'){
            return Math.round(Math.random()*range);
        }else{
            return Math.random();
        }

    }),

    [convoFunctions.idx]:createConvoScopeFunction((scope,ctx)=>{
        if(!scope.paramValues){
            return undefined;
        }
        let value=scope.paramValues[0];
        for(let i=1;i<scope.paramValues.length;i++){
            value=value?.[ctx.getVar(scope.paramValues?.[1]??'',scope,'')];
        }
        return value;
    }),

    [convoFunctions.setDefault]:createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{
        const obj=mapFn(scope,ctx);
        if(obj){
            for(const e in obj){
                ctx.setDefaultVarValue(obj[e],e);
            }
        }
        return obj;
    }),

    encodeURI:createConvoScopeFunction(scope=>{
        return encodeURI(scope.paramValues?.[0]?.toString()??'');
    }),
    encodeURIComponent:createConvoScopeFunction(scope=>{
        return encodeURIComponent(scope.paramValues?.[0]?.toString()??'');
    }),

    now:createConvoScopeFunction(()=>{
        return Date.now();
    }),

    dateTime:createConvoScopeFunction(scope=>{
        const f=scope.paramValues?.[0]??convoDateFormat;
        let time:Date|string|number=scope.paramValues?.[1]??new Date();
        switch(typeof time){
            case 'string':
                time=new Date(time);
                break;

            case 'number':
                break;

            default:
                if(!(time instanceof Date)){
                    throw new ConvoError('invalid-args',{statement:scope.s},
                        'Second arg of timeTime must be a string, number or Date object'
                    );
                }
                break;
        }
        try{
            return format(time,f);
        }catch{
            return format(time,convoDateFormat);
        }
    }),

    [convoFunctions.today]:createConvoScopeFunction(()=>{
        return format(new Date(),'yyyy-MM-dd');
    }),

    md:createConvoScopeFunction((scope)=>{
        if(!scope.paramValues?.length){
            return '';
        }
        const out:string[]=[];
        for(let i=0;i<scope.paramValues.length;i++){
            const value=scope.paramValues[i];
            if(value===undefined){
                out.push('undefined');
            }else if(value===null){
                out.push('null');
            }else if((typeof value === 'object') && !isPrimitiveArray(value) && !(value instanceof Date)){
                if(value[convoMetadataKey] || isConvoTypeArray(value)){
                    out.push(JSON.stringify(convoTypeToJsonScheme(value)));
                }else{
                    try{
                        out.push(JSON.stringify(value,null,4));
                    }catch{
                        try{
                            out.push(JSON.stringify(value,createJsonRefReplacer(),4));
                        }catch{
                            out.push('[[object with excessive recursive references]]')
                        }
                    }
                }
            }else{
                objectToMarkdownBuffer(value,out,'',5);
            }
        }
        return out.join('');
    }),

    toMarkdown:createConvoScopeFunction(scope=>{
        if(!scope.paramValues?.length){
            return '';
        }
        const maxDepth=scope.paramValues[0];
        if(typeof maxDepth !== 'number'){
            throw new ConvoError('invalid-args',{statement:scope.s},'The first arg of toMarkdown must be a number indicating the max depth')
        }
        const out:string[]=[];
        for(let i=1;i<scope.paramValues.length;i++){
            objectToMarkdownBuffer(scope.paramValues[i],out,'',maxDepth);
        }
        return out.join('');
    }),

    toJson:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?.[0];
        if(value===undefined){
            return 'undefined';
        }
        return JSON.stringify(value,createJsonRefReplacer(),4);
    }),

    toJsonMdBlock:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?.[0];
        return (
            '``` json\n'+
            value===undefined?'undefined':JSON.stringify(value,createJsonRefReplacer(),4)+
            '\n```'
        )
    }),

    toJsonScheme:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?.[0];
        return JSON.stringify(convoTypeToJsonScheme(value))
    }),

    toCsv:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?.[0];
        if(!Array.isArray(value)){
            return '"!Invalid CSV Data"'
        }
        return toCsvLines(value);
    }),

    toCsvMdBlock:createConvoScopeFunction(scope=>{
        const value=scope.paramValues?.[0];
        if(!Array.isArray(value)){
            return '"!Invalid CSV Data"'
        }
        return '``` csv\n'+toCsvLines(value)+'\n```';
    }),

    merge:createConvoScopeFunction(scope=>{
        const value:Record<string,any>={}
        if(scope.paramValues){
            for(let i=0;i<scope.paramValues.length;i++){
                const item=scope.paramValues[i];
                if(item && (typeof item === 'object')){
                    for(const e in item){
                        const v=item[e];
                        if(v!==undefined){
                            value[e]=v;
                        }
                    }
                }

            }
        }
        return value;
    }),

    setObjDefaults:createConvoScopeFunction((scope,ctx)=>{
        let target=scope.paramValues?.[0];
        const source=scope.paramValues?.[1];

        if(typeof target === 'string'){
            let t=ctx.getVar(target,scope);
            if(t===undefined){
                const parts=target.split('.')
                target=parts.pop()??'_';
                t={}
                ctx.setVar(true,t,target,parts.length?parts:undefined);
            }
            target=t;
        }

        if(!target || !source || (typeof target !== 'object') || (typeof source !=='object')){
            return target;
        }

        for(const e in source){
            const v=source[e];
            if(v===undefined || target[e]!==undefined){
                continue;
            }
            target[e]=v;
        }

        return target;
    }),

    ['new']:createConvoScopeFunction(scope=>{
        const type=convoValueToZodType(scope.paramValues?.[0]);
        if(!valueIsZodObject(type)){
            throw new ConvoError('invalid-args',{statement:scope.s},'The first arg of new should be a type variable')
        }
        const r=type.safeParse(scope.paramValues?.[1]??{});
        if(r.success){
            return r.data;
        }else{
            throw new ConvoError('missing-defaults',{statement:scope.s},'The type has missing property defaults and can not be used with the new function - '+r.error.message);
        }
    }),

    tmpl:createConvoScopeFunction((scope,ctx)=>{
        const name=scope.paramValues?.[0];
        const format=scope.paramValues?.[1]??'plain';
        const md=ctx.getVar(convoVars.__md,null,null);
        if(!md){
            return '';
        }

        return getConvoMarkdownVar(name,format,ctx);
    }),

    html:createConvoScopeFunction((scope)=>{
        const params=scope.paramValues;
        if(!params?.length){
            return '';
        }
        if(params.length===1){
            return escapeHtml(params[0]?.toString?.()??'');
        }
        const out:string[]=[];
        for(let i=0;i<params.length;i++){
            const p=params[i];
            if(!p){
                out.push(escapeHtml(p.toString?.()??''))
            }

        }

        return out.join('\n');
    }),

    describeStruct,

    xAtt:createConvoScopeFunction((scope)=>{
        const value=scope.paramValues?.[0];
        switch(typeof value){
            case 'string':
                if(value.startsWith('{') && value.endsWith('}')){
                    return `"\\${escapeHtml(value)}"`;
                }else{
                    return `"${escapeHtml(value)}"`;
                }

            case 'number':
            case 'boolean':
            case 'bigint':
                return `"{${value}}"`;

            case 'undefined':
                return '"{undefined}"';

            default:
                try{
                    return `'{${escapeHtmlKeepDoubleQuote(JSON.stringify(value))}}'`
                }catch(ex){
                    return `'{${escapeHtmlKeepDoubleQuote(JSON.stringify({
                        __error:getErrorMessage(ex)
                    }))}}'`
                }
        }
    }),

    [convoFunctions.enableRag]:createConvoScopeFunction((scope,ctx)=>{
        ctx.enableRag(Array.isArray(scope.paramValues)?scope.paramValues:undefined);
    }),

    [convoFunctions.clearRag]:createConvoScopeFunction((scope,ctx)=>{
        ctx.clearRag();
    }),

    [convoFunctions.shortUuid]:createConvoScopeFunction(()=>{
        return shortUuid();
    }),

    [convoFunctions.uuid]:createConvoScopeFunction(()=>{
        return uuid();
    }),

    [convoFunctions.getVar]:createConvoScopeFunction((scope,ctx)=>{
        const name=scope.paramValues?.[0];
        if(typeof name !=='string'){
            return undefined
        }
        const v=ctx.getVar(name,scope);
        return v===undefined?scope.paramValues?.[1]:v;
    }),

    [convoFunctions.setVar]:createConvoScopeFunction((scope,ctx)=>{
        if(!scope.paramValues || scope.paramValues.length<2){
            return undefined;
        }
        let name='';
        for(let i=0;i<scope.paramValues.length-1;i++){
            const n=scope.paramValues[i];
            if(n){
                name+=(name?'.':'')+n;
            }
        }
        const v=scope.paramValues[scope.paramValues.length-1];
        if(name.includes('.')){
            const parts=name.split('.');
            ctx.setVar(true,v,parts.shift() as string,parts);
        }else{
            ctx.setVar(true,v,name);
        }
        return v;
    }),

    [convoFunctions.describeScene]:createConvoScopeFunction((scope,ctx)=>{
        const ctrl=ctx.getVar(convoVars.__sceneCtrl);
        if(ctrl instanceof SceneCtrl){
            const scene=ctrl.buildScene();
            ctx.setVar(true,scene,convoVars.__lastDescribedScene);
            return createConvoSceneDescription(scene);
        }else{
            return 'Unable to see scene';
        }
    }),

    [convoFunctions.getAgentList]:createConvoScopeFunction((scope,ctx)=>{
        const agents=ctx.convo.conversation?.agents;
        if(!agents?.length){
            return `<agentList>\n(no agents defined)\n</agentList>`
        }
        return `<agentList>\n${agents.map(a=>{

            const out:string[]=[`<agent>\nName: ${a.name}\n`];
            if(a.description){
                out.push(`Description: ${a.description}\n\n`);
            }
            if(a.capabilities.length){
                out.push('Capabilities:\n');
                for(const cap of a.capabilities){
                    out.push(`- ${cap}\n`);
                }
            }
            out.push('</agent>');

            return out.join('');
        }).join('\n\n')}\n</agentList>`
    }),

    [convoFunctions.defineForm]:createConvoScopeFunction((scope,ctx)=>{
        const form:ConvoForm=deepClone(scope.paramValues?.[0]);
        if(!form){
            return form;
        }
        if(ctx.getVar(convoVars.__formsEnabled)===undefined){
            ctx.setVar(true,true,convoVars.__formsEnabled);
        }
        let formsAry:ConvoForm[]|undefined=ctx.getVar(convoVars.__forms);
        if(!formsAry || !Array.isArray(formsAry)){
            formsAry=[];
            ctx.setVar(true,formsAry,convoVars.__forms);
        }

        if(!form.id){
            form.id='form-'+(formsAry.length+1);
        }

        if(!form.items){
            form.items=[];
        }

        for(let i=0;i<form.items.length;i++){
            let item=form.items[i];
            if(!item){
                form.items.splice(i,1);
                i--;
                continue;
            }
            if(typeof item === 'string'){
                item={
                    id:'item-'+(i+1),
                    type:'question',
                    question:item,
                }
                form.items[i]=item;
            }
            if(!item.id){
                item.id='item-'+(i+1);
            }
        }

        formsAry.push(form);
    }),

    [convoFunctions.enableTransform]:createConvoScopeFunction((scope,ctx)=>{
        if(!scope.paramValues){
            return;
        }
        for(const t of scope.paramValues){
            if(typeof t === 'string'){
                enableTransform(t,ctx);
            }else if(Array.isArray(t)){
                for(const at of t){
                    if(typeof at === 'string'){
                        enableTransform(at,ctx);
                    }
                }
            }
        }
    }),

    [convoFunctions.enableAllTransforms]:createConvoScopeFunction((scope,ctx)=>{
        enableTransform('all',ctx);
    }),

    [convoFunctions.pushConvoTask]:createConvoScopeFunction((scope,ctx)=>{
        if(!scope.paramValues){
            return;
        }
        const str=scope.paramValues.map(v=>{
            if(typeof v === 'string'){
                return v
            }else if(v===undefined || v===null){
                return ''
            }else{
                try{
                    return JSON.stringify(v);
                }catch{
                    return v+''
                }
            }
        }).join(' ');

        return ctx.convo.conversation?.addTask({
            name:str
        })
    }),

    [convoFunctions.popConvoTask]:createConvoScopeFunction((scope,ctx)=>{
        ctx.convo.conversation?.popTask();
    }),

    [convoFunctions.fsFullPath]:createConvoScopeFunction(async (scope,ctx)=>{
        return ctx.getFullPath(scope.paramValues?.[0],scope);
    }),

    [convoFunctions.joinPaths]:createConvoScopeFunction(async (scope)=>{
        if(!scope.paramValues){
            return '.';
        }
        const paths=scope.paramValues.filter(v=>v && (typeof v === 'string'));

        return joinPaths(...paths);
    }),

    [convoFunctions.isUndefined]:createConvoScopeFunction(async (scope)=>{
        if(!scope.paramValues){
            return true;
        }
        for(const v of scope.paramValues){
            if(v!==undefined){
                return false;
            }
        }
        return true;
    }),

    [convoFunctions.secondMs]:createConvoScopeFunction(async (scope)=>{
        return (scope.paramValues?.[0]??0)*1000;
    }),

    [convoFunctions.minuteMs]:createConvoScopeFunction(async (scope)=>{
        return (scope.paramValues?.[0]??0)*60000;
    }),

    [convoFunctions.hourMs]:createConvoScopeFunction(async (scope)=>{
        return (scope.paramValues?.[0]??0)*3600000;
    }),

    [convoFunctions.dayMs]:createConvoScopeFunction(async (scope)=>{
        return (scope.paramValues?.[0]??0)*86400000;
    }),

    [convoFunctions.aryFindMatch]:createConvoScopeFunction(async (scope)=>{
        const ary=scope.paramValues?.[0];
        const match=scope.paramValues?.[1];

        if(!Array.isArray(ary)){
            return undefined;
        }

        for(let i=0;i<ary.length;i++){
            const item=ary[i];
            if(isShallowEqualTo(match,item)){
                return item;
            }
        }

        return undefined;
    }),

    [convoFunctions.aryRemoveMatch]:createConvoScopeFunction(async (scope)=>{
        const ary=scope.paramValues?.[0];
        const match=scope.paramValues?.[1];

        if(!Array.isArray(ary)){
            return false;
        }

        for(let i=0;i<ary.length;i++){
            const item=ary[i];
            if(isShallowEqualTo(match,item)){
                ary.splice(i,1);
                return true;
            }
        }

        return false;
    }),

} as const;
Object.freeze(defaultConvoVarsBase);

export const extendedConvoVars={

    httpGet:createConvoScopeFunction(async scope=>{
        let url=scope.paramValues?.[0];
        let options=scope.paramValues?.[1];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        if(options && (typeof options !== 'object')){
            url+=`${url.includes('?')?'&':'?'}__input=${encodeURIComponent(options.toString())}`;
            options=undefined;
        }

        return await httpClient().getAsync(url,options)
    }),

    httpGetString:createConvoScopeFunction(async scope=>{
        const url=scope.paramValues?.[0];
        const options=scope.paramValues?.[1];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        return await httpClient().getStringAsync(url,options)
    }),

    httpPost:createConvoScopeFunction(async scope=>{
        const url=scope.paramValues?.[0];
        const body=scope.paramValues?.[1];
        const options=scope.paramValues?.[2];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        return await httpClient().postAsync(url,body,options)
    }),

    httpPut:createConvoScopeFunction(async scope=>{
        const url=scope.paramValues?.[0];
        const body=scope.paramValues?.[1];
        const options=scope.paramValues?.[2];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        return await httpClient().putAsync(url,body,options)
    }),

    httpPatch:createConvoScopeFunction(async scope=>{
        const url=scope.paramValues?.[0];
        const body=scope.paramValues?.[1];
        const options=scope.paramValues?.[2];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        return await httpClient().patchAsync(url,body,options)
    }),

    httpDelete:createConvoScopeFunction(async scope=>{
        const url=scope.paramValues?.[0];
        const options=scope.paramValues?.[1];

        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},"First arg must be a string URL");
        }

        return await httpClient().deleteAsync(url,options)
    }),

    openBrowserWindow:createConvoScopeFunction((scope)=>{
        const url=scope.paramValues?.[0];
        const target=scope.paramValues?.[1]??'_blank';
        if((typeof url !== 'string') || (typeof target !== 'string')){
            return false;
        }
        globalThis.window?.open(url,target);
        return true;
    }),

    [convoFunctions.readDoc]:convoScopeFunctionReadDoc,

    [convoFunctions.fsWriteJson]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsWriteJson expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues[0],scope);
        const value=scope.paramValues[1];

        await vfs().writeObjectAsync(path,value);
        return value;
    }),

    [convoFunctions.fsReadJson]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadJson expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        try{
            return await vfs().readObjectAsync(path);
        }catch{
            return undefined;
        }
    }),

    [convoFunctions.fsMultiRead]:createConvoScopeFunction(async (scope,ctx)=>{
        const options:ConvoMultiReadOptions=scope.paramValues?.[0];
        if(!options || (typeof options !== 'object') || (!Array.isArray(options.names))){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsMultiRead expects first argument an object of type ConvoMultiReadOptions');
        }

        const all=await Promise.all(options.names.map(async name=>{
            const path=ctx.getFullPath(options.pattern?options.pattern.replace('*',name):name,scope);
            let value=await vfs().readStringAsync(path);
            if(options.tagItemsWithName){
                value=`<${name}>\n${value}\n</${name}>`;
            }
            if(options.itemTag){
                value=`<${options.itemTag}>\n${value}\n</${options.itemTag}>`;
            }
            return value;
        }));

        let value=all.join('\n\n');
        if(options.tag){
            value=`<${options.tag}>\n${value}\n</${options.tag}>`;
        }
        return value;
    }),

    [convoFunctions.fsReadBase64]:createConvoScopeFunction(async (scope,ctx)=>{
        const [url]=scope.paramValues??[];
        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64 expects first argument to be a string');
        }
        const path=ctx.getFullPath(url,scope);

        const data=await vfs().readStringAsync(path);
        return base64Encode(data??'');
    }),

    [convoFunctions.fsReadBase64Url]:createConvoScopeFunction(async (scope,ctx)=>{
        const [url,_contentType]=scope.paramValues??[];
        if(typeof url !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64Url expects fist argument to be a string');
        }
        let contentType=_contentType;
        if(!contentType){
            contentType=getContentType(url);
        }
        if(typeof contentType !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsReadBase64Url expects second argument to be a string');
        }
        const path=ctx.getFullPath(url,scope);

        const data=await vfs().readBufferAsync(path);
        return base64EncodeUrl(contentType,data);
    }),

    [convoFunctions.fsReadBase64Image]:mdImg,
    [convoFunctions.mdImg]:mdImg,

    [convoFunctions.fsWrite]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsWrite expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues[0],scope);
        const value=scope.paramValues[1];

        await vfs().writeStringAsync(path,(typeof value === 'string')?value:(value+''));
        return value;
    }),

    [convoFunctions.fsRead]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsRead expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        try{
            return await vfs().readStringAsync(path);
        }catch{
            return undefined;
        }
    }),

    [convoFunctions.fsRemove]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsRemove expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        return await vfs().removeAsync(path);
    }),

    [convoFunctions.fsMkDir]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsMkDir expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        return await vfs().mkDirAsync(path);
    }),

    [convoFunctions.fsExists]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsExists expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        return (await vfs().getItemAsync(path))?true:false
    }),

    [convoFunctions.fsReadDir]:createConvoScopeFunction(async (scope,ctx)=>{
        if(typeof scope.paramValues?.[0] !== 'string'){
            throw new ConvoError('invalid-args',{statement:scope.s},'fsExists expects first argument to be a string');
        }
        const path=ctx.getFullPath(scope.paramValues?.[0],scope);

        try{
            return (await vfs().readDirAsync(path)).items.map(v=>v.path);
        }catch{
            return [];
        }
    }),

    [convoFunctions.getNodeInfo]:createConvoScopeFunction(getNodeInfo),

    [convoFunctions.getNodeInput]:createConvoScopeFunction((scope,ctx)=>getNodeInfo(scope,ctx)?.input),

} as const;
Object.freeze(extendedConvoVars);

export const defaultConvoVars={
    ...defaultConvoVarsBase,
    ...extendedConvoVars
}
Object.freeze(defaultConvoVars);

export const sandboxConvoVars:Record<string,any>={
    ...defaultConvoVarsBase
}
const nopFn=createConvoScopeFunction(()=>null)
for(const e in extendedConvoVars){
    sandboxConvoVars[e]=nopFn;
}
Object.freeze(sandboxConvoVars);

const enableTransform=(name:string,ctx:ConvoExecutionContext)=>{
    let enabledList:string[]=ctx.getVar(convoVars.__explicitlyEnabledTransforms);
    if(!Array.isArray(enabledList)){
        enabledList=[]
        ctx.setVar(true,enabledList,convoVars.__explicitlyEnabledTransforms);
    }

    if(!enabledList.includes(name)){
        enabledList.push(name);
    }
}



export const getConvoMarkdownVar=(name:string,format:string,ctx:ConvoExecutionContext)=>{
    const md=ctx.getVar(convoVars.__md,null,null);
    if(!md){
        return '';
    }

    const v=md[name];
    if(isConvoMarkdownLine(v)){
        return markdownLineToString(format as any,v.line);
    }else{
        return v?.toString?.()??'';
    }
}


const isShallowEqualTo=<T=any>(a:T, b:T, shouldTestKey?:(key:keyof T)=>boolean):boolean=>
{
    if(!a && !b)
        return true;

    if(!a || !b)
        return false;

    if(!(b && (typeof b === 'object')) || !(a && (typeof a === 'object'))){
        return a===b;
    }

    for(const key in a) {
        if(shouldTestKey && !shouldTestKey(key as any)){
            continue;
        }
        if(!(key in (b as any)) || a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}



const isPrimitiveArray=(value:any)=>{
    if(!Array.isArray(value)){
        return false;
    }
    for(let i=0;i<value.length;i++){
        const v=value[i];
        if(v && (typeof v === 'object') && !(v instanceof Date)){
            return false;
        }
    }
    return true;
}

