import { ConvoMakeStage, ConvoMakeTargetDeclaration, defaultConvoMakeStageName } from "@convo-lang/convo-lang";
import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { asArray } from "@iyio/common";
import { ProviderResult } from "vscode";
import { getConvoExtMakeMetadataOrCreateValue } from "./convo-make-ext-lib";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtStageList extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:'stage-list',
            name:'stages',
            type:'stageList'
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return this.obj.options.stages.map(stage=>getConvoExtMakeMetadataOrCreateValue(stage,'stage',()=>new ConvoMakeExtStage({
            ...this.getBaseParams(),
            obj:stage,
        })))
    }
}

export class ConvoMakeExtStage extends ConvoMakeExtTreeItem<ConvoMakeStage>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeStage>){
        super({
            ...options,
            id:`stage::${options.obj.name}`,
            name:options.obj.name,
            type:'stage'
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        const targets=this.ctrl.options.targets.filter(t=>(t.stage??defaultConvoMakeStageName)===this.obj.name);
         return targets.map((target,index)=>getConvoExtMakeMetadataOrCreateValue(target,'stageTarget',()=>new ConvoMakeExtStageTarget({
            ...this.getBaseParams(),
            obj:target,
        },index)))
    }
}

export class ConvoMakeExtStageTarget extends ConvoMakeExtTreeItem<ConvoMakeTargetDeclaration>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeTargetDeclaration>,index:number){
        super({
            ...options,
            id:`stage::${options.obj.name}::${index}::${asArray(options.obj.out).join(', ')}`,
            name:asArray(options.obj.out).join(', '),
            type:'stageTarget',
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj,this.getBaseParams())
    }
}

