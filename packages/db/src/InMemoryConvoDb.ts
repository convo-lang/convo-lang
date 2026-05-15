import { ConvoDbDriverPathsResult, ConvoDbExport, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodePermissionType, ConvoNodeQueryStep, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, PromiseResultType, PromiseResultTypeVoid, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions, defaultConvoNodeQueryLimit } from "@convo-lang/convo-lang";
import { deepClone, uuid } from "@iyio/common";
import { BaseConvoDb } from "./BaseConvoDb.js";
import { compareJsonQueryValues, createJsonQueryPathMatcher, doesJsonQueryEdgeMatchQuery, doesJsonQueryEmbeddingMatchQuery, evaluateJsonQueryCondition, getJsonQueryPermissionValue, getJsonQueryValueByPath, hasJsonQueryPermission, selectJsonQueryEdgeDestinationPaths, selectJsonQueryKeys, sortJsonQueryValues } from "./json-query.js";


export class InMemoryConvoDb extends BaseConvoDb
{

    private readonly nodes=new Map<string,ConvoNode>();
    private readonly edges=new Map<string,ConvoNodeEdge>();
    private readonly embeddings=new Map<string,ConvoNodeEmbedding>();
    private readonly blobs=new Map<string,Blob>();

    public exportData():ConvoDbExport{
        return {
            nodes:[...this.nodes.values()].map(v=>deepClone(v)),
            edges:[...this.edges.values()].map(v=>deepClone(v)),
            embeddings:[...this.embeddings.values()].map(v=>deepClone(v)),
        };
    }

    public importData(data:ConvoDbExport):void{
        this.nodes.clear();
        this.edges.clear();
        this.embeddings.clear();

        for(const node of data.nodes){
            const clone=deepClone(node);
            this.nodes.set(clone.path,clone);
        }

        for(const edge of data.edges){
            const clone=deepClone(edge);
            this.edges.set(clone.id,clone);
        }

        for(const embedding of data.embeddings){
            const clone=deepClone(embedding);
            this.embeddings.set(clone.id,clone);
        }
    }

    override _driver={

        
        openBlobAsync:async (path:string):PromiseResultType<ReadableStream>=>{
            const blob=this.blobs.get(path);
            if(!blob){
                return {
                    success:false,
                    error:'Blob not found',
                    statusCode:404,
                }
            }

            return {
                success:true,
                result:blob.stream(),
            }
        },

        writeBlobAsync:async (path:string,blob:string|Blob|ReadableStream|null):PromiseResultTypeVoid=>{
            
            if(typeof blob === 'string'){
                blob=new Blob([blob]);
            }else if(blob && !(blob instanceof Blob)){
                const response=new Response(blob);
                blob=await response.blob();
            }else if(blob){
                blob=structuredClone(blob);
            }
            if(blob===null){
                this.blobs.delete(path);
            }else{
                this.blobs.set(path,blob);
            }
            return {
                success:true,
            }
        },

        hasBlobAsync:(path:string):PromiseResultType<boolean>=>{
            return Promise.resolve({
                success:true,
                result:this.blobs.has(path),
            });
        },

        selectEdgesByPathsAsync:async (keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>=>{
            const fromSet=new Set(fromPathsIn);
            const toSet=new Set(toPathsIn);
            const edges:Partial<ConvoNodeEdge>[]=[];

            for(const edge of this.edges.values()){
                if(!fromSet.has(edge.from) || !toSet.has(edge.to)){
                    continue;
                }
                if(hasGrant && !edge.grant){
                    continue;
                }
                edges.push(selectJsonQueryKeys(edge,keys,deepClone));
            }

            return {
                success:true,
                result:edges,
            }
        },

        selectNodesByPathsAsync:async (keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>=>{
            const nodes:ConvoNode[]=[];

            for(const path of paths){
                const node=this.nodes.get(path);
                if(node){
                    nodes.push(deepClone(node));
                }
            }

            sortJsonQueryValues(nodes,orderBy,{pathOrder:paths,getPath:node=>node.path});

            return {
                success:true,
                result:nodes.map(node=>selectJsonQueryKeys(node,keys,deepClone)),
            }
        },
        
        selectNodePathsForPathAsync:async (step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const nodes=this.getCandidateNodes(currentNodePaths);
            const matchesPath=createJsonQueryPathMatcher(step.path);

            const matched=nodes.filter(node=>matchesPath(node.path));

            sortJsonQueryValues(matched,orderBy);

            return {
                success:true,
                result:{paths:matched.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const nodes=this.getCandidateNodes(currentNodePaths);

            const matched=nodes.filter(node=>evaluateJsonQueryCondition(node,step.condition));

            sortJsonQueryValues(matched,orderBy);

            return {
                success:true,
                result:{paths:matched.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectNodePathsForPermissionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const nodes=this.getCandidateNodes(currentNodePaths);
            const matched=nodes.filter(node=>hasJsonQueryPermission(this.edges.values(),step.permissionFrom,node.path,step.permissionRequired));

            sortJsonQueryValues(matched,orderBy);

            return {
                success:true,
                result:{paths:matched.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectNodePathsForEmbeddingAsync:async (step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const allowedPaths=currentNodePaths?new Set(currentNodePaths):undefined;
            const matchedPaths:string[]=[];

            for(const embedding of this.embeddings.values()){
                if(step.embedding.type!==undefined && embedding.type!==step.embedding.type){
                    continue;
                }
                if(allowedPaths && !allowedPaths.has(embedding.path)){
                    continue;
                }

                const node=this.nodes.get(embedding.path);
                if(!node){
                    continue;
                }

                const value=getJsonQueryValueByPath(node,embedding.prop);
                const text=value===undefined || value===null?'':String(value);
                if(text.toLowerCase().includes(step.embedding.text.toLowerCase())){
                    matchedPaths.push(embedding.path);
                }
            }

            const matchedNodes=matchedPaths.map(path=>this.nodes.get(path)).filter(v=>v) as ConvoNode[];
            sortJsonQueryValues(matchedNodes,orderBy);

            return {
                success:true,
                result:{paths:matchedNodes.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectEdgeNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const paths=selectJsonQueryEdgeDestinationPaths(this.edges.values(),step,currentNodePaths);
            const matchedNodes=paths.map(path=>this.nodes.get(path)).filter(v=>v) as ConvoNode[];
            sortJsonQueryValues(matchedNodes,orderBy,{pathOrder:paths,getPath:node=>node.path});

            return {
                success:true,
                result:{paths:matchedNodes.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        insertNodeAsync:async (node:ConvoNode,options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>=>{
            if(this.nodes.has(node.path)){
                return {
                    success:false,
                    error:`Node already exists - ${node.path}`,
                    statusCode:409,
                }
            }

            const clone=deepClone(node);
            this.nodes.set(clone.path,clone);

            return {
                success:true,
                result:deepClone(clone),
            }
        },

        updateNodeAsync:async (node:ConvoNodeUpdate,options:Omit<UpdateConvoNodeOptions,'permissionFrom'|'mergeData'>|undefined):PromiseResultTypeVoid=>{
            const current=this.nodes.get(node.path);
            if(!current){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            const updated=deepClone(current);

            if(node.displayName!==undefined){
                if(node.displayName===null){
                    delete updated.displayName;
                }else{
                    updated.displayName=node.displayName;
                }
            }
            if(node.modified!==undefined){
                if(node.modified===null){
                    delete updated.modified;
                }else{
                    updated.modified=node.modified;
                }
            }
            if(node.description!==undefined){
                if(node.description===null){
                    delete updated.description;
                }else{
                    updated.description=node.description;
                }
            }
            if(node.instructions!==undefined){
                if(node.instructions===null){
                    delete updated.instructions;
                }else{
                    updated.instructions=node.instructions;
                }
            }
            if(node.data){
                updated.data=deepClone(node.data);
            }

            this.nodes.set(updated.path,updated);

            return {
                success:true,
            }
        },

        deleteNodeAsync:async (path:string,options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            if(!this.nodes.has(path)){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            this.nodes.delete(path);

            for(const [id,edge] of this.edges){
                if(edge.from===path || edge.to===path){
                    this.edges.delete(id);
                }
            }

            for(const [id,embedding] of this.embeddings){
                if(embedding.path===path){
                    this.embeddings.delete(id);
                }
            }

            return {
                success:true,
            }
        },

        insertEdgeAsync:async (edge:Omit<ConvoNodeEdge,"id">,options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>=>{
            if(!this.nodes.has(edge.from)){
                return {
                    success:false,
                    error:`Node not found - ${edge.from}`,
                    statusCode:404,
                }
            }
            if(!this.nodes.has(edge.to)){
                return {
                    success:false,
                    error:`Node not found - ${edge.to}`,
                    statusCode:404,
                }
            }

            const inserted:ConvoNodeEdge={
                ...deepClone(edge),
                id:uuid(),
            };

            this.edges.set(inserted.id,inserted);

            return {
                success:true,
                result:deepClone(inserted),
            }
        },

        updateEdgeAsync:async (update:ConvoNodeEdgeUpdate,options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const current=this.edges.get(update.id);
            if(!current){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            const updated=deepClone(current);

            if(update.displayName!==undefined){
                if(update.displayName===null){
                    delete updated.displayName;
                }else{
                    updated.displayName=update.displayName;
                }
            }
            if(update.modified!==undefined){
                if(update.modified===null){
                    delete updated.modified;
                }else{
                    updated.modified=update.modified;
                }
            }
            if(update.description!==undefined){
                if(update.description===null){
                    delete updated.description;
                }else{
                    updated.description=update.description;
                }
            }
            if(update.instructions!==undefined){
                if(update.instructions===null){
                    delete updated.instructions;
                }else{
                    updated.instructions=update.instructions;
                }
            }
            if(update.grant!==undefined){
                if(update.grant===null){
                    delete updated.grant;
                }else{
                    updated.grant=update.grant;
                }
            }

            this.edges.set(updated.id,updated);

            return {
                success:true,
            }
        },

        deleteEdgeAsync:async (id:string,options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            if(!this.edges.has(id)){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            this.edges.delete(id);

            return {
                success:true,
            }
        },

        insertEmbeddingAsync:async (embedding:Omit<ConvoNodeEmbedding,"id">,options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>=>{
            if(!this.nodes.has(embedding.path)){
                return {
                    success:false,
                    error:`Node not found - ${embedding.path}`,
                    statusCode:404,
                }
            }

            const inserted:ConvoNodeEmbedding={
                ...deepClone(embedding),
                id:uuid(),
            };

            if(options?.generateVector){
                const vectorResult=await this.generateEmbeddingVectorAsync(inserted);
                if(!vectorResult.success){
                    return vectorResult;
                }
                inserted.vector=vectorResult.result;
            }

            this.embeddings.set(inserted.id,inserted);

            return {
                success:true,
                result:deepClone(inserted),
            }
        },

        deleteEmbeddingAsync:async (id:string,options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            if(!this.embeddings.has(id)){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            this.embeddings.delete(id);

            return {
                success:true,
            }
        },

        updateEmbeddingAsync:async (update:ConvoNodeEmbeddingUpdate,options:Omit<UpdateConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const current=this.embeddings.get(update.id);
            if(!current){
                return {
                    success:false,
                    error:'not found',
                    statusCode:404,
                }
            }

            const updated=deepClone(current);

            if(update.modified!==undefined){
                if(update.modified===null){
                    delete updated.modified;
                }else{
                    updated.modified=update.modified;
                }
            }
            if(update.description!==undefined){
                if(update.description===null){
                    delete updated.description;
                }else{
                    updated.description=update.description;
                }
            }
            if(update.instructions!==undefined){
                if(update.instructions===null){
                    delete updated.instructions;
                }else{
                    updated.instructions=update.instructions;
                }
            }

            if(update.generateVector){
                const vectorResult=await this.generateEmbeddingVectorAsync(updated);
                if(!vectorResult.success){
                    return vectorResult;
                }
                updated.vector=vectorResult.result;
            }

            this.embeddings.set(updated.id,updated);

            return {
                success:true,
            }
        },

        queryEdgesAsync:async (query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>=>{
            const limit=Math.max(0,query.limit??defaultConvoNodeQueryLimit);
            const offset=Math.max(0,query.offset??0);

            let edges=[...this.edges.values()].filter(edge=>doesJsonQueryEdgeMatchQuery(edge,query));

            if(query.permissionFrom!==undefined){
                edges=edges.filter(edge=>{
                    const fromPermission=this.getPermissionValue(query.permissionFrom!,edge.from);
                    const toPermission=this.getPermissionValue(query.permissionFrom!,edge.to);
                    return (fromPermission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read &&
                        (toPermission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read;
                });
            }

            edges.sort((a,b)=>compareJsonQueryValues(a.id,b.id));

            const total=query.includeTotal?edges.length:undefined;
            const resultEdges=edges.slice(offset,offset+limit).map(edge=>deepClone(edge));

            return {
                success:true,
                result:{
                    edges:resultEdges,
                    total,
                }
            }
        },

        queryEmbeddingsAsync:async (query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbeddingQueryResult>=>{
            const limit=Math.max(0,query.limit??defaultConvoNodeQueryLimit);
            const offset=Math.max(0,query.offset??0);

            let embeddings=[...this.embeddings.values()].filter(embedding=>doesJsonQueryEmbeddingMatchQuery(embedding,query));

            if(query.permissionFrom!==undefined){
                embeddings=embeddings.filter(embedding=>{
                    const permission=this.getPermissionValue(query.permissionFrom!,embedding.path);
                    return (permission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read;
                });
            }

            embeddings.sort((a,b)=>compareJsonQueryValues(a.id,b.id));

            const total=query.includeTotal?embeddings.length:undefined;
            const resultEmbeddings=embeddings
                .slice(offset,offset+limit)
                .map(embedding=>{
                    const clone=deepClone(embedding);
                    if(!query.includeVector){
                        delete clone.vector;
                    }
                    return clone;
                });

            return {
                success:true,
                result:{
                    embeddings:resultEmbeddings,
                    total,
                }
            }
        },
    }

    private getCandidateNodes(currentNodePaths:string[]|null):ConvoNode[]{
        if(currentNodePaths===null){
            return [...this.nodes.values()];
        }
        const nodes:ConvoNode[]=[];
        for(const path of currentNodePaths){
            const node=this.nodes.get(path);
            if(node){
                nodes.push(node);
            }
        }
        return nodes;
    }

    private getPermissionValue(fromPath:string,toPath:string):ConvoNodePermissionType{
        return getJsonQueryPermissionValue(this.edges.values(),fromPath,toPath);
    }
}
