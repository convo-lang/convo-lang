import { DisposeCallback } from "@iyio/common";

export interface AudioVisualizerOptions
{
    canvas:HTMLCanvasElement;
    stream:MediaStream;
}

export class AudioVisualizer
{

    private readonly options:AudioVisualizerOptions;

    public constructor(options:AudioVisualizerOptions){
        this.options=options;
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.cleanUp?.();
    }
    private cleanUp?:DisposeCallback;

    public run(){
        if(this.isDisposed || this.cleanUp){
            return;
        }
        const canvas=this.options.canvas;
        const style=globalThis.window?.getComputedStyle(canvas);
        const color=style.color;
        const ctx=canvas.getContext('2d');
        const audioContext=new (globalThis.window?.AudioContext || (globalThis.window as any)?.webkitAudioContext)();
        if(!audioContext || !ctx){
            return;
        }
        const source=audioContext.createMediaStreamSource(this.options.stream);
        const analyser=audioContext.createAnalyser();

        this.cleanUp=()=>{
            source.disconnect();
            analyser.disconnect();
            audioContext.close();
        }

        // Lower fftSize makes the wave smoother
        analyser.fftSize=1024;
        analyser.smoothingTimeConstant=0.8;
        source.connect(analyser);

        const bufferLength=analyser.frequencyBinCount;
        const stampLength=bufferLength*2;
        const dataArray=new Uint8Array(bufferLength);


        // shift Buffer should be 2x the size of dataArray
        const shiftBuffer=new Uint8Array(bufferLength*2);
        const shiftMin=30;

        const draw=()=>{

            if(this.isDisposed){
                return;
            }

            const pillCount=Math.floor(canvas.width/28);
            const pillWidth=8;
            const pillGap=19;
            const minHeight=8;
            const maxHeight=canvas.height*0.8;

            canvas.width=canvas.clientWidth*2;
            canvas.height=canvas.clientHeight*2;

            analyser.getByteFrequencyData(dataArray);

            for(let i=0;i<bufferLength;i++){
                const v=dataArray[i] as number;
                if(v>shiftMin){
                    shiftBuffer[bufferLength+i]=v;
                }
            }
            const shiftSize=Math.round(stampLength/pillCount*0.5);
            for(let i=0;i<stampLength;i+=shiftSize){
                for(let s=0;s<shiftSize;s++){
                    shiftBuffer[i+s]=shiftBuffer[i+shiftSize+s]??shiftMin;
                }
            }

            ctx.clearRect(0,0,canvas.width,canvas.height);

            const totalWidth=pillCount*(pillWidth+pillGap);
            const startX=(canvas.width-totalWidth)/2;

            for (let i=0;i<pillCount;i++){
                const step=Math.floor(bufferLength/pillCount);
                const value=shiftBuffer[i*step] as number;

                const percent=value/255;
                const height=Math.max(minHeight,maxHeight*percent);

                const x=startX+i*(pillWidth+pillGap);
                const y=(canvas.height-height)/2;

                ctx.beginPath();
                ctx.fillStyle=color;
                ctx.roundRect(x,y,pillWidth,height,pillWidth/2);
                ctx.fill();
            }

            if(!this.isDisposed){
                requestAnimationFrame(draw);
            }
        }

        draw();
    }
}
