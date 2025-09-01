import { ConvoMakeCtrl, ConvoMakeTargetCtrl } from "@convo-lang/convo-lang-make";
import { ProviderResult } from "vscode";
import { getConvoMakeExtJsonChildren } from "./ConvoMakeExtJson";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";
import { createConvoExtIcon } from "./convo-make-ext-lib";



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
        this.obj.reviewingSubject.subscribe(()=>{
            this.iconPath=getIcon(this.obj);
            this.updateContextValue();
        })
        this.updateContextValue();
    }

    public updateContextValue(){
        this.contextValue=(
            'target-'+
            (this.obj.reviewing?'reviewing':this.obj.state)+
            (this.obj.outExists?'-exists':'-notFound')+
            (this.obj.target.review?'-review':'-newReview')+
            (this.ctrl.preview?'-preview':'-noPreview')
        );
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj.target,this.getBaseParams())
    }
}

const getIcon=(target:ConvoMakeTargetCtrl)=>{
    return createConvoExtIcon(
        target.reviewing?
            'open-preview'
        :target.state==='complete'?
            'check'
        :target.isDisposed?
            (target.makeCtrl.preview?'circle':'debug-stop')
        :target.state==='building'?
            'sync~spin'
        :target.state==='skipped'?
            'watch'
        :
            'debug-stop'
    );
}
