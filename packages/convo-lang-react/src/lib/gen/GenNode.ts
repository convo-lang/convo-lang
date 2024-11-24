import { Conversation, ConvoDocQuery, ConvoDocQueryResult, ConvoDocQueryRunner, ConvoDocQueryRunnerOptions, convoDoQueryOutputToMessageContent, convoDocPageToString } from "@convo-lang/convo-lang";
import { ReadonlySubject, delayAsync, getErrorMessage, pushBehaviorSubjectAry, removeBehaviorSubjectAryValue } from "@iyio/common";
import { BehaviorSubject, Subscription } from "rxjs";
import { GenNodeOptions, GenNodeState } from "./gen-lib";

export class GenNode
{

    public readonly id?:string;

    private readonly _convo:BehaviorSubject<string>=new BehaviorSubject<string>('');
    public get convoSubject():ReadonlySubject<string>{return this._convo}
    public get convo(){return this._convo.value}
    public set convo(value:string){
        if(value===this._convo.value){
            return;
        }
        this._convo.next(value);
        this.runConvoAsync();

    }

    private readonly _options:BehaviorSubject<GenNodeOptions|null>=new BehaviorSubject<GenNodeOptions|null>(null);
    public get optionsSubject():ReadonlySubject<GenNodeOptions|null>{return this._options}
    public get options(){return this._options.value}
    public set options(value:GenNodeOptions|null){
        if(value==this._options.value){
            return;
        }
        this._options.next(value);
        this.runConvoAsync();
    }

    private readonly _docQuery:BehaviorSubject<ConvoDocQuery|null>=new BehaviorSubject<ConvoDocQuery|null>(null);
    public get docQuerySubject():ReadonlySubject<ConvoDocQuery|null>{return this._docQuery}
    public get docQuery(){return this._docQuery.value}
    public set docQuery(value:ConvoDocQuery|null){
        if(value==this._docQuery.value){
            return;
        }
        this._docQuery.next(value);
        this.runConvoAsync();
    }

    private readonly _docQueryOptions:BehaviorSubject<ConvoDocQueryRunnerOptions|null>=new BehaviorSubject<ConvoDocQueryRunnerOptions|null>(null);
    public get docQueryOptionsSubject():ReadonlySubject<ConvoDocQueryRunnerOptions|null>{return this._docQueryOptions}
    public get docQueryOptions(){return this._docQueryOptions.value}
    public set docQueryOptions(value:ConvoDocQueryRunnerOptions|null){
        if(value==this._docQueryOptions.value){
            return;
        }
        this._docQueryOptions.next(value);
        this.runConvoAsync();
    }

    private readonly _vars:BehaviorSubject<Record<string,any>|null>=new BehaviorSubject<Record<string,any>|null>(null);
    public get varsSubject():ReadonlySubject<Record<string,any>|null>{return this._vars}
    public get vars(){return this._vars.value}
    public set vars(value:Record<string,any>|null){
        if(value==this._vars.value){
            return;
        }
        this._vars.next(value);
        this.runConvoAsync();
    }

    private readonly _state:BehaviorSubject<GenNodeState>;
    public get stateSubject():ReadonlySubject<GenNodeState>{return this._state}
    public get state(){return this._state.value}

    private readonly _lastGeneratedState:BehaviorSubject<GenNodeState>;
    public get lastGeneratedStateSubject():ReadonlySubject<GenNodeState>{return this._lastGeneratedState}
    /**
     * The last state that successfully generated a value
     */
    public get lastGeneratedState(){return this._lastGeneratedState.value}

    private readonly _parent:BehaviorSubject<GenNode|null>=new BehaviorSubject<GenNode|null>(null);
    public get parentSubject():ReadonlySubject<GenNode|null>{return this._parent}
    public get parent(){return this._parent.value}

    private readonly _children:BehaviorSubject<GenNode[]>=new BehaviorSubject<GenNode[]>([]);
    public get childrenSubject():ReadonlySubject<GenNode[]>{return this._children}
    public get children(){return this._children.value}

    private readonly _conversation:BehaviorSubject<Conversation|null>=new BehaviorSubject<Conversation|null>(null);
    public get conversationSubject():ReadonlySubject<Conversation|null>{return this._conversation}
    public get conversation(){return this._conversation.value}


    public constructor(id?:string)
    {
        this.id=id;
        this._state=new BehaviorSubject<GenNodeState>({status:'ready',convo:''});
        this._lastGeneratedState=new BehaviorSubject<GenNodeState>(this._state.value);
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.runId++;
        this._setParent(null,true);
        this.clearAppend();
    }

    _setParent(parent:GenNode|null,ignoreDispose=false){
        if(this._isDisposed && !ignoreDispose){
            return;
        }
        const child=this;
        const currentParent=this._parent.value;

        if(parent===currentParent){
            return;
        }

        this._parent.next(null);

        if(currentParent){
            removeBehaviorSubjectAryValue(currentParent._children,child);
        }

        if(parent){
            pushBehaviorSubjectAry(parent._children,child);
            this._parent.next(parent);
        }

        this.runConvoAsync();
    }

    private runId=0;
    private async runConvoAsync()
    {

        if(this._isDisposed){
            return;
        }

        const convo=this._convo.value;
        const options=this._options.value;
        const defaultVars=this._vars.value;
        const docQuery=this._docQuery.value;
        const docQueryOptions=this._docQueryOptions.value;
        const parentState=this._parent.value?._state.value;

        const runId=++this.runId;
        this.clearAppend();

        if((parentState && parentState.status!=='generated') || (!convo && !docQuery && !docQueryOptions?.query)){
            return;
        }

        await delayAsync(30);
        if(runId!==this.runId){
            return;
        }

        try{

            let docQueryResult:ConvoDocQueryResult|null=null;

            const setVars=(vars:Record<string,any>)=>{

                if(defaultVars){
                    for(const e in defaultVars){
                        if(vars[e]===undefined){
                            vars[e]=defaultVars[e];
                        }
                    }
                }

                const parentVars=parentState?.vars;
                if(parentVars){
                    for(const e in parentVars){
                        if(vars[e]===undefined){
                            vars[e]=parentVars[e];
                        }
                    }
                }

                vars['document']=docQueryResult?convoDoQueryOutputToMessageContent(docQueryResult):(vars['document']??'');
                vars['documentPages']=(
                    docQueryResult?.pages.map(p=>convoDocPageToString(p.index,docQueryResult as ConvoDocQueryResult))??
                    vars['documentPages']??[]
                );
                vars['docQueryResult']=docQueryResult??vars['docQueryResult'];
            }

            const dq=docQuery??docQueryOptions?.query;
            if(dq){
                this.setState({status:'querying-document',convo});
                const runner=new ConvoDocQueryRunner({
                    ...docQueryOptions,
                    query:{
                        ...dq,
                        visionPass:dq.visionPass??true,
                    },
                    cacheConversations:docQueryOptions?.cacheConversations??true,
                    cacheQueryResults:docQueryOptions?.cacheQueryResults??true,
                });

                docQueryResult=await runner.runQueryAsync();
                if(runId!==this.runId){
                    return;
                }

                const vars:Record<string,any>={};
                setVars(vars);

                if(!convo && docQueryResult){
                    this.setState({
                        convo,
                        status:'generated',
                        value:null,
                        docQueryResult,
                        vars,
                    })
                    return;
                }
            }

            this.setState({status:'generating',convo});
            const conversation=new Conversation(options?.conversationOptions);
            this._conversation.next(conversation);
            const vars=conversation.defaultVars;
            setVars(vars);

            conversation.append(convo);

            await this.completeAsync(conversation,runId,convo,options);

            if(runId===this.runId && options?.allowAppend){
                this.enableAppend(conversation,runId,options);
            }

        }catch(ex){
            if(runId===this.runId){
                this.setState({status:'error',errorMessage:getErrorMessage(ex),convo,error:ex})
            }
        }

    }

    private _completingCount=0;
    private async completeAsync(
        conversation:Conversation,
        runId:number,
        convo:string,
        options:GenNodeOptions|undefined|null
    ){
        this._completingCount++;
        try{

            const result=await conversation.completeAsync({
                returnOnCalled:options?.allowAppend?false:!options?.completeOnCalled,
            });
            if(runId!==this.runId){
                return;
            }

            if(result.error){

                this.setState({
                    status:'error',
                    convo,
                    errorMessage:getErrorMessage(result.error),
                    error:result.error,
                })

            }else{

                const msg=result.message;

                this.setState({
                    status:'generated',
                    convo,
                    value:(result.lastFnCall?
                        result.lastFnCall.returnValue
                    :msg?.format==='json'?
                        JSON.parse(msg?.content??'null')
                    :
                        msg?.content
                    ),
                    completion:result,
                    vars:result.exe?.getUserSharedVars()??{}
                });
            }

        }catch(ex){
            if(runId===this.runId){
                this.setState({status:'error',errorMessage:getErrorMessage(ex),convo,error:ex})
            }
        }finally{
            this._completingCount--;
        }
    }

    private setState(state:GenNodeState){

        if(state.status==='generated'){
            this._lastGeneratedState.next(state);
        }
        this._state.next(state);

        if(state.status==='generated'){
            for(const child of this.children){
                child.runConvoAsync();
            }
        }

    }

    public append(convo:string){
        const options=this.options;
        if(!options?.allowAppend || !this.conversation || this._completingCount){
            return false;
        }
        this.conversation.append(convo);
        return true;
    }

    public appendUserMessage(convo:string){
        const options=this.options;
        if(!options?.allowAppend || !this.conversation || this._completingCount){
            return false;
        }
        this.conversation.appendUserMessage(convo);
        return true;
    }

    private appendSub?:Subscription;
    private enableAppend(conversation:Conversation,runId:number,options:GenNodeOptions|undefined|null){
        this.clearAppend();
        let iv:any=null;
        this.appendSub=conversation.onAppend.subscribe(()=>{
            if(runId!==this.runId){
                return;
            }
            clearTimeout(iv);
            iv=setTimeout(()=>{
                if(runId!==this.runId || !conversation.isUserMessage(conversation.getLastMessage())){
                    return;
                }

                this.setState({status:'generating',convo:conversation.convo});
                this.completeAsync(conversation,runId,conversation.convo,options)

            },300);
        })
    }

    private clearAppend()
    {
        const sub=this.appendSub;
        this.appendSub=undefined;
        sub?.unsubscribe();
    }
}
