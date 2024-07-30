import { ReadonlySubject, aryDuplicateRemoveItem, shortUuid } from "@iyio/common";
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { Conversation, ConversationOptions } from "./Conversation";
import { LocalStorageConvoDataStore } from "./LocalStorageConvoDataStore";
import { getConvoPromptMediaUrl } from "./convo-lang-ui-lib";
import { ConvoComponentRenderer, ConvoDataStore, ConvoEditorMode, ConvoMessageRenderResult, ConvoMessageRenderer, ConvoPromptMedia } from "./convo-lang-ui-types";
import { removeDanglingConvoUserMessage } from "./convo-lib";
import { FlatConvoMessage } from "./convo-types";

export type ConversationUiCtrlTask='completing'|'loading'|'clearing'|'disposed';

export interface InitConversationUiCtrlConvoOptions
{
    appendTemplate:boolean;
}

export interface ConversationUiCtrlOptions
{
    id?:string;
    /**
     * If true and an id is given the conversation will be auto loaded.
     */
    autoLoad?:boolean;
    template?:string;
    convo?:Conversation;
    convoOptions?:ConversationOptions;
    initConvo?:(convo:Conversation)=>void;
    autoSave?:boolean;
    store?:null|'localStorage'|ConvoDataStore;
    removeDanglingUserMessages?:boolean;
    enableSlashCommand?:boolean;
}

export class ConversationUiCtrl
{

    public readonly id:string;

    public readonly autoSave:boolean;

    private readonly store:null|ConvoDataStore;

    private readonly convoOptions?:ConversationOptions;
    private readonly initConvoCallback?:(convo:Conversation)=>void;

    private readonly _lastCompletion:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get lastCompletionSubject():ReadonlySubject<string|null>{return this._lastCompletion}
    public get lastCompletion(){return this._lastCompletion.value}

    private readonly tasks:ConversationUiCtrlTask[]=[];
    private readonly _currentTask:BehaviorSubject<ConversationUiCtrlTask|null>=new BehaviorSubject<ConversationUiCtrlTask|null>(null);
    public get currentTaskSubject():ReadonlySubject<ConversationUiCtrlTask|null>{return this._currentTask}
    public get currentTask(){return this._currentTask.value}

    private readonly _template:BehaviorSubject<string|undefined>;
    public get templateSubject():ReadonlySubject<string|undefined>{return this._template}
    public get template(){return this._template.value}
    public set template(value:string|undefined){
        if(value==this._template.value){
            return;
        }
        this._template.next(value);
    }

    private readonly _removeDanglingUserMessages:BehaviorSubject<boolean>;;
    public get removeDanglingUserMessagesSubject():ReadonlySubject<boolean>{return this._removeDanglingUserMessages}
    public get removeDanglingUserMessages(){return this._removeDanglingUserMessages.value}
    public set removeDanglingUserMessages(value:boolean){
        if(value==this._removeDanglingUserMessages.value){
            return;
        }
        this._removeDanglingUserMessages.next(value);
    }

    private readonly _convo:BehaviorSubject<Conversation|null>=new BehaviorSubject<Conversation|null>(null);
    public get convoSubject():ReadonlySubject<Conversation|null>{return this._convo}
    public get convo(){return this._convo.value}

    private readonly _showSource:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get showSourceSubject():ReadonlySubject<boolean>{return this._showSource}
    /**
     * If true the source convo-lang syntax should be displayed to the user
     */
    public get showSource(){return this._showSource.value}
    public set showSource(value:boolean){
        if(value==this._showSource.value){
            return;
        }
        this._showSource.next(value);
    }

    private readonly _editorMode:BehaviorSubject<ConvoEditorMode>=new BehaviorSubject<ConvoEditorMode>('code');
    public get editorModeSubject():ReadonlySubject<ConvoEditorMode>{return this._editorMode}
    public get editorMode(){return this._editorMode.value}
    public set editorMode(value:ConvoEditorMode){
        if(value==this._editorMode.value){
            return;
        }
        this._editorMode.next(value);
    }

    private readonly _showSystemMessages:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get showSystemMessagesSubject():ReadonlySubject<boolean>{return this._showSystemMessages}
    /**
     * If true the system messages should be displayed to the user
     */
    public get showSystemMessages(){return this._showSystemMessages.value}
    public set showSystemMessages(value:boolean){
        if(value==this._showSystemMessages.value){
            return;
        }
        this._showSystemMessages.next(value);
    }

    private readonly _showFunctions:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get showFunctionsSubject():ReadonlySubject<boolean>{return this._showFunctions}
    /**
     * If true function calls should be displayed to the user
     */
    public get showFunctions(){return this._showFunctions.value}
    public set showFunctions(value:boolean){
        if(value==this._showFunctions.value){
            return;
        }
        this._showFunctions.next(value);
    }

    private readonly _enabledSlashCommands:BehaviorSubject<boolean>;
    public get enabledSlashCommandsSubject():ReadonlySubject<boolean>{return this._enabledSlashCommands}
    /**
     * If messages appended to the conversation using the appendUiMessage will be checked for messages
     * starting with a forward slash and be interpreted as a command.
     */
    public get enabledSlashCommands(){return this._enabledSlashCommands.value}
    public set enabledSlashCommands(value:boolean){
        if(value==this._enabledSlashCommands.value){
            return;
        }
        this._enabledSlashCommands.next(value);
    }

    private readonly _theme:BehaviorSubject<Record<string,any>>=new BehaviorSubject<Record<string,any>>({});
    public get themeSubject():ReadonlySubject<Record<string,any>>{return this._theme}
    public get theme(){return this._theme.value}
    public set theme(value:Record<string,any>){
        if(value==this._theme.value){
            return;
        }
        this._theme.next(value);
    }

    private readonly _mediaQueue:BehaviorSubject<(ConvoPromptMedia)[]>=new BehaviorSubject<(ConvoPromptMedia)[]>([]);
    public get mediaQueueSubject():ReadonlySubject<readonly (ConvoPromptMedia)[]>{return this._mediaQueue as any}
    public get mediaQueue():readonly (ConvoPromptMedia)[]{return this._mediaQueue.value}

    private readonly _collapsed:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(true);
    public get collapsedSubject():ReadonlySubject<boolean>{return this._collapsed}
    /**
     * Often used to indicate if the conversation is display in a collapsed state
     */
    public get collapsed(){return this._collapsed.value}
    public set collapsed(value:boolean){
        if(value==this._collapsed.value){
            return;
        }
        this._collapsed.next(value);
    }

    private readonly _onClear=new Subject<void>();
    public get onClear():Observable<void>{return this._onClear}

    public readonly componentRenderers:Record<string,ConvoComponentRenderer>={};

    public constructor({
        id,
        autoLoad,
        convo,
        initConvo,
        convoOptions,
        template,
        autoSave=false,
        removeDanglingUserMessages=false,
        store='localStorage',
        enableSlashCommand=false,
    }:ConversationUiCtrlOptions={}){

        this.id=id??shortUuid();

        this._removeDanglingUserMessages=new BehaviorSubject<boolean>(removeDanglingUserMessages);
        this._enabledSlashCommands=new BehaviorSubject(enableSlashCommand);

        this.convoOptions=convoOptions;
        this.initConvoCallback=initConvo;

        this._template=new BehaviorSubject(template);

        this.autoSave=autoSave;
        this.store=store==='localStorage'?
            new LocalStorageConvoDataStore():store;



        if(id!==undefined && autoLoad){
            if(convo){
                this.setConvo(convo);
            }
            this.loadAsync();
        }else{
            this.setConvo(convo??this.createConvo(true))
        }
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this._currentTask.next('disposed');
        if(this.convoTaskSub){
            this.convoTaskSub.unsubscribe();
            this.convoTaskSub=null;
        }
    }

    protected initConvo(convo:Conversation,options:InitConversationUiCtrlConvoOptions){
        if(this.initConvoCallback){
            this.initConvoCallback(convo);
        }
        if(options.appendTemplate && this.template){
            convo.append(this.template);
        }
    }

    private createConvo(appendTemplate:boolean){
        const convo=new Conversation(this.convoOptions);
        this.initConvo(convo,{appendTemplate});
        return convo;
    }

    public async loadAsync():Promise<boolean>{
        if(this.isDisposed || this.currentTask || !this.store?.loadConvo){
            return false;
        }
        this.pushTask('loading');
        try{
            const str=await this.store?.loadConvo?.(this.id);
            if(this.isDisposed){
                return false;
            }
            const convo=this.createConvo(str?false:true);
            if(str){
                convo.append(str);
            }
            this.setConvo(convo);

        }finally{
            this.popTask('loading');
        }

        return true;
    }

    public clear(){
        if(this.isDisposed || this.currentTask){
            return false;
        }
        this.setConvo(this.createConvo(true));
        if(this.autoSave){
            this.queueAutoSave();
        }
        this._onClear.next();
        return true;
    }

    private pushTask(task:ConversationUiCtrlTask){
        this.tasks.push(task);
        if(this._currentTask.value!==task){
            this._currentTask.next(task);
        }
    }

    private popTask(task:ConversationUiCtrlTask){
        if(this.isDisposed){
            return;
        }
        const i=this.tasks.lastIndexOf(task);
        if(i===-1){
            console.error(`ConversationUiCtrl.popTask out of sync. (${task}) not in current list`);
            return;
        }
        this.tasks.splice(i,1);
        const next=this.tasks[this.tasks.length-1]??null;
        if(this._currentTask.value!==next){
            this._currentTask.next(next);
        }
    }

    private convoTaskCount=0;
    private convoTaskSub:Subscription|null=null;
    private setConvo(convo:Conversation)
    {
        if(this.convoTaskSub){
            this.convoTaskSub.unsubscribe();
            this.convoTaskSub=null;
        }
        while(this.tasks.includes('completing')){
            this.popTask('completing');
        }
        this.convoTaskSub=convo.activeTaskCountSubject.subscribe(n=>{
            if(n===1){
                if(!this.tasks.includes('completing')){
                    this.pushTask('completing');
                }
            }else if(n===0){
                if(this.tasks.includes('completing')){
                    this.popTask('completing');
                }
            }
        })
        this._convo.next(convo);
    }


    public replace(convo:string):boolean{
        if(this.isDisposed || this.currentTask){
            return false;
        }

        if(this.removeDanglingUserMessages){
            convo=removeDanglingConvoUserMessage(convo);
        }


        const c=this.createConvo(false);
        try{
            c.append(convo);
        }catch{
            return false;
        }

        this.setConvo(c);

        if(this.autoSave){
            this.queueAutoSave();
        }

        return true;
    }

    public async replaceAndCompleteAsync(convo:string){
        if(!this.replace(convo)){
            return false;
        }
        if(this.currentTask){
            return false;
        }

        await this.convo?.completeAsync();
        this._lastCompletion.next(this.convo?.convo??null);

        if(this.autoSave){
            this.queueAutoSave();
        }
        return true;
    }

    public isSlashCommand(message:string){
        return cmdReg.test(message);
    }

    public async appendUiMessageAsync(message:string):Promise<boolean|'command'>{

        if(this.isDisposed){
            return false;
        }


        if(cmdReg.test(message)){
            if(!this._enabledSlashCommands.value){
                return false;
            }
            message=message.trim();
            switch(message){

                case '/source':
                    this.showSource=this.editorMode==='code'?!this.showSource:true;
                    this.editorMode='code';
                    break;

                case '/vars':
                    this.showSource=this.editorMode==='vars'?!this.showSource:true;
                    this.editorMode='vars';
                    break;

                case '/flat':
                    this.showSource=this.editorMode==='flat'?!this.showSource:true;
                    this.editorMode='flat';
                    break;

                case '/tree':
                    this.showSource=this.editorMode==='tree'?!this.showSource:true;
                    this.editorMode='tree';
                    break;

                case '/system':
                    this.showSystemMessages=!this.showSystemMessages;
                    break;

                case '/function':
                    this.showFunctions=!this.showFunctions;
                    break;

                case '/clear':
                    this.clear();
                    break;
            }
            return 'command';
        }

        const convo=this.convo;
        if(!convo || convo.isCompleting || this.currentTask){
            return false;
        }


        if(this.mediaQueue.length){
            message+='\n\n'+this.mediaQueue.map(i=>{
                const url=getConvoPromptMediaUrl(i,'prompt');
                if(!url){
                    return '';
                }
                return `![](${encodeURI(url)})`;
            }).join('\n');
            this._mediaQueue.next([]);
        }

        if(message.trim()){
            convo.appendUserMessage(message);
        }
        await convo.completeAsync();
        this._lastCompletion.next(convo.convo??null);
        if(this.autoSave){
            this.queueAutoSave();
        }
        return true;
    }

    public queueMedia(media:string|ConvoPromptMedia){
        this._mediaQueue.next([...this._mediaQueue.value,(typeof media === 'string')?{url:media}:media]);
    }

    public dequeueMedia(media:string|ConvoPromptMedia):boolean{
        if(typeof media === 'string'){
            const match=this._mediaQueue.value.find(m=>m.url===media);
            if(!match){
                return false;
            }
            media=match;
        }
        if(!this._mediaQueue.value.includes(media)){
            return false;
        }
        this._mediaQueue.next(aryDuplicateRemoveItem(this._mediaQueue.value,media));
        return true;
    }



    private isAutoSaving=false;
    private autoSaveRequested=false;

    private queueAutoSave(){
        if(this.isDisposed || !this.store){
            return;
        }

        if(this.isAutoSaving){
            this.autoSaveRequested=true;
            return;
        }

        this._autoSaveAsync();
    }

    private async _autoSaveAsync(){
        if(this.isAutoSaving || !this.store){
            return;
        }
        this.isAutoSaving=true;
        do{
            try{
                await this.store?.saveConvo?.(this.id,this.convo?.convo??'');
            }catch(ex){
                console.error('ConversationUiCtrl auto save failed',ex);
            }

        }while(this.autoSaveRequested && !this.isDisposed)
    }

    public renderMessage(message:FlatConvoMessage,index:number):ConvoMessageRenderResult{
        for(const r of this.messageRenderers){
            const v=r(message,index,this);
            if(v!==undefined && v!==null){
                return v;
            }
        }
        return undefined;
    }

    public readonly messageRenderers:ConvoMessageRenderer[]=[];

}

const cmdReg=/^\s*\//;
