import { aryRemoveItem, DisposeCallback, InternalOptions, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { Conversation, ConversationOptions } from "./Conversation.js";
import { ConvoNodeGraphState } from "./convo-node-graph-types.js";
import { ConvoCompletion } from "./convo-types.js";

export type ConvoNodeGraphStepCompletionHandler=(completion:ConvoCompletion)=>void|Promise<void>;

export interface ConvoNodeGraphCtrlOptions
{
    convo:Conversation|string;
    convoOptions?:ConversationOptions;
    maxSteps?:number;
}

export class ConvoNodeGraphCtrl
{
    public readonly conversation:Conversation;

    private readonly options:InternalOptions<ConvoNodeGraphCtrlOptions,'maxSteps','convo'|'convoOptions'>;

    private readonly _onStepComplete=new Subject<ConvoCompletion>();
    public get onStepComplete():Observable<ConvoCompletion>{return this._onStepComplete}

    private readonly onStepCompleteCallbacks:ConvoNodeGraphStepCompletionHandler[]=[];
    public addStepCompletionListener(listener:ConvoNodeGraphStepCompletionHandler):DisposeCallback{
        this.onStepCompleteCallbacks.push(listener);
        return ()=>{
            aryRemoveItem(this.onStepCompleteCallbacks,listener);
        }
    }
    public removeStepCompletionListener(listener:ConvoNodeGraphStepCompletionHandler):void{
        aryRemoveItem(this.onStepCompleteCallbacks,listener);
    }

    private readonly _state:BehaviorSubject<ConvoNodeGraphState>=new BehaviorSubject<ConvoNodeGraphState>('ready');
    public get stateSubject():ReadonlySubject<ConvoNodeGraphState>{return this._state}
    public get state(){return this._state.value}

    private readonly _stepIndex:BehaviorSubject<number>=new BehaviorSubject<number>(0);
    public get stepIndexSubject():ReadonlySubject<number>{return this._stepIndex}
    public get stepIndex(){return this._stepIndex.value}

    public constructor({
        maxSteps,
        convoOptions,
        convo,
    }:ConvoNodeGraphCtrlOptions){
        this.conversation=(typeof convo === 'string')?
            new Conversation({
                ...convoOptions,
                initConvo:convo
            }):
            convo;
        this.options={
            maxSteps,
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
    }

    public shouldContinue()
    {
        return (
            !this._isDisposed &&
            !this.conversation.isDisposed &&
            (this.options.maxSteps===undefined || this.options.maxSteps>this.stepIndex)
        )
    }

    private runPromise?:Promise<void>;
    public async runAsync()
    {
        await (this.runPromise??(this.runPromise=this._runAsync()))
    }

    private async _runAsync()
    {
        this._state.next('running');

        while(this.shouldContinue()){

            const completion=await this.conversation.completeAsync({
                appendNextGoto:true,
            });

            try{
                this._onStepComplete.next(completion);
                if(this.onStepCompleteCallbacks.length){
                    await Promise.all(this.onStepCompleteCallbacks.map(async c=>{
                        await c(completion);
                    }));
                }
            }catch(ex){
                console.error('ConvoNodeGraph controller stopped due to completion callback error',ex);
                break;
            }

            if(!completion.nextNodeId || completion.graphStopped){
                break;
            }
        }

         this._state.next('stopped');

    }
}
