import { CancelToken, Lock, ReadonlySubject, aryRemoveFirst, shortUuid } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { AiCompletionService } from "./AiCompletionService";
import { aiComplete } from "./_type.ai-complete";
import { aiFunctionInterfaceToFunction, applyResultToAiMessage, callAiFunctionInterfaceAsync, mergeAiCompletionMessages } from './ai-complete-lib';
import { AiCompletionFunction, AiCompletionFunctionCall, AiCompletionFunctionInterface, AiCompletionMessage, AiCompletionMessageOptionalId, AiCompletionOption, AiCompletionResult } from "./ai-complete-types";

export interface AiConversationOptions
{
    service?:AiCompletionService;
    pickMessage?:(options:AiCompletionOption[])=>AiCompletionMessage|null|undefined;
}

export interface ConversationSendResult
{
    result:AiCompletionResult;
    picked?:AiCompletionMessage;
}

export class AiConversation
{

    private readonly messageList:AiCompletionMessage[]=[];

    private readonly _messages:BehaviorSubject<AiCompletionMessage[]>=new BehaviorSubject<AiCompletionMessage[]>([]);
    public get messagesSubject():ReadonlySubject<AiCompletionMessage[]>{return this._messages}
    public get messages(){return this._messages.value}


    private readonly _sending:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get sendingSubject():ReadonlySubject<boolean>{return this._sending}
    public get sending(){return this._sending.value}

    private readonly _calling:BehaviorSubject<AiCompletionFunctionCall|null>=new BehaviorSubject<AiCompletionFunctionCall|null>(null);
    public get callingSubject():ReadonlySubject<AiCompletionFunctionCall|null>{return this._calling}
    public get calling(){return this._calling.value}

    private readonly _functionInterfaces:BehaviorSubject<AiCompletionFunctionInterface[]>=new BehaviorSubject<AiCompletionFunctionInterface[]>([]);
    public get functionInterfacesSubject():ReadonlySubject<AiCompletionFunctionInterface[]>{return this._functionInterfaces}
    public get functionInterfaces(){return this._functionInterfaces.value}


    private functions:AiCompletionFunction[]=[];
    private functionInterfaceList:AiCompletionFunctionInterface[]=[];

    public readonly service:AiCompletionService;

    private readonly options:AiConversationOptions;

    public constructor(options:AiConversationOptions={}){
        this.service=options.service??aiComplete();
        this.options={...options}
    }

    private sendLock=new Lock();

    public send(message:AiCompletionMessageOptionalId):void{
        this.sendAsync(message);
    }

    public async sendAsync(message:AiCompletionMessageOptionalId,cancel?:CancelToken):Promise<ConversationSendResult>{

        if(!message.id){
            message.id=shortUuid();
        }

        const msg=message as AiCompletionMessage;

        const unlock=await this.sendLock.waitAsync(cancel);

        try{

            this._sending.next(true);

            this.messageList.push(msg);
            this._messages.next([...this.messageList]);

            const result=await this.service.completeAsync({
                messages:this.messageList,
                functions:this.functions.length?this.functions:undefined
            });

            result.options.sort((a,b)=>b.confidence-a.confidence);

            let changed=false;

            if(result.preGeneration?.length){
                mergeAiCompletionMessages(result.preGeneration,this.messageList);
                changed=true;
            }

            const picked=(result.options.length && this.options.pickMessage)?
                this.options.pickMessage(result.options):
                result.options[0]?.message;

            if(picked){
                this.messageList.push(picked);
                changed=true;
            }

            if(picked?.type==='function' && picked.call){
                const fi=this.functionInterfaceList.find(f=>f.name===picked.call?.name);
                if(fi){
                    if(fi.callback || fi.render){
                        this._calling.next(picked.call);
                        const callReulst=await callAiFunctionInterfaceAsync(fi,true,picked.call.params,this.service);
                        applyResultToAiMessage(picked,callReulst);
                        this._calling.next(null);
                    }
                }else{
                    console.warn(`No function interface found for ${picked.call.name}`);
                }
            }

            this._sending.next(false);

            if(changed){
                this._messages.next([...this.messageList]);
            }

            return {result,picked:picked??undefined}

        }finally{
            if(this._sending){
                try{
                    this._sending.next(false);
                }catch{
                    //
                }
            }
            unlock();
        }
    }

    public clear()
    {
        if(!this.messageList.length){
            return;
        }
        this.messageList.splice(0,this.messageList.length);
        this._messages.next([]);
    }

    public hasFunction(name:string):boolean{
        return this.functionInterfaceList.some(f=>f.name===name);
    }

    public registerFunction(fn:AiCompletionFunctionInterface):void
    {
        if(this.functionInterfaceList.some(f=>f.name===fn.name)){
            throw new Error(`A function is already registered with the name ${fn.name}`);
        }

        this.functionInterfaceList.push(fn);
        this.functions.push(aiFunctionInterfaceToFunction(fn));
        this._functionInterfaces.next([...this.functionInterfaceList]);
    }

    public unregisterFunction(name:string):boolean
    {
        const removed=aryRemoveFirst(this.functionInterfaceList,f=>f.name===name);
        aryRemoveFirst(this.functions,f=>f.name===name);
        if(removed){
            this._functionInterfaces.next([...this.functionInterfaceList]);
        }
        return removed;
    }
}
