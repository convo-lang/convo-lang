import { ConvoDb, ConvoDbDriver, ConvoDbDriverPathsResult, convoDbService, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodeQueryStep, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, normalizeConvoNodePath, PromiseResultType, PromiseResultTypeVoid, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from "@convo-lang/convo-lang";
import { BaseConvoDb, BaseConvoDbOptions } from "./BaseConvoDb.js";

const hasSupport=(layer:ConvoDbLayerConfig,support:ConvoDbLayerSupport)=>{
    return (
        (support.supportsNodes?layer.supportsNodes===true:true) &&
        (support.supportsEdges?layer.supportsEdges===true:true) &&
        (support.supportsEmbeddings?layer.supportsEmbeddings===true:true)
    )
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
     */
    supportsNodes?:boolean;

    /**
     * If true the layer can be used for edge operations.
     */
    supportsEdges?:boolean;

    /**
     * If true the layer can be used for embedding operations.
     */
    supportsEmbeddings?:boolean;
}

export interface ConvoDbLayerConfig extends Required<ConvoDbLayerSupport>
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

interface Layer extends ConvoDbLayerConfig
{
    db?:ConvoDb;
}

interface LayerInst extends ConvoDbLayerConfig
{
    db:ConvoDb;
}

export interface LayeredConvoDbOptions extends BaseConvoDbOptions
{
    layers:ConvoDbLayerConfig[];
}

export class LayeredConvoDb extends BaseConvoDb
{

    private readonly layers:Layer[]=[];

    public constructor({
        layers,
        ...options
    }:LayeredConvoDbOptions){
        super(options);

        this.layers=layers.map<Layer>(l=>{
            l={...l};
            const p=normalizeConvoNodePath(l.mountPoint,'none');
            if(!p){
                throw new Error(`Invalid ConvoDb layer mountPoint path - ${l.mountPoint}`);
            }
            l.mountPoint=p;
            if(!l.mountPoint.endsWith('/')){
                l.mountPoint+='/';
            }
            return l;
        });
    }

    public getLayersByPath(support:ConvoDbLayerSupport,path:string,wildcard?:boolean,layers:LayerInst[]=[]):LayerInst[]{


        const p=normalizeConvoNodePath(path,'end');
        if(!p){
            return [];
        }
        path=p;

        if(wildcard===undefined){
            wildcard=path.endsWith('*');
        }
        if(!path.endsWith('/')){
            path+='/'
        }


        for(let i=0;i<this.layers.length && (wildcard || !layers.length);i++){
            const layer=this.layers[i];
            if( !layer ||
                !path.startsWith(layer.mountPoint) ||
                !hasSupport(layer,support) ||
                layers.some(d=>layer.mountPoint.startsWith(d.mountPoint))
            ){
                continue;
            }

            if(layer.db){
                layers.push(layer as LayerInst);
                continue;
            }

            if(layer.serviceTag){
                const db=convoDbService.get(layer.serviceTag);
                if(db){
                    layer.db=db;
                    layers.push(layer as LayerInst);
                    continue;
                }
            }

            if(layer.createDb){
                const db=layer.createDb();
                layer.db=db;
                layers.push(layer as LayerInst);
                continue;
            }
        }

        return layers;
    }

    private getPathGroups(support:ConvoDbLayerSupport,paths:string[]){
        const groups:{paths:string[],db:ConvoDb}[]=[];
        for(const path of paths){
            const db=this.getLayersByPath(support,path)[0]?.db;
            if(!db){
                continue
            }
            const match=groups.find(g=>g.db===db);
            if(match){
                match.paths.push(path);
            }else{
                groups.push({paths:[path],db});
            }
        }
        return groups;
    }

    override readonly _driver:ConvoDbDriver={
        selectEdgesByPathsAsync:async (keys: (keyof ConvoNodeEdge)[] | "*", fromPathsIn: string[], toPathsIn: string[], hasGrant: boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>=>{
            const groups=this.getPathGroups({supportsEdges:true},fromPathsIn);
            const results=await Promise.all(groups.map(g=>g.db._driver.selectEdgesByPathsAsync(keys,g.paths,toPathsIn,hasGrant)));
            const edges:Partial<ConvoNodeEdge>[]=[];
            for(const r of results){
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
            const results=await Promise.all(groups.map(g=>g.db._driver.selectNodesByPathsAsync(keys,g.paths,orderBy)));
            const nodes:Partial<ConvoNode>[]=[];
            for(const r of results){
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
        selectNodePathsForPathAsync:(step: Required<Pick<ConvoNodeQueryStep, "path">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            throw new Error("Function not implemented.");
        },
        selectNodePathsForConditionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "condition">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            throw new Error("Function not implemented.");
        },
        selectNodePathsForPermissionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "permissionFrom" | "permissionRequired">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            throw new Error("Function not implemented.");
        },
        selectNodePathsForEmbeddingAsync:async (step: Required<Pick<ConvoNodeQueryStep, "embedding">>, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            throw new Error("Function not implemented.");
        },
        selectEdgeNodePathsForConditionAsync:async (step: Required<Pick<ConvoNodeQueryStep, "edge" | "edgeDirection">> & Pick<ConvoNodeQueryStep, "edgeLimit">, currentNodePaths: string[] | null, orderBy: ConvoNodeOrderBy[], limit: number, offset: number, nextToken: string | undefined): PromiseResultType<ConvoDbDriverPathsResult>=>{
            throw new Error("Function not implemented.");
        },
        insertNodeAsync:async (node: ConvoNode, options: Omit<InsertConvoNodeOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNode> =>{
            throw new Error("Method not implemented.");
        },
        updateNodeAsync:async (node: ConvoNodeUpdate, options: Omit<UpdateConvoNodeOptions, "permissionFrom" | "mergeData"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        deleteNodeAsync:async (path: string, options: Omit<DeleteConvoNodeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        insertEdgeAsync:async (edge: Omit<ConvoNodeEdge, "id">, options: Omit<InsertConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNodeEdge> =>{
            throw new Error("Method not implemented.");
        },
        updateEdgeAsync:async (update: ConvoNodeEdgeUpdate, options: Omit<UpdateConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        deleteEdgeAsync:async (id: string, options: Omit<DeleteConvoNodeEdgeOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        insertEmbeddingAsync:async (embedding: Omit<ConvoNodeEmbedding, "id">, options: Omit<InsertConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultType<ConvoNodeEmbedding> =>{
            throw new Error("Method not implemented.");
        },
        deleteEmbeddingAsync:async (id: string, options: Omit<DeleteConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        updateEmbeddingAsync:async (update: ConvoNodeEmbeddingUpdate, options: Omit<UpdateConvoNodeEmbeddingOptions, "permissionFrom"> | undefined): PromiseResultTypeVoid =>{
            throw new Error("Method not implemented.");
        },
        queryEdgesAsync:(query: ConvoNodeEdgeQuery): PromiseResultType<ConvoNodeEdgeQueryResult>=>{
            throw new Error("Method not implemented.");
        },
        queryEmbeddingsAsync:(query: ConvoNodeEmbeddingQuery): PromiseResultType<ConvoNodeEmbeddingQueryResult>=>{
            throw new Error("Method not implemented.");
        },
        
    }
    
}

