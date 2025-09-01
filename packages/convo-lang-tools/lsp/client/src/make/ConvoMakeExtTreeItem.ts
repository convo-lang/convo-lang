import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { ConvoExt } from "../ConvoExt";
import { ConvoMakeExtTreeItemType } from "./convo-make-ext-types";
import { ConvoMakeExtTree } from "./ConvoMakeExtTree";


export interface ConvoMakeExtTreeItemOptionsBase<T>
{
    tree:ConvoMakeExtTree;
    ext:ConvoExt;
    ctrl:ConvoMakeCtrl;
    obj:T;
    cState?:TreeItemCollapsibleState;
    noChildren?:boolean;
    expand?:boolean;
    icon?:string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
}


export interface ConvoMakeExtTreeItemOptions<T> extends ConvoMakeExtTreeItemOptionsBase<T>
{
    id:string;
    name:string;
    type:ConvoMakeExtTreeItemType;
}

export abstract class ConvoMakeExtTreeItem<T> extends TreeItem
{
    public readonly tree:ConvoMakeExtTree;
    public readonly ext:ConvoExt;

    public readonly name:string;
    public readonly type:ConvoMakeExtTreeItemType;
    public readonly ctrl:ConvoMakeCtrl;
    public readonly obj:T;

    public constructor({
        name,
        tree,
        ctrl,
        type,
        ext,
        obj,
        noChildren,
        expand,
        cState=noChildren?TreeItemCollapsibleState.None:expand?TreeItemCollapsibleState.Expanded:TreeItemCollapsibleState.Collapsed,
        id,
        icon,
    }:ConvoMakeExtTreeItemOptions<T>){
        super(name,cState);
        this.id=`${ctrl.id}::${id}`;
        this.iconPath=icon;
        this.name=name;
        this.type=type;
        this.tree=tree;
        this.ctrl=ctrl;
        this.ext=ext;
        this.obj=obj;
        this.contextValue=type;
    }

    public getBaseParams():Omit<ConvoMakeExtTreeItemOptionsBase<T>,'obj'>{
        return {
            ctrl:this.ctrl,
            ext:this.ext,
            tree:this.tree,
        }
    }

    public abstract getChildren():ProviderResult<ConvoMakeExtTreeItem<any>[]>;




}
