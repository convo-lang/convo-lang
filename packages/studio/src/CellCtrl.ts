import { ObjWatchEvt, ReadonlySubject, wSetProp } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { BindingCtrl, BindingCtrlOptions } from "./BindingCtrl.js";
import { StudioCell, StudioDoc } from "./convo-studio-types.js";
import { DocCtrl } from "./DocCtrl.js";
import { WindowCtrl } from "./WindowCtrl.js";

export interface CellCtrlOptions extends BindingCtrlOptions<StudioCell>
{
    window:WindowCtrl;
}

export class CellCtrl extends BindingCtrl<StudioCell>
{

    public readonly window:WindowCtrl;

    private readonly _activeDoc:BehaviorSubject<DocCtrl|null>=new BehaviorSubject<DocCtrl|null>(null);
    public get activeDocSubject():ReadonlySubject<DocCtrl|null>{return this._activeDoc}
    public get activeDoc(){return this._activeDoc.value}
    public set activeDoc(value:DocCtrl|null){
        if(value==this._activeDoc.value){
            return;
        }

        if(value && value.cell!==this){
            throw new Error('No allowed set cell active doc to doc belonging to different cell');
        }

        this._activeDoc.next(value);
    }

    private readonly _docs:BehaviorSubject<DocCtrl[]>=new BehaviorSubject<DocCtrl[]>([]);
    public get docsSubject():ReadonlySubject<DocCtrl[]>{return this._docs}
    public get docs(){return this._docs.value}

    public constructor({
        window,
        ...options
    }:CellCtrlOptions){
        super(options);
        this.window=window;
    }

    public override sync(evt: ObjWatchEvt<StudioCell>):void{
        const current=this._docs.value;
        const update=this.obj.docs.map(obj=>{
            return current.find(w=>w.obj===obj)??new DocCtrl({
                studio:this.studio,
                cell:this,
                obj,
            })
        });
        this._docs.next(update);

        for(const ctrl of current){
            if(!update.includes(ctrl)){
                ctrl.dispose();
            }
        }
    }
    
    public createDoc(doc:StudioDoc){
        wSetProp(this.obj,'docs',[...this.obj.docs,doc]);
        const ctrl=this.docs.find(w=>w.obj===doc);
        if(!ctrl){
            throw new Error('CellCtrl sync failed');
        }
        return ctrl;
    }

}