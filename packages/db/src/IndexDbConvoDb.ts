import type {
    ConvoDbDriver,
    ConvoDbDriverNextToken,
    ConvoDbDriverPathsResult,
    ConvoEmbeddingSearch,
    ConvoNode,
    ConvoNodeCondition,
    ConvoNodeEdge,
    ConvoNodeEdgeQuery,
    ConvoNodeEdgeQueryResult,
    ConvoNodeEdgeUpdate,
    ConvoNodeEmbedding,
    ConvoNodeEmbeddingQuery,
    ConvoNodeEmbeddingQueryResult,
    ConvoNodeEmbeddingUpdate,
    ConvoNodeGroupCondition,
    ConvoNodeOrderBy,
    ConvoNodePermissionType as ConvoNodePermissionTypeT,
    ConvoNodePropertyCondition,
    ConvoNodeQueryStep,
    ConvoNodeUpdate,
    DeleteConvoNodeEdgeOptions,
    DeleteConvoNodeEmbeddingOptions,
    DeleteConvoNodeOptions,
    InsertConvoNodeEdgeOptions,
    InsertConvoNodeEmbeddingOptions,
    InsertConvoNodeOptions,
    PromiseResultType,
    PromiseResultTypeVoid,
    ResultType,
    ResultTypeError,
    StatusCode,
    UpdateConvoNodeEdgeOptions,
    UpdateConvoNodeEmbeddingOptions,
    UpdateConvoNodeOptions,
} from '@convo-lang/convo-lang';
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';
import { uuid } from '@iyio/common';
import { BaseConvoDb, BaseConvoDbOptions } from './BaseConvoDb.js';

export interface IndexDbConvoDbInf
{
    open(name:string,version?:number):IDBOpenDBRequest;
}

export interface IndexDbConvoDbOptions extends BaseConvoDbOptions
{
    /**
     * Database name to pass to indexedDB.open. Defaults to the dbName option
     * @default dbName
     */
    indexDbName?:string;

    /**
     * Name of store to store nodes in
     * @default "node"
     */
    nodeStore?:string;

    /**
     * Name of store to store edges in
     * @default "edge"
     */
    edgeStore?:string;

    /**
     * Name of store to store embeddings in
     * @default "embedding"
     */
    embeddingStore?:string;

    /**
     * Name of store to store blobs in
     * @default "blob"
     */
    blobStore?:string;

    /**
     * An alternate function to use to create the index db
     */
    openDb?:(name:string,version?:number)=>IDBOpenDBRequest;

    /**
     * An optional delay to add to all accesses to the IndexDbConvoDbInf. This is used to
     * simulate network latency or other performance bottlenecks.
     */
    simulatedDelayMs?:number;
}

export interface IndexDbConvoDbDriverOptions
{
    indexDbName:string;
    nodeStore:string;
    edgeStore:string;
    embeddingStore:string;
    blobStore:string;
    openDb?:(name:string,version?:number)=>IDBOpenDBRequest;
    simulatedDelayMs?:number;
}

interface IndexDbBlobRecord
{
    path:string;
    blob:Blob;
}

export class IndexDbConvoDb extends BaseConvoDb
{
    public readonly indexDbName:string;

    public readonly nodeStore:string;

    public readonly edgeStore:string;

    public readonly embeddingStore:string;

    public readonly blobStore:string;

    public readonly simulatedDelayMs?:number;

    override readonly _driver:ConvoDbDriver;

    private readonly _driverT:IndexDbConvoDbDriver;

    public constructor({
        indexDbName,
        nodeStore='node',
        edgeStore='edge',
        embeddingStore='embedding',
        blobStore='blob',
        openDb,
        simulatedDelayMs,
        ...baseOptions
    }:IndexDbConvoDbOptions){
        super(baseOptions);
        this.indexDbName=indexDbName??baseOptions.name;
        this.nodeStore=nodeStore;
        this.edgeStore=edgeStore;
        this.embeddingStore=embeddingStore;
        this.blobStore=blobStore;
        this.simulatedDelayMs=simulatedDelayMs;
        this._driver=this._driverT=new IndexDbConvoDbDriver({
            indexDbName:this.indexDbName,
            nodeStore,
            edgeStore,
            embeddingStore,
            blobStore,
            openDb,
            simulatedDelayMs,
        });
    }

    protected override async _initAsync():PromiseResultTypeVoid{
        return await this._driverT.initAsync();
    }

    protected override _dispose():void{
        this._driverT.dispose();
    }
}

export class IndexDbConvoDbDriver implements ConvoDbDriver
{
    public readonly indexDbName:string;

    public readonly nodeStore:string;

    public readonly edgeStore:string;

    public readonly embeddingStore:string;

    public readonly blobStore:string;

    public readonly simulatedDelayMs?:number;

    private readonly openDb?:(name:string,version?:number)=>IDBOpenDBRequest;

    private db?:IDBDatabase;

    public constructor({
        indexDbName,
        nodeStore,
        edgeStore,
        embeddingStore,
        blobStore,
        openDb,
        simulatedDelayMs,
    }:IndexDbConvoDbDriverOptions){
        this.indexDbName=indexDbName;
        this.nodeStore=nodeStore;
        this.edgeStore=edgeStore;
        this.embeddingStore=embeddingStore;
        this.blobStore=blobStore;
        this.openDb=openDb;
        this.simulatedDelayMs=simulatedDelayMs;
    }

    public async initAsync():PromiseResultTypeVoid{
        try{
            await this._delayAsync();

            const request=(
                this.openDb?
                    this.openDb(this.indexDbName,1)
                :
                    indexedDB.open(this.indexDbName,1)
            );

            request.onupgradeneeded=()=>{
                const db=request.result;
                this._createStores(db);
            };

            this.db=await requestToPromise(request);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public dispose():void{
        this.db?.close();
        this.db=undefined;
    }

    public async openBlobAsync(path:string):PromiseResultType<ReadableStream>{
        try{
            const record=await this._getByKey<IndexDbBlobRecord>(this.blobStore,path);
            if(!record){
                return error('Blob not found',404);
            }

            return success(record.blob.stream());
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async writeBlobAsync(path:string,blob:string|Blob|ReadableStream|null):PromiseResultTypeVoid{
        try{
            if(blob===null){
                await this._deleteByKey(this.blobStore,path);
            }else{
                const blobValue=(
                    typeof blob==='string'?
                        new Blob([blob])
                    :blob instanceof Blob?
                        blob
                    :
                        await new Response(blob).blob()
                );
                await this._put(this.blobStore,{path,blob:blobValue});
            }
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async hasBlobAsync(path:string):PromiseResultType<boolean>{
        try{
            return success(await this._getByKey<IndexDbBlobRecord>(this.blobStore,path)!==undefined);
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectEdgesByPathsAsync(
        keys:(keyof ConvoNodeEdge)[]|'*',
        fromPathsIn:string[],
        toPathsIn:string[],
        hasGrant:boolean
    ):PromiseResultType<Partial<ConvoNodeEdge>[]>{
        try{
            const fromSet=new Set(fromPathsIn);
            const toSet=new Set(toPathsIn);
            const edges=(await this._getAll<ConvoNodeEdge>(this.edgeStore))
                .filter(edge=>
                    fromSet.has(edge.from) &&
                    toSet.has(edge.to) &&
                    (
                        !hasGrant ||
                        (
                            edge.grant!==undefined &&
                            edge.grant!==ConvoNodePermissionType.none
                        )
                    )
                )
                .map(edge=>pickKeys(edge,keys));

            return success(edges);
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectNodesByPathsAsync(
        keys:(keyof ConvoNode)[]|'*',
        paths:string[],
        orderBy:ConvoNodeOrderBy[]
    ):PromiseResultType<Partial<ConvoNode>[]>{
        try{
            const pathSet=new Set(paths);
            const pathIndex=new Map(paths.map((path,index)=>[path,index]));
            const nodes=(await this._getAll<ConvoNode>(this.nodeStore))
                .filter(node=>pathSet.has(node.path));

            if(orderBy.length){
                sortItems(nodes,orderBy);
            }else{
                nodes.sort((a,b)=>(pathIndex.get(a.path)??0)-(pathIndex.get(b.path)??0));
            }

            return success(nodes.map(node=>pickKeys(node,keys)));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectNodePathsForPathAsync(
        step:Required<Pick<ConvoNodeQueryStep,'path'>>,
        currentNodePaths:string[]|null,
        orderBy:ConvoNodeOrderBy[],
        limit:number,
        offset:number,
        nextToken:string|undefined
    ):PromiseResultType<ConvoDbDriverPathsResult>{
        try{
            const nodes=await this._selectCandidateNodesAsync(currentNodePaths);
            const filtered=nodes.filter(node=>pathMatches(step.path,node.path));
            return success(pathsResult(filtered,orderBy,limit,offset,nextToken));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectNodePathsForConditionAsync(
        step:Required<Pick<ConvoNodeQueryStep,'condition'>>,
        currentNodePaths:string[]|null,
        orderBy:ConvoNodeOrderBy[],
        limit:number,
        offset:number,
        nextToken:string|undefined
    ):PromiseResultType<ConvoDbDriverPathsResult>{
        try{
            const nodes=await this._selectCandidateNodesAsync(currentNodePaths);
            const filtered=nodes.filter(node=>conditionMatches(step.condition,node));
            return success(pathsResult(filtered,orderBy,limit,offset,nextToken));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectNodePathsForPermissionAsync(
        step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,
        currentNodePaths:string[]|null,
        orderBy:ConvoNodeOrderBy[],
        limit:number,
        offset:number,
        nextToken:string|undefined
    ):PromiseResultType<ConvoDbDriverPathsResult>{
        try{
            const nodes=await this._selectCandidateNodesAsync(currentNodePaths);
            const edges=await this._getAll<ConvoNodeEdge>(this.edgeStore);
            const filtered=nodes.filter(node=>hasPermission(edges,step.permissionFrom,node.path,step.permissionRequired));
            return success(pathsResult(filtered,orderBy,limit,offset,nextToken));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectNodePathsForEmbeddingAsync(
        step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,
        currentNodePaths:string[]|null,
        orderBy:ConvoNodeOrderBy[],
        limit:number,
        offset:number,
        nextToken:string|undefined
    ):PromiseResultType<ConvoDbDriverPathsResult>{
        try{
            const pathSet=currentNodePaths?new Set(currentNodePaths):null;
            const embeddings=(await this._getAll<ConvoNodeEmbedding>(this.embeddingStore))
                .filter(embedding=>
                    (!pathSet || pathSet.has(embedding.path)) &&
                    embeddingMatches(step.embedding,embedding)
                );

            const matchingPathSet=new Set(embeddings.map(embedding=>embedding.path));
            const nodes=(await this._getAll<ConvoNode>(this.nodeStore))
                .filter(node=>matchingPathSet.has(node.path));

            return success(pathsResult(nodes,orderBy,limit,offset,nextToken));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async selectEdgeNodePathsForConditionAsync(
        step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,
        currentNodePaths:string[]|null,
        orderBy:ConvoNodeOrderBy[],
        limit:number,
        offset:number,
        nextToken:string|undefined
    ):PromiseResultType<ConvoDbDriverPathsResult>{
        try{
            const currentSet=currentNodePaths?new Set(currentNodePaths):null;
            const destinationPaths:string[]=[];
            const destinationSet=new Set<string>();
            const direction=step.edgeDirection;
            const edges=(await this._getAll<ConvoNodeEdge>(this.edgeStore))
                .filter(edge=>edgeConditionMatches(step.edge,edge));

            const addPath=(path:string)=>{
                if(destinationSet.has(path)){
                    return;
                }
                destinationSet.add(path);
                destinationPaths.push(path);
            };

            for(const edge of edges){
                if((direction==='forward' || direction==='bi') && (!currentSet || currentSet.has(edge.from))){
                    addPath(edge.to);
                }
                if((direction==='reverse' || direction==='bi') && (!currentSet || currentSet.has(edge.to))){
                    addPath(edge.from);
                }
            }

            const limitedPaths=step.edgeLimit===undefined?destinationPaths:destinationPaths.slice(0,step.edgeLimit);
            const nodes=await this._selectCandidateNodesAsync(limitedPaths);
            return success(pathsResult(nodes,orderBy,limit,offset,nextToken));
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async insertNodeAsync(
        node:ConvoNode,
        options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined
    ):PromiseResultType<ConvoNode>{
        void options;
        try{
            await this._add(this.nodeStore,node);
            return success(node);
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async updateNodeAsync(
        node:ConvoNodeUpdate,
        options:Omit<UpdateConvoNodeOptions,'permissionFrom'|'mergeData'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            const current=await this._getByKey<ConvoNode>(this.nodeStore,node.path);
            if(!current){
                return error('Node not found',404);
            }

            applyNullableUpdate(current,node,'displayName');
            applyNullableUpdate(current,node,'modified');
            applyNullableUpdate(current,node,'description');
            applyNullableUpdate(current,node,'instructions');

            if(node.data!==undefined){
                current.data=node.data??{};
            }

            await this._put(this.nodeStore,current);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async deleteNodeAsync(
        path:string,
        options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            await this._deleteByKey(this.nodeStore,path);

            const edges=await this._getAll<ConvoNodeEdge>(this.edgeStore);
            await Promise.all(edges
                .filter(edge=>edge.from===path || edge.to===path)
                .map(edge=>this._deleteByKey(this.edgeStore,edge.id))
            );

            const embeddings=await this._getAll<ConvoNodeEmbedding>(this.embeddingStore);
            await Promise.all(embeddings
                .filter(embedding=>embedding.path===path)
                .map(embedding=>this._deleteByKey(this.embeddingStore,embedding.id))
            );

            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async insertEdgeAsync(
        edge:Omit<ConvoNodeEdge,'id'>,
        options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined
    ):PromiseResultType<ConvoNodeEdge>{
        void options;
        try{
            const insert={...edge,id:uuid()};
            await this._add(this.edgeStore,insert);
            return success(insert);
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async updateEdgeAsync(
        update:ConvoNodeEdgeUpdate,
        options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            const current=await this._getByKey<ConvoNodeEdge>(this.edgeStore,update.id);
            if(!current){
                return error('Edge not found',404);
            }

            applyNullableUpdate(current,update,'displayName');
            applyNullableUpdate(current,update,'modified');
            applyNullableUpdate(current,update,'description');
            applyNullableUpdate(current,update,'instructions');
            applyNullableUpdate(current,update,'grant');

            await this._put(this.edgeStore,current);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async deleteEdgeAsync(
        id:string,
        options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            await this._deleteByKey(this.edgeStore,id);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async insertEmbeddingAsync(
        embedding:Omit<ConvoNodeEmbedding,'id'>,
        options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined
    ):PromiseResultType<ConvoNodeEmbedding>{
        void options;
        try{
            const insert={...embedding,id:uuid()};
            await this._add(this.embeddingStore,insert);
            return success(insert);
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async deleteEmbeddingAsync(
        id:string,
        options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            await this._deleteByKey(this.embeddingStore,id);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async updateEmbeddingAsync(
        update:ConvoNodeEmbeddingUpdate,
        options:Omit<UpdateConvoNodeEmbeddingOptions,'permissionFrom'>|undefined
    ):PromiseResultTypeVoid{
        void options;
        try{
            const current=await this._getByKey<ConvoNodeEmbedding>(this.embeddingStore,update.id);
            if(!current){
                return error('Embedding not found',404);
            }

            applyNullableUpdate(current,update,'modified');
            applyNullableUpdate(current,update,'description');
            applyNullableUpdate(current,update,'instructions');

            await this._put(this.embeddingStore,current);
            return successVoid();
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async queryEdgesAsync(query:ConvoNodeEdgeQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEdgeQueryResult&ConvoDbDriverNextToken>{
        try{
            let edges=await this._getAll<ConvoNodeEdge>(this.edgeStore);
            edges=edges.filter(edge=>
                (query.id===undefined || edge.id===query.id) &&
                (query.from===undefined || edge.from===query.from) &&
                (query.to===undefined || edge.to===query.to) &&
                (query.type===undefined || edge.type===query.type) &&
                (query.name===undefined || edge.name===query.name)
            );

            const total=query.includeTotal?edges.length:undefined;
            const offset=query.offset??0;
            const limit=query.limit??50;
            edges=edges.slice(offset,offset+limit);

            return success({
                edges,
                total,
            });
        }catch(ex){
            return errorResult(ex);
        }
    }

    public async queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEmbeddingQueryResult&ConvoDbDriverNextToken>{
        try{
            let embeddings=await this._getAll<ConvoNodeEmbedding>(this.embeddingStore);
            embeddings=embeddings.filter(embedding=>
                (query.id===undefined || embedding.id===query.id) &&
                (query.path===undefined || embedding.path===query.path) &&
                (query.type===undefined || embedding.type===query.type) &&
                (query.name===undefined || embedding.name===query.name) &&
                (query.prop===undefined || embedding.prop===query.prop)
            );

            const total=query.includeTotal?embeddings.length:undefined;
            const offset=query.offset??0;
            const limit=query.limit??50;
            embeddings=embeddings.slice(offset,offset+limit);

            if(!query.includeVector){
                embeddings=embeddings.map(embedding=>{
                    const clone={...embedding};
                    delete clone.vector;
                    return clone;
                });
            }

            return success({
                embeddings,
                total,
            });
        }catch(ex){
            return errorResult(ex);
        }
    }

    private _createStores(db:IDBDatabase):void{
        const createStore=(name:string,keyPath:string)=>{
            if(!db.objectStoreNames.contains(name)){
                db.createObjectStore(name,{keyPath});
            }
        };

        createStore(this.nodeStore,'path');
        createStore(this.edgeStore,'id');
        createStore(this.embeddingStore,'id');
        createStore(this.blobStore,'path');
    }

    private async _selectCandidateNodesAsync(currentNodePaths:string[]|null):Promise<ConvoNode[]>{
        const nodes=await this._getAll<ConvoNode>(this.nodeStore);
        if(!currentNodePaths){
            return nodes;
        }
        const pathSet=new Set(currentNodePaths);
        return nodes.filter(node=>pathSet.has(node.path));
    }

    private _requireDb():IDBDatabase{
        if(!this.db){
            throw new Error('IndexedDB database is not initialized');
        }
        return this.db;
    }

    private async _getAll<T>(storeName:string):Promise<T[]>{
        await this._delayAsync();
        const db=this._requireDb();
        const tx=db.transaction(storeName,'readonly');
        return await requestToPromise<T[]>(tx.objectStore(storeName).getAll());
    }

    private async _getByKey<T>(storeName:string,key:IDBValidKey):Promise<T|undefined>{
        await this._delayAsync();
        const db=this._requireDb();
        const tx=db.transaction(storeName,'readonly');
        return await requestToPromise<T|undefined>(tx.objectStore(storeName).get(key));
    }

    private async _add<T>(storeName:string,value:T):Promise<void>{
        await this._delayAsync();
        const db=this._requireDb();
        const tx=db.transaction(storeName,'readwrite');
        const store=tx.objectStore(storeName);
        await requestToPromise(store.add(value));
        await transactionComplete(tx);
    }

    private async _put<T>(storeName:string,value:T):Promise<void>{
        await this._delayAsync();
        const db=this._requireDb();
        const tx=db.transaction(storeName,'readwrite');
        const store=tx.objectStore(storeName);
        await requestToPromise(store.put(value));
        await transactionComplete(tx);
    }

    private async _deleteByKey(storeName:string,key:IDBValidKey):Promise<void>{
        await this._delayAsync();
        const db=this._requireDb();
        const tx=db.transaction(storeName,'readwrite');
        const store=tx.objectStore(storeName);
        await requestToPromise(store.delete(key));
        await transactionComplete(tx);
    }

    private async _delayAsync():Promise<void>{
        if(!this.simulatedDelayMs){
            return;
        }
        await new Promise<void>(resolve=>setTimeout(resolve,this.simulatedDelayMs));
    }
}

const success=<T>(result:T):ResultType<T>=>({
    success:true,
    result,
});

const successVoid=():PromiseResultTypeVoid extends Promise<infer T>?T:never=>({
    success:true,
});

const error=<T=never>(message:string,statusCode:StatusCode=500):ResultType<T>=>({
    success:false,
    error:message,
    statusCode,
});

const errorResult=<T=never>(ex:any,statusCode:StatusCode=500):ResultTypeError=>{
    if(ex && typeof ex==='object' && 'statusCode' in ex && 'error' in ex){
        return ex;
    }

    return {
        success:false,
        error:ex instanceof Error?ex.message:String(ex),
        statusCode,
    };
};

const requestToPromise=<T>(request:IDBRequest<T>):Promise<T>=>
    new Promise<T>((resolve,reject)=>{
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error??new Error('IndexedDB request failed'));
    });

const transactionComplete=(tx:IDBTransaction):Promise<void>=>
    new Promise<void>((resolve,reject)=>{
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error??new Error('IndexedDB transaction failed'));
        tx.onabort=()=>reject(tx.error??new Error('IndexedDB transaction aborted'));
    });

const pickKeys=<T extends Record<string,any>>(value:T,keys:(keyof T)[]|'*'):Partial<T>=>{
    if(keys==='*'){
        return {...value};
    }

    const out:Partial<T>={};
    for(const key of keys){
        if(key in value){
            out[key]=value[key];
        }
    }
    return out;
};

const pathsResult=(
    nodes:ConvoNode[],
    orderBy:ConvoNodeOrderBy[],
    limit:number,
    offset:number,
    nextToken:string|undefined
):ConvoDbDriverPathsResult=>{
    void nextToken;
    const sorted=[...nodes];
    sortItems(sorted,orderBy);

    return {
        paths:sorted.slice(offset,offset+limit).map(node=>node.path),
    };
};

const sortItems=<T extends Record<string,any>>(items:T[],orderBy:ConvoNodeOrderBy[]):void=>{
    if(!orderBy.length){
        items.sort((a,b)=>String(a['path']??'').localeCompare(String(b['path']??'')));
        return;
    }

    items.sort((a,b)=>{
        for(const order of orderBy){
            const dir=order.direction==='desc'?-1:1;
            const result=compare(getValue(a,order.prop),getValue(b,order.prop));
            if(result!==0){
                return result*dir;
            }
        }
        return 0;
    });
};

const compare=(a:any,b:any):number=>{
    if(a===b){
        return 0;
    }
    if(a===undefined || a===null){
        return 1;
    }
    if(b===undefined || b===null){
        return -1;
    }
    if(typeof a==='number' && typeof b==='number'){
        return a-b;
    }
    return String(a).localeCompare(String(b));
};

const pathMatches=(pattern:string,path:string):boolean=>{
    if(!pattern.includes('*')){
        return pattern===path;
    }

    const prefix=pattern.slice(0,-1);
    return path.startsWith(prefix) && path.length>prefix.length;
};

const conditionMatches=(condition:ConvoNodeCondition,target:Record<string,any>):boolean=>
    isGroupCondition(condition)?
        groupConditionMatches(condition,target)
    :
        propertyConditionMatches(condition,target);

const isGroupCondition=(condition:ConvoNodeCondition):condition is ConvoNodeGroupCondition=>
    'groupOp' in condition;

const groupConditionMatches=(condition:ConvoNodeGroupCondition,target:Record<string,any>):boolean=>{
    if(!condition.conditions.length){
        return false;
    }

    if(condition.groupOp==='and'){
        return condition.conditions.every(child=>conditionMatches(child,target));
    }

    return condition.conditions.some(child=>conditionMatches(child,target));
};

const propertyConditionMatches=(condition:ConvoNodePropertyCondition,target:Record<string,any>):boolean=>{
    const value=getValue(target,condition.target);
    const compareValue=condition.value;

    switch(condition.op){
        case '=':
            return value===compareValue || String(value)===String(compareValue);

        case '!=':
            return value!==compareValue && String(value)!==String(compareValue);

        case '>':
            return value>compareValue;

        case '<':
            return value<compareValue;

        case '>=':
            return value>=compareValue;

        case '<=':
            return value<=compareValue;

        case 'in':
            return Array.isArray(compareValue) && compareValue.includes(value);

        case 'all-in':
            return Array.isArray(value) && Array.isArray(compareValue) && value.every(item=>compareValue.includes(item));

        case 'any-in':
            return Array.isArray(value) && Array.isArray(compareValue) && value.some(item=>compareValue.includes(item));

        case 'contains':
            return Array.isArray(value) && value.includes(compareValue);

        case 'contains-all':
            return Array.isArray(value) && Array.isArray(compareValue) && compareValue.every(item=>value.includes(item));

        case 'contains-any':
            return Array.isArray(value) && Array.isArray(compareValue) && compareValue.some(item=>value.includes(item));

        case 'like':
            return wildcardMatches(String(compareValue),String(value),false);

        case 'ilike':
            return wildcardMatches(String(compareValue),String(value),true);
    }
};

const edgeConditionMatches=(condition:string|ConvoNodeCondition,edge:ConvoNodeEdge):boolean=>
    typeof condition==='string'?
        edge.type===condition
    :
        conditionMatches(condition,edge);

const embeddingMatches=(search:ConvoEmbeddingSearch,embedding:ConvoNodeEmbedding):boolean=>
    (search.type===undefined || embedding.type===search.type);

const wildcardMatches=(pattern:string,value:string,ignoreCase:boolean):boolean=>{
    const flags=ignoreCase?'i':'';
    const escaped=pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
    return new RegExp(`^${escaped}$`,flags).test(value);
};

const getValue=(target:Record<string,any>,path:string):any=>{
    const parts=path.split('.');
    let value:any=target;

    for(const part of parts){
        if(value===undefined || value===null){
            return undefined;
        }
        value=value[part];
    }

    return value;
};

const hasPermission=(
    edges:ConvoNodeEdge[],
    fromPath:string,
    toPath:string,
    required:ConvoNodePermissionTypeT
):boolean=>{
    if(required===ConvoNodePermissionType.none){
        return true;
    }

    const toPaths=new Set(getAncestorPaths(toPath));
    let grant=ConvoNodePermissionType.none;

    for(const edge of edges){
        if(edge.from===fromPath && toPaths.has(edge.to) && edge.grant!==undefined){
            grant=grant|edge.grant;
        }
    }

    return (grant&required)===required;
};

const getAncestorPaths=(path:string):string[]=>{
    const paths=[path];
    let current=path;

    while(current!=='/'){
        const index=current.lastIndexOf('/');
        current=index<=0?'/':current.slice(0,index);
        paths.push(current);
    }

    return paths;
};

const applyNullableUpdate=<T extends Record<string,any>,U extends Record<string,any>,K extends keyof T&keyof U>(
    target:T,
    update:U,
    key:K
):void=>{
    if(update[key]===undefined){
        return;
    }
    if(update[key]===null){
        delete target[key];
        return;
    }
    target[key]=update[key];
};
