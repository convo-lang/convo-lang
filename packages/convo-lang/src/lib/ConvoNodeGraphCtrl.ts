import { aryRemoveItem, DisposeCallback, getErrorMessage, InternalOptions, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { Conversation, ConversationOptions } from "./Conversation.js";
import { createConvoNodeGraphResult } from "./convo-node-graph-lib.js";
import { ConvoNodeGraphResult, ConvoNodeGraphState } from "./convo-node-graph-types.js";
import { ConvoCompletion } from "./convo-types.js";

export type ConvoNodeGraphStepCompletionHandler=(completion:ConvoCompletion)=>void|Promise<void>;

export interface ConvoNodeGraphCtrlOptions
{
    convo:Conversation|string;
    convoOptions?:ConversationOptions;
    maxSteps?:number;
    initCtrl?:(ctrl:ConvoNodeGraphCtrl)=>void;
}

export class ConvoNodeGraphCtrl
{
    public readonly conversation:Conversation;

    private readonly options:InternalOptions<ConvoNodeGraphCtrlOptions,'maxSteps'|'convoOptions','convo'|'initCtrl'>;

    private readonly _onStepComplete=new Subject<ConvoCompletion>();
    public get onStepComplete():Observable<ConvoCompletion>{return this._onStepComplete}

    private readonly _result:BehaviorSubject<ConvoNodeGraphResult|null>=new BehaviorSubject<ConvoNodeGraphResult|null>(null);
    public get resultSubject():ReadonlySubject<ConvoNodeGraphResult|null>{return this._result}
    public get result(){return this._result.value}

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
        convoOptions={},
        convo,
        initCtrl,
    }:ConvoNodeGraphCtrlOptions){
        convoOptions={
            ...convoOptions,
            disableGraphSummary:convoOptions.disableGraphSummary??true,
        }
        this.conversation=(typeof convo === 'string')?
            new Conversation({
                ...convoOptions,
                initConvo:convo
            }):
            convo;
        this.options={
            maxSteps,
            convoOptions,
        }

        initCtrl?.(this);
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

    private runPromise?:Promise<ConvoNodeGraphResult>;
    /**
     * Runs a convo node graph by calling `Conversation.completeAsync` in a loop until the graph
     * exists. `runAsync` is guaranteed to not throw an error, the returned result object will
     * contain an error if an error is thrown inside the function.
     */
    public async runAsync():Promise<ConvoNodeGraphResult>
    {
        return await (this.runPromise??(this.runPromise=this._runAsync()))
    }

    private async _runAsync():Promise<ConvoNodeGraphResult>
    {
        let result:ConvoNodeGraphResult|undefined;
        let lastCompletion:ConvoCompletion|undefined;
        try{
            this._state.next('running');

            while(this.shouldContinue()){

                lastCompletion=undefined
                const completion=await this.conversation.completeAsync({
                    appendNextGoto:true,
                    disableGraphSummary:this.options.convoOptions?.disableGraphSummary
                });
                lastCompletion=completion;

                try{
                    this._onStepComplete.next(completion);
                    if(this.onStepCompleteCallbacks.length){
                        await Promise.all(this.onStepCompleteCallbacks.map(async c=>{
                            await c(completion);
                        }));
                    }
                }catch(ex){
                    const msg='Convo node graph stopped due to completion callback error';
                    console.error(msg,ex);
                    result=createConvoNodeGraphResult(completion,ex,`${msg}: ${getErrorMessage(ex)}`);
                    break;
                }

                if(!completion.nextNodeId || completion.graphExited){
                    result=createConvoNodeGraphResult(completion);
                    break;
                }
            }


        }catch(ex){
            const msg='Convo node graph stopped due to an error';
            const errorMsg=`${msg}: ${getErrorMessage(ex)}`;
            console.error(msg,ex);
            result=createConvoNodeGraphResult(lastCompletion,ex,errorMsg)
        }

        if(!result){
            result=createConvoNodeGraphResult(null,null,'ConvoNodeGraphCtrl existed early');
        }

        try{
            this._result.next(result);
        }catch(ex){
            console.error('Error while setting ConvoNodeGraphCtrl result',ex);
        }

        try{
            this._state.next('stopped');
        }catch(ex){
            console.error('Error while setting ConvoNodeGraphCtrl state to stopped',ex);
        }

        return result;

    }
}
