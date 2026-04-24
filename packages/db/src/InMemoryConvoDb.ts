import { ConvoDbDriverPathsResult, ConvoDbExport, ConvoNode, ConvoNodeCondition, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodePermissionType, ConvoNodeQueryStep, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, PromiseResultType, PromiseResultTypeVoid, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions, defaultConvoNodeQueryLimit, isConvoNodeGroupCondition, isConvoNodePropertyCondition } from "@convo-lang/convo-lang";
import { deepClone, starStringToRegex, uuid } from "@iyio/common";
import { BaseConvoDb } from "./BaseConvoDb.js";

export class InMemoryConvoDb extends BaseConvoDb
{
    private readonly nodes=new Map<string,ConvoNode>();
    private readonly edges=new Map<string,ConvoNodeEdge>();
    private readonly embeddings=new Map<string,ConvoNodeEmbedding>();

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
                edges.push(cloneSelected(edge,keys));
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

            nodes.sort((a,b)=>compareByOrder(a,b,orderBy));

            return {
                success:true,
                result:nodes.map(node=>cloneSelected(node,keys)),
            }
        },
        
        selectNodePathsForPathAsync:async (step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const regex=step.path.includes('*')?starStringToRegex(step.path):undefined;
            const nodes=this.getCandidateNodes(currentNodePaths);

            const matched=nodes.filter(node=>{
                return regex?regex.test(node.path):node.path===step.path;
            });

            matched.sort((a,b)=>compareByOrder(a,b,orderBy));

            return {
                success:true,
                result:{paths:matched.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const nodes=this.getCandidateNodes(currentNodePaths);

            const matched=nodes.filter(node=>evaluateCondition(node,step.condition));

            matched.sort((a,b)=>compareByOrder(a,b,orderBy));

            return {
                success:true,
                result:{paths:matched.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectNodePathsForPermissionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const nodes=this.getCandidateNodes(currentNodePaths);
            const matched:ConvoNode[]=[];

            for(const node of nodes){
                const permission=this.getPermissionValue(step.permissionFrom,node.path);
                if((permission&step.permissionRequired)===step.permissionRequired){
                    matched.push(node);
                }
            }

            matched.sort((a,b)=>compareByOrder(a,b,orderBy));

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

                const value=getValueByPath(node,embedding.prop);
                const text=value===undefined || value===null?'':String(value);
                if(text.toLowerCase().includes(step.embedding.text.toLowerCase())){
                    matchedPaths.push(embedding.path);
                }
            }

            const matchedNodes=matchedPaths.map(path=>this.nodes.get(path)).filter(v=>v) as ConvoNode[];
            matchedNodes.sort((a,b)=>compareByOrder(a,b,orderBy));

            return {
                success:true,
                result:{paths:matchedNodes.slice(offset,offset+limit).map(node=>node.path)}
            }
        },

        selectEdgeNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const currentSet=currentNodePaths?new Set(currentNodePaths):undefined;
            const condition:ConvoNodeCondition=(typeof step.edge==='string')?
                {
                    target:'type',
                    op:'=',
                    value:step.edge,
                }
            :
                step.edge;

            const resultPaths:string[]=[];

            for(const edge of this.edges.values()){
                if(!evaluateCondition(edge,condition)){
                    continue;
                }

                switch(step.edgeDirection){
                    case 'forward':
                        if(!currentSet || currentSet.has(edge.from)){
                            resultPaths.push(edge.to);
                        }
                        break;

                    case 'reverse':
                        if(!currentSet || currentSet.has(edge.to)){
                            resultPaths.push(edge.from);
                        }
                        break;

                    case 'bi':
                        if(!currentSet){
                            resultPaths.push(edge.to);
                            resultPaths.push(edge.from);
                        }else{
                            if(currentSet.has(edge.from)){
                                resultPaths.push(edge.to);
                            }
                            if(currentSet.has(edge.to)){
                                resultPaths.push(edge.from);
                            }
                        }
                        break;
                }
            }

            let paths=resultPaths;
            if(step.edgeLimit!==undefined){
                paths=paths.slice(0,Math.max(0,step.edgeLimit));
            }

            const matchedNodes=paths.map(path=>this.nodes.get(path)).filter(v=>v) as ConvoNode[];
            matchedNodes.sort((a,b)=>compareByOrder(a,b,orderBy));

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

            let edges=[...this.edges.values()];

            if(query.id!==undefined){
                edges=edges.filter(edge=>edge.id===query.id);
            }
            if(query.from!==undefined){
                edges=edges.filter(edge=>edge.from===query.from);
            }
            if(query.to!==undefined){
                edges=edges.filter(edge=>edge.to===query.to);
            }
            if(query.type!==undefined){
                edges=edges.filter(edge=>edge.type===query.type);
            }
            if(query.name!==undefined){
                edges=edges.filter(edge=>edge.name===query.name);
            }
            if(query.permissionFrom!==undefined){
                edges=edges.filter(edge=>{
                    const fromPermission=this.getPermissionValue(query.permissionFrom!,edge.from);
                    const toPermission=this.getPermissionValue(query.permissionFrom!,edge.to);
                    return (fromPermission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read &&
                        (toPermission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read;
                });
            }

            edges.sort((a,b)=>comparePrimitive(a.id,b.id));

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

            let embeddings=[...this.embeddings.values()];

            if(query.id!==undefined){
                embeddings=embeddings.filter(embedding=>embedding.id===query.id);
            }
            if(query.path!==undefined){
                embeddings=embeddings.filter(embedding=>embedding.path===query.path);
            }
            if(query.type!==undefined){
                embeddings=embeddings.filter(embedding=>embedding.type===query.type);
            }
            if(query.name!==undefined){
                embeddings=embeddings.filter(embedding=>embedding.name===query.name);
            }
            if(query.prop!==undefined){
                embeddings=embeddings.filter(embedding=>embedding.prop===query.prop);
            }
            if(query.permissionFrom!==undefined){
                embeddings=embeddings.filter(embedding=>{
                    const permission=this.getPermissionValue(query.permissionFrom!,embedding.path);
                    return (permission&ConvoNodePermissionType.read)===ConvoNodePermissionType.read;
                });
            }

            embeddings.sort((a,b)=>comparePrimitive(a.id,b.id));

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
        const targets:string[]=['/'];
        if(toPath!=="/"){
            const parts=toPath.split('/').filter(Boolean);
            let current='';
            for(const part of parts){
                current+='/'+part;
                targets.push(current);
            }
        }

        let grant=ConvoNodePermissionType.none;
        for(const edge of this.edges.values()){
            if(edge.from===fromPath && targets.includes(edge.to) && edge.grant){
                grant|=edge.grant;
            }
        }

        return grant;
    }
}

const cloneSelected=<T extends Record<string,any>>(source:T,keys:(keyof T)[]|'*'):Partial<T>=>{
    if(keys==='*'){
        return deepClone(source);
    }

    const obj:Partial<T>={};
    for(const key of keys){
        obj[key]=deepClone(source[key]);
    }
    return obj;
}

const getValueByPath=(obj:any,path:string):any=>{
    if(!path){
        return undefined;
    }

    const parts=path.split('.');
    let current=obj;

    for(const part of parts){
        if(current===undefined || current===null){
            return undefined;
        }
        current=current[part];
    }

    return current;
}

const evaluateCondition=(target:any,condition:ConvoNodeCondition):boolean=>{
    if(isConvoNodePropertyCondition(condition)){
        const left=getValueByPath(target,condition.target);
        const right=condition.value;

        switch(condition.op){
            case '=':
                return left===right;
            case '!=':
                return left!==right;
            case '>':
                return left>right;
            case '<':
                return left<right;
            case '>=':
                return left>=right;
            case '<=':
                return left<=right;
            case 'in':
                return Array.isArray(right)?right.includes(left):false;
            case 'all-in':
                return Array.isArray(left) && Array.isArray(right)?left.every(v=>right.includes(v)):false;
            case 'any-in':
                return Array.isArray(left) && Array.isArray(right)?left.some(v=>right.includes(v)):false;
            case 'contains':
                return Array.isArray(left)?left.includes(right):false;
            case 'contains-all':
                return Array.isArray(left) && Array.isArray(right)?right.every(v=>left.includes(v)):false;
            case 'contains-any':
                return Array.isArray(left) && Array.isArray(right)?right.some(v=>left.includes(v)):false;
            case 'like':
                return starStringToRegex(String(right)).test(String(left));
            case 'ilike':
                return starStringToRegex(String(right),'i').test(String(left));
            default:
                return false;
        }
    }

    if(isConvoNodeGroupCondition(condition)){
        if(!condition.conditions.length){
            return false;
        }
        switch(condition.groupOp){
            case 'and':
                return condition.conditions.every(c=>evaluateCondition(target,c));
            case 'or':
                return condition.conditions.some(c=>evaluateCondition(target,c));
            default:
                return false;
        }
    }

    return false;
}

const compareByOrder=(a:any,b:any,orderBy:ConvoNodeOrderBy[]):number=>{
    for(const order of orderBy){
        const av=getValueByPath(a,order.prop);
        const bv=getValueByPath(b,order.prop);
        const cmp=comparePrimitive(av,bv);
        if(cmp!==0){
            return order.direction==='desc'?-cmp:cmp;
        }
    }
    return 0;
}

const comparePrimitive=(a:any,b:any):number=>{
    if(a===b){
        return 0;
    }
    if(a===undefined || a===null){
        return -1;
    }
    if(b===undefined || b===null){
        return 1;
    }
    if(a>b){
        return 1;
    }
    if(a<b){
        return -1;
    }
    return String(a).localeCompare(String(b));
}