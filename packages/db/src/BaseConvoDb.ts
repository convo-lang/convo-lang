import { allConvoStepStages, callConvoDbDriverCmdAsync, Conversation, ConversationOptions, ConvoDb, ConvoDbAuthManager, ConvoDbCommand, ConvoDbCommandResult, ConvoDbDriver, ConvoDbDriverPathsResult, ConvoDbFunction, ConvoEmbeddingsGenerationRequest, ConvoEmbeddingsGenerationResult, ConvoEmbeddingsService, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeKeySelection, ConvoNodePermissionType, ConvoNodeQuery, ConvoNodeQueryResult, ConvoNodeStreamItem, ConvoNodeStreamItemType, ConvoNodeUpdate, ConvoNodeWatchCondition, ConvoStepStage, createConvoDbFunctionExecutionContextAsync, defaultConvoNodeQueryLimit, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, executeConvoDbFunction, getDefaultMockConvoEmbeddingsService, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, maxConvoNodeQueryLimit, normalizeConvoNodePath, PromiseResultType, PromiseResultTypeVoid, ResultType, ResultTypeError, StatusCode, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions, validateConvoNodeQuery } from "@convo-lang/convo-lang";
import { aryRemoveItem, CancelToken, DisposeCallback, getErrorMessage, getValueByPath } from "@iyio/common";
import z, { ZodType } from "zod";



const QueryTraversalStateSchema=z.object({

    /**
     * Current step number
     */
    step:z.number(),

    stepStage:z.enum(allConvoStepStages),

    /**
     * If true the first defined stage of the current step is being evaluated.
     */
    initState:z.boolean().optional(),

    /**
     * Used by ConvoDbFunctions as a next token.
     */
    fnNextToken:z.string().optional(),

    /**
     * The index in paths that is currently getting loaded and written to the stream. If undefined
     * traversal is in progress and nodes are not being written.
     */
    flushIndex:z.number().int().optional(),

    /**
     * Total number of nodes scanned.
     */
    scanCount:z.number().int(),

    /**
     * Number of nodes returned by query so far
     */
    returnedCount:z.number(),
    /**
     * Paths of current nodes
     */
    paths:z.string().array(),

    /**
     * Remaining number of nodes to skip
     */
    skip:z.number().optional(),

    error:z.string().optional(),

    errorCode:z.number().optional(),
});

type QueryTraversalState=z.infer<typeof QueryTraversalStateSchema>;

export interface BaseConvoDbOptions
{
    /**
     * embeddings service to use for generating embeddings
     */
    embeddingsService?:ConvoEmbeddingsService;

    /**
     * Default options for generating embeddings
     */
    embeddingOptions?:Partial<Omit<ConvoEmbeddingsGenerationRequest,'text'>>;

    /**
     * Options used to create Conversation instances for natural language processing
     */
    convoOptions?:ConversationOptions;

    /**
     * Name of the database
     */
    name:string;
}



export abstract class BaseConvoDb implements ConvoDb
{
    protected embeddingsService?:ConvoEmbeddingsService;
    protected embeddingOptions?:Partial<Omit<ConvoEmbeddingsGenerationRequest,'text'>>;
    protected convoOptions?:ConversationOptions;

    public readonly auth:ConvoDbAuthManager;

    public readonly dbName:string;

    public constructor({
        embeddingsService,
        embeddingOptions,
        convoOptions,
        name,
    }:BaseConvoDbOptions)
    {
        this.embeddingsService=embeddingsService;
        this.embeddingOptions=embeddingOptions;
        this.convoOptions=convoOptions;
        this.dbName=name;
        this.auth=new ConvoDbAuthManager(this);
    }

    abstract readonly _driver: ConvoDbDriver;

    protected loggingEnabled=false;

    public enableLogging()
    {
        this.loggingEnabled=true;
    }

    public async callFunctionAsync<T extends Record<string,any>=Record<string,any>>(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<T|undefined>
    {
        const r=await this.callFunctionReturnNodeAsync(path,args,permissionFrom);
        if(!r.success){
            return r;
        }
        return {
            success:true,
            result:r.result?.data as T|undefined,
        }
    }

    public async callFunctionWithSchemaAsync<TInput,TOutput>(inputSchema:ZodType<TInput>,outputSchema:ZodType<TOutput>,path:string,args:TInput,permissionFrom?:string):PromiseResultType<TOutput>
    {
        const inputParsed=inputSchema.safeParse(args);
        if(inputParsed.error){
            return {
                success:false,
                error:inputParsed.error.message,
                statusCode:400
            }
        }

        const r=await this.callFunctionReturnValueAsync(path,inputParsed.data as any);
        if(!r.success){
            return r;
        }

        const outputParsed=outputSchema.safeParse(r.result);
        if(outputParsed.error){
            return {
                success:false,
                error:outputParsed.error.message,
                statusCode:500,
            }
        }

        return {
            success:true,
            result:outputParsed.data,
        }
    }


    public async callFunctionReturnValueAsync<T extends Record<string,any>=Record<string,any>>(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<T>
    {
        const r=await this.callFunctionReturnNodeAsync(path,args,permissionFrom);
        if(!r.success){
            return r;
        }
        const data=r.result?.data;
        if(!data){
            return {
                success:false,
                error:'Called function did not return a value',
                statusCode:500,
            }
        }

        return {
            success:true,
            result:data as T,
        }
    }

    
    public async callFunctionReturnNodeAsync(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<ConvoNode|undefined>
    {
        const r=await this.queryNodesAsync({steps:[{path,call:{args}}],limit:1,permissionFrom});
        if(!r.success){
            return r;
        }
        const node=r.result.nodes[0];
        return {
            success:true,
            result:node,
        }
    }

    public async queryNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(
        query:ConvoNodeQuery<TKeys>
    ):PromiseResultType<ConvoNodeQueryResult<
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
        const stateResult=parseToken(query.nextToken);
        if(!stateResult.success){
            return stateResult;
        }
        const state=stateResult.result;

        const nodes:any[]=[];
        const limit=Math.min(query.limit??defaultConvoNodeQueryLimit,maxConvoNodeQueryLimit)+state.returnedCount;
        const limitedQuery:ConvoNodeQuery<TKeys>={
            ...query,
            limit,
            watch:false,
        };

        streamLoop: for await(const item of this._streamNodesAsync<TKeys>(limitedQuery,stateResult)){
            switch(item.type){

                case 'node':
                    nodes.push(item.node);
                    if(nodes.length>=limit){
                        break streamLoop;
                    }
                    break;

                case 'error':
                    return {
                        success:false,
                        error:item.error,
                        statusCode:item.statusCode,
                    }

                case 'flush':
                case 'ping':
                case 'end':
                    break;

                case 'node-insert':
                case 'node-update':
                case 'node-delete':
                case 'watch-start':
                    return {
                        success:false,
                        error:`Unsupported command for non-streaming query - ${item.type}`,
                        statusCode:500,
                    }

                default:
                    return {
                        success:false,
                        error:`Unknown stream item type - ${(item as any).type}`,
                        statusCode:500,
                    }
            }
        }

        const isComplete=state.error!==undefined || (!query.steps[state.step] && state.flushIndex===undefined);

        return {
            success:true,
            result:{
                nodes,
                nextToken:isComplete?undefined:JSON.stringify(state),
            }
        };
    }

    public async getNodeByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNode|undefined>
    {
        const r=await this.queryNodesAsync({steps:[{path}],limit:1,permissionFrom});
        if(!r.success){
            return r;
        }
        return {
            success:true,
            result:r.result.nodes[0],
        }
    }

    public async requireNodeByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNode>
    {
        const node=await this.getNodeByPathAsync(path,permissionFrom);
        if(!node.success){
            return node;
        }
        if(!node.result){
            return {
                success:false,
                error:`Node not found by path: ${path}`,
                statusCode:404,
            }
        }
        return node as ResultType<ConvoNode>;
    }

    protected getBatchSize(query:ConvoNodeQuery<any>):number
    {
        return defaultConvoNodeQueryLimit+1;
    }

    public streamNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(
        query:ConvoNodeQuery<TKeys>,
        cancel?:CancelToken
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
        return this._streamNodesAsync(query,parseToken(query.nextToken),cancel);
    }

    private readonly watchers:Watcher[]=[];
    private async *_streamNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(
        query:ConvoNodeQuery<TKeys>,
        stateResult:ResultType<QueryTraversalState>,
        cancel:CancelToken=new CancelToken()
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
        if(!stateResult.success){
            yield errorResultToConvoNodeStreamItem(stateResult,undefined);
            return;
        }
        const state=stateResult.result;
        if(state.error!==undefined){
            yield {
                type:'error',
                error:state.error,
                statusCode:(state.errorCode??500) as StatusCode,
            }
            return;
        }

        const queryValidationError=validateConvoNodeQuery(query);
        if(queryValidationError){
            yield {
                type:'error',
                error:queryValidationError,
                statusCode:400,
            }
            return;
        }

        if(query.skip!==undefined && state.skip===undefined){
            state.skip=Math.max(0,query.skip);
        }
        const ob=query.orderBy??{prop:'path',direction:'asc'};
        const orderBy=Array.isArray(ob)?ob:[ob];
        const batchSize=Math.max(1,query.readBatchSize??this.getBatchSize(query));
        const limit=query.limit===undefined?Number.MAX_SAFE_INTEGER:Math.max(0,query.limit);
        const hasLimit=!(query.watch && query.limit===undefined);
        const keys=convoNodeKeySelectionToKeys(query.keys);
        if(keys!=='*' && !keys.includes('path')){
            keys.push('path');
        }

        if(hasLimit && state.returnedCount>=limit){
            yield {type:'end'}
            return;
        }

        const iteratePathsAsync=async (getPaths:(offset:number,nextToken:string|undefined)=>PromiseResultType<ConvoDbDriverPathsResult>):PromiseResultType<string[]>=>{
            let offset=0;
            const paths:string[]=[];
            let nextToken:string|undefined;
            while(!cancel.isCanceled){
                const r=await getPaths(offset,nextToken);
                if(!r.success){
                    return r;
                }
                nextToken=r.result.nextToken;
                for(const p of r.result.paths){
                    const np=normalizeConvoNodePath(p,'none');
                    if(!np){
                        return {
                            success:false,
                            error:'Invalid node path returned from backing store',
                            statusCode:500,
                        }
                    }
                    paths.push(np);
                }
                offset+=r.result.paths.length;
                if(r.result.paths.length<batchSize){
                    break;
                }
            }

            return {
                success:true,
                result:paths,
            }
        }

        let watcher:Watcher|undefined;

        try{
            while(!cancel.isCanceled){

                if(state.flushIndex!==undefined){
                    if(query.watch && !watcher && !query.steps[state.step]){
                        const lastStep=query.steps[query.steps.length-1];
                        if(lastStep){
                            const iv=setInterval(()=>{
                                if(watcher?.next){
                                    const w=watcher.next;
                                    delete watcher.next;
                                    w('ping');
                                }
                            },60000);
                            watcher={
                                condition:{
                                    path:lastStep.path,
                                    condition:lastStep.condition,
                                    baseNodePaths:query.steps.length>1?[...state.paths]:undefined,
                                },
                                itemMap:{},
                                loopCount:0,
                                lastSend:0,
                                dispose:cancel.subscribe(()=>{
                                    clearInterval(iv);
                                    if(watcher){
                                        if(watcher.next){
                                            watcher.next([{type:'error'}]);
                                        }else{
                                            if(!watcher.queue){
                                                watcher.queue=[];
                                            }
                                            watcher.queue.push({type:'error'})
                                        }
                                    }
                                    watcher?.next?.([{type:'error'}]);
                                })
                            }
                            if(watcher.condition.path?.endsWith('*')){
                                watcher.condition.path=watcher.condition.path.substring(0,watcher.condition.path.length-1);
                                watcher.condition.wildcardPath=true;
                            }
                            this.watchers.push(watcher);
                        }
                    }
                    while(state.flushIndex<state.paths.length){
                        const loadPaths=state.paths.slice(state.flushIndex,state.flushIndex+batchSize);
                        if(!loadPaths.length){
                            break;
                        }
                        const r=await this._driver.selectNodesByPathsAsync(keys,loadPaths,orderBy);
                        if(cancel.isCanceled){return;}

                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        const nodes=r.result;
                        if(watcher?.itemMap){
                            for(const path in watcher.itemMap){
                                const mapped=watcher.itemMap[path];
                                if(mapped?.type==='node-delete'){
                                    nodes.push({path})
                                }
                            }
                        }
                        if(!r.result.length){
                            break;
                        }
                        for(const node of nodes){
                            state.flushIndex++;
                            if(state.skip){
                                state.skip--;
                            }else{
                                if(query.permissionFrom){
                                    if(!node.path){
                                        continue;
                                    }
                                    const permission=await this.checkNodePermissionAsync(
                                        query.permissionFrom,
                                        node.path,
                                        query.permissionRequired??ConvoNodePermissionType.all,
                                    );
                                    if(!permission.success){
                                        if(permission.statusCode!==401){
                                            yield errorResultToConvoNodeStreamItem(permission,state);
                                            return;
                                        }
                                    }
                                }
                                state.returnedCount++;
                                if(watcher){
                                    watcher.lastSend=Date.now();
                                }
                                yield {type:'node',node:node as any,...watcher?.itemMap[node.path??''] as any};
                                if(hasLimit && state.returnedCount>=limit){
                                    yield {type:'end'}
                                    return;
                                }
                            }
                            if(cancel.isCanceled){return;}
                        }
                        yield {type:'flush'}
                    }
                    state.flushIndex=undefined;
                }

                const step=query.steps[state.step];
                if(!step){

                    if(query.watch){

                        if(!watcher){
                            yield errorResultToConvoNodeStreamItem({
                                success:false,
                                error:'Watcher not initialized before flush',
                                statusCode:500,
                            },state);
                            return;
                        }

                        if(!watcher.loopCount){
                            yield {type:'watch-start'};
                        }
                        watcher.loopCount++;

                        let update:WatcherUpdate[]|'ping';
                        if(watcher.queue){
                            update=watcher.queue;
                            delete watcher.queue;
                        }else{
                            try{
                                update=await new Promise<WatcherUpdate[]|'ping'>((resolve,reject)=>{
                                    if(!watcher){
                                        reject('watcher unset');
                                        return;
                                    }
                                    watcher.next=resolve;
                                });
                            }catch(ex){
                                yield errorResultToConvoNodeStreamItem({
                                    success:false,
                                    error:getErrorMessage(ex),
                                    statusCode:500,
                                },state);
                                return;
                            }
                        }
                        if(cancel.isCanceled){return;}
                        if(update==='ping'){
                            yield {type:'ping'};
                            continue;
                        }
                        let paths:string[]=[];
                        for(const i of update){
                            if(i.error){
                                yield errorResultToConvoNodeStreamItem(i.error,state);
                                return;

                            }
                            if(i.type==='error'){
                                yield errorResultToConvoNodeStreamItem({
                                    success:false,
                                    error:'Watcher error',
                                    statusCode:500,
                                },state);
                                return;
                            }
                            if(i.path){
                                paths.push(i.path);
                            }
                        }
                        const cond=watcher.condition.condition;
                        if(cond){
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForConditionAsync({
                                condition:cond,
                            },paths,orderBy,batchSize,offset,nextToken));
                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            paths=[];
                            for(const u of update){
                                if(u.path && r.result.includes(u.path)){
                                    paths.push(u.path);
                                }
                            }
                        }
                        for(const k in watcher.itemMap){
                            delete watcher.itemMap[k];
                        }
                        for(const u of update){
                            if(u.path && paths.includes(u.path)){
                                watcher.itemMap[u.path]={type:u.type}
                            }
                        }
                        if(cancel.isCanceled){
                            return;
                        }
                        state.flushIndex=0;
                        state.paths=paths;
                        continue;
                    }else{
                        break;
                    }
                }
                let stagePaths=state.step===0 && (state.initState===true || state.initState===undefined)?null:state.paths;

                switch(state.stepStage){

                    case 'path':
                        if(step.path){
                            const p=step.path;
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForPathAsync({
                                path:p
                            },stagePaths,orderBy,batchSize,offset,nextToken));
                            if(cancel.isCanceled){return;}

                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            state.paths=stagePaths=r.result;
                        }
                        break;

                    case 'condition':
                        if(step.condition){
                            const c=step.condition;
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForConditionAsync({
                                condition:c,
                            },stagePaths,orderBy,batchSize,offset,nextToken));
                            if(cancel.isCanceled){return;}

                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            state.paths=stagePaths=r.result;
                        }
                        break;

                    case 'permissions':
                        if(step.permissionFrom){
                            const f=step.permissionFrom;
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForPermissionAsync({
                                permissionFrom:f,
                                permissionRequired:step.permissionRequired??ConvoNodePermissionType.all,
                            },stagePaths,orderBy,batchSize,offset,nextToken));
                            if(cancel.isCanceled){return;}

                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            state.paths=stagePaths=r.result;
                        }
                        break;

                    case 'embedding':
                        if(step.embedding){
                            const e=step.embedding;
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForEmbeddingAsync({
                                embedding:e
                            },stagePaths,orderBy,batchSize,offset,nextToken));
                            if(cancel.isCanceled){return;}

                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            state.paths=stagePaths=r.result;
                        }
                        break;

                    case 'call':
                        if(step.call){
                            // check permission
                            if(query.permissionFrom){
                                const f=query.permissionFrom;
                                const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectNodePathsForPermissionAsync({
                                    permissionFrom:f,
                                    permissionRequired:ConvoNodePermissionType.execute,
                                },stagePaths,orderBy,batchSize,offset,nextToken));
                                if(cancel.isCanceled){return;}

                                if(!r.success){
                                    yield errorResultToConvoNodeStreamItem(r,state);
                                    return;
                                }
                            }
                            const fnPaths=state.paths;
                            state.paths=stagePaths=[];
                            for(const path of fnPaths){
                                const r=await this.selectNodeByPathAsync(path,'*');
                                if(cancel.isCanceled){return;}

                                if(!r.success){
                                    yield errorResultToConvoNodeStreamItem(r,state);
                                    return;
                                }
                                const fnNode=r.result as ConvoNode|undefined;
                                if(!fnNode){
                                    continue;
                                }
                                const fn:ConvoDbFunction|undefined=fnNode.data['function'];
                                const isExecutable=fnNode.data['isExecutable'];
                                if(!fn || (typeof fn !== 'object') || isExecutable!==true){
                                    continue;
                                }
                                try{
                                    const ctxResult=await createConvoDbFunctionExecutionContextAsync(
                                        true,
                                        fnNode,
                                        keys,
                                        step.call,
                                        this,
                                        query as any,
                                        step,
                                        state.paths,
                                        state.fnNextToken,
                                        cancel,
                                    );
                                    if(!ctxResult.success){
                                        yield errorResultToConvoNodeStreamItem(ctxResult,state);
                                        return;
                                    }
                                    const ctx=ctxResult.result.ctx;
                                    if(ctxResult.result.argsTypeWereParsed || ctxResult.result.mainWasCompiled){
                                        try{
                                            fn.argsTypeParsed=ctx.argsTypeParsed;
                                            fn.mainCompiled=ctx.mainCompiled;
                                            const r=await this._driver.updateNodeAsync({
                                                path:fnNode.path,
                                                data:{
                                                    ...fnNode.data,
                                                    function:{...fn}
                                                }

                                            },{});
                                            if(!r.success){
                                                console.error('Failed to stored parsed function values, but will continue execution',r.error);
                                            }
                                        }catch(ex){
                                            console.error('Failed to stored parsed function values, but will continue execution',ex);
                                        }
                                    }
                                    for await(const resultNode of executeConvoDbFunction(ctx)){
                                        state.fnNextToken=ctx.nextToken;
                                        if(cancel.isCanceled){return;}
                                        if(resultNode.type==='error'){
                                            yield errorResultToConvoNodeStreamItem({
                                                success:false,
                                                error:resultNode.error,
                                                statusCode:resultNode.statusCode
                                            },state);
                                            return;
                                        }
                                        yield resultNode;
                                        if(cancel.isCanceled){return;}
                                    }
                                    delete state.fnNextToken;
                                }catch(ex){
                                    console.error('ConvoNode execution failed',ex);
                                    yield errorResultToConvoNodeStreamItem({
                                        success:false,
                                        error:'ConvoNode execution failed',
                                        statusCode:500
                                    },state);
                                    return;
                                }
                            }
                        }
                        break;

                    case 'edge':
                        if(step.edge){
                            const e=step.edge;
                            const r=await iteratePathsAsync((offset,nextToken)=>this._driver.selectEdgeNodePathsForConditionAsync({
                                edge:e,
                                edgeDirection:step.edgeDirection??'bi',
                                edgeLimit:step.edgeLimit,
                            },stagePaths,orderBy,batchSize,offset,nextToken));
                            if(cancel.isCanceled){return;}

                            if(!r.success){
                                yield errorResultToConvoNodeStreamItem(r,state);
                                return;
                            }
                            state.paths=stagePaths=r.result;
                        }
                        break;

                    default:
                        yield {
                            type:'error',
                            error:`Unknown step stage - ${(state as any).stepStage}`,
                            statusCode:500,
                        }
                        return;

                }

                state.initState=false;

                const nextStage=getNextStepStage(state.stepStage);
                if(nextStage===undefined){
                    state.step++;
                    state.initState=true;
                    delete state.fnNextToken;
                    state.stepStage=allConvoStepStages[0];
                    const scan=(step.edge || !query.steps[state.step] || state.step===1)?true:false;
                    if(scan){
                        state.scanCount+=state.paths.length;
                    }
                    if(query.returnAllScanned?scan:!query.steps[state.step]){
                        state.flushIndex=0;
                    }
                }else{
                    state.stepStage=nextStage;
                }

            }
        }finally{
            if(watcher){
                aryRemoveItem(this.watchers,watcher);
                watcher.dispose();
            }
        }
    }

    private triggerWatchEvent(type:Exclude<ConvoNodeStreamItemType,'error'>,nodePath:string){
        if(!this.watchers.length){
            return;
        }
        for(let i=0;i<this.watchers.length;i++){
            const w=this.watchers[i];
            if(!w){
                continue;
            }
            try{
                const c=w.condition;
                if(c.baseNodePaths && !c.baseNodePaths.includes(nodePath)){
                    continue;
                }
                if(c.path){
                    if(c.wildcardPath){
                        if(!nodePath.startsWith(c.path)){
                            continue;
                        }
                    }else if(c.path!==nodePath){
                        continue;
                    }
                }
                if(w.next){
                    const next=w.next;
                    delete w.next;
                    next([{type,path:nodePath}]);
                }else{
                    if(!w.queue){
                        w.queue=[];
                    }
                    w.queue.push({type,path:nodePath});
                }
            }catch(ex){
                console.error('ConvoDb watch trigger error',ex);
            }
        }
    }

    public getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>>
    {
        return this.queryNodesAsync({steps:[{path}],permissionFrom});
    }

    public async getNodePermissionAsync(fromPath:string,toPath:string):PromiseResultType<ConvoNodePermissionType>
    {
        const to=normalizeConvoNodePath(toPath,'none')?.split('/');
        const from=normalizeConvoNodePath(fromPath,'none');
        if(to===undefined || from===undefined){
            return {
                success:true,
                result:ConvoNodePermissionType.none,
            }
        }

        for(let i=1;i<to.length;i++){
            to[i]=to[i-1]+'/'+to[i];
        }
        to[0]='/';

        const r=await this._driver.selectEdgesByPathsAsync(['from','to','grant'],[from],to,true);
        if(!r.success){
            return r;
        }
        let grant=ConvoNodePermissionType.none;
        for(const e of r.result){
            if(e.grant){
                grant|=e.grant;
            }
        }

        return {success:true,result:grant};

    }


    public async checkNodePermissionAsync(fromPath:string,toPath:string,type:ConvoNodePermissionType,matchAny?:boolean):PromiseResultTypeVoid
    {
        const r=await this.getNodePermissionAsync(fromPath,toPath);
        if(!r.success){
            return r;
        }

        const grant=r.result;
        const success=(matchAny?
            (grant&type)?true:false
        :
            (grant&type)===type
        );
        return success?{
            success:true,
        }:{
            success:false,
            error:'Permission denied',
            statusCode:401,
        }
    }

    public async insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>
    {
        if(node.path!==normalizeConvoNodePath(node.path,'none')){
            return {
                success:false,
                error:`Invalid node path. Paths should be normalized - ${node.path}`,
                statusCode:400,
            };
        }
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            };
        }
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,node.path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }
        const r=await this._driver.insertNodeAsync(node,options);
        if(r.success){
            this.triggerWatchEvent('node-insert',node.path);
        }
        return r;
    }


    public async updateNodeAsync(node:ConvoNodeUpdate,options?:UpdateConvoNodeOptions):PromiseResultTypeVoid
    {
        if(node.path!==normalizeConvoNodePath(node.path,'none')){
            return {
                success:false,
                error:`Invalid node path. Paths should be normalized - ${node.path}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,node.path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }

        if(node.data===null){
            node={...node,data:{}};
        }

        if(options?.mergeData && node.data){
            const current=await this.selectNodeByPathAsync(node.path,['data']);
            if(!current.success){
                return current;
            }
            if(current.result?.data){
                node={...node,data:{...current.result.data,...node.data}};
            }
        }

        const r=await this._driver.updateNodeAsync(node,options);

        if(r.success){
            this.triggerWatchEvent('node-update',node.path);
        }

        return r;
    }


    public async deleteNodeAsync(path:string,options?:DeleteConvoNodeOptions):PromiseResultTypeVoid
    {
        if(path!==normalizeConvoNodePath(path,'none')){
            return {
                success:false,
                error:`Invalid node path. Paths should be normalized - ${path}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }
        const r=await this._driver.deleteNodeAsync(path,options);
        
        if(r.success){
            this.triggerWatchEvent('node-delete',path);
        }

        return r;
    }




    

    public async getEdgeByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEdge>
    {
        if(permissionFrom!==undefined && permissionFrom!==normalizeConvoNodePath(permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${permissionFrom}`,
                statusCode:400,
            }
        }
        const r=await this._driver.queryEdgesAsync({id,permissionFrom,limit:1});
        if(!r.success){
            return r;
        }
        const edge=r.result.edges[0];
        if(edge){
            return {
                success:true,
                result:edge,
            };
        }else{
            return {
                success:false,
                error:'not found',
                statusCode:404,
            }
        }
    }

    public async insertEdgeAsync(edge:Omit<ConvoNodeEdge,"id">,options?:InsertConvoNodeEdgeOptions):PromiseResultType<ConvoNodeEdge>
    {
        if(edge.from!==normalizeConvoNodePath(edge.from,'none')){
            return {
                success:false,
                error:`Invalid node path. Edge from paths should be normalized - ${edge.from}`,
                statusCode:400,
            }
        }
        if(edge.to!==normalizeConvoNodePath(edge.to,'none')){
            return {
                success:false,
                error:`Invalid node path. Edge to paths should be normalized - ${edge.to}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom){
            const [fromPermission,toPermission]=await Promise.all([
                this.checkNodePermissionAsync(options.permissionFrom,edge.from,ConvoNodePermissionType.write),
                this.checkNodePermissionAsync(options.permissionFrom,edge.to,ConvoNodePermissionType.readWrite,true),
            ]);
            if(!fromPermission.success){
                return fromPermission;
            }
            if(!toPermission.success){
                return toPermission;
            }
        }
        return this._driver.insertEdgeAsync(edge,options);
    }

    public async updateEdgeAsync(update:ConvoNodeEdgeUpdate,options?:UpdateConvoNodeEdgeOptions):PromiseResultTypeVoid
    {
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }

        const edgeResult=await this.getEdgeByIdAsync(update.id);
        if(!edgeResult.success){
            return edgeResult;
        }
        const current=edgeResult.result;
        if(options?.permissionFrom){
            const [from,to]=await Promise.all([
                this.checkNodePermissionAsync(options.permissionFrom,current.from,ConvoNodePermissionType.write),
                this.checkNodePermissionAsync(options.permissionFrom,current.to,ConvoNodePermissionType.readWrite,true),
            ]);
            if(!from.success){
                return from;
            }
            if(!to.success){
                return to;
            }
        }
        return await this._driver.updateEdgeAsync(update,options);
    }

    public async deleteEdgeAsync(id:string,options?:DeleteConvoNodeEdgeOptions):PromiseResultTypeVoid
    {
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }

        const edgeResult=await this.getEdgeByIdAsync(id);
        if(!edgeResult.success){
            return edgeResult;
        }
        const current=edgeResult.result;
        if(options?.permissionFrom){
            const [from,to]=await Promise.all([
                this.checkNodePermissionAsync(options.permissionFrom,current.from,ConvoNodePermissionType.write),
                this.checkNodePermissionAsync(options.permissionFrom,current.to,ConvoNodePermissionType.readWrite,true),
            ]);
            if(!from.success){
                return from;
            }
            if(!to.success){
                return to;
            }
        }
        return await this._driver.deleteEdgeAsync(id,options);
    }

    

    public async getEmbeddingByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEmbedding>
    {
        if(permissionFrom!==undefined && permissionFrom!==normalizeConvoNodePath(permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${permissionFrom}`,
                statusCode:400,
            }
        }
        const r=await this._driver.queryEmbeddingsAsync({id,permissionFrom,limit:1});
        if(!r.success){
            return r;
        }
        const embedding=r.result.embeddings[0];
        if(embedding){
            return {
                success:true,
                result:embedding,
            };
        }else{
            return {
                success:false,
                error:'not found',
                statusCode:404,
            }
        }
    }

    public async insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,"id">,options?:InsertConvoNodeEmbeddingOptions):PromiseResultType<ConvoNodeEmbedding>
    {
        if(embedding.path!==normalizeConvoNodePath(embedding.path,'none')){
            return {
                success:false,
                error:`Invalid node path. Embedding paths should be normalized - ${embedding.path}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,embedding.path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }
        return await this._driver.insertEmbeddingAsync(embedding,options);
    }

    public async updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options?:UpdateConvoNodeEmbeddingOptions):PromiseResultTypeVoid
    {
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }

        const embeddingResult=await this.getEmbeddingByIdAsync(update.id);
        if(!embeddingResult.success){
            return embeddingResult;
        }
        const current=embeddingResult.result;
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,current.path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }
        return await this._driver.updateEmbeddingAsync(update,options);
    }

    public async deleteEmbeddingAsync(id:string,options?:DeleteConvoNodeEmbeddingOptions):PromiseResultTypeVoid
    {
        if(options?.permissionFrom!==undefined && options.permissionFrom!==normalizeConvoNodePath(options.permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${options.permissionFrom}`,
                statusCode:400,
            }
        }

        const embeddingResult=await this.getEmbeddingByIdAsync(id);
        if(!embeddingResult.success){
            return embeddingResult;
        }
        const current=embeddingResult.result;
        if(options?.permissionFrom){
            const permission=await this.checkNodePermissionAsync(options.permissionFrom,current.path,ConvoNodePermissionType.write);
            if(!permission.success){
                return permission;
            }
        }
        return await this._driver.deleteEmbeddingAsync(id,options);
    }

    protected async selectNodeByPathAsync(path:string,keys:(keyof ConvoNode)[]|'*'):PromiseResultType<Partial<ConvoNode>|undefined>
    {
        const r=await this._driver.selectNodesByPathsAsync(keys,[path],[{prop:'path'}]);
        if(!r.success){
            return r;
        }
        return {
            success:true,
            result:r.result[0]
        }
    }

    /**
     * Generates a vector for the given embedding.
     * Steps:
     * - Get node with matching path
     * - Extract value pointed to by the `prop` property of the embedding
     * - If the embedding includes instructions the instructions are evaluated as raw convo-lang
     *   and the result is used as the text value to generate embeddings for.
     * - Generate embeddings using the configured ConvoEmbeddingsService or use the MockConvoEmbeddingsService
     *   if one is not configured.
     */
    public async generateEmbeddingVectorAsync(embedding:ConvoNodeEmbedding):PromiseResultType<any>
    {
        const nodeResult=await this.selectNodeByPathAsync(embedding.path,'*');
        if(!nodeResult.success){
            return nodeResult;
        }
        const node=nodeResult.result;
        if(!node){
            return {
                success:false,
                error:'Target node not found',
                statusCode:404,
            }
        }

        let value:any=getValueByPath(node,embedding.prop);
        if(embedding.instructions){
            const conversation=this.createConversation();
            conversation.defaultVars['node']=node;
            conversation.defaultVars['embedding']=embedding;
            conversation.defaultVars['value']=value;
            try{
                conversation.append(embedding.instructions);
            }catch(ex){
                return {
                    success:false,
                    error:`Invalid embedding.instructions - ${getErrorMessage(ex)}`,
                    statusCode:400
                }
            }
            try{
                const r=await conversation.completeAsync();
                value=r.message?.content?.trim()||value;
            }catch(ex){
                return {
                    success:false,
                    error:`Embeddings natural language content generation failed - ${getErrorMessage(ex)}`,
                    statusCode:500
                }
            }
        }

        const embeddingResult=await this.generateEmbeddingsAsync({
            ...this.embeddingOptions,
            text:String(value),
        });

        if(!embeddingResult.success){
            return embeddingResult;
        }

        return {
            success:true,
            result:embeddingResult.result.embedding
        }

    }

    public queryEdgesAsync(query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>{
        return this._driver.queryEdgesAsync(query);
    }

    public queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbeddingQueryResult>
    {
        return this._driver.queryEmbeddingsAsync(query);
    }

    protected async generateEmbeddingsAsync(request:ConvoEmbeddingsGenerationRequest):PromiseResultType<ConvoEmbeddingsGenerationResult>
    {
        const service=this.embeddingsService??getDefaultMockConvoEmbeddingsService();
        return await service.generateEmbeddingsAsync(request);
    }

    /**
     * Creates a Convo-Lang conversation that can be used for natural language processing.
     */
    protected createConversation()
    {
        return new Conversation(this.convoOptions);
    }

    public async executeCommandAsync<TKeys extends ConvoNodeKeySelection='*'>(
        command:ConvoDbCommand<TKeys>
    ):PromiseResultType<ConvoDbCommandResult<TKeys>>
    {
        const actionNames=Object.keys(command);
        const action=actionNames[0] as keyof ConvoDbCommand<TKeys>;
        if(actionNames.length!==1 || !action){
            return {
                success:false,
                error:'Exactly one action should be defined for a ConvoDbCommand',
                statusCode:400,
            };
        }

        let result:ResultType<any>;

        switch(action){

            case 'driverCmd':
                result=(await callConvoDbDriverCmdAsync(
                    this._driver,
                    command.driverCmd!.fn,
                    command.driverCmd!.args
                )) as ResultType<any>;
                break;

            case 'queryNodes':
                result=await this.queryNodesAsync(command.queryNodes!.query);
                break;

            case 'getNodesByPath':
                result=await this.getNodesByPathAsync(
                    command.getNodesByPath!.path,
                    command.getNodesByPath!.permissionFrom,
                );
                break;

            case 'getNodePermission':
                result=await this.getNodePermissionAsync(
                    command.getNodePermission!.fromPath,
                    command.getNodePermission!.toPath,
                );
                break;

            case 'checkNodePermission':{
                const r=await this.checkNodePermissionAsync(
                    command.checkNodePermission!.fromPath,
                    command.checkNodePermission!.toPath,
                    command.checkNodePermission!.type,
                    command.checkNodePermission!.matchAny,
                );
                if(r.success){
                    result={success:true,result:true};
                }else if(r.statusCode===401){
                    result={success:true,result:false};
                }else{
                    result=r;
                }
                break;
            }

            case 'insertNode':
                result=await this.insertNodeAsync(
                    command.insertNode!.node,
                    command.insertNode!.options,
                );
                break;

            case 'updateNode':{
                const r=await this.updateNodeAsync(
                    command.updateNode!.node,
                    command.updateNode!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            case 'deleteNode':{
                const r=await this.deleteNodeAsync(
                    command.deleteNode!.path,
                    command.deleteNode!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            case 'queryEdges':
                result=await this.queryEdgesAsync(command.queryEdges!.query);
                break;

            case 'getEdgeById':
                result=await this.getEdgeByIdAsync(
                    command.getEdgeById!.id,
                    command.getEdgeById!.permissionFrom,
                );
                break;

            case 'insertEdge':
                result=await this.insertEdgeAsync(
                    command.insertEdge!.edge,
                    command.insertEdge!.options,
                );
                break;

            case 'updateEdge':{
                const r=await this.updateEdgeAsync(
                    command.updateEdge!.update,
                    command.updateEdge!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            case 'deleteEdge':{
                const r=await this.deleteEdgeAsync(
                    command.deleteEdge!.id,
                    command.deleteEdge!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            case 'queryEmbeddings':
                result=await this.queryEmbeddingsAsync(command.queryEmbeddings!.query);
                break;

            case 'getEmbeddingById':
                result=await this.getEmbeddingByIdAsync(
                    command.getEmbeddingById!.id,
                    command.getEmbeddingById!.permissionFrom,
                );
                break;

            case 'insertEmbedding':
                result=await this.insertEmbeddingAsync(
                    command.insertEmbedding!.embedding,
                    command.insertEmbedding!.options,
                );
                break;

            case 'updateEmbedding':{
                const r=await this.updateEmbeddingAsync(
                    command.updateEmbedding!.update,
                    command.updateEmbedding!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            case 'deleteEmbedding':{
                const r=await this.deleteEmbeddingAsync(
                    command.deleteEmbedding!.id,
                    command.deleteEmbedding!.options,
                );
                if(r.success){
                    result={success:true,result:true};
                }else{
                    result=r;
                }
                break;
            }

            default:
                return {
                    success:false,
                    error:`Unknown command action - ${action as string}`,
                    statusCode:400,
                };
        }

        return (result.success?
            {
                success:true,
                result:{[action]:result.result},
            }
        :
            result
        );
    }

    public async executeCommandsAsync(commands:ConvoDbCommand<any>[]):PromiseResultType<ConvoDbCommandResult<any>[]>
    {
        const results:ConvoDbCommandResult<any>[]=[];
        for(let i=0;i<commands.length;i++){
            const cmd=commands[i];
            if(!cmd){
                continue;
            }
            const r=await this.executeCommandAsync(cmd);
            if(!r.success){
                return {
                    metadata:{successfulResults:results},
                    success:false,
                    error:`Command error at index: ${i}, error: ${r.error}`,
                    statusCode:r.statusCode,
                }
            }
            results.push(r.result);
        }

        return {success:true,result:results};
    }
}

/**
 * Returns the next traversal stage in the fixed query evaluation order.
 *
 * The stage order is defined by `allConvoStepStages`. If `stage` is the final stage,
 * `undefined` is returned.
 *
 * @param stage Current traversal stage.
 */
const getNextStepStage=(stage:ConvoStepStage):ConvoStepStage|undefined=>{
    const i=allConvoStepStages.indexOf(stage);
    return (allConvoStepStages as any)[i+1];
}

/**
 * Converts a node key selection into a concrete key list or `"*"`.
 *
 * Selection rules:
 * - `null`, `undefined`, or `"*"` become `"*"`
 * - arrays containing `"*"`, `null`, or `undefined` become `"*"`
 * - otherwise the selected keys are returned as an array
 *
 * @param sourceKeys Requested node key selection.
 */
const convoNodeKeySelectionToKeys=(sourceKeys:ConvoNodeKeySelection):(keyof ConvoNode)[]|'*'=>{

    if(!Array.isArray(sourceKeys)){
        return sourceKeys==='*' || sourceKeys===null || sourceKeys===undefined?'*':[sourceKeys];
    }
    const keys:(keyof ConvoNode)[]=[];
    for(const k of sourceKeys){
        if(k==='*' || k===null || k===undefined){
            return '*';
        }
        keys.push(k);
    }

    return keys;
}

/**
 * Parses a serialized query traversal token into traversal state.
 *
 * If `token` is empty, a new initial traversal state is returned.
 * Parsed state is validated against the schema and all stored paths are normalized in place.
 *
 * @param token Token previously returned by `queryNodesAsync`.
 */
const parseToken=(token:string|null|undefined):ResultType<QueryTraversalState>=>{
    if(!token){
        return {
            success:true,
            result:{
                step:0,
                initState:true,
                stepStage:allConvoStepStages[0],
                returnedCount:0,
                scanCount:0,
                paths:[],
            }
        }
    }
    try{
        const parsed=QueryTraversalStateSchema.safeParse(JSON.parse(token));
        if(parsed.error){
            return {
                success:false,
                error:parsed.error.message,
                statusCode:400,
            }
        }

        const state=parsed.data;
        const badPath=normalizationPaths(state.paths);
        if(badPath){
            return {
                success:false,
                error:`Invalid path - ${badPath}`,
                statusCode:400,
            }

        }

        return {
            success:true,
            result:state,
        }

    }catch(ex){
        return {
            success:false,
            error:`Invalid token format - ${getErrorMessage(ex)}`,
            statusCode:400,
        }
    }
};

/**
 * Normalizes the provided paths array in place.
 *
 * @param paths Paths to normalize.
 * @returns The first invalid original path if one is found; otherwise `undefined`.
 */
const normalizationPaths=(paths:string[]):string|undefined=>{
    for(let i=0;i<paths.length;i++){
        const n=normalizeConvoNodePath(paths[i],'none');
        if(!n){
            return paths[i]??'(empty)';
        }
        paths[i]=n;
    }
    return undefined;
}

/**
 * Converts a failed result into a `ConvoNodeStreamItem` error and optionally persists the
 * error information onto the traversal state so pagination can resume with the same failure.
 *
 * If a success result is mistakenly passed in, a generic internal error item is returned.
 *
 * @param result Result to convert.
 * @param state Optional traversal state to update with error details.
 */
const errorResultToConvoNodeStreamItem=<T extends keyof ConvoNode>(result:ResultType<any>,state:QueryTraversalState|undefined):ConvoNodeStreamItem<T>=>{
    const r=(result.success?
        {
            type:'error',
            error:'Success passed as error',
            statusCode:500,
        } as const
    :
        {
            type:'error',
            error:result.error,
            statusCode:result.statusCode,
        } as const
    );

    if(state){
        state.error=r.error;
        state.errorCode=r.statusCode;
    }

    return r;
}

interface WatcherUpdate
{
    type:ConvoNodeStreamItemType;
    error?:ResultTypeError;
    path?:string;
}

interface Watcher
{
    condition:ConvoNodeWatchCondition;
    next?:(items:WatcherUpdate[]|'ping')=>void;
    /**
     * Stores stream items until next can be called.
     */
    queue?:WatcherUpdate[];
    dispose:DisposeCallback;

    itemMap:Record<string,Partial<ConvoNodeStreamItem<any>>>;

    loopCount:number;
    lastSend:number;
}