import { Conversation, HttpConvoCompletionService } from "@convo-lang/convo-lang";
import { VoiceConversationCtrl } from "@convo-lang/media/VoiceConversationCtrl.js";
import './index.css';

interface State
{
    recording:boolean;
}

const _state:State={
    recording:false,
}

const startBtn=document.getElementById('start-btn');
const stopBtn=document.getElementById('stop-btn');
const outputElem=document.getElementById('output');
const canvas=document.getElementById('audio-visualizer')

let ctrl:VoiceConversationCtrl|undefined;
let conversation:Conversation|undefined;
const getCtrl=()=>{
    if(ctrl){
        return ctrl;
    }
    const http=new HttpConvoCompletionService({
        endpoint:'/'
    });
    conversation=new Conversation({
        completionService:http
    });
    ctrl=new VoiceConversationCtrl({
        conversation,
        labelSpeakers:true,
        canvas:canvas as any,
        canvasSizeFactor:2,
        recordingOptions:{
            transcriptionService:http,
        }
    });

    conversation.onAppend.subscribe(()=>{
        if(outputElem){
            outputElem.innerText=conversation?.convo??'';
        }
    })


    return ctrl;
}

const start=()=>{
    // const http=new HttpConvoCompletionService({
    //     endpoint:'/'
    // })
    // const c=new Conversation({
    //     completionService:http
    // });
    // c.appendUserMessage('hi');
    // c.completeAsync();
    getCtrl().start();
    update(s=>s.recording=true);
}

const stop=()=>{
    getCtrl().stop();
    update(s=>s.recording=false);
}

const syncState=(prev:State,state:State)=>{
    if(state.recording){
         getCtrl().start();
         startBtn?.classList.add('hidden');
         stopBtn?.classList.remove('hidden');
    }else{
         getCtrl().stop();
         startBtn?.classList.remove('hidden');
         stopBtn?.classList.add('hidden');
    }
}

const update=(mutate:(state:State)=>void)=>{
    try{
        const prev={..._state}
        mutate(_state);
        syncState(prev,_state);
    }catch(ex){
        console.error('State mutation failed',ex);
    }
}

const init=()=>{
    syncState(_state,_state);
    startBtn?.addEventListener('click',start);
    stopBtn?.addEventListener('click',stop);
}

init();