import { CancelToken, getErrorMessage, getValueByPath } from "@iyio/common";
import z from "zod";
import { Conversation, ConversationOptions } from "../Conversation.js";
import { ConvoEmbeddingsGenerationRequest, ConvoEmbeddingsGenerationResult, ConvoEmbeddingsService } from "../convo-types.js";
import { getDefaultMockConvoEmbeddingsService } from "../MockConvoEmbeddingsService.js";
import { PromiseResultType, PromiseResultTypeVoid, ResultType, StatusCode } from "../result-type.js";
import { defaultConvoNodeQueryLimit, maxConvoNodeQueryLimit } from "./convo-node-const.js";
import { normalizeConvoNodePath, validateConvoNodeQuery } from "./convo-node-lib.js";
import { allConvoStepStages, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeKeySelection, ConvoNodeOrderBy, ConvoNodePermissionType, ConvoNodeQuery, ConvoNodeQueryResult, ConvoNodeQueryStep, ConvoNodeStore, ConvoNodeStreamItem, ConvoNodeUpdate, ConvoStepStage, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from "./convo-node-types.js";



const QueryTraversalStateSchema=z.object({

    /**
     * Current step number
     */
    step:z.number(),

    stepStage:z.enum(allConvoStepStages),

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

export interface BaseConvoNodeStoreOptions
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
}



export abstract class BaseConvoNodeStore implements ConvoNodeStore{

    protected embeddingsService?:ConvoEmbeddingsService;
    protected embeddingOptions?:Partial<Omit<ConvoEmbeddingsGenerationRequest,'text'>>;
    protected convoOptions?:ConversationOptions;

    public constructor({
        embeddingsService,
        embeddingOptions,
        convoOptions,
    }:BaseConvoNodeStoreOptions={}){
        this.embeddingsService=embeddingsService;
        this.embeddingOptions=embeddingOptions;
        this.convoOptions=convoOptions;
    }

    /**
     * Returns edges whose `from` path is contained in `fromPathsIn` and whose `to` path is contained
     * in `toPathsIn`.
     *
     * This is primarily used by the base implementation to evaluate permissions by loading grant
     * edges between known path sets.
     *
     * Implementation requirements:
     * - if `keys` is `"*"`, all edge properties should be returned
     * - otherwise only the requested properties should be returned when practical
     * - matching is by exact equality on `from` and `to`
     * - if `hasGrant` is true, only edges with a defined non-`none` grant should be returned
     * - returned paths should be normalized
     *
     * @param keys The edge properties to return, similar to a SQL select column list.
     * @param fromPathsIn Allowed `edge.from` values.
     * @param toPathsIn Allowed `edge.to` values.
     * @param hasGrant If true, require `grant` to be defined and not `ConvoNodePermissionType.none`.
     */
    protected abstract _selectEdgesByPathsAsync(keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>;

    /**
     * Returns nodes whose `path` is contained in `paths`.
     *
     * This is used during the flush phase of query traversal after the base class has already
     * determined the final ordered path list to load.
     *
     * Implementation requirements:
     * - if `keys` is `"*"`, all node properties should be returned
     * - otherwise only the requested properties should be returned when practical
     * - only nodes whose path is in `paths` should be returned
     * - returned node paths should be normalized
     * - results should respect the supplied `orderBy`
     *
     * @param keys The node properties to return, similar to a SQL select column list.
     * @param paths Exact node paths to load.
     * @param orderBy Ordering to apply to returned nodes.
     */
    protected abstract _selectNodesByPathsAsync(keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>;
    
    /**
     * Selects node paths matching a query step path filter.
     *
     * This method is called during traversal stage 1 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, search across the full node store
     * - otherwise only return matches whose path is within `currentNodePaths`
     * - support exact paths and valid wildcard paths as defined by `ConvoNodeQueryStep.path`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The path portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     */
    protected abstract _selectNodePathsForPathAsync(step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    /**
     * Selects node paths matching a query step property or grouped condition filter.
     *
     * This method is called during traversal stage 2 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, evaluate against the full node store
     * - otherwise only evaluate nodes whose path is within `currentNodePaths`
     * - condition semantics should match the documented `ConvoNodeCondition` rules
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The condition portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     */
    protected abstract _selectNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    /**
     * Selects node paths that satisfy a permission check for the current query step.
     *
     * This method is called during traversal stage 3 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, evaluate permissions across the full node store
     * - otherwise only evaluate nodes whose path is within `currentNodePaths`
     * - determine whether `step.permissionFrom` has `step.permissionRequired` for each candidate node
     * - permission semantics should match `checkNodePermissionAsync`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The permission portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     */
    protected abstract _selectNodePathsForPermissionAsync(step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    /**
     * Selects node paths matching an embedding search filter for the current query step.
     *
     * This method is called during traversal stage 4 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, search across the full node store
     * - otherwise only return matches whose path is within `currentNodePaths`
     * - embedding search semantics should match the supplied `ConvoEmbeddingSearch`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The embedding portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     */
    protected abstract _selectNodePathsForEmbeddingAsync(step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    /**
     * Selects destination node paths by traversing edges from the current query step.
     *
     * This method is called during traversal stage 5 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, traversal starts from the full node set
     * - otherwise only traverse from the supplied current nodes
     * - edge filtering semantics should match `ConvoNodeQueryStep.edge`
     * - traversal direction should match `edgeDirection`
     * - destination node paths should be deduplicated
     * - if `edgeLimit` is defined it limits destination nodes after deduplication
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The edge traversal portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply to destination nodes.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     */
    protected abstract _selectEdgeNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    /**
     * Inserts a node into the backing store.
     *
     * The base class validates normalization and permissions before calling this method.
     * Implementations should enforce any remaining datastore-specific constraints.
     *
     * @param node Node to insert.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _insertNodeAsync(node:ConvoNode,options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>;

    /**
     * Updates an existing node in the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should apply documented update semantics and enforce immutable fields.
     *
     * @param node Node update payload.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _updateNodeAsync(node:ConvoNodeUpdate,options:Omit<UpdateConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Deletes a node from the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should also delete all connected edges and embeddings pointing to the node.
     *
     * @param path Normalized path of the node to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _deleteNodeAsync(path:string,options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Inserts an edge into the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should generate the edge id and enforce immutable field rules for future updates.
     *
     * @param edge Edge to insert without an id.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _insertEdgeAsync(edge:Omit<ConvoNodeEdge,"id">,options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>;

    /**
     * Updates an existing edge in the backing store.
     *
     * The base class loads the current edge and validates permissions before calling this method.
     * Implementations should apply documented update semantics and enforce immutable fields.
     *
     * @param update Edge update payload.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _updateEdgeAsync(update:ConvoNodeEdgeUpdate,options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Deletes an edge from the backing store.
     *
     * The base class loads the current edge and validates permissions before calling this method.
     *
     * @param id Id of the edge to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _deleteEdgeAsync(id:string,options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Inserts an embedding into the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should generate the embedding id and handle vector generation behavior as needed.
     *
     * @param embedding Embedding to insert without an id.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,"id">,options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Deletes an embedding from the backing store.
     *
     * The base class loads the current embedding and validates permissions before calling this method.
     *
     * @param id Id of the embedding to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _deleteEmbeddingAsync(id:string,options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Updates an existing embedding in the backing store.
     *
     * The base class loads the current embedding and validates permissions before calling this method.
     * Implementations should apply documented update semantics and enforce immutable fields.
     *
     * @param update Embedding update payload.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    protected abstract _updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options:Omit<UpdateConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;
    
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
        }
    }

    protected getBatchSize(query:ConvoNodeQuery<any>):number{
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
        const keys=convoNodeKeySelectionToKeys(query.keys);
        if(keys!=='*' && !keys.includes('path')){
            keys.push('path');
        }
        
        if(state.returnedCount>=limit){
            return;
        }

        const iterateStageAsync=async (getPaths:(offset:number)=>PromiseResultType<string[]>):PromiseResultType<string[]>=>{
            let offset=0;
            const paths:string[]=[];
            while(!cancel.isCanceled){
                const r=await getPaths(offset);
                if(!r.success){
                    return r;
                }
                for(const p of r.result){
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
                offset+=r.result.length;
                if(r.result.length<batchSize){
                    break;
                }
            }

            return {
                success:true,
                result:paths,
            }
        }

        while(!cancel.isCanceled){

            if(state.flushIndex!==undefined){
                while(state.flushIndex<state.paths.length){
                    const loadPaths=state.paths.slice(state.flushIndex,state.flushIndex+batchSize);
                    if(!loadPaths.length){
                        break;
                    }
                    const r=await this._selectNodesByPathsAsync(keys,loadPaths,orderBy);
                    if(cancel.isCanceled){return;}
                    
                    if(!r.success){
                        yield errorResultToConvoNodeStreamItem(r,state);
                        return;
                    }
                    if(!r.result.length){
                        break;
                    }
                    const nodes=r.result;
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
                            yield {type:'node',node:node as any};
                            if(state.returnedCount>=limit){
                                return;
                            }
                        }
                        if(cancel.isCanceled){return;}
                    }
                }
                state.flushIndex=undefined;
            }

            const step=query.steps[state.step];
            if(!step){
                break;
            }
            const paths=state.step===0?null:state.paths;

            switch(state.stepStage){

                case 'path':
                    if(step.path){
                        const p=step.path;
                        const r=await iterateStageAsync((offset)=>this._selectNodePathsForPathAsync({
                            path:p
                        },paths,orderBy,batchSize,offset));
                        if(cancel.isCanceled){return;}

                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        state.paths=r.result;
                    }
                    break;

                case 'condition':
                    if(step.condition){
                        const c=step.condition;
                        const r=await iterateStageAsync((offset)=>this._selectNodePathsForConditionAsync({
                            condition:c,
                        },paths,orderBy,batchSize,offset));
                        if(cancel.isCanceled){return;}

                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        state.paths=r.result;
                    }
                    break;

                case 'permissions':
                    if(step.permissionFrom){
                        const f=step.permissionFrom;
                        const r=await iterateStageAsync((offset)=>this._selectNodePathsForPermissionAsync({
                            permissionFrom:f,
                            permissionRequired:step.permissionRequired??ConvoNodePermissionType.all,
                        },paths,orderBy,batchSize,offset));
                        if(cancel.isCanceled){return;}
                        
                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        state.paths=r.result;
                    }
                    break;

                case 'embedding':
                    if(step.embedding){
                        const e=step.embedding;
                        const r=await iterateStageAsync((offset)=>this._selectNodePathsForEmbeddingAsync({
                            embedding:e
                        },paths,orderBy,batchSize,offset));
                        if(cancel.isCanceled){return;}
                        
                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        state.paths=r.result;
                    }
                    break;

                case 'edge':
                    if(step.edge){
                        const e=step.edge;
                        const r=await iterateStageAsync((offset)=>this._selectEdgeNodePathsForConditionAsync({
                            edge:e,
                            edgeDirection:step.edgeDirection??'bi',
                            edgeLimit:step.edgeLimit,
                        },paths,orderBy,batchSize,offset));
                        if(cancel.isCanceled){return;}
                        
                        if(!r.success){
                            yield errorResultToConvoNodeStreamItem(r,state);
                            return;
                        }
                        state.paths=r.result;
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

            const nextStage=getNextStepStage(state.stepStage);
            if(nextStage===undefined){
                state.step++;
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
    }

    public getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>>{
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

        const r=await this._selectEdgesByPathsAsync(['from','to','grant'],[from],to,true);
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

    public async insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>{
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
        return await this._insertNodeAsync(node,options);
    }


    public async updateNodeAsync(node:ConvoNodeUpdate,options?:UpdateConvoNodeOptions):PromiseResultTypeVoid{
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
        return await this._updateNodeAsync(node,options);
    }


    public async deleteNodeAsync(path:string,options?:DeleteConvoNodeOptions):PromiseResultTypeVoid{
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
        return this._deleteNodeAsync(path,options);
    }




    public abstract queryEdgesAsync(query: ConvoNodeEdgeQuery): PromiseResultType<ConvoNodeEdgeQueryResult>;

    public async getEdgeByIdAsync(id: string, permissionFrom?: string): PromiseResultType<ConvoNodeEdge>{
        if(permissionFrom!==undefined && permissionFrom!==normalizeConvoNodePath(permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${permissionFrom}`,
                statusCode:400,
            }
        }
        const r=await this.queryEdgesAsync({id,permissionFrom,limit:1});
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
        return this._insertEdgeAsync(edge,options);
    }

    public async updateEdgeAsync(update: ConvoNodeEdgeUpdate, options?: UpdateConvoNodeEdgeOptions): PromiseResultTypeVoid{
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
        return await this._updateEdgeAsync(update,options);
    }

    public async deleteEdgeAsync(id: string, options?: DeleteConvoNodeEdgeOptions): PromiseResultTypeVoid{
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
        return await this._deleteEdgeAsync(id,options);
    }

    public abstract queryEmbeddingsAsync(query: ConvoNodeEmbeddingQuery): PromiseResultType<ConvoNodeEmbeddingQueryResult>;

    public async getEmbeddingByIdAsync(id: string, permissionFrom?: string): PromiseResultType<ConvoNodeEmbedding>{
        if(permissionFrom!==undefined && permissionFrom!==normalizeConvoNodePath(permissionFrom,'none')){
            return {
                success:false,
                error:`Invalid node path. Permission paths should be normalized - ${permissionFrom}`,
                statusCode:400,
            }
        }
        const r=await this.queryEmbeddingsAsync({id,permissionFrom,limit:1});
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

    public async insertEmbeddingAsync(embedding: Omit<ConvoNodeEmbedding, "id">, options?: InsertConvoNodeEmbeddingOptions): PromiseResultType<ConvoNodeEmbedding>{
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
        return await this._insertEmbeddingAsync(embedding,options);
    }

    public async updateEmbeddingAsync(update: ConvoNodeEmbeddingUpdate, options?: UpdateConvoNodeEmbeddingOptions): PromiseResultTypeVoid{
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
        return await this._updateEmbeddingAsync(update,options);
    }

    public async deleteEmbeddingAsync(id: string, options?: DeleteConvoNodeEmbeddingOptions): PromiseResultTypeVoid{
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
        return await this._deleteEmbeddingAsync(id,options);
    }

    protected async selectNodeByPathAsync(path:string,keys:(keyof ConvoNode)[]|'*'):PromiseResultType<Partial<ConvoNode>|undefined>
    {
        const r=await this._selectNodesByPathsAsync(keys,[path],[{prop:'path'}]);
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

    protected async generateEmbeddingsAsync(request:ConvoEmbeddingsGenerationRequest):PromiseResultType<ConvoEmbeddingsGenerationResult>
    {
        const service=this.embeddingsService??getDefaultMockConvoEmbeddingsService();
        return await service.generateEmbeddingsAsync(request);
    }

    /**
     * Creates a Convo-Lang conversation that can be used for natural language processing.
     */
    protected createConversation(){
        return new Conversation(this.convoOptions);
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
}

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