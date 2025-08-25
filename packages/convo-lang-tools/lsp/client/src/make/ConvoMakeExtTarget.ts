import { ConvoMakeCtrl, ConvoMakeTargetCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult, ThemeIcon } from "vscode";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtTargetList extends ConvoMakeExtTreeItem<ConvoMakeCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeCtrl>){
        super({
            ...options,
            id:'target-list',
            name:'targets',
            type:'targetList',
            expand:true,
        });
        options.ctrl.targetsSubject.subscribe(()=>{
            this.tree.triggerTreeChange(this);
        })
    }

    public getChildren():ProviderResult<any[]>
    {
        console.log('hio 👋 👋 👋 GET TARGETS',this.obj.targets);
        return this.obj.targets.map((target,index)=>new ConvoMakeExtTarget({
            ...this.getBaseParams(),
            obj:target,
        },index));
    }
}

export class ConvoMakeExtTarget extends ConvoMakeExtTreeItem<ConvoMakeTargetCtrl>
{

    public constructor(options:ConvoMakeExtTreeItemOptionsBase<ConvoMakeTargetCtrl>,index:number){
        super({
            ...options,
            id:`target::${index}::${options.obj.target.out}`,
            name:options.obj.target.out,
            type:'target',
            icon:getIcon(options.obj)
        });
        // this.obj.stateSubject.subscribe(()=>{
        //     this.iconPath=getIcon(this.obj);
        // })
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj.target,this.getBaseParams())
    }
}

const getIcon=(target:ConvoMakeTargetCtrl)=>{
    return new ThemeIcon(
        target.state==='complete'?
            'check'
        :target.isDisposed?
            'debug-stop'
        :target.state==='building'?
            'debug-start'
        :target.state==='skipped'?
            'watch'
        :
            'debug-stop'
    )
}
