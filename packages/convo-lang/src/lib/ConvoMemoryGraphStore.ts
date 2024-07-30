import { wAryPush, wArySplice } from "@iyio/common";
import { Observable, Subject } from "rxjs";
import { ConvoEdge, ConvoEdgeSide, ConvoGraphDb, ConvoGraphStore, ConvoGraphStoreEvt, ConvoNode, ConvoSourceNode, ConvoTraverser, IHasConvoGraphDb } from "./convo-graph-types";


export interface ConvoMemoryGraphStoreOptions
{
    db?:Partial<ConvoGraphDb>;
    graphId:string;
}

export class ConvoMemoryGraphStore implements ConvoGraphStore, IHasConvoGraphDb
{
    public readonly graphId:string;

    public db:ConvoGraphDb;


    private readonly _onDbChange=new Subject<ConvoGraphStoreEvt>();
    public get onDbChange():Observable<ConvoGraphStoreEvt>{return this._onDbChange}

    public constructor({
        graphId,
        db={
            nodes:[],
            edges:[],
            traversers:[],
        },
    }:ConvoMemoryGraphStoreOptions){
        this.graphId=graphId;
        this.db={
            nodes:db.nodes??[],
            edges:db.edges??[],
            traversers:db.traversers??[],
            inputs:db.inputs??[],
            sourceNodes:db.sourceNodes??[],
        }
        if(!this.db.inputs){
            this.db.inputs=[];
        }
    }

    public saveChangesAsync():Promise<void>{
        // do nothing
        return Promise.resolve();
    }

    public getNodeAsync(id:string):Promise<ConvoNode|undefined>
    {
        return Promise.resolve(this.db.nodes.find(g=>g.id===id));

    }

    public putNodeAsync(node:ConvoNode):Promise<void>
    {
        const index=this.db.nodes.findIndex(g=>g.id===node.id);
        if(index===-1){
            wAryPush(this.db.nodes,node);
        }else{
            wArySplice(this.db.nodes,index,1,node);
        }
        this._onDbChange.next({node,nodeId:node.id});
        return Promise.resolve();
    }

    public deleteNodeAsync(id:string):Promise<void>
    {
        const index=this.db.nodes.findIndex(g=>g.id===id);
        if(index!==-1){
            wArySplice(this.db.nodes,index,1);
        }
        this._onDbChange.next({nodeId:id});
        return Promise.resolve();
    }

    public getNodeEdgesAsync(nodeId:string,side:ConvoEdgeSide):Promise<ConvoEdge[]>
    {
        return Promise.resolve(this.db.edges.filter(e=>side==='to'?
            e.to===nodeId:
            e.from===nodeId
        ))
    }


    public getEdgeAsync(id:string):Promise<ConvoEdge|undefined>
    {
        return Promise.resolve(this.db.edges.find(g=>g.id===id));

    }

    public putEdgeAsync(edge:ConvoEdge):Promise<void>
    {
        const index=this.db.edges.findIndex(g=>g.id===edge.id);
        if(index===-1){
            wAryPush(this.db.edges,edge);
        }else{
            wArySplice(this.db.edges,index,1,edge);
        }
        this._onDbChange.next({edge,edgeId:edge.id});
        return Promise.resolve();
    }

    public deleteEdgeAsync(id:string):Promise<void>
    {
        const index=this.db.edges.findIndex(g=>g.id===id);
        if(index!==-1){
            wArySplice(this.db.edges,index,1);
        }
        this._onDbChange.next({edgeId:id});
        return Promise.resolve();
    }



    public getTraverserAsync(id:string):Promise<ConvoTraverser|undefined>
    {
        return Promise.resolve(this.db.traversers.find(g=>g.id===id));

    }

    public putTraverserAsync(traverser:ConvoTraverser):Promise<void>
    {
        const index=this.db.traversers.findIndex(g=>g.id===traverser.id);
        if(index===-1){
            wAryPush(this.db.traversers,traverser);
        }else{
            wArySplice(this.db.traversers,index,1,traverser);
        }
        this._onDbChange.next({traverser,traverserId:traverser.id});
        return Promise.resolve();
    }

    public deleteTraverserAsync(id:string):Promise<void>
    {
        const index=this.db.traversers.findIndex(g=>g.id===id);
        if(index!==-1){
            wArySplice(this.db.traversers,index,1);
        }
        this._onDbChange.next({traverserId:id});
        return Promise.resolve();
    }



    public getSourceNodesAsync():Promise<ConvoSourceNode[]>
    {
        return Promise.resolve([...this.db.sourceNodes]);

    }

    public getSourceNodeAsync(id:string):Promise<ConvoSourceNode|undefined>
    {
        return Promise.resolve(this.db.sourceNodes.find(g=>g.id===id));

    }

    public putSourceNodeAsync(sourceNode:ConvoSourceNode):Promise<void>
    {
        const index=this.db.sourceNodes.findIndex(g=>g.id===sourceNode.id);
        if(index===-1){
            wAryPush(this.db.sourceNodes,sourceNode);
        }else{
            wArySplice(this.db.sourceNodes,index,1,sourceNode);
        }
        this._onDbChange.next({sourceNode,traverserId:sourceNode.id});
        return Promise.resolve();
    }

    public deleteSourceNodeAsync(id:string):Promise<void>
    {
        const index=this.db.sourceNodes.findIndex(g=>g.id===id);
        if(index!==-1){
            wArySplice(this.db.sourceNodes,index,1);
        }
        this._onDbChange.next({traverserId:id});
        return Promise.resolve();
    }
}
