import { openAiApiKeyParam } from "@iyio/ai-complete-openai";
import { s3Client } from "@iyio/aws-s3";
import { CancelToken, DisposeCallback, aryRemoveItem, deepCompare } from "@iyio/common";
import { Observable, Subject } from "rxjs";
import { ConvoCaptureState, TranscriptionEvent, TranscriptionPart } from "./convo-chrome-types";

const defaultMediaRecordingAudioKBPerSecond=2;
const defaultMediaRecordingVideoKBPerSecond=50;

export class StreamRecorder
{

    private _state:ConvoCaptureState|null=null;
    public get state(){return this._state}

    private readonly _onTranscription=new Subject<TranscriptionEvent>();
    public get onTranscription():Observable<TranscriptionEvent>{return this._onTranscription}

    private onDispose?:DisposeCallback;

    public constructor(onDispose?:DisposeCallback)
    {
        this.onDispose=onDispose;
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this.updateState(null);
        this._isDisposed=true;
        this.onDispose?.();
    }

    public updateState(state:ConvoCaptureState|null){
        console.log('hio 👋 👋 👋 update recording state',state);
        if(this._isDisposed || deepCompare(state,this._state)){
            return;
        }

        this._state=state;

        const currentToken=this.recordToken;
        this.recordToken=null;
        if(currentToken){
            currentToken.cancelNow();
        }

        if(state?.stop){
            this._state=null;
            this.dispose();
            return;
        }
        if(this._state){
            this.recordToken=new CancelToken();
            this.recordAsync(this._state,this.recordToken);
        }
    }

    private recordToken:CancelToken|null=null;

    private async recordAsync(state:ConvoCaptureState,cancel:CancelToken)
    {
        const streamId=state.tabStreamId;
        if(!streamId){
            return;
        }

        const transParts:TranscriptionPart[]=[];
        let transIndex=-1;

        const stream=await navigator.mediaDevices.getUserMedia({
            audio:{
                mandatory:{
                    chromeMediaSource:"tab",
                    chromeMediaSourceId:streamId,
                },
            } as any,
            video:{
                mandatory:{
                    chromeMediaSource:"tab",
                    chromeMediaSourceId:streamId,
                },
            } as any,
        });

        try{
            await Promise.all([

                // record upload video
                this.recordStreamAsync(stream,state,cancel,{
                    audio:true,
                    video:true,
                    onData:evt=>{
                        if(this._state?.cancel){
                            return;
                        }
                        this.uploadAsync(state,evt);
                    }
                }),

                // transcribe
                state.transcribe?this.recordStreamAsync(new MediaStream(stream.getAudioTracks()),state,cancel,{
                    audio:true,
                    video:false,
                    splitMs:30000,
                    playAudio:true,
                    onData:async evt=>{
                        let prev:TranscriptionPart|undefined;
                        for(let i=transParts.length-1;i>=0;i--){
                            const t=transParts[i];
                            if(t?.index===transIndex){
                                prev=t;
                                break;
                            }
                        }
                        const index=++transIndex;
                        const trans=await transcribeAsync(evt.data,prev?.text);
                        if(trans){
                            transParts.push({
                                index,
                                ...trans

                            })
                        }
                    },
                    onComplete:()=>{
                        transParts.sort((a,b)=>a.index-b.index);
                        console.log('hio 👋 👋 👋 trans parts',transParts);
                        console.log('hio 👋 👋 👋 trans',transParts.map(t=>t.text).join(' '));
                        this._onTranscription.next({parts:transParts,captureState:state});
                    }
                }):undefined,
            ])
        }finally{
            const tracks=stream.getTracks();
            for(const track of tracks){
                try{
                    track.stop();
                }catch{
                    // do nothing
                }
            }
        }

    }

    private async recordStreamAsync(stream:MediaStream,state:ConvoCaptureState,cancel:CancelToken,options:RecordOptions)
    {
        const streamId=state.tabStreamId;
        if(!streamId){
            return;
        }

        console.log('hio 👋 👋 👋 start stream recording',streamId);

        try{

            const contentType=options.video?'video/webm; codecs=vp8':'audio/webm';

            const recorder=new MediaRecorder(stream,{
                audioBitsPerSecond:defaultMediaRecordingAudioKBPerSecond*8000,
                videoBitsPerSecond:defaultMediaRecordingVideoKBPerSecond*8000,
                mimeType:contentType,
            });

            let onLastChunk:(()=>void)|undefined;
            const endPromise=new Promise<void>(resolve=>{
                onLastChunk=resolve;
                if(cancel.isCanceled){
                    resolve();
                }
            })

            const dataPromises:Promise<void>[]=[];

            recorder.addEventListener('dataavailable',(e)=>{
                console.log('hio 👋 👋 👋 data recorded',e);
                //this.uploadAsync(state,e);
                const dp=options.onData?.(e);
                if(dp){
                    dataPromises.push(dp);
                    dp.finally(()=>{
                        aryRemoveItem(dataPromises,dp);
                    })
                }
                if(cancel.isCanceled){
                    onLastChunk?.();
                }
            });

            recorder.start();

            const splitIv=options.splitMs?setInterval(()=>{
                if(cancel.isCanceled){
                    return;
                }
                recorder.stop();
                recorder.start();
            },options.splitMs):undefined;

            if(options.analyze){
                analyzeStream(stream,cancel);
            }

            if(options.playAudio){
                playAudio(stream,cancel);
            }

            await options.run?.(recorder,state,contentType,cancel);


            await cancel.toPromise();

            if(splitIv!==undefined){
                clearInterval(splitIv);
            }

            try{
                recorder.stop();
            }catch{
                // do nothing
            }

            await endPromise;

            await Promise.all([...dataPromises]);

            options.onComplete?.();

        }catch(ex){
            console.error('Stream recording failed',ex);
            return;
        }

    }

    private async uploadAsync(state:ConvoCaptureState,evt:BlobEvent){
        const bucket=state.targetBucket;
        const key=state.targetKey;
        if(!bucket || !key){
            return;
        }

        console.log('hio 👋 👋 👋 uploading',{bucket,key});
        await s3Client().putAsync(bucket,key,evt.data);
        console.log('hio 👋 👋 👋 upload done',);
    }
}



interface RecordOptions
{
    audio:boolean;
    video:boolean;
    onData?:(evt:BlobEvent)=>void|Promise<void>;
    run?:(recorder:MediaRecorder,state:ConvoCaptureState,contentType:string,cancel:CancelToken)=>Promise<void>|void;
    onComplete?:()=>void;
    splitMs?:number;
    analyze?:boolean;
    playAudio?:boolean;
}

const messageStartIgnoreList=[
    'thank you for watching',
    'thanks for watching',
    'silence'
]
const messageIgnoreList=[
    'you'
]

const transcribeAsync=async (blob:Blob,prev?:string):Promise<{text:string,segments:any[],language:string}|null>=>{
    const dataType=blob.type;
    try{

        const formData=new FormData();
        formData.append('model','whisper-1');
        formData.append('response_format','verbose_json');
        if(prev){
            formData.append('prompt',prev);
        }
        formData.append('file',new File([blob],'file.webm',{type:dataType}));
        const result=await fetch('https://api.openai.com/v1/audio/translations',{
            method:'POST',
            headers:{
                //'Content-Type':'multipart/form-data',
                'Authorization':`Bearer ${openAiApiKeyParam()}`
            },
            body:formData
        })
        const json=await result.json();
        console.log('hio 👋 👋 👋 JSON result',json);
        const text=json?.text??'';
        const lt=text.toLowerCase();
        if(!/\w/.test(text) || messageStartIgnoreList.some(m=>lt.startsWith(m)) || messageIgnoreList.includes(lt)){
            console.log('hio 👋 👋 👋 Ignore message - ',text);
            return null;
        }
        console.log('hio 👋 👋 👋 transcription::',text);
        return {
            text,
            segments:json.segments,
            language:json.language
        };
    }catch(ex){
        console.error('transcription failed',ex);
        return null;
    }
}
const speakingTol=150;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let lastActiveSpeakingTime=0;

const analyzeStream=(stream:MediaStream,cancel:CancelToken)=>{
    const ctx = new AudioContext();
    //source.connect(ctx.destination);
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const ary:number[]=[];

    const update=()=>{
        if(cancel.isCanceled){
            clearInterval(iv);
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        // visCtx.clearRect(0,0,visWidth,visHeight);
        // visCtx.fillStyle='#ffffff00';
        // visCtx.fillRect(0,0,visWidth,visHeight);

        // const barWidth = (visWidth / bufferLength) * 2.5;
        // let barHeight;
        // let x = 0;
        let highest=0;
        for (let i = 0; i < bufferLength; i++) {
            const byte=dataArray[i] as number;
            ary[i]=byte;
            if(byte>highest){
                highest=byte;
            }
            // barHeight = byte / 255 * visHeight;

            // visCtx.fillStyle = byte>speakingTol?"#599359":'#aaaaaa';
            // visCtx.fillRect(x, visHeight - barHeight , barWidth, barHeight);

            // x += barWidth + 1;
        }
        if(highest>speakingTol){
            lastActiveSpeakingTime=Date.now();
        }else{
            console.log('SILENCE')
        }

    }
    const iv=setInterval(update,15);
}

const playAudio=(stream:MediaStream,cancel:CancelToken)=>{
    // const context = new AudioContext();
    // const audio = context.createMediaStreamSource(stream);
    // audio.connect(context.destination);
    const audio=new Audio();
    audio.srcObject=stream;
    audio.play();
    cancel.onCancel(()=>{
        audio.pause();
        audio.srcObject=null;
    })
}
