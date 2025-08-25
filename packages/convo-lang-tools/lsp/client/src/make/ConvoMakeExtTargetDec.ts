import { ConvoMakeTargetDeclaration } from "@convo-lang/convo-lang";
import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { asArray } from "@iyio/common";
import { ProviderResult } from "vscode";
import { getConvoExtMakeMetadataOrCreateValue } from "./convo-make-ext-lib";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtTargetDecList extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:'target-dec-list',
            name:'target declarations',
            type:'targetDecList',
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return this.obj.options.targets.map((target,index)=>getConvoExtMakeMetadataOrCreateValue(target,'targetDec',()=>new ConvoMakeExtTargetDec({
            ...this.getBaseParams(),
            obj:target,
        },index)));
    }
}

export class ConvoMakeExtTargetDec extends ConvoMakeExtTreeItem<ConvoMakeTargetDeclaration>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeTargetDeclaration>,index:number){
        super({
            ...options,
            id:`target-dec::${index}::${asArray(options.obj.out).join(', ')}`,
            name:asArray(options.obj.out).join(', '),
            type:'targetDec'
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj,this.getBaseParams())
    }
}

