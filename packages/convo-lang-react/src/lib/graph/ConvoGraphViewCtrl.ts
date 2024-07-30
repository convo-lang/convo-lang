import { Point, ReadonlySubject } from "@iyio/common";
import { ConvoGraphCtrl, ConvoGraphDb, hasConvoGraphDb } from "@iyio/convo-lang";
import { BehaviorSubject } from "rxjs";
import { ConvoLineCtrl } from "./ConvoLineCtrl";
import { ConvoEntityLayoutCtrl, ConvoInputSource } from "./convo-graph-react-type";

export interface ConvoGraphViewCtrlOptions
{
    ctrl:ConvoGraphCtrl;
}

export class ConvoGraphViewCtrl
{


    public readonly entityCtrls:Record<string,ConvoEntityLayoutCtrl>={};

    public readonly graph:ConvoGraphDb;

    public readonly ctrl:ConvoGraphCtrl;

    public readonly lineCtrl:ConvoLineCtrl;

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

    public constructor({
        ctrl
    }:ConvoGraphViewCtrlOptions){
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

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
    }

    public getLayoutForElem(elem:HTMLElement){
        for(const e in this.entityCtrls){
            const l=this.entityCtrls[e];
            if(l?.elem===elem){
                return l;
            }
        }
        return undefined;
    }



}
