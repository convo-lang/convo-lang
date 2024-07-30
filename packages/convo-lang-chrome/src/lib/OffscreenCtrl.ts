import { aryRemoveItem } from '@iyio/common';
import { BaseConvoChromeCtrl } from './BaseConvoChromeCtrl';
import { StreamRecorder } from './StreamRecorder';
import { CcMsg, ConvoTaskState, TranscriptionEvent } from './convo-chrome-types';

export interface OffscreenCtrlOptions
{
    onTranscription?:(ctrl:OffscreenCtrl,evt:TranscriptionEvent)=>void;
}


export class OffscreenCtrl extends BaseConvoChromeCtrl
{

    private recorders:StreamRecorder[]=[];

    private onTranscription?:(ctrl:OffscreenCtrl,evt:TranscriptionEvent)=>void;

    public constructor({
        onTranscription
    }:OffscreenCtrlOptions)
    {
        super();
        this.onTranscription=onTranscription;

        const iv=setInterval(()=>{
            this.sendMessage({
                type:'ping'
            })
        },20000);
        this.disposables.addCb(()=>{
            clearInterval(iv);
        })
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        console.log('hio 👋 👋 👋 offscreen msg',msg);

        if(msg.type==='startTaskEx' || msg.type==='updateState'){
            switch(msg.data.type){

                case 'capture':
                    this.updateTaskState(msg.data);
                    break;

            }
        }
    }

    private updateTaskState(state:ConvoTaskState){
        const tabId=state.capture?.tabStreamId;
        if(!tabId || !state.capture){
            return;
        }

        let recorder=this.recorders.find(r=>r.state?.tabStreamId===tabId);
        if(recorder){
            recorder.updateState(state.capture);
        }else{
            recorder=new StreamRecorder(()=>{
                aryRemoveItem(this.recorders,recorder);
            })
            if(this.onTranscription){
                recorder.onTranscription.subscribe(v=>{
                        this.onTranscription?.(this,v)
                });
            }
            recorder.updateState(state.capture);
            this.recorders.push(recorder);
        }

    }
}
