import { ObjWatchEvt, ReadonlySubject, uuid, wSetProp } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { BindingCtrl } from "./BindingCtrl.js";
import { CellCtrl } from "./CellCtrl.js";
import { StudioCell, StudioWindow } from "./convo-studio-types.js";

export class WindowCtrl extends BindingCtrl<StudioWindow>
{

    private readonly _activeCell:BehaviorSubject<CellCtrl|null>=new BehaviorSubject<CellCtrl|null>(null);
    public get activeCellSubject():ReadonlySubject<CellCtrl|null>{return this._activeCell}
    public get activeCell(){return this._activeCell.value}
    public set activeCell(value:CellCtrl|null){
        if(value==this._activeCell.value){
            return;
        }
        if(value && value.window!==this){
            throw new Error('No allowed set window active cell to cell belonging to different window');
        }
        this._activeCell.next(value);
    }

    private readonly _cells:BehaviorSubject<CellCtrl[]>=new BehaviorSubject<CellCtrl[]>([]);
    public get cellsSubject():ReadonlySubject<CellCtrl[]>{return this._cells}
    public get cells(){return this._cells.value}

    public override sync(evt:ObjWatchEvt<StudioWindow>):void{
        const current=this._cells.value;
        const update=this.obj.cells.map(obj=>{
            return current.find(w=>w.obj===obj)??new CellCtrl({
                studio:this.studio,
                window:this,
                obj,
            })
        });
        this._cells.next(update);
        for(const ctrl of current){
            if(!update.includes(ctrl)){
                ctrl.dispose();
            }
        }
    }

    public getWorkingCell()
    {
        return this.activeCell??this.cells[0]??this.createCell();

    }
    
    public createCell(cell:StudioCell={docs:[],id:uuid()}):CellCtrl{
        wSetProp(this.obj,'cells',[...this.obj.cells,cell]);
        const ctrl=this.cells.find(w=>w.obj===cell);
        if(!ctrl){
            throw new Error('WindowCtrl sync failed');
        }
        return ctrl;
    }
}