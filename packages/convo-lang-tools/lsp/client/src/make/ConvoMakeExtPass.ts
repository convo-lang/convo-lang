import { ConvoMakeActivePass, ConvoMakePass } from "@convo-lang/convo-lang";
import { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult } from "vscode";
import { createConvoExtIcon, getConvoExtMakeMetadataOrCreateValue } from "./convo-make-ext-lib.js";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson.js";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem.js";



export class ConvoMakeExtPassList extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:'pass-list',
            name:'passes',
            type:'passList',
            expand:true,
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        const passes=this.obj.passes.map(pass=>getConvoExtMakeMetadataOrCreateValue(pass,'pass',()=>new ConvoMakeExtPass({
            ...this.getBaseParams(),
            obj:pass,
        })));

        if(this.obj.activePass){
            passes.push(new ConvoMakeExtPass({
                ...this.getBaseParams(),
                obj:this.obj.activePass,
            }))
        }

        return passes;
    }
}

export class ConvoMakeExtPass extends ConvoMakeExtTreeItem<ConvoMakeActivePass|ConvoMakePass>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeActivePass|ConvoMakePass>){
        super({
            ...options,
            id:`pass::${options.obj.index}::${options.obj.endTime}`,
            name:`pass ${options.obj.index+1}${options.obj.endTime===undefined?'':` (${Math.round((options.obj.endTime-options.obj.startTime)/1000)}s)`}`,
            type:'pass',
            icon:createConvoExtIcon((options.obj as ConvoMakePass).cancelled?'debug-stop':(options.obj.endTime || options.ctrl.isDisposed)?'check':'sync~spin'),
            expand:options.obj.endTime?false:true,
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj,this.getBaseParams())
    }
}

