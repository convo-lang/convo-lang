import { CancelToken, getErrorMessage } from "@iyio/common";
import z from "zod";
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

    error:z.string().optional(),

    errorCode:z.number().optional(),
});

type QueryTraversalState=z.infer<typeof QueryTraversalStateSchema>;



export abstract class BaseConvoNodeStore implements ConvoNodeStore{

    /**
     * Returns edges where their `fromPath` is in `fromPathsIn` and `toPath` is in `toPathsIn`.
     * @param keys The properties / keys of the edges to be returned. Similar to select columns in SQL.
     * @param fromPathsIn Array of paths that selected nodes fromPath should be in.
     * @param toPathsIn Array of paths that selected nodes toPath should be in.
     * @param hasGrant If true the edge should have grant value defined and not be `none`.
     */
    protected abstract _selectEdgesByPathsAsync(keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>;

    /**
     * Returns nodes by path
     * @param keys The properties / keys of the nodes to be returned. Similar to select columns in SQL.
     * @param paths Array of paths the selected nodes path should be in.
     */
    protected abstract _selectNodesByPathsAsync(keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>;
    
    protected abstract _selectNodePathsForPathAsync(step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;
    protected abstract _selectNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;
    protected abstract _selectNodePathsForPermissionAsync(step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;
    protected abstract _selectNodePathsForEmbeddingAsync(step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;
    protected abstract _selectEdgeNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<string[]>;

    protected abstract _insertNodeAsync(node:ConvoNode,options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>;
    protected abstract _updateNodeAsync(node:ConvoNodeUpdate,options:Omit<UpdateConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;
    protected abstract _deleteNodeAsync(path:string,options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    protected abstract _insertEdgeAsync(edge:Omit<ConvoNodeEdge,"id">,options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>;
    protected abstract _updateEdgeAsync(update:ConvoNodeEdgeUpdate,options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;
    protected abstract _deleteEdgeAsync(id:string,options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    protected abstract _insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,"id">,options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>;
    protected abstract _deleteEmbeddingAsync(id:string,options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;
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

        const nodes:any[]=[];

        const limitedQuery:ConvoNodeQuery<TKeys>={
            ...query,
            limit:Math.min(query.limit??defaultConvoNodeQueryLimit,maxConvoNodeQueryLimit),
        };

        for await(const item of this._streamNodesAsync<TKeys>(limitedQuery,stateResult)){
            switch(item.type){

                case 'node':
                    nodes.push(item.node);
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

        const state=stateResult.result;
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

        const ob=query.orderBy??{prop:'path',direction:'asc'};
        const orderBy=Array.isArray(ob)?ob:[ob];
        const batchSize=Math.max(1,query.readBatchSize??this.getBatchSize(query));
        const limit=query.limit===undefined?Number.MAX_SAFE_INTEGER:Math.max(0,query.limit);
        let skip=query.skip??0;
        const keys=convoNodeKeySelectionToKeys(query.keys);
        
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
                        if(skip>0){
                            skip--;
                        }else{
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
                const scan=(step.edge || !query.steps[state.step])?true:false;
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
}

const getNextStepStage=(stage:ConvoStepStage):ConvoStepStage|undefined=>{
    const i=allConvoStepStages.indexOf(stage);
    return (allConvoStepStages as any)[i+1];
}

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
 * Normalizes the paths in place and returns the first invalid path if one is found
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