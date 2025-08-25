import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult, ThemeIcon } from "vscode";
import { getConvoExtMakeMetadataOrCreateValue } from './convo-make-ext-lib';
import { ConvoMakeExtPassList } from "./ConvoMakeExtPass";
import { ConvoMakeExtStageList } from "./ConvoMakeExtStage";
import { ConvoMakeExtTargetList } from "./ConvoMakeExtTarget";
import { ConvoMakeExtTargetDecList } from "./ConvoMakeExtTargetDec";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtBuild extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:options.ctrl.id,
            name:options.ctrl.name,
            type:'build',
            expand:true,
            icon:getIcon(options.ctrl)
        });
        this.ctrl.onBuildEvent.subscribe(()=>{
            if(this.ctrl.isDisposed || this.ctrl.complete){
                this.iconPath=getIcon(this.ctrl);
            }
        })
    }

    public getChildren():ProviderResult<ConvoMakeExtTreeItem<any>[]>
    {
        return [
            getConvoExtMakeMetadataOrCreateValue(this.obj,'stageList',()=>new ConvoMakeExtStageList({
                ...this.getBaseParams(),
                obj:this.obj,
            })),
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
        ]
    }
}

const getIcon=(ctrl:ConvoMakeCtrl)=>{
    return new ThemeIcon(ctrl.complete?'check':ctrl.isDisposed?'debug-stop':'debug-start')
}
