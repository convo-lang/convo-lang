import { CancelToken, getErrorMessage, strHashBase64 } from "@iyio/common";
import { Conversation } from "../Conversation.js";
import { parseConvoCode } from "../convo-parser.js";
import { ConvoMessage } from "../convo-types.js";
import { convoValueToZodType } from "../convo-zod.js";
import { ConvoExecutionContext } from "../ConvoExecutionContext.js";
import { PromiseOrResultType, PromiseResultType, ResultType } from "../result-type.js";
import { CompliedConvoDbFunction, ConvoDb, ConvoDbFunction, ConvoDbFunctionCall, ConvoDbFunctionExecutionContext, ConvoDbFunctionImplementation, ConvoDbFunctionResult, convoDbRuntimeCacheKey, ConvoNode, ConvoNodeKeySelection, ConvoNodeQuery, ConvoNodeQueryStep, ConvoNodeStreamItem, ParsedConvoDbFunctionArgsType, PartialNode } from "./convo-db-types.js";

export interface CreateConvoDbFunctionExecutionContextResult
{
    /**
     * The context that can be used to call a db function
     */
    ctx:ConvoDbFunctionExecutionContext;

    /**
     * If true the main source of the function was compiled. The caller of `createConvoDbFunctionExecutionContextAsync`
     * may now choose to save the compile main to the node in the database for future reuse.
     */
    mainWasCompiled:boolean;

    /**
     * If true the arg types where parsed. The caller of `createConvoDbFunctionExecutionContextAsync`
     * may now choose to save the parsed args to the node in the database for future reuse.
     */
    argsTypeWereParsed:boolean;
}

/**
 * Create a ConvoDbFunctionExecutionContext that can be passed to `executeConvoDbFunction`
 * @param compileAndParse If true main will be compiled if needed and args type will be parsed if needed.
 * @param node 
 * @param keys 
 * @param call 
 * @param db 
 * @param query 
 * @param step 
 * @param paths 
 * @returns 
 */
export const createConvoDbFunctionExecutionContextAsync=async (
    compileAndParse:boolean,
    node:ConvoNode,
    keys:ConvoNodeKeySelection,
    call:ConvoDbFunctionCall,
    db:ConvoDb,
    query:ConvoNodeQuery,
    step:ConvoNodeQueryStep,
    paths:string[],
    fnNextToken:string|undefined,
    cancel:CancelToken,
):PromiseResultType<CreateConvoDbFunctionExecutionContextResult>=>{

    const fn:ConvoDbFunction|undefined=node?.data?.['function'];
    const isExecutable=node?.data?.['isExecutable'];
    if(!fn || (typeof fn !== 'object')){
        return {
            success:false,
            error:'Node did not define a ConvoDbFunction at `data.function`',
            statusCode:500,
        }
    }

    if(isExecutable!==true){
        return {
            success:false,
            error:'Function note marked as executable `data.isExecutable` should be set to true',
            statusCode:500,
        }
    }

    let mainWasCompiled=false;
    let argsTypeWereParsed=false;

    let argsTypeParsed=fn.argsTypeParsed;
    let mainCompiled=fn.mainCompiled;

    if(compileAndParse){
        if(!argsTypeParsed && fn.argsType){
            try{
                argsTypeParsed=parseArgs(fn.argsType);
                argsTypeWereParsed=true;
            }catch(ex){
                return {
                    success:false,
                    error:`Failed to parse args type struct - ${getErrorMessage(ex)}`,
                    statusCode:500,
                }
            }

        }

        if(!mainCompiled){
            try{
                mainCompiled=await compileMainAsync(fn)
                mainWasCompiled=true;
            }catch(ex){
                return {
                    success:false,
                    error:`Failed to compile main - ${getErrorMessage(ex)}`,
                    statusCode:500,
                }
            }
        }
    }

    if(!mainCompiled){
        return {
            success:false,
            error:'No mainCompiled and compiling not enabled',
            statusCode:500,
        }
    }

    return {
        success:true,
        result:{
            ctx:{
                node,
                keys,
                query:query as any,
                step,
                args:call.args??{},
                db,
                function:fn,
                paths:paths,
                effects:fn.effects,
                argsTypeParsed,
                mainCompiled,
                nextToken:fnNextToken,
                cancel
            },
            mainWasCompiled,
            argsTypeWereParsed,
        }
    }
}

const parseArgs=(argsType:string):ParsedConvoDbFunctionArgsType=>{
    const r=parseConvoCode(`> define\n${argsType}`);
    if(r.error){
        throw new Error(r.error.message);
    }
    if(!r.result){
        throw new Error('Parsed args result empty');
    }

    
    const s=r.result[0]?.statement;
    if(!s){
        throw new Error('Invalid parsing result');
    }
    const exe=new ConvoExecutionContext();
    const exR=exe.executeStatement(s,r.result[0]);
    if(!exR){
        throw new Error('Args struct return empty value');
    }

    return {
        sourceHash:strHashBase64(argsType),
        parsedArgs:exR,
    }
}

export const parseConvoDbFunctionArgsType=(argsType:string):ResultType<ParsedConvoDbFunctionArgsType>=>{
    try{
        return {
            success:true,
            result:parseArgs(argsType),
        }
    }catch(ex){
        return {
            success:false,
            error:`Failed to parse args type struct - ${getErrorMessage(ex)}`,
            statusCode:500,
        }
    }
}

const compileMainAsync=async (fn:ConvoDbFunction):Promise<CompliedConvoDbFunction>=>{
    switch(fn.format){

        case 'convo':{
            const r=parseConvoCode(fn.main);
            if(r.error){
                throw new Error(r.error.message);
            }
            if(!r.result){
                throw new Error('Empty parsing result');
            }
            return {
                sourceHash:strHashBase64(fn.main),
                compiled:r.result,
            }
        }

        default:
            return {
                sourceHash:strHashBase64(fn.main),
                compiled:null,
            }
    }
}

const getImplementationAsync=async (
    fn:ConvoDbFunction,
    compiled:CompliedConvoDbFunction,
    getRefFunction?:(uri:string)=>PromiseOrResultType<ConvoDbFunctionImplementation>,
    verifyHash=true
):PromiseResultType<ConvoDbFunctionImplementation>=>{

    if(compiled && (!verifyHash || strHashBase64(fn.main)===compiled.sourceHash)){

        const cached=compiled[convoDbRuntimeCacheKey];
        if(cached){
            return {
                success:true,
                result:cached,
            };
        }

    }

    let imp:ConvoDbFunctionImplementation|undefined;

    switch(fn.format){

        case 'convo':{
            const r=createConvoFnImp(fn.main,compiled);
            if(!r.success){
                return r;
            }
            imp=r.result;
            break;
        }

        case 'js':
        case 'javascript':{
            const r=createJsFnImp(fn.main);
            if(!r.success){
                return r;
            }
            imp=r.result;
            break;
        }

        case 'uri':{
            const r=await getRefFunction?.(fn.main);
            if(!r){
                return {
                    success:false,
                    error:`Unsupported reference function: ${fn.main}`,
                    statusCode:404,
                }
            }
            if(!r.success){
                return r;
            }
            imp=r.result;
            break;
        }

        default:
            return {
                success:false,
                error:`Unsupported ConvoDbFunction format: ${fn.format}`,
                statusCode:500,
            }

    }

    compiled[convoDbRuntimeCacheKey]=imp;

    return {
        success:true,
        result:imp,
    }
}



const createResultNode=(value:any):ConvoNode=>{
    return {
        path:'/null',
        type:'function-result',
        data:{
            value
        }
    }
}

const createConvoFnImp=(src:string,compiled:CompliedConvoDbFunction):ResultType<ConvoDbFunctionImplementation>=>{
    const messages:ConvoMessage[]=compiled.compiled;
    if(!Array.isArray(messages)){
        return {
            success:false,
            error:'Compiled messages not an array',
            statusCode:500,
        }
    }

    return {
        success:true,
        result:async (ctx)=>{
            try{
                const conversation=new Conversation({defaultVars:{
                    args:ctx.args,
                    ctx,
                }});
                conversation.append(messages,{disableAutoFlatten:true});
                const r=await conversation.completeAsync();
                const returnValue=r.exe?.getVar('__return');
                if(returnValue!==undefined){
                    return {
                        success:true,
                        result:{node:createResultNode(returnValue)}
                    }
                }
                if(r.message?.format==='json'){
                    return {
                        success:true,
                        result:{node:createResultNode(JSON.parse(r.message.content??'null'))}
                    }
                }else{
                    return {
                        success:true,
                        result:{node:createResultNode(r.message?.content??'')}
                    }
                }
            }catch(ex){
                return {
                    success:false,
                    error:`Failed to complete convo function conversation: ${getErrorMessage(ex)}`,
                    statusCode:500
                }
            }
        }
    }
}

/**
 * Javascript function entry points
 */
interface JsEntryPoints
{
    /**
     * If the return value is not undefined the return value will be wrapped in a node with
     * the following shape:
     * {
     *     path:'/null',
     *     type:'function-result',
     *     data:{value:__RETURNED_VALUE___}
     * }
     *
     * If undefined is returned no node will be yielded by the query.
     */
    handler?:(args:Record<string,any>,ctx:ConvoDbFunctionExecutionContext)=>any|Promise<any>;

    /**
     * Returns a node or array of nodes that will be yielded by the query. If null or undefined is 
     * returned no node will be yielded by the query. Null and undefined values in returned
     * arrays are ignored.
     */
    nodeHandler?:(args:Record<string,any>,ctx:ConvoDbFunctionExecutionContext)=>PartialNode|null|undefined|(PartialNode|null|undefined)[]|Promise<PartialNode|null|undefined|(PartialNode|null|undefined)[]>;

    /**
     * Returns a ResultType with a result of a node or array of nodes that will be yielded by the query.
     * If null or undefined is returned no node will be yielded by the query. Null and undefined values in returned
     * arrays are ignored. Use resultHandler if you need to return custom errors, otherwise use nodeHandler
     */
    resultHandler?:(args:Record<string,any>,ctx:ConvoDbFunctionExecutionContext)=>PromiseOrResultType<PartialNode|null|undefined|(PartialNode|null|undefined)[]>;

    /**
     * Returns an async stream of nodes
     */
    streamHandler?:(args:Record<string,any>,ctx:ConvoDbFunctionExecutionContext)=>AsyncIterable<PartialNode>;
}
const createJsFnImp=(src:string):ResultType<ConvoDbFunctionImplementation>=>{
    // todo - run in sandbox
    try{
        const evalName='eval';
        const ev=globalThis[evalName];
        const entryPoints:()=>JsEntryPoints=ev(`((args,ctx)=>{

            ${src};

            const getFromLocalScope=(getter)=>{
                try{
                    return getter();
                }catch(ex){
                    return undefined
                }
            }

            return {
                handler:getFromLocalScope(()=>handler),
                nodeHandler:getFromLocalScope(()=>nodeHandler),
                resultHandler:getFromLocalScope(()=>resultHandler),
                streamHandler:getFromLocalScope(()=>streamHandler),
            }

        })`);
        return {
            success:true,
            result:async (ctx)=>{
                try{

                    const {
                        handler,
                        nodeHandler,
                        resultHandler,
                        streamHandler,
                    }=entryPoints();

                    if(!handler && !nodeHandler && !resultHandler && !streamHandler){
                        return {
                            success:false,
                            error:'No js handlers defined. handler, nodeHandler, resultHandler or streamHandler should be defined',
                            statusCode:500,
                        }
                    }

                    const nodes:PartialNode[]=[];

                    if(handler){
                        const value=await handler(ctx.args,ctx);
                        if(value!==undefined){
                            nodes.push(createResultNode(value));
                        }
                    }

                    if(nodeHandler){
                        const r=await nodeHandler(ctx.args,ctx);
                        if(r){
                            if(Array.isArray(r)){
                                for(const node of r){
                                    if(node){
                                        nodes.push(node);
                                    }
                                }
                            }else{
                                nodes.push(r);
                            }
                        }
                    }

                    if(resultHandler){
                        const r=await resultHandler(ctx.args,ctx);
                        if(!r.success){
                            return r;
                        }
                        if(r.result){
                            if(Array.isArray(r.result)){
                                for(const node of r.result){
                                    if(node){
                                        nodes.push(node);
                                    }
                                }
                            }else{
                                nodes.push(r.result);
                            }
                        }
                    }
                    const result:ConvoDbFunctionResult={}
                    if(nodes.length===1){
                        result.node=nodes[0];
                    }else if(nodes.length>1){
                        result.nodes=nodes;
                    }

                    if(streamHandler){
                        result.stream=streamHandler(ctx.args,ctx);
                    }

                    return {
                        success:true,
                        result,
                    }

                }catch(ex){
                    return {
                        success:false,
                        error:getErrorMessage(ex),
                        statusCode:500,
                    }
                }
            }
        }
    }catch(ex){
        return {
            success:false,
            error:`Failed to parse js function - ${getErrorMessage(ex)}`,
            statusCode:500
        }
    }

}

export async function *executeConvoDbFunction<TKeys extends ConvoNodeKeySelection='*'>(
    ctx:ConvoDbFunctionExecutionContext,
    getRefFunction?:(uri:string)=>PromiseOrResultType<ConvoDbFunctionImplementation>
):AsyncIterableIterator<ConvoNodeStreamItem<
    TKeys extends null|undefined ?
        keyof ConvoNode
    :TKeys extends "*"?
        keyof ConvoNode
    :TKeys extends keyof ConvoNode?
        TKeys
    :TKeys extends (infer U)[]?
        "*" extends U?
            keyof ConvoNode
        :
            Exclude<U,"*"|null|undefined> & keyof ConvoNode
    :
        keyof ConvoNode
>>{
    try{
        const {
            function:fn,
            mainCompiled,
            argsTypeParsed,
        }=ctx;

        let args=ctx.args;

        if(argsTypeParsed){
            let zodType=argsTypeParsed[convoDbRuntimeCacheKey];
            if(!zodType){
                try{
                    zodType=convoValueToZodType(argsTypeParsed.parsedArgs);
                    argsTypeParsed[convoDbRuntimeCacheKey]=zodType;
                }catch(ex){
                    yield {
                        type:'error',
                        error:`Failed to convert args type to ZodType - ${getErrorMessage(ex)}`,
                        statusCode:500
                    };
                    return;
                }
            }
            const r=zodType.safeParse(args);
            if(r.error){
                yield {
                    type:'error',
                    error:`Invalid Args: ${r.error.message}`,
                    statusCode:400
                }
                return;
            }
            args=r.data;
        }

        const cancel=ctx.cancel;

        const impR=await getImplementationAsync(fn,mainCompiled,getRefFunction);
        if(cancel.isCanceled){return;}

        if(!impR.success){
            yield {type:'error',error:impR.error,statusCode:impR.statusCode}
            return;
        }

        const impCallResult=await impR.result(ctx);
        if(cancel.isCanceled){return;}

        if(!impCallResult.success){
            yield {type:'error',error:impCallResult.error,statusCode:impCallResult.statusCode}
            return impCallResult;
        }

        const {
            node,
            nodes,
            stream,
        }=impCallResult.result;

        if(node){
            yield {type:'node',node};
            if(cancel.isCanceled){return;}
        }

        if(nodes){
            for(const node of nodes){
                yield {type:'node',node};
                if(cancel.isCanceled){return;}
            }
        }

        if(stream){
            for await(const node of stream){
                yield {type:'node',node}
                if(cancel.isCanceled){return;}
            }
        }
    }catch(ex){
        yield {type:'error',error:getErrorMessage(ex),statusCode:500}
    }
}