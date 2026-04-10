import { ConvoTranscriptionRequest, convoTranscriptionRequestToSupportRequest, ConvoTranscriptionResultBase, ConvoTranscriptionService } from "@convo-lang/convo-lang";
import { CancelToken, createPromiseSource, InternalOptions, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { getAudioRecordingContentType, getVideoRecordingContentType, stopStream } from "./media-lib.js";

export type RecordingCtrlState='stopped'|'recording'|'done';

export interface RecordingOptions
{
    enableVideo?:boolean;
    transcribe?:boolean;
    transcriptionService?:ConvoTranscriptionService;
    onTranscription?:(transcription:ConvoTranscriptionResultBase,recorder:RecordingCtrl)=>void;

}

export class RecordingCtrl
{

    private readonly options:InternalOptions<RecordingOptions,'transcriptionService'|'onTranscription'>;

    public constructor({
        enableVideo=false,
        transcribe=false,
        transcriptionService,
        onTranscription,
    }:RecordingOptions={}){
        this.options={
            enableVideo,
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

    private readonly _stream:BehaviorSubject<MediaStream|null>=new BehaviorSubject<MediaStream|null>(null);
    public get streamSubject():ReadonlySubject<MediaStream|null>{return this._stream}
    public get stream(){return this._stream.value}

    private readonly _recording:BehaviorSubject<File|null>=new BehaviorSubject<File|null>(null);
    public get recordingSubject():ReadonlySubject<File|null>{return this._recording}
    public get recording(){return this._recording.value}

    private readonly _isTranscribing:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isTranscribingSubject():ReadonlySubject<boolean>{return this._isTranscribing}
    public get isTranscribing(){return this._isTranscribing.value}

    private readonly _audioTranscription:BehaviorSubject<ConvoTranscriptionResultBase|null>=new BehaviorSubject<ConvoTranscriptionResultBase|null>(null);
    public get audioTranscriptionSubject():ReadonlySubject<ConvoTranscriptionResultBase|null>{return this._audioTranscription}
    public get audioTranscription(){return this._audioTranscription.value}

    public start()
    {
        this.cancel();
        if(this.isDisposed){
            return;
        }
        const id=++this.currentRecordingId;
        const cancel=new CancelToken();
        this.recordingStopToken=cancel;
        this.recordAsync(this.options.enableVideo,cancel,id);
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
    private async recordAsync(video:boolean,cancel:CancelToken,id:number)
    {
        if(cancel.isCanceled){
            return;
        }

        let stream:MediaStream|undefined;
        let mediaRecorder:MediaRecorder|undefined;

        try{
            this._isRunning.next(true);
            const type=video?getVideoRecordingContentType():getAudioRecordingContentType();

            this._isRecording.next(true);
            stream=await navigator.mediaDevices.getUserMedia({
                audio:!video,
                video,
            });
            if(cancel.isCanceled){
                return;
            }

            this._stream.next(stream);

            const chunks:Blob[]=[];
            const stopPromise=createPromiseSource<void>();

            mediaRecorder=new MediaRecorder(stream,type?{mimeType:type.contentType}:undefined);
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

            await stopPromise.promise;

            try{
                mediaRecorder.stop();
            }catch{}


            if(this.isDisposed || id!==this.currentRecordingId){
                return;
            }
            this._isRecording.next(false);

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

            if(this.options.transcribe && this.options.transcriptionService && recording){
                this._isTranscribing.next(true);
                try{
                    const request:ConvoTranscriptionRequest={
                        audio:recording,
                    }
                    const can=await this.options.transcriptionService.canTranscribe(convoTranscriptionRequestToSupportRequest(request));
                    if(id!==this.currentRecordingId || !can){
                        return;
                    }
                    const r=await this.options.transcriptionService.transcribeAsync(request);
                    if(!r.success || id!==this.currentRecordingId){
                        return;
                    }

                    this._audioTranscription.next(r);
                    this.options.onTranscription?.(r,this);

                }finally{
                    this._isTranscribing.next(false);
                }
            }


        }catch(ex){
            console.error('Recording failed',ex);
        }finally{
            if(id===this.currentRecordingId){
                this._isRunning.next(false);
                this._isRecording.next(false);
                this._isTranscribing.next(false);
            }
            stopStream(stream);
            mediaRecorder?.stop();
            if(this.stream===stream){
                this._stream.next(null);
            }
        }
    }
}
