import { convoUsageTokensToString } from "@convo-lang/convo-lang";
import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult } from "vscode";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson.js";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem.js";



export class ConvoMakeExtTokenUsage extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        const getName=()=>{
            return `token usage (${convoUsageTokensToString(options.obj.usage)})`
        }
        super({
            ...options,
            id:'token-usage',
            name:getName(),
            type:'tokenUsage',
        });
        options.ctrl.usageSubject.subscribe(()=>{
            this.tree.triggerTreeChange(this);
            this.label=getName();
        })
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj.usage,this.getBaseParams())
    }
}
