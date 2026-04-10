import { CancelToken, InternalOptions, type ReadonlySubject } from "@iyio/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";

export interface VadOptions
{
    /**
     * Number of milliseconds to delay before ending active speech detection
     */
    endDelayMs?:number;

    createRecorder?:(stream:MediaStream)=>MediaRecorder;

    onnxWASMBasePath?:string;
    baseAssetPath?:string;
}

export interface VadSpeechFile
{
    index:number;
    file:File;
}

export class VadCtrl
{

    private options:InternalOptions<VadOptions,'createRecorder'>;

    private readonly _onSpeechRecording=new Subject<VadSpeechFile>();
    public get onSpeechRecording():Observable<VadSpeechFile>{return this._onSpeechRecording}

    public constructor({
        endDelayMs=1000,
        createRecorder,
        onnxWASMBasePath="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
        baseAssetPath="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    }:VadOptions){
        this.options={
            endDelayMs,
            createRecorder,
            onnxWASMBasePath,
            baseAssetPath
        }
    }

    private readonly _active:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get activeSubject():ReadonlySubject<boolean>{return this._active}
    public get active(){return this._active.value}

    public async runAsync(stream:MediaStream,cancel:CancelToken):Promise<void>{
        let index=0;
        const micVad=await import('@ricky0123/vad-web');

        let currentRecorder:MediaRecorder|undefined;

        const mic=await micVad.MicVAD.new({
            redemptionMs:this.options.endDelayMs,
            getStream:async ()=>stream,
            onSpeechStart:()=>{
                if(cancel.isCanceled){
                    return;
                }
                currentRecorder=this.options.createRecorder?.(stream);
                this._active.next(true);
            },
            onVADMisfire:()=>{
                this._active.next(false);
            },
            onSpeechEnd:(samples)=>{
                this._active.next(false);

                if(currentRecorder && !cancel.isCanceled){
                    currentRecorder.stop();
                    currentRecorder=undefined;
                    const sampleRate=16000;
                    const chunkSeconds=60;
                    const chunkSize=chunkSeconds*sampleRate;
                    for(let i=0;i<samples.length;i+=chunkSize){
                        const b=audioBufferToWav(sampleRate,samples,i,Math.min(samples.length-i,chunkSize));
                        const file=new File([b],'audio.wav',{type:'audio/wav'});
                        this._onSpeechRecording.next({file,index:index++});
                    }
                }
            },
            onnxWASMBasePath:this.options.onnxWASMBasePath,
            baseAssetPath:this.options.baseAssetPath,
        });

        mic.start();

        await cancel.toPromise();
        currentRecorder?.stop();
        currentRecorder=undefined;

        mic.destroy();
    }
}


function audioBufferToWav(sampleRate:number, channelBuffer:Float32Array, index=0, len=channelBuffer.length):ArrayBuffer {
    const totalSamples = len;

    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    const writeString = (view:DataView, offset:number, str:string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    /* RIFF identifier */
    writeString(view, 0, "RIFF");
    /* RIFF chunk length */
    view.setUint32(4, 36 + totalSamples * 2, true);
    /* RIFF type */
    writeString(view, 8, "WAVE");
    /* format chunk identifier */
    writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, totalSamples * 2, true);

    // floatTo16BitPCM
    let offset = 44;
    for (let i = 0; i < len; i++) {
        const s = Math.max(-1, Math.min(1, channelBuffer[index+i] as number));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
    }

    return buffer;
}
