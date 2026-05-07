import { ObjectBinding } from "@convo-lang/convo-lang";
import { getContentType, ObjWatchEvt, ReadonlySubject, uuid, wSetProp } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { CellCtrl } from "./CellCtrl.js";
import { areStudioUrisEqual, defaultStudioDocTask, parseStudioUri } from "./convo-studio-lib.js";
import { Studio, StudioCell, StudioDoc, StudioDocTask, StudioUri, StudioWindow, TmpStudioIo } from "./convo-studio-types.js";
import { DocCtrl } from "./DocCtrl.js";
import { WindowCtrl } from "./WindowCtrl.js";

export interface StudioCtrlOptions
{
    workspacePath:string;
    studio?:Studio;
    tmpIo:TmpStudioIo;
}

/**
 *
 * ## Structure
 *
 * StudioCtrl
 *  |
 *  +-- windows[]
 *      |
 *      +-- WindowCtrl
 *          |
 *          +-- cells[] (grid layout)
 *              |
 *              +-- CellCtrl (cell in grid with tabs)
 *                  |
 *                  +-- docs[] (tabs)
 *                      |
 *                      +-- DocCtrl (tab)
 * 
 * ## Data binding
 * Controllers bind to their associated object using object watchers from `@iyio/common` and changes
 * are made to objects using the wSetProp function.
 */
export class StudioCtrl extends ObjectBinding<Studio>
{

    public readonly workspacePath:string;

    private readonly tmpIo:TmpStudioIo;

    public constructor({
        workspacePath,
        studio={windows:[]},
        tmpIo,
    }:StudioCtrlOptions){
        super({obj:studio});
        this.workspacePath=workspacePath;
        this.tmpIo=tmpIo;
    }

    public override sync(evt:ObjWatchEvt<Studio>):void{
        const current=this._windows.value;
        const update=this.obj.windows.map(obj=>{
            return current.find(w=>w.obj===obj)??new WindowCtrl({
                studio:this,
                obj,
            })
        })
        this._windows.next(update);

        for(const ctrl of current){
            if(!update.includes(ctrl)){
                ctrl.dispose();
            }
        }
    }

    private readonly _cwd:BehaviorSubject<string>=new BehaviorSubject<string>('.');
    public get cwdSubject():ReadonlySubject<string>{return this._cwd}
    public get cwd(){return this._cwd.value}
    public set cwd(value:string){
        if(value==this._cwd.value){
            return;
        }
        this._cwd.next(value);
    }

    private readonly _activeWindow:BehaviorSubject<WindowCtrl|null>=new BehaviorSubject<WindowCtrl|null>(null);
    public get activeWindowSubject():ReadonlySubject<WindowCtrl|null>{return this._activeWindow}
    public get activeWindow(){return this._activeWindow.value}
    public set activeWindow(value:WindowCtrl|null){
        if(value==this._activeWindow.value){
            return;
        }

        if(value && value.studio!==this){
            throw new Error('No allowed set studio active window to window belonging to different studio');
        }

        this._activeWindow.next(value);
    }

    private readonly _windows:BehaviorSubject<WindowCtrl[]>=new BehaviorSubject<WindowCtrl[]>([]);
    public get windowsSubject():ReadonlySubject<WindowCtrl[]>{return this._windows}
    public get windows(){return this._windows.value}


    public async openDocAsync(uri:string|StudioUri|null|undefined,setActive=true):Promise<DocCtrl|undefined>{

        uri=parseStudioUri(uri,this.workspacePath);

        if(!uri){
            return undefined;
        }

        const existing=this.findDoc(uri);
        if(existing){
            if(setActive){
                this.activateDoc(existing);
            }
            return existing;
        }

        let content:string|undefined;

        if(uri.protocol==='file'){
            content=await this.tmpIo.readFileAsync(uri.path);
        }
        const doc:StudioDoc={
            name:uri.basename,
            uri:uri.uri,
            contentType:getContentType(uri.basename),
            content:content??'',
        }

        const docCtrl=this.getWorkingWindow().getWorkingCell().createDoc(doc);
        

        if(setActive){
            this.activateDoc(docCtrl);
        }

        return docCtrl;

    }

    public closeDoc(doc:DocCtrl)
    {
        const cell=doc.cell;
        this._closeDoc(doc);

        if(cell.docs.length===0){
            this.closeCell(cell);
        }
    }

    private _closeDoc(doc:DocCtrl)
    {
        const cell=doc.cell;
        if(cell.activeDoc===doc){
            cell.activeDoc=null;
        }
        wSetProp(cell.obj,'docs',cell.obj.docs.filter(d=>d!==doc.obj));

    }

    public closeCell(cell:CellCtrl){
        const docs=[...cell.docs];
        for(const d of docs){
            this._closeDoc(d);
        }

        const window=cell.window;
        if(window.activeCell===cell){
            window.activeCell=null;
        }
        wSetProp(window.obj,'cells',window.obj.cells.filter(d=>d!==cell.obj));
    }

    public findDoc(uri:string|StudioUri|null|undefined):DocCtrl|undefined{
        uri=parseStudioUri(uri,this.workspacePath);
        if(!uri){
            return undefined;
        }
        for(const win of this.windows){
            for(const cell of win.cells){
                for(const doc of cell.docs){
                    if(areStudioUrisEqual(doc.uri,uri)){
                        return doc;
                    }
                }
            }
        }
        return undefined;
    }

    public activateDoc(doc:DocCtrl){
        doc.cell.activeDoc=doc;
        doc.window.activeCell=doc.cell;
        this.activeWindow=doc.window;

    }

    public getWorkingWindow():WindowCtrl
    {
        return this.activeWindow??this.windows[0]??this.createWindow();
    }

    public getWorkingWindowOrById(id:string|null|undefined):WindowCtrl{
        return this.windows.find(w=>w.obj.id===id)??this.getWorkingWindow();
    }

    public createWindow(window:StudioWindow={cells:[],id:uuid()}):WindowCtrl{
        wSetProp(this.obj,'windows',[...this.obj.windows,window]);
        const ctrl=this.windows.find(w=>w.obj===window);
        if(!ctrl){
            throw new Error('StudioCtrl sync failed');
        }
        return ctrl;
    }

    public getWindowCtrl(window:StudioWindow):WindowCtrl|undefined
    {
        for(const w of this.windows){
            if(w.obj===window){
                return w;
            }
        }
        return undefined;
    }

    public getCellCtrl(cell:StudioCell):CellCtrl|undefined
    {
        for(const w of this.windows){
            for(const c of w.cells){
                if(c.obj===cell){
                    return c;
                }
            }
        }
        return undefined;
    }

    public getDocCtrl(doc:StudioDoc):DocCtrl|undefined
    {
        for(const w of this.windows){
            for(const c of w.cells){
                for(const d of c.docs){
                    if(d.obj===doc){
                        return d;
                    }
                }
            }
        }
        return undefined;
    }

    public getDocByUriCtrl(uri:StudioUri|string|null|undefined,task?:StudioDocTask):DocCtrl|undefined
    {
        uri=parseStudioUri(uri,this.workspacePath);
        if(!uri){
            return undefined;
        }
        for(const w of this.windows){
            for(const c of w.cells){
                for(const d of c.docs){
                    if(task && (d.obj.task??defaultStudioDocTask)!==task){
                        continue;
                    }
                    if(areStudioUrisEqual(d.uri,uri)){
                        return d;
                    }
                }
            }
        }
        return undefined;
    }
}