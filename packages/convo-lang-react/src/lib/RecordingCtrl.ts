import { ConvoTranscriptionRequest, convoTranscriptionRequestToSupportRequest, ConvoTranscriptionResultBase, ConvoTranscriptionService } from "@convo-lang/convo-lang";
import { CancelToken, createPromiseSource, InternalOptions, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { getAudioRecordingContentType, getVideoRecordingContentType, stopStream } from "./media-lib.js";

export type RecordingCtrlState='stopped'|'recording'|'done';

export interface RecordingOptions
{
    audio:boolean;
    video:boolean;
    transcribe?:boolean;
    transcriptionService?:ConvoTranscriptionService;
    onTranscription?:(transcription:ConvoTranscriptionResultBase,recorder:RecordingCtrl)=>void;

}

export class RecordingCtrl
{

    private readonly options:InternalOptions<RecordingOptions,'transcriptionService'|'onTranscription'>;

    public constructor({
        audio,
        video,
        transcribe=false,
        transcriptionService,
        onTranscription,
    }:RecordingOptions){
        this.options={
            audio,
            video,
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
        this.recordingStopToken?.cancelNow();
    }

    private readonly _state:BehaviorSubject<RecordingCtrlState>=new BehaviorSubject<RecordingCtrlState>('stopped');
    public get stateSubject():ReadonlySubject<RecordingCtrlState>{return this._state}
    public get state(){return this._state.value}
    public set state(value:RecordingCtrlState){
        if(value==this._state.value){
            return;
        }
        this.recordingStopToken?.cancelNow();
        this.recordingStopToken=undefined;

        this._state.next(value);
        if(value!=='done'){
            this.stateIndex++;
        }
        if(value==='recording'){
            const token=new CancelToken();
            this.recordingStopToken=token;
            if(this.options.audio){
                this.recordAsync(false,token,this.stateIndex);
            }
            if(this.options.video){
                this.recordAsync(true,token,this.stateIndex);
            }
        }
    }
    private stateIndex=0;

    private readonly _audioStream:BehaviorSubject<MediaStream|null>=new BehaviorSubject<MediaStream|null>(null);
    public get audioStreamSubject():ReadonlySubject<MediaStream|null>{return this._audioStream}
    public get audioStream(){return this._audioStream.value}

    private readonly _videoStream:BehaviorSubject<MediaStream|null>=new BehaviorSubject<MediaStream|null>(null);
    public get videoStreamSubject():ReadonlySubject<MediaStream|null>{return this._videoStream}
    public get videoStream(){return this._videoStream.value}

    private readonly _audioRecording:BehaviorSubject<File|null>=new BehaviorSubject<File|null>(null);
    public get audioRecordingSubject():ReadonlySubject<File|null>{return this._audioRecording}
    public get audioRecording(){return this._audioRecording.value}

    private readonly _videoRecording:BehaviorSubject<File|null>=new BehaviorSubject<File|null>(null);
    public get videoRecordingSubject():ReadonlySubject<File|null>{return this._videoRecording}
    public get videoRecording(){return this._videoRecording.value}

    private readonly _isTranscribing:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isTranscribingSubject():ReadonlySubject<boolean>{return this._isTranscribing}
    public get isTranscribing(){return this._isTranscribing.value}

    private readonly _audioTranscription:BehaviorSubject<ConvoTranscriptionResultBase|null>=new BehaviorSubject<ConvoTranscriptionResultBase|null>(null);
    public get audioTranscriptionSubject():ReadonlySubject<ConvoTranscriptionResultBase|null>{return this._audioTranscription}
    public get audioTranscription(){return this._audioTranscription.value}

    private recordingStopToken?:CancelToken;
    private async recordAsync(video:boolean,cancel:CancelToken,stateIndex:number)
    {
        let stream:MediaStream|undefined;
        let mediaRecorder:MediaRecorder|undefined;

        try{
            const type=video?getVideoRecordingContentType():getAudioRecordingContentType();


            stream=await navigator.mediaDevices.getUserMedia({
                audio:!video,
                video,
            });
            if(cancel.isCanceled){
                return;
            }

            if(video){
                this._videoStream.next(stream);
            }else{
                this._audioStream.next(stream);
            }

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
                if(!cancel.isCanceled){
                    this.state='done';
                    cancel.cancelNow();
                }
                stopPromise.resolve();
            }
            mediaRecorder.onerror=evt=>{
                if(!cancel.isCanceled){
                    this.state='stopped';
                    cancel.cancelNow();
                }
                stopPromise.resolve();
            }
            mediaRecorder.start();

            await stopPromise.promise;


            if(this.isDisposed || stateIndex!==this.stateIndex){
                return;
            }
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
            if(video){
                this._videoRecording.next(recording);
            }else{
                this._audioRecording.next(recording);
            }

            if(this.options.transcribe && this.options.transcriptionService && !video && recording){
                this._isTranscribing.next(true);
                try{
                    const request:ConvoTranscriptionRequest={
                        audio:recording,
                    }
                    const can=await this.options.transcriptionService.canTranscribe(convoTranscriptionRequestToSupportRequest(request));
                    if(stateIndex!==this.stateIndex || !can){
                        return;
                    }
                    const r=await this.options.transcriptionService.transcribeAsync(request);
                    if(r.success && stateIndex===this.stateIndex){
                        this._audioTranscription.next(r);
                        this.options.onTranscription?.(r,this);
                    }
                }finally{
                    this._isTranscribing.next(false);
                }
            }


        }catch(ex){
            console.error('Recording failed',ex);
            if(!cancel.isCanceled){
                this.state='stopped';
            }
        }finally{
            stopStream(stream);
            mediaRecorder?.stop();
            if(this.audioStream===stream){
                this._audioStream.next(null);
            }
            if(this.videoStream===stream){
                this._videoStream.next(null);
            }
        }
    }
}
