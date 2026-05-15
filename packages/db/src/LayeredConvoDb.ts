import { ConvoDb, ConvoDbDriver, ConvoDbDriverNextToken, ConvoDbDriverPathsResult, convoDbService, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodeQueryStep, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, normalizeConvoNodePath, PromiseResultType, PromiseResultTypeVoid, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from "@convo-lang/convo-lang";
import { BaseConvoDb, BaseConvoDbOptions } from "./BaseConvoDb.js";
import { doesJsonQueryPathMatchStepPath, getJsonQueryPathLiteralPrefix, hasJsonQueryPathWildcard } from "./json-query.js";



const hasSupport=(layer:Required<ConvoDbLayerSupport>,support:ConvoDbLayerSupport)=>{
    return (
        (support.supportsNodes?layer.supportsNodes===true:true) &&
        (support.supportsEdges?layer.supportsEdges===true:true) &&
        (support.supportsEmbeddings?layer.supportsEmbeddings===true:true) &&
        (support.supportsBlobs?layer.supportsBlobs===true:true)
    )
}

const isPathInMountPoint=(path:string,mountPoint:string):boolean=>{
    if(mountPoint==='/'){
        return path.startsWith('/');
    }

    const root=mountPoint.endsWith('/')?mountPoint.substring(0,mountPoint.length-1):mountPoint;
    return path===root || path.startsWith(mountPoint);
}

interface PathsToken
{
    layerIndex:number;
    offset:number;
}

export interface ConvoDbLayerSupport
{
    /**
     * If true the layer can be used for node operations.
     * @default true
     */
    supportsNodes?:boolean;

    /**
     * If true the layer can be used for edge operations.
     * @default true
     */
    supportsEdges?:boolean;

    /**
     * If true the layer can be used for embedding operations.
     * @default true
     */
    supportsEmbeddings?:boolean;

    /**
     * If true the layer can be used for blob operations.
     * @default true
     */
    supportsBlobs?:boolean;
}

export interface ConvoDbLayerConfig extends ConvoDbLayerSupport
{
    /**
     * The path where the db will be mounted
     */
    mountPoint:string;

    /**
     * A tag to pass to the convoDbService function to return a ConvoDb by tag. A ConvoDb with a
     * matching tag can be registered to scope initialization.
     */
    serviceTag?:string;
    
    /**
     * Returns a new instance of a ConvoDb to mount at the given point. `createDb` will be called
     * the first time a resource is accessed in the layer's mount point.
     */
    createDb?:()=>ConvoDb;

    /**
     * Pre-created ConvoDb instance
     */
    db?:ConvoDb;

    
}

type Layer=ConvoDbLayerConfig&Required<ConvoDbLayerSupport>&{
    db?:ConvoDb;
    ownsDb?:boolean;
}

type LayerInst=ConvoDbLayerConfig&Required<ConvoDbLayerSupport>&{
    db:ConvoDb;
    ownsDb?:boolean;
}

export interface LayeredConvoDbOptions extends BaseConvoDbOptions
{
    layers:ConvoDbLayerConfig[];
    dbId?:string;
}

/**
 * A ConvoDb implementation that allows you to layer multiple databases on top of each other 
 * with a shared name space. 
 */
export class LayeredConvoDb extends BaseConvoDb
{

    private readonly layers:Layer[]=[];

    private readonly initializedDbs=new WeakSet<ConvoDb>();

    public readonly dbId:string|undefined;

    public constructor({
        layers,
        dbId,
        ...options
    }:LayeredConvoDbOptions){
        super(options);

        this.dbId=dbId;

        this.layers=layers.map<Layer>(l=>{
            const layer:Layer={
                supportsNodes:true,
                supportsEdges:true,
                supportsEmbeddings:true,
                supportsBlobs:true,
                ...l,
            };
            const p=normalizeConvoNodePath(layer.mountPoint,'none');
            if(!p){
                throw new Error(`Invalid ConvoDb layer mountPoint path - ${layer.mountPoint}`);
            }
            layer.mountPoint=p;
            if(!layer.mountPoint.endsWith('/')){
                layer.mountPoint+='/';
            }
            return layer;
        });
    }

    protected override _dispose(): void {
        const disposed=new Set<ConvoDb>();
        for(const layer of this.layers){
            if(!layer.ownsDb || !layer.db || disposed.has(layer.db)){
                continue;
            }
            disposed.add(layer.db);
            layer.db.dispose();
        }
    }

    private scopePathToMountPoint(path:string,mountPoint:string):string{
        if(!hasJsonQueryPathWildcard(path)){
            return path;
        }

        const mountRoot=getMountPointRoot(mountPoint);
        const prefix=getJsonQueryPathLiteralPrefix(path);

        if(path.endsWith('/**') && mountPoint.startsWith(prefix)){
            return mountRoot==='/'?'/**':`${mountRoot}/**`;
        }

        if(doesJsonQueryPathMatchStepPath(mountRoot,path)){
            return mountRoot;
        }

        return path;
    }

    private filterCurrentPaths(currentPaths:string[]|null,mountPoint:string):string[]|null{
        if(!currentPaths){
            return null;
        }
        if(!mountPoint.endsWith('/')){
            mountPoint+='/';
        }
        return currentPaths.filter(p=>isPathInMountPoint(p,mountPoint));
    }

    private filterPathsToMountPoint(paths:string[],mountPoint:string):string[]{
        return paths.filter(p=>isPathInMountPoint(p,mountPoint));
    }

    private filterEdgesToMountPoint(edges:ConvoNodeEdge[],mountPoint:string):ConvoNodeEdge[]{
        return edges.filter(e=>isPathInMountPoint(e.from,mountPoint));
    }

    private filterEmbeddingsToMountPoint(embeddings:ConvoNodeEmbedding[],mountPoint:string):ConvoNodeEmbedding[]{
        return embeddings.filter(e=>isPathInMountPoint(e.path,mountPoint));
    }

    private getPathGroups(support:ConvoDbLayerSupport,paths:string[]):ScopedPathGroup[]{
        const groups:ScopedPathGroup[]=[];
        for(const path of paths){
            const layers=this.getLayersByPath(support,path);
            for(const layer of layers){
                const match=groups.find(g=>g.layer===layer);
                const p=this.scopePathToMountPoint(path,layer.mountPoint);
                if(match){
                    if(!match.paths.includes(p)){
                        match.paths.push(p);
                    }
                }else{
                    groups.push({db:layer.db,layer:layer,paths:[p]});
                }
            }
        }
        return groups;
    }

    private getDbForLayer(layer:Layer):ConvoDb|undefined{
        if(layer.db){
            return layer.db;
        }

        if(layer.serviceTag){
            const db=convoDbService.get(layer.serviceTag);
            if(db){
                layer.db=db;
                return db;
            }
        }

        if(layer.createDb){
            const db=layer.createDb();
            layer.db=db;
            layer.ownsDb=true;
            return db;
        }

        return undefined;
    }

    private async initLayerAsync(layer:LayerInst):PromiseResultTypeVoid{
        if(this.initializedDbs.has(layer.db)){
            return {
                success:true,
            }
        }

        const r=await layer.db.initAsync();
        if(!r.success){
            return r;
        }

        this.initializedDbs.add(layer.db);

        return {
            success:true,
        }
    }

    public getLayerByPath(support:ConvoDbLayerSupport,path:string,limit?:number):LayerInst|undefined{
        return this.getLayersByPath(support,path,1)[0];
    }

    public getLayersByPath(support:ConvoDbLayerSupport,path:string,limit?:number):LayerInst[]{

        const layers:LayerInst[]=[];

        const p=normalizeConvoNodePath(path,'any');
        if(!p){
            return [];
        }
        path=p;

        const wildcard=hasJsonQueryPathWildcard(path);
        const lookupPath=wildcard?getJsonQueryPathLiteralPrefix(path):ensureTrailingSlash(path);

        for(let i=0;i<this.layers.length && (wildcard || !layers.length) && (limit===undefined?true:layers.length<limit);i++){
            const layer=this.layers[i];
            if( !layer ||
                !hasSupport(layer,support) ||
                !(wildcard?
                    lookupPath.startsWith(layer.mountPoint) || layer.mountPoint.startsWith(lookupPath)
                :
                    lookupPath.startsWith(layer.mountPoint)
                )
            ){
                continue;
            }

            const db=this.getDbForLayer(layer);
            if(db){
                layers.push(layer as LayerInst);
            }
        }

        return layers;
    }

    async selectForStepAsync(
        groupPaths:string[],
        step: ConvoNodeQueryStep,
        currentNodePaths: string[] | null,
        orderBy: ConvoNodeOrderBy[],
        limit: number,
        offset: number,
        nextToken: string | undefined,
        select:(
            state:SelectToken,
            group:ScopedPathGroup,
            path:string,
            step: ConvoNodeQueryStep,
            currentNodePaths: string[] | null,
            orderBy: ConvoNodeOrderBy[],
            limit: number,
            offset: number,
            nextToken: string | undefined,
        )=>PromiseResultType<ConvoDbDriverPathsResult>
    ): PromiseResultType<ConvoDbDriverPathsResult>{
        const groups=this.getPathGroups({supportsNodes:true},groupPaths);
        const state=getSelectToken(nextToken);
        if(offset<state.o){
            return {
                success:true,
                result:{paths:[]}
            }
        }
        for(;state.i<groups.length;state.i++){
            const group=groups[state.i]!;
            const initR=await this.initLayerAsync(group.layer);
            if(!initR.success){
                return initR;
            }
            const scopedCurrentPaths=this.filterCurrentPaths(currentNodePaths,group.layer.mountPoint);
            if(scopedCurrentPaths && !scopedCurrentPaths.length){
                continue;
            }
            for(;state.g<group.paths.length;state.g++){
                const path=group.paths[state.g]!;
                const r=await select(
                    state,group,path,step,
                    scopedCurrentPaths,
                    orderBy,limit,getSelectLayerOffset(offset,state),state.t
                );
                if(!r.success){
                    return r;
                }
                state.t=r.result.nextToken;
                state.l+=r.result.paths.length;
                const paths=this.filterPathsToMountPoint(r.result.paths,group.layer.mountPoint);
                if(paths.length){
                    return {
                        success:true,
                        result:{
                            paths,
                            nextToken:JSON.stringify(state)
                        }
                    }
                }
                state.o+=state.l;
                state.l=0;
                state.t=undefined;
            }
            state.g=0;

        }
        return {
            success:true,
            result:{
                paths:[],
            },
        }
    }

    override readonly _driver:ConvoDbDriver={

        openBlobAsync:async (path:string):PromiseResultType<ReadableStream>=>
        {
            const layer=this.getLayerByPath({supportsBlobs:true},path);
            if(!layer){
                return {
                    success:false,
                    error:'Layer not found by path',
                    statusCode:404,
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.openBlobAsync(path);
        },

        writeBlobAsync:async (path:string,blob:string|Blob|ReadableStream|null):PromiseResultTypeVoid=>
        {
            const layer=this.getLayerByPath({supportsBlobs:true},path);
            if(!layer){
                return {
                    success:false,
                    error:'Layer not found by path',
                    statusCode:404,
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.writeBlobAsync(path,blob);

        },

        hasBlobAsync:async (path:string):PromiseResultType<boolean>=>
        {
            const layer=this.getLayerByPath({supportsBlobs:true},path);
            if(!layer){
                return {
                    success:false,
                    error:'Layer not found by path',
                    statusCode:404,
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.hasBlobAsync(path);
        },


        selectEdgesByPathsAsync:async (keys: (keyof ConvoNodeEdge)[] | "*", fromPathsIn: string[], toPathsIn: string[], hasGrant: boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>=>{
            const groups=this.getPathGroups({supportsEdges:true},fromPathsIn);
            const edges:Partial<ConvoNodeEdge>[]=[];
            for(const group of groups){
                const initR=await this.initLayerAsync(group.layer);
                if(!initR.success){
                    return initR;
                }
                const r=await group.db._driver.selectEdgesByPathsAsync(keys,group.paths,toPathsIn,hasGrant);
                if(!r.success){
                    return r;
                }
                edges.push(...r.result);
            }

            return {
                success:true,
                result:edges,
            }
        },
        selectNodesByPathsAsync:async (keys: (keyof ConvoNode)[] | "*", paths: string[], orderBy: ConvoNodeOrderBy[]): PromiseResultType<Partial<ConvoNode>[]> =>{
            const groups=this.getPathGroups({supportsNodes:true},paths);
            const nodes:Partial<ConvoNode>[]=[];
            for(const group of groups){
                const initR=await this.initLayerAsync(group.layer);
                if(!initR.success){
                    return initR;
                }
                const r=await group.db._driver.selectNodesByPathsAsync(keys,group.paths,orderBy);
                if(!r.success){
                    return r;
                }
                nodes.push(...r.result);
            }

            return {
                success:true,
                result:nodes,
            }
        },
        selectNodePathsForPathAsync:async (step: Required<Pick<ConvoNodeQueryStep, "path">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            return await this.selectForStepAsync(
                [step.path],step,currentNodePaths,orderBy,limit,offset,nextToken,
                (state,group,path,step,currentNodePaths,orderBy,limit,offset,nextToken)=>{
                    return group.db._driver.selectNodePathsForPathAsync(
                        {path},currentNodePaths,orderBy,limit,offset,nextToken
                    )
                }
            );
        },
        selectNodePathsForConditionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "condition">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            return await this.selectForStepAsync(
                currentNodePaths??['/**'],step,currentNodePaths,orderBy,limit,offset,nextToken,
                (state,group,path,step,currentNodePaths,orderBy,limit,offset,nextToken)=>{
                    return group.db._driver.selectNodePathsForConditionAsync(
                        step as any,currentNodePaths,orderBy,limit,offset,nextToken
                    )
                }
            );
        },
        selectNodePathsForPermissionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "permissionFrom" | "permissionRequired">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            return await this.selectForStepAsync(
                currentNodePaths??['/**'],step,currentNodePaths,orderBy,limit,offset,nextToken,
                (state,group,path,step,currentNodePaths,orderBy,limit,offset,nextToken)=>{
                    return group.db._driver.selectNodePathsForPermissionAsync(
                        step as any,currentNodePaths,orderBy,limit,offset,nextToken
                    )
                }
            );
        },
        selectNodePathsForEmbeddingAsync:async (step: Required<Pick<ConvoNodeQueryStep, "embedding">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            return await this.selectForStepAsync(
                currentNodePaths??['/**'],step,currentNodePaths,orderBy,limit,offset,nextToken,
                (state,group,path,step,currentNodePaths,orderBy,limit,offset,nextToken)=>{
                    return group.db._driver.selectNodePathsForEmbeddingAsync(
                        step as any,currentNodePaths,orderBy,limit,offset,nextToken
                    )
                }
            );
        },
        selectEdgeNodePathsForConditionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "edge" | "edgeDirection">> & Pick<ConvoNodeQueryStep, "edgeLimit">, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            return await this.selectForStepAsync(
                currentNodePaths??['/**'],step,currentNodePaths,orderBy,limit,offset,nextToken,
                (state,group,path,step,currentNodePaths,orderBy,limit,offset,nextToken)=>{
                    return group.db._driver.selectEdgeNodePathsForConditionAsync(
                        step as any,currentNodePaths,orderBy,limit,offset,nextToken
                    )
                }
            );
        },
        insertNodeAsync:async (node: ConvoNode, options: Omit<InsertConvoNodeOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNode> =>{
            const layer=this.getLayerByPath({supportsNodes:true},node.path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${node.path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.insertNodeAsync(node,options);

        },
        updateNodeAsync:async (node: ConvoNodeUpdate, options: Omit<UpdateConvoNodeOptions, "permissionFrom" | "mergeData"> | undefined): PromiseResultTypeVoid =>{
            const layer=this.getLayerByPath({supportsNodes:true},node.path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${node.path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.updateNodeAsync(node,options);
        },
        deleteNodeAsync:async (path: string, options: Omit<DeleteConvoNodeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            const layer=this.getLayerByPath({supportsNodes:true},path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.deleteNodeAsync(path,options);
        },
        insertEdgeAsync:async (edge: Omit<ConvoNodeEdge, "id">, options: Omit<InsertConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNodeEdge> =>{
            const layer=this.getLayerByPath({supportsEdges:true},edge.from);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${edge.from}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.insertEdgeAsync(edge,options);
        },
        updateEdgeAsync:async (update: ConvoNodeEdgeUpdate, options: Omit<UpdateConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            const edgeR=await this._driver.queryEdgesAsync({id:update.id,limit:1});
            if(!edgeR.success){
                return edgeR;
            }
            const edge=edgeR.result.edges[0];
            if(!edge){
                return {
                    success:false,
                    error:"No edge found by id",
                    statusCode:404,
                }
            }
            const layer=this.getLayerByPath({supportsEdges:true},edge.from);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${edge.from}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return layer.db._driver.updateEdgeAsync(update,options);
        },
        deleteEdgeAsync:async (id: string, options: Omit<DeleteConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            const edgeR=await this._driver.queryEdgesAsync({id,limit:1});
            if(!edgeR.success){
                return edgeR;
            }
            const edge=edgeR.result.edges[0];
            if(!edge){
                return {
                    success:false,
                    error:"No edge found by id",
                    statusCode:404,
                }
            }
            const layer=this.getLayerByPath({supportsEdges:true},edge.from);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${edge.from}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return layer.db._driver.deleteEdgeAsync(id,options);
        },
        insertEmbeddingAsync:async (embedding: Omit<ConvoNodeEmbedding, "id">, options: Omit<InsertConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNodeEmbedding> =>{
            const layer=this.getLayerByPath({supportsEmbeddings:true},embedding.path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${embedding.path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return await layer.db._driver.insertEmbeddingAsync(embedding,options);
        },
        updateEmbeddingAsync:async (update: ConvoNodeEmbeddingUpdate, options: Omit<UpdateConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            const embeddingR=await this._driver.queryEmbeddingsAsync({id:update.id,limit:1});
            if(!embeddingR.success){
                return embeddingR;
            }
            const embedding=embeddingR.result.embeddings[0];
            if(!embedding){
                return {
                    success:false,
                    error:"No embedding found by id",
                    statusCode:404,
                }
            }
            const layer=this.getLayerByPath({supportsEmbeddings:true},embedding.path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${embedding.path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return layer.db._driver.updateEmbeddingAsync(update,options);
        },
        deleteEmbeddingAsync:async (id: string, options: Omit<DeleteConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            const embeddingR=await this._driver.queryEmbeddingsAsync({id,limit:1});
            if(!embeddingR.success){
                return embeddingR;
            }
            const embedding=embeddingR.result.embeddings[0];
            if(!embedding){
                return {
                    success:false,
                    error:"No embedding found by id",
                    statusCode:404,
                }
            }
            const layer=this.getLayerByPath({supportsEmbeddings:true},embedding.path);
            if(!layer){
                return {
                    success:false,
                    error:`No layer mounted at ${embedding.path}`,
                    statusCode:404
                }
            }
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            return layer.db._driver.deleteEmbeddingAsync(id,options);
        },
        queryEdgesAsync:async (query: ConvoNodeEdgeQuery&ConvoDbDriverNextToken): PromiseResultType<ConvoNodeEdgeQueryResult&ConvoDbDriverNextToken>=>{
            if(query.limit!==undefined && query.limit<1 && !query.includeTotal){
                return {
                    success:true,
                    result:{edges:[]}
                }
            }
            const layers=this.getLayersByPath({supportsEdges:true},query.from??'/**');
            const state=getQueryToken(query.nextToken);
            const offset=query.offset??0;
            for(;state.i<layers.length;state.i++){
                const layer=layers[state.i];
                if(!layer){
                    return {
                        success:false,
                        error:'Layer not found at index',
                        statusCode:500,
                    }
                }
                const initR=await this.initLayerAsync(layer);
                if(!initR.success){
                    return initR;
                }
                const r=await layer.db._driver.queryEdgesAsync({
                    ...query,
                    offset:getLayerOffset(offset,state),
                    nextToken:state.t,
                    includeTotal:false,
                });

                if(!r.success){
                    return r;
                }

                state.l+=r.result.edges.length;
                state.t=r.result.nextToken;

                const edges=this.filterEdgesToMountPoint(r.result.edges,layer.mountPoint);

                if(edges.length===0){
                    state.o+=state.l;
                    state.l=0;
                    state.t=undefined;
                    continue;
                }
                let total:number|undefined;
                if(query.includeTotal){
                    const tr=await this.getEdgeTotalAsync(query);
                    if(!tr.success){
                        return tr;
                    }
                    total=tr.result;
                }
                return {
                    success:true,
                    result:{
                        nextToken:state.t===undefined && r.result.edges.length<(query.limit??50)?undefined:JSON.stringify(state),
                        edges,
                        total,
                    }
                }
            }

            let total:number|undefined;
            if(query.includeTotal){
                const tr=await this.getEdgeTotalAsync(query);
                if(!tr.success){
                    return tr;
                }
                total=tr.result;
            }
            return {
                success:true,
                result:{
                    edges:[],
                    total,
                }
            }
            
        },
        queryEmbeddingsAsync:async (query: ConvoNodeEmbeddingQuery&ConvoDbDriverNextToken): PromiseResultType<ConvoNodeEmbeddingQueryResult&ConvoDbDriverNextToken>=>{
            if(query.limit!==undefined && query.limit<1 && !query.includeTotal){
                return {
                    success:true,
                    result:{embeddings:[]}
                }
            }
            const layers=this.getLayersByPath({supportsEmbeddings:true},query.path??'/**');
            const state=getQueryToken(query.nextToken);
            const offset=query.offset??0;
            for(;state.i<layers.length;state.i++){
                const layer=layers[state.i];
                if(!layer){
                    return {
                        success:false,
                        error:'Layer not found at index',
                        statusCode:500,
                    }
                }
                const initR=await this.initLayerAsync(layer);
                if(!initR.success){
                    return initR;
                }
                const r=await layer.db._driver.queryEmbeddingsAsync({
                    ...query,
                    offset:getLayerOffset(offset,state),
                    nextToken:state.t,
                    includeTotal:false,
                });

                if(!r.success){
                    return r;
                }

                state.l+=r.result.embeddings.length;
                state.t=r.result.nextToken;

                const embeddings=this.filterEmbeddingsToMountPoint(r.result.embeddings,layer.mountPoint);

                if(embeddings.length===0){
                    state.o+=state.l;
                    state.l=0;
                    state.t=undefined;
                    continue;
                }
                let total:number|undefined;
                if(query.includeTotal){
                    const tr=await this.getEmbeddingTotalAsync(query);
                    if(!tr.success){
                        return tr;
                    }
                    total=tr.result;
                }
                return {
                    success:true,
                    result:{
                        nextToken:state.t===undefined && r.result.embeddings.length<(query.limit??50)?undefined:JSON.stringify(state),
                        embeddings,
                        total,
                    }
                }
            }

            let total:number|undefined;
            if(query.includeTotal){
                const tr=await this.getEmbeddingTotalAsync(query);
                if(!tr.success){
                    return tr;
                }
                total=tr.result;
            }
            return {
                success:true,
                result:{
                    embeddings:[],
                    total,
                }
            }
        },
        
    }

    private async getEdgeTotalAsync(query:ConvoNodeEdgeQuery):PromiseResultType<number>
    {
        let total=0;
        const layers=this.getLayersByPath({supportsEdges:true},query.from??'/**');
        for(const layer of layers){
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            const r=await layer.db._driver.queryEdgesAsync({
                ...query,
                nextToken:undefined,
                offset:0,
                limit:1,
                includeTotal:true
            });
            if(!r.success){
                return r;
            }
            if(query.from===undefined){
                const edges=this.filterEdgesToMountPoint(r.result.edges,layer.mountPoint);
                total+=edges.length?r.result.total??0:0;
            }else{
                total+=(r.result.total??0);
            }
        }
        return {
            success:true,
            result:total,
        }
    }

    private async getEmbeddingTotalAsync(query:ConvoNodeEmbeddingQuery):PromiseResultType<number>
    {
        let total=0;
        const layers=this.getLayersByPath({supportsEmbeddings:true},query.path??'/**');
        for(const layer of layers){
            const initR=await this.initLayerAsync(layer);
            if(!initR.success){
                return initR;
            }
            const r=await layer.db._driver.queryEmbeddingsAsync({
                ...query,
                nextToken:undefined,
                offset:0,
                limit:1,
                includeTotal:true
            });
            if(!r.success){
                return r;
            }
            if(query.path===undefined){
                const embeddings=this.filterEmbeddingsToMountPoint(r.result.embeddings,layer.mountPoint);
                total+=embeddings.length?r.result.total??0:0;
            }else{
                total+=(r.result.total??0);
            }
        }
        return {
            success:true,
            result:total,
        }
    }
    
}

const getLayerOffset=(offset:number,state:QueryToken):number=>{
    return Math.max(0,offset-state.o)+(state.t===undefined?state.l:0);
}

const getSelectLayerOffset=(offset:number,state:QueryToken):number=>{
    return Math.max(0,offset-state.o);
}

const getQueryToken=(token?:string):QueryToken=>{
    if(!token){
        return {
            i:0,
            o:0,
            l:0,
        }
    }

    try{
        return JSON.parse(token);
    }catch{
        throw new Error('Invalid layer db next token');
    }

}

const ensureTrailingSlash=(path:string):string=>{
    return path.endsWith('/')?path:`${path}/`;
}

const getMountPointRoot=(mountPoint:string):string=>{
    return mountPoint==='/'?'/':mountPoint.substring(0,mountPoint.length-1);
}

interface QueryToken
{
    /**
     * Layer Index
     */
    i:number;

    /**
     * Layer offset. The total of all items returned by layers that have already been passed.
     * Will offset the offset value passed to driver functions
     */
    o:number;

    /**
     * Current layer total
     */
    l:number;

    /**
     * Layer next token
     */
    t?:string;
}

interface SelectToken extends QueryToken 
{

    /**
     * Group index
     */
    g:number;


}

const getSelectToken=(token:string|undefined):SelectToken=>{
    if(!token){
        return {i:0,g:0,o:0,l:0}
    }
    try{
        return JSON.parse(token);
    }catch{
        throw new Error('Invalid layer db next token');
    }
}

interface ScopedPathGroup
{
    paths:string[];
    db:ConvoDb;
    layer:LayerInst;
}
