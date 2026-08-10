import { Conversation, ConvoTranscriptionResultBase, convoTranscriptionService, escapeConvo } from "@convo-lang/convo-lang";
import { DisposeContainer, escapeHtml, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { AudioVisualizer } from "./AudioVisualizer.js";
import type { RecordingCtrlOptions } from "./recording-types.js";
import { RecordingCtrl } from "./RecordingCtrl.js";

export interface VoiceConversationCtrlOptions
{
    conversation?:Conversation;
    recordingOptions?:RecordingCtrlOptions;
    labelSpeakers?:boolean;
    /**
     * If true a function will be forced to be called for each user message appended.
     */
    functionsOnly?:boolean;

    canvas?:HTMLCanvasElement;
    canvasSizeFactor?:number;
}

export class VoiceConversationCtrl
{
    public readonly conversation:Conversation;
    public readonly recordingCtrl:RecordingCtrl;
    public readonly labelSpeakers:boolean;
    public readonly canvas?:HTMLCanvasElement;
    public functionsOnly:boolean;
    private readonly _completing:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get completingSubject():ReadonlySubject<boolean>{return this._completing}
    public get completing(){return this._completing.value}

    public get isRecording(){return this.recordingCtrl.isRecording}

    private _visualizer?:AudioVisualizer;

    public constructor({
        conversation,
        labelSpeakers=false,
        recordingOptions,
        functionsOnly=false,
        canvas,
        canvasSizeFactor,
    }:VoiceConversationCtrlOptions){
        this.conversation=conversation??new Conversation();
        this.labelSpeakers=labelSpeakers;
        this.functionsOnly=functionsOnly;
        this.canvas=canvas;
        this.recordingCtrl=new RecordingCtrl({
            enableLiveMode:true,
            enableVideo:false,
            transcriptionService:recordingOptions?.transcriptionService??convoTranscriptionService.get(),
            transcribe:recordingOptions?.transcribe??{
                includeSegments:labelSpeakers,
                labelSpeakers,
            },
            ...recordingOptions,
        });
        this.disposables.addSub(this.recordingCtrl.audioTranscriptionSubject.subscribe(t=>{
            if(t){
                this.pushAsync(t);
            }
        }));
        this.disposables.addSub(this.recordingCtrl.streamSubject.subscribe(stream=>{
            if(this._visualizer){
                this._visualizer.dispose();
                this._visualizer=undefined;
            }
            if(stream && canvas && !this.isDisposed){
                this._visualizer=new AudioVisualizer({
                    stream,
                    canvas,
                    sizeFactor:canvasSizeFactor,
                });
                this._visualizer.run();
            }
        }))
    }

    private _isDisposed=false;
    private readonly disposables=new DisposeContainer();
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
        this.conversation.dispose();
        this.recordingCtrl.dispose();
        this._visualizer?.dispose();
    }

    /**
     * Starts capturing audio
     */
    public start()
    {
        this.recordingCtrl.start();
    }

    /**
     * Stops capturing audio
     */
    public stop()
    {
        this.recordingCtrl.stop();
    }

    private queue:ConvoTranscriptionResultBase[]=[];
    private async pushAsync(trans:ConvoTranscriptionResultBase){
        if(this.isDisposed || !this.conversation.messages.some(m=>m.fn)){
            return;
        }
        this.queue.push(trans);
        if(this._completing.value){
            return;
        }
        this._completing.next(true);
        try{

            while(this.queue.length && !this.isDisposed){
                const msg=this.queue.map(t=>{
                    return ((this.labelSpeakers && t.segments)?
                        t.segments.map(s=>(
                            `<SPEAKER id="${escapeHtml(s.id)}" name="${escapeHtml(s.speaker)}">${s.text}</SPEAKER>`
                        )).join('\n\n')
                    :
                        t.text
                    );
                }).join('\n\n');
                this.queue.splice(0,this.queue.length);
                this.conversation.append(`${this.functionsOnly?'@call\n':''}> user\n${escapeConvo(msg)}`);
                await this.conversation.completeAsync();
            }

        }finally{
            this._completing.next(false);
        }
    }

}