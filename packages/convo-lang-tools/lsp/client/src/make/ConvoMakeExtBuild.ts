import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { normalizePath } from "@iyio/common";
import { ProviderResult, workspace } from "vscode";
import { createConvoExtIcon, getConvoExtMakeMetadataOrCreateValue } from './convo-make-ext-lib';
import { ConvoMakeExtAppList } from "./ConvoMakeExtApp";
import { ConvoMakeExtPassList } from "./ConvoMakeExtPass";
import { ConvoMakeExtStageList } from "./ConvoMakeExtStage";
import { ConvoMakeExtTargetList } from "./ConvoMakeExtTarget";
import { ConvoMakeExtTargetDecList } from "./ConvoMakeExtTargetDec";
import { ConvoMakeExtTokenUsage } from "./ConvoMakeExtTokenUsage";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtBuild extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{


    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        let name=normalizePath(options.ctrl.filePath);
        let dir=workspace.workspaceFolders?.[0]?.uri.path
        if(dir){
            dir=normalizePath(dir);
            if(!dir.endsWith('/')){
                dir+='/';
            }
            if(name.startsWith(dir)){
                name=name.substring(dir.length);
            }
        }
        super({
            ...options,
            id:options.ctrl.id,
            name,
            type:'build',
            expand:false,
            icon:getIcon(options.ctrl)
        });
        this.ctrl.onBuildEvent.subscribe(()=>{
            if(this.ctrl.isDisposed || this.ctrl.complete){
                this.iconPath=getIcon(this.ctrl);
            }
        });
        this.contextValue=options.ctrl.preview?'build':'build-active';
    }

    public getChildren():ProviderResult<ConvoMakeExtTreeItem<any>[]>
    {
        return [

            this.ctrl.preview?null:
            getConvoExtMakeMetadataOrCreateValue(this.obj,'tokenUsage',()=>new ConvoMakeExtTokenUsage({
                ...this.getBaseParams(),
                obj:this.obj,
            })),

            getConvoExtMakeMetadataOrCreateValue(this.obj,'appList',()=>new ConvoMakeExtAppList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),

            getConvoExtMakeMetadataOrCreateValue(this.obj,'stageList',()=>new ConvoMakeExtStageList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),

            this.ctrl.preview?null:
            getConvoExtMakeMetadataOrCreateValue(this.obj,'passList',()=>new ConvoMakeExtPassList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),

            getConvoExtMakeMetadataOrCreateValue(this.obj,'targetDecList',()=>new ConvoMakeExtTargetDecList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),

            getConvoExtMakeMetadataOrCreateValue(this.obj,'targetList',()=>new ConvoMakeExtTargetList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),
        ].filter(v=>v) as ConvoMakeExtTreeItem<any>[];
    }
}

const getIcon=(ctrl:ConvoMakeCtrl)=>{
    if(ctrl.preview){
        return undefined;
    }
    return createConvoExtIcon(ctrl.complete?'check':ctrl.isDisposed?'debug-stop':'sync~spin')
}
