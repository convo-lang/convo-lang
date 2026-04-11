import { aryRemoveItem, CancelToken, getErrorMessage, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoTts, ConvoTtsRequest, ConvoTtsService } from "./convo-types.js";
import { convoTtsService } from "./convo.deps.js";

export class TtsCtrl
{
    public readonly ttsService:ConvoTtsService|undefined;

    public constructor(ttsService:ConvoTtsService|undefined){
        this.ttsService=ttsService;
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

    private readonly _convertingTextToSpeech:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get convertingTextToSpeechSubject():ReadonlySubject<boolean>{return this._convertingTextToSpeech}
    public get convertingTextToSpeech(){return this._convertingTextToSpeech.value}

    private readonly _readingText:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get readingTextSubject():ReadonlySubject<boolean>{return this._readingText}
    public get readingText(){return this._readingText.value}

    private readonly _provider:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get providerSubject():ReadonlySubject<string|null>{return this._provider}
    public get provider(){return this._provider.value}
    public set provider(value:string|null){
        if(value==this._provider.value){
            return;
        }
        this._provider.next(value);
    }

    private readonly _model:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get modelSubject():ReadonlySubject<string|null>{return this._model}
    public get model(){return this._model.value}
    public set model(value:string|null){
        if(value==this._model.value){
            return;
        }
        this._model.next(value);
    }

    private readonly _voice:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get voiceSubject():ReadonlySubject<string|null>{return this._voice}
    public get voice(){return this._voice.value}
    public set voice(value:string|null){
        if(value==this._voice.value){
            return;
        }
        this._voice.next(value);
    }

    public textToSpeech(request:ConvoTtsRequest,cancel?:CancelToken):ConvoQueuedTextToSpeech|null{
        const service=this.ttsService||convoTtsService.get();
        if(!service){
            return null;
        }

        const item:ConvoQueuedTextToSpeech={
            request:{
                provider:request.provider??this.provider??undefined,
                model:request.model??this.model??undefined,
                voice:request.voice??this.voice??undefined,
                text:request.text,
            },
            cancel:cancel??new CancelToken(),
        }
        this.queue.push(item);
        this.convertToAudioAsync(item,service);
        return item;

    }

    private async convertToAudioAsync(item:ConvoQueuedTextToSpeech,service:ConvoTtsService){
        try{
            const canConvert=await service.canConvertToSpeech(item.request);

            if(!canConvert || this.isDisposed || item.cancel.isCanceled){
                aryRemoveItem(this.queue,item);
                return;
            }

            const r=await service.convertToSpeechAsync(item.request);
            if(!r.success || this.isDisposed || item.cancel.isCanceled){
                aryRemoveItem(this.queue,item);
                return;
            }

            item.tts=r.tts;
            this.flushAsync();
        }catch(ex){
            console.error(`Failed to convert text to speech. error:${getErrorMessage(ex)}, text:${item.request.text}`);
            aryRemoveItem(this.queue,item);
        }
    }

    private queue:ConvoQueuedTextToSpeech[]=[];
    private isFlushing=false;
    private async flushAsync()
    {
        if(this.isDisposed || this.isFlushing){
            return;
        }

        this.isFlushing=true;
        try{

            let item:ConvoQueuedTextToSpeech|undefined;
            while((item=this.queue[0])?.tts){
                aryRemoveItem(this.queue,item);
                if(item.cancel.isCanceled){
                    continue;
                }
                const url=URL.createObjectURL(item.tts.audio);
                try{
                    const audio=new Audio(url);
                    audio.onended=()=>{
                        item?.cancel.cancelNow();
                    }
                    audio.onerror=()=>{
                        item?.cancel.cancelNow();
                    }
                    audio.play();
                    await item.cancel.toPromise();
                    audio.pause();
                }finally{
                    URL.revokeObjectURL(url);
                }
            }

        }finally{
            this.isFlushing=false;
        }
    }
}

export interface ConvoQueuedTextToSpeech
{
    request:ConvoTtsRequest;
    tts?:ConvoTts;
    cancel:CancelToken;
}
