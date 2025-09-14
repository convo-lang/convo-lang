import { DisposeContainer } from "@iyio/common";
import { EventEmitter, ProviderResult, TreeDataProvider, TreeItem } from "vscode";
import { ConvoExt } from "../ConvoExt.js";
import { ConvoMakeExtBuild } from "./ConvoMakeExtBuild.js";
import { ConvoMakeExtTreeItem } from "./ConvoMakeExtTreeItem.js";
import { getConvoExtMakeMetadataOrCreateValue } from "./convo-make-ext-lib.js";


export interface ConvoMakeExtTreeOptions
{
    ext:ConvoExt;
}

export class ConvoMakeExtTree implements TreeDataProvider<ConvoMakeExtTreeItem<any>>
{

    public readonly ext:ConvoExt;

    public constructor({
        ext
    }:ConvoMakeExtTreeOptions){
        this.ext=ext;

        let iv:any=0;
        const update=()=>{
            clearInterval(iv);
            iv=setTimeout(()=>{
                this._onDidChangeTreeData.fire(null);
            },50);
        }
        this.disposables.addSub(ext.onBuildEvent.subscribe(update));
        this.disposables.addSub(ext.makeCtrlsSubject.subscribe(update));
    }

    private readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
    }

    private readonly _onDidChangeTreeData=new EventEmitter<ConvoMakeExtTreeItem<any>|null>();
    public get onDidChangeTreeData(){return this._onDidChangeTreeData.event};
    public triggerTreeChange(item:ConvoMakeExtTreeItem<any>|null){
        this._onDidChangeTreeData.fire(item);
    }

    public getTreeItem(element:ConvoMakeExtTreeItem<any>):TreeItem|Thenable<TreeItem>{
        return element;
    }

    public getChildren(element?:ConvoMakeExtTreeItem<any>|undefined):ProviderResult<ConvoMakeExtTreeItem<any>[]>{

        if(element){
            return element.getChildren();
        }else{
            return this.ext.makeCtrls.map(e=>getConvoExtMakeMetadataOrCreateValue(e,'build',()=>{
                return new ConvoMakeExtBuild({
                    ctrl:e,
                    obj:e,
                    ext:this.ext,
                    tree:this,
                })
            }))
        }
    }


}
