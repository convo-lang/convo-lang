import { ConvoTranscriptionRequest, convoTranscriptionRequestToSupportRequest, ConvoTranscriptionResultBase, ConvoTranscriptionService } from "@convo-lang/convo-lang";
import { CancelToken, createPromiseSource, DisposeContainer, dupDeleteUndefined, InternalOptions, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { getAudioRecordingContentType, getVideoRecordingContentType, stopStream } from "./media-lib.js";
import { VadCtrl, VadSpeechFile } from "./VadCtrl.js";

export type RecordingCtrlState='stopped'|'recording'|'done';


export interface RecordingOptions
{
    enableVideo?:boolean;
    enableLiveMode?:boolean;
    transcribe?:boolean;
}

export interface RecordingCtrlOptions extends RecordingOptions
{
    transcriptionService?:ConvoTranscriptionService;
    onTranscription?:(transcription:ConvoTranscriptionResultBase,liveMode:boolean,recorder:RecordingCtrl)=>void;
}

type Options=InternalOptions<RecordingCtrlOptions,'transcriptionService'|'onTranscription'>

export class RecordingCtrl
{

    private readonly options:Options;

    public constructor({
        enableVideo=false,
        enableLiveMode=false,
        transcribe=false,
        transcriptionService,
        onTranscription,
    }:RecordingCtrlOptions={}){
        this.options={
            enableVideo,
            enableLiveMode,
            transcribe,
            transcriptionService,
            onTranscription,
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
        this.stop();
    }

    private readonly _isRecording:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isRecordingSubject():ReadonlySubject<boolean>{return this._isRecording}
    public get isRecording(){return this._isRecording.value}

    private readonly _isRunning:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isRunningSubject():ReadonlySubject<boolean>{return this._isRunning}
    public get isRunning(){return this._isRunning.value}

    private readonly _liveModeActive:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get liveModeActiveSubject():ReadonlySubject<boolean>{return this._liveModeActive}
    public get liveModeActive(){return this._liveModeActive.value}

    private readonly _stream:BehaviorSubject<MediaStream|null>=new BehaviorSubject<MediaStream|null>(null);
    public get streamSubject():ReadonlySubject<MediaStream|null>{return this._stream}
    public get stream(){return this._stream.value}

    private readonly _recording:BehaviorSubject<File|null>=new BehaviorSubject<File|null>(null);
    public get recordingSubject():ReadonlySubject<File|null>{return this._recording}
    public get recording(){return this._recording.value}

    private readonly _speechActive:BehaviorSubject<boolean|null>=new BehaviorSubject<boolean|null>(null);
    public get speechActiveSubject():ReadonlySubject<boolean|null>{return this._speechActive}
    public get speechActive(){return this._speechActive.value}

    private readonly _isTranscribing:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isTranscribingSubject():ReadonlySubject<boolean>{return this._isTranscribing}
    public get isTranscribing(){return this._isTranscribing.value}

    private readonly _audioTranscription:BehaviorSubject<ConvoTranscriptionResultBase|null>=new BehaviorSubject<ConvoTranscriptionResultBase|null>(null);
    public get audioTranscriptionSubject():ReadonlySubject<ConvoTranscriptionResultBase|null>{return this._audioTranscription}
    public get audioTranscription(){return this._audioTranscription.value}

    public start(options?:RecordingOptions)
    {
        this.cancel();
        if(this.isDisposed){
            return;
        }
        const id=++this.currentRecordingId;
        const cancel=new CancelToken();
        this.recordingStopToken=cancel;
        this.recordAsync({...this.options,...dupDeleteUndefined(options??{})},cancel,id);
    }

    public stop()
    {
        this.recordingStopToken?.cancelNow();
    }

    public cancel()
    {
        this.currentRecordingId++;
        const token=this.recordingStopToken;
        this.recordingStopToken=undefined;
        token?.cancelNow();
        this._isRecording.next(false);
        this._isTranscribing.next(false);
        this._isRunning.next(false);
        this._liveModeActive.next(false);
    }

    public toggle(){
        if(this.isRunning){
            this.stop();
        }else{
            this.start();
        }
    }

    private currentRecordingId=0;
    private recordingStopToken?:CancelToken;
    private async recordAsync(options:Options,cancel:CancelToken,id:number)
    {
        if(cancel.isCanceled){
            return;
        }

        let stream:MediaStream|undefined;
        let mediaRecorder:MediaRecorder|undefined;
        const cleanUp=new DisposeContainer();

        try{
            this._isRunning.next(true);
            const type=options.enableVideo?getVideoRecordingContentType():getAudioRecordingContentType();

            this._isRecording.next(true);
            this._liveModeActive.next(options.enableLiveMode);
            stream=await navigator.mediaDevices.getUserMedia({
                audio:!options.enableVideo,
                video:options.enableVideo,
            });
            if(cancel.isCanceled){
                return;
            }

            this._stream.next(stream);

            const chunks:Blob[]=[];
            const stopPromise=createPromiseSource<void>();

            const createRecorder=(stream:MediaStream)=>new MediaRecorder(stream,type?{mimeType:type.contentType}:undefined)

            if(options.enableLiveMode){
                const vad=new VadCtrl({
                    createRecorder,
                });
                const speechQueue:(VadSpeechFile&{trans?:ConvoTranscriptionResultBase})[]=[];
                const flushQueue=()=>{
                    let first=speechQueue.shift()
                    while(first?.trans){
                        this.triggerTrans(first.trans,options);
                        first=speechQueue.shift();
                    }
                }
                cleanUp.addSub(vad.onSpeechRecording.subscribe(s=>{
                    const q:(VadSpeechFile&{trans?:ConvoTranscriptionResultBase})={...s};
                    speechQueue.push(q);
                    this.transcribeAsync(s.file,id,options,false).then(trans=>{
                        if(this.isDisposed || id!==this.currentRecordingId){
                            return;
                        }
                        q.trans=trans;
                        flushQueue();
                    })
                }));
                cleanUp.addSub(vad.activeSubject.subscribe(active=>{
                    this._speechActive.next(active);
                }));
                vad.runAsync(stream,cancel);
            }else{
                mediaRecorder=createRecorder(stream);
                cancel.onCancelOrNextTick(()=>{
                    mediaRecorder?.stop();
                })
                mediaRecorder.ondataavailable=evt=>{
                    chunks.push(evt.data);
                }
                mediaRecorder.onstop=()=>{
                    stopPromise.resolve();
                }
                mediaRecorder.onerror=()=>{
                    stopPromise.resolve();
                }
                mediaRecorder.start();
            }

            await stopPromise.promise;

            try{
                mediaRecorder?.stop();
            }catch{}


            if(this.isDisposed || id!==this.currentRecordingId){
                return;
            }
            this._isRecording.next(false);
            this._speechActive.next(null);

            let recording:File|null;
            if(chunks.length){
                recording=new File(
                    chunks,
                    `recording-${new Date().toISOString().replace(/\W/g,'_')}.${type?.extension??'file'}`,
                    {type:type?.contentType??chunks[0]?.type}
                );
            }else{
                recording=null;
            }
            this._recording.next(recording);

            if(this.isDisposed || id!==this.currentRecordingId){
                return;
            }

            if(options.transcribe && options.transcriptionService && recording && !options.enableLiveMode){
                await this.transcribeAsync(recording,id,options,true);
            }


        }catch(ex){
            console.error('Recording failed',ex);
        }finally{
            cleanUp.dispose();
            if(id===this.currentRecordingId){
                this._isRunning.next(false);
                this._liveModeActive.next(false);
                this._isRecording.next(false);
                this._speechActive.next(null);
            }
            stopStream(stream);
            mediaRecorder?.stop();
            if(this.stream===stream){
                this._stream.next(null);
            }
        }
    }

    private triggerTrans(trans:ConvoTranscriptionResultBase,options:Options){
        if(!trans.text.trim()){
            return;
        }
        this._audioTranscription.next(trans);
        options.onTranscription?.(trans,options.enableLiveMode,this);
    }

    private transcribeCount=0;
    private async transcribeAsync(recording:File,id:number,options:Options,trigger:boolean){
        const service=options.transcriptionService;
        if(!service){
            return;
        }
        this.transcribeCount++;
        this._isTranscribing.next(true);
        try{
            const request:ConvoTranscriptionRequest={
                audio:recording,
            }
            const canTranscribe=await service.canTranscribe(convoTranscriptionRequestToSupportRequest(request));
            if(id!==this.currentRecordingId || !canTranscribe){
                return;
            }
            const r=await service.transcribeAsync(request);
            if(!r.success || id!==this.currentRecordingId){
                return;
            }

            if(trigger){
                this.triggerTrans(r,options);
            }

            return r;

        }finally{
            this.transcribeCount--;
            if(!this.transcribeCount){
                this._isTranscribing.next(false);
            }
        }
    }
}
