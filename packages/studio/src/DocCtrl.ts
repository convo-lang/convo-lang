import { ObjWatchEvt } from "@iyio/common";
import { BindingCtrl, BindingCtrlOptions } from "./BindingCtrl.js";
import { CellCtrl } from "./CellCtrl.js";
import { defaultStudioDocTask, parseStudioUri } from "./convo-studio-lib.js";
import { StudioDoc, StudioDocTask, StudioUri } from "./convo-studio-types.js";
import { WindowCtrl } from "./WindowCtrl.js";

export interface DocCtrlOptions extends BindingCtrlOptions<StudioDoc>
{
    cell:CellCtrl;
}

export class DocCtrl extends BindingCtrl<StudioDoc>
{
    public readonly uri:StudioUri;
    public readonly invalidUri:boolean;
    public readonly isReadonly:boolean;
    public readonly cell:CellCtrl;
    public readonly window:WindowCtrl;
    public readonly task:StudioDocTask;

    public constructor({
        cell,
        ...options
    }:DocCtrlOptions){
        super(options);
        this.cell=cell;
        this.window=cell.window;
        const uri=parseStudioUri(options.obj.uri,options.studio.workspacePath);
        if(uri){
            this.uri=uri;
            this.invalidUri=false;
            this.isReadonly=false;
        }else{
            this.uri=parseStudioUri('./invalid-uri')!;
            this.invalidUri=true;
            this.isReadonly=true;
        }
        this.task=options.obj.task??(this.uri.protocol==='form'?"form":defaultStudioDocTask);
    }

    public override sync(evt: ObjWatchEvt<StudioDoc>):void{
        
    }
}