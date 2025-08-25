import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult } from "vscode";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";
import { ConvoMakeAppAndCtrl } from "./convo-make-ext-types";



export class ConvoMakeExtAppList extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:'app-list',
            name:'apps',
            type:'appList',
            expand:true,
        });
        options.ctrl.appsSubject.subscribe(()=>{
            this.tree.triggerTreeChange(this);
        })
    }

    public getChildren():ProviderResult<any[]>
    {
        return this.obj.options.apps.map((app,index)=>new ConvoMakeExtApp({
            ...this.getBaseParams(),
            obj:{app,ctrl:this.ctrl},
        },index));
    }
}

export class ConvoMakeExtApp extends ConvoMakeExtTreeItem<ConvoMakeAppAndCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeAppAndCtrl>,index:number){
        const app=options.obj.app;
        super({
            ...options,
            id:`app::${index}::${app.name}`,
            name:app.name+(app.host || app.port?` (${app.host??'localhost'}${app.port?`:${app.port}`:''})`:''),
            type:'target',
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj.app,this.getBaseParams())
    }
}
