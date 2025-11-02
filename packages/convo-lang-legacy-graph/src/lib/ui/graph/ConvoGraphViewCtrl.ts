import { DisposeContainer, Point, ReadonlySubject, Size, removeBehaviorSubjectAryValue, wAryPush } from "@iyio/common";
import { PanZoomCtrl } from "@iyio/react-common";
import { DragEvent } from "react";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { ConvoGraphCtrl } from "../../ConvoGraphCtrl.js";
import { compareConvoGraphSelections, createConvoGraphEntity, hasConvoGraphDb } from "../../convo-graph-lib.js";
import { ConvoEdge, ConvoGraphDb, ConvoGraphEntities, ConvoGraphEntityAny, ConvoGraphEntityRef, ConvoGraphSelection, ConvoInputTemplate, ConvoNode, ConvoSourceNode, ConvoTraverser } from "../../convo-graph-types.js";
import { ConvoLineCtrl } from "./ConvoLineCtrl.js";
import { getDarkConvoGraphStyle } from "./convo-graph-react-lib.js";
import { ConvoEntityLayoutCtrl, ConvoGraphEntityRenderResult, ConvoGraphEntityRenderer, ConvoGraphStyle, ConvoInputSource } from "./convo-graph-react-type.js";

export interface ConvoGraphViewCtrlOptions
{
    ctrl:ConvoGraphCtrl;
    style?:ConvoGraphStyle;
}

export class ConvoGraphViewCtrl
{


    public readonly entityCtrls:Record<string,ConvoEntityLayoutCtrl>={};

    public readonly graph:ConvoGraphDb;

    public readonly ctrl:ConvoGraphCtrl;

    public readonly lineCtrl:ConvoLineCtrl;

    private readonly _style:BehaviorSubject<ConvoGraphStyle>;
    public get styleSubject():ReadonlySubject<ConvoGraphStyle>{return this._style}
    public get style(){return this._style.value}
    public set style(value:ConvoGraphStyle){
        if(value==this._style.value){
            return;
        }
        this._style.next(value);
    }

    private readonly _selected:BehaviorSubject<ConvoGraphSelection|null>=new BehaviorSubject<ConvoGraphSelection|null>(null);
    public get selectedSubject():ReadonlySubject<ConvoGraphSelection|null>{return this._selected}
    public get selected(){return this._selected.value}

    private readonly _entityRenderers:BehaviorSubject<ConvoGraphEntityRenderer[]>=new BehaviorSubject<ConvoGraphEntityRenderer[]>([]);
    public get entityRenderersSubject():ReadonlySubject<ConvoGraphEntityRenderer[]>{return this._entityRenderers}
    public get entityRenderers(){return this._entityRenderers.value}
    public set entityRenderers(value:ConvoGraphEntityRenderer[]){
        if(value==this._entityRenderers.value){
            return;
        }
        this._entityRenderers.next(value);
    }

    private readonly _scale:BehaviorSubject<number>=new BehaviorSubject<number>(1);
    public get scaleSubject():ReadonlySubject<number>{return this._scale}
    public get scale(){return this._scale.value}
    public set scale(value:number){
        if(value==this._scale.value){
            return;
        }
        this._scale.next(value);
    }

    private readonly _offset:BehaviorSubject<Point>=new BehaviorSubject<Point>({x:0,y:0});
    public get offsetSubject():ReadonlySubject<Point>{return this._offset}
    public get offset(){return this._offset.value}
    public set offset(value:Point){
        if(value==this._offset.value){
            return;
        }
        this._offset.next(value);
    }

    private readonly _inputSources:BehaviorSubject<ConvoInputSource[]>=new BehaviorSubject<ConvoInputSource[]>([]);
    public get inputSourcesSubject():ReadonlySubject<ConvoInputSource[]>{return this._inputSources}
    public get inputSources(){return this._inputSources.value}
    public set inputSources(value:ConvoInputSource[]){
        if(value==this._inputSources.value){
            return;
        }
        this._inputSources.next(value);
    }

    private readonly _rootElem:BehaviorSubject<HTMLElement|null>=new BehaviorSubject<HTMLElement|null>(null);
    public get rootElemSubject():ReadonlySubject<HTMLElement|null>{return this._rootElem}
    public get rootElem(){return this._rootElem.value}
    public set rootElem(value:HTMLElement|null){
        if(value==this._rootElem.value){
            return;
        }
        this._rootElem.next(value);
    }
    private readonly _panZoom:BehaviorSubject<PanZoomCtrl|null>=new BehaviorSubject<PanZoomCtrl|null>(null);
    public get panZoomSubject():ReadonlySubject<PanZoomCtrl|null>{return this._panZoom}
    public get panZoom(){return this._panZoom.value}
    public set panZoom(value:PanZoomCtrl|null){
        if(value==this._panZoom.value){
            return;
        }
        this._panZoom.next(value);
    }

    private readonly _dragNodeFrom:BehaviorSubject<ConvoNode|null>=new BehaviorSubject<ConvoNode|null>(null);
    public get dragNodeFromSubject():ReadonlySubject<ConvoNode|null>{return this._dragNodeFrom}
    public get dragNodeFrom(){return this._dragNodeFrom.value}
    public set dragNodeFrom(value:ConvoNode|null){
        if(value==this._dragNodeFrom.value){
            return;
        }
        this._dragNodeFrom.next(value);
    }

    private readonly _canvasSize:BehaviorSubject<Size>=new BehaviorSubject<Size>({
        width:globalThis.window?.innerWidth??1200,
        height:globalThis.window?.innerHeight??720
    });
    public get canvasSizeSubject():ReadonlySubject<Size>{return this._canvasSize}
    public get canvasSize(){return this._canvasSize.value}
    public set canvasSize(value:Size){
        if(value==this._canvasSize.value){
            return;
        }
        this._canvasSize.next(value);
    }


    private readonly _onDrop=new Subject<Point>();
    public get onDrop():Observable<Point>{return this._onDrop}

    public constructor({
        ctrl,
        style,
    }:ConvoGraphViewCtrlOptions){
        this._style=new BehaviorSubject<ConvoGraphStyle>(style??getDarkConvoGraphStyle());
        this.ctrl=ctrl;
        this.lineCtrl=new ConvoLineCtrl(this);
        if(hasConvoGraphDb(ctrl.store)){
            this.graph=ctrl.store.db;
        }else{
            this.graph={
                nodes:[],
                edges:[],
                traversers:[],
                inputs:[],
                sourceNodes:[],
            }
        }
    }

    protected readonly disposeContainer=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposeContainer.dispose();
    }

    public getLayoutForElem(elem:HTMLElement):ConvoEntityLayoutCtrl|undefined{
        for(const e in this.entityCtrls){
            const l=this.entityCtrls[e];
            if(l?.elem===elem){
                return l;
            }
        }
        return undefined;
    }

    public getLayoutForEntity(entity:ConvoNode|ConvoEdge|ConvoTraverser|ConvoInputTemplate|ConvoSourceNode):ConvoEntityLayoutCtrl|undefined{
        for(const e in this.entityCtrls){
            const l=this.entityCtrls[e];
            if(l?.entity===entity){
                return l;
            }
        }
        return undefined;
    }

    public addRenderer(renderer:ConvoGraphEntityRenderer){
        this._entityRenderers.next([...this._entityRenderers.value,renderer]);
    }

    public removeRenderer(renderer:ConvoGraphEntityRenderer){
        removeBehaviorSubjectAryValue(this._entityRenderers,renderer);
    }

    public renderEntity(entity:ConvoGraphEntityRef|null|undefined):ConvoGraphEntityRenderResult|null{
        if(!entity){
            return null;
        }
        for(const renderer of this._entityRenderers.value){
            const result=renderer(entity);
            if(result){
                return result;
            }
        }
        return null;
    }

    public select(entity:ConvoGraphEntities|ConvoGraphEntities[]):ConvoGraphSelection|null{
        if(Array.isArray(entity)){
            const first=entity[0];
            if(!first){
                return null;
            }
            const e=createConvoGraphEntity(first);
            if(!e){
                return null;
            }
            const selected:ConvoGraphSelection={
                ...e,
                multi:entity.map(e=>createConvoGraphEntity(e)).filter(e=>e) as ConvoGraphEntityRef[]
            }
            if(compareConvoGraphSelections(this.selected,selected)){
                return this.selected;
            }
            this._selected.next(selected);
            return selected;

        }else{
            const e=createConvoGraphEntity(entity);
            if(!e){
                return null;
            }
            const selected:ConvoGraphSelection={
                ...e,
                multi:[e]
            }
            if(compareConvoGraphSelections(this.selected,selected)){
                return this.selected;
            }
            this._selected.next(selected);
            return selected;
        }
    }

    public deselect()
    {
        this._selected.next(null);
    }

    public isSelected(entity:ConvoGraphEntityAny|null|undefined):boolean{
        const s=this.selected;
        if(!s || !entity){
            return false;
        }
        return s.id===entity.id || s.multi.some(e=>e.id===entity.id);
    }

    public triggerOnDrop(e:DragEvent){
        if(!this.panZoom){
            return;
        }
        const pt=this.panZoom.transformClientPointToPlane({x:e.clientX,y:e.clientY});
        this._onDrop.next(pt);
    }

    protected beforeConnect(from:ConvoNode,to:ConvoNode,edge:ConvoEdge){
        //do nothing
    }
    public connect(from:ConvoNode,to:ConvoNode){

        const fl=this.getLayoutForEntity(from)?.getElementBounds({type:'shell'});
        const tl=this.getLayoutForEntity(to)?.getElementBounds({type:'shell'});

        if(!fl || !tl){
            return undefined;
        }

        const edge:ConvoEdge={
            id:this.ctrl.store.getNextEdgeId(),
            from:from.id,
            to:to.id,
        }
        let left:number;
        let right:number;
        if(fl.x<tl.x){
            left=fl.x+fl.width;
            right=tl.x;
        }else{
            left=tl.x+tl.width;
            right=fl.x;
        }

        let top:number;
        let bottom:number;
        if(fl.y<tl.y){
            top=fl.y;
            bottom=tl.y;
        }else{
            top=tl.y;
            bottom=fl.y;
        }

        edge.x=left+(right-left-200)/2;
        edge.y=top+(bottom-top)/2;


        this.beforeConnect(from,to,edge);
        wAryPush(this.graph.edges,edge);
        this.select({edge});
        return edge;
    }

}
