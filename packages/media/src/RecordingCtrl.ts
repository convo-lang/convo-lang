import { convoDbService, ConvoTranscriptionRequest, convoTranscriptionRequestToSupportRequest, ConvoTranscriptionResultBase, ConvoTranscriptionSegment, ConvoTranscriptionUsage } from "@convo-lang/convo-lang";
import { aryRemoveItem, CancelToken, createPromiseSource, DisposeContainer, getFileName, InternalOptions, ReadonlySubject, uuid } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { VadCtrl, VadSpeechFile } from "./VadCtrl.js";
import { getAudioRecordingContentType, getVideoRecordingContentType, stopStream } from "./media-lib.js";
import type { RecordingCtrlOptions } from "./recording-types.js";


type Options=InternalOptions<RecordingCtrlOptions,'transcriptionService'|'db'|'onTranscription'|'transcriptionsSaveDir'|'audioSaveDir'|'inputDbFilePath'>

export class RecordingCtrl
{

    private readonly options:Options;

    public constructor({
        enableVideo=false,
        enableLiveMode=false,
        transcribe=false,
        transcriptionService,
        transcriptionsSaveDir,
        transcriptionFileNameTemplate='[[date-time]]-[[index]]',
        audioSaveDir,
        audioFileNameTemplate='[[date-time]]-[[index]].[[ext]]',
        storeLocalState=false,
        localStateMetadata={},
        db,
        onTranscription,
        inputDbFilePath,
    }:RecordingCtrlOptions={}){
        this.options={
            enableVideo,
            enableLiveMode,
            transcribe,
            transcriptionService,
            db,
            onTranscription,
            transcriptionsSaveDir,
            transcriptionFileNameTemplate,
            audioSaveDir,
            audioFileNameTemplate,
            storeLocalState,
            localStateMetadata,
            inputDbFilePath,
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

    public start()
    {
        this.cancel();
        if(this.isDisposed){
            return;
        }
        const id=++this.currentRecordingId;
        const cancel=new CancelToken();
        this.recordingStopToken=cancel;
        this.recordAsync(id,cancel);
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

    private async getFileStreamAsync(path:string):Promise<{stream:MediaStream,cleanUp:()=>void}>
    {
        const readableStream=await this.getDb()?.openBlobAsync(path);
        if(!readableStream || !readableStream.success){
            throw new Error(`Unable to load audio data from ${path}`);
        }
        
        const reader=readableStream.result.getReader();
        const chunks:any[]=[];
        let len=0;

        while (true) {
            const {done,value}=await reader.read();
            if(done){
                break;
            }
            chunks.push(value); 
            len+=value.byteLength;
        }
        
                // 1. Create the AudioContext
        const audioContext = new AudioContext();

        // 2. Fetch the WAV file and grab its arrayBuffer
        const buf=new Uint8Array(len);
        let offset = 0;
        for (const chunk of chunks) {
            buf.set(chunk, offset);
            offset += chunk.byteLength;
        }
        const arrayBuffer = await buf.buffer;

        // 3. Decode the WAV binary data into an AudioBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 4. Create an AudioBufferSourceNode and attach the buffer
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;

        // 5. Create a MediaStreamAudioDestinationNode
        const destinationNode = audioContext.createMediaStreamDestination();

        // 6. Connect the source to the destination node
        sourceNode.connect(destinationNode);

        // 7. Start playing the source node
        sourceNode.start();

        // 8. Extract and return the actual MediaStream object
        return {
            stream:destinationNode.stream,
            cleanUp:()=>{}
        }
    }

    private async _getFileStreamAsync(path:string):Promise<{stream:MediaStream,cleanUp:()=>void}>
    {
        const readableStream=await this.getDb()?.openBlobAsync(path);
        if(!readableStream || !readableStream.success){
            throw new Error(`Unable to load audio data from ${path}`);
        }
        
        const reader=readableStream.result.getReader();
        const chunks:any[]=[];

        while (true) {
            const {done,value}=await reader.read();
            if(done){
                break;
            }
            chunks.push(value); 
        }

        const blob=new Blob(chunks,{type:'audio/wav'});
        const url=URL.createObjectURL(blob);

        const audio=new Audio(url);
        audio.crossOrigin='anonymous';
        return {
            cleanUp:()=>{
                URL.revokeObjectURL(url);
            },
            stream:(audio as any).captureStream?(audio as any).captureStream():(audio as any).mozCaptureStream(),
        }
    }

    private currentRecordingId=0;
    private recordingStopToken?:CancelToken;
    private async recordAsync(id:number,cancel:CancelToken)
    {
        if(cancel.isCanceled){
            return;
        }

        const options=this.options;
        let index=0;

        let stream:MediaStream|undefined;
        let mediaRecorder:MediaRecorder|undefined;
        const cleanUp=new DisposeContainer();

        try{
            this._isRunning.next(true);
            const type=options.enableVideo?getVideoRecordingContentType():getAudioRecordingContentType();

            this._isRecording.next(true);
            this._liveModeActive.next(options.enableLiveMode);
            if(this.options.inputDbFilePath){
                const {stream:s,cleanUp:c}=await this.getFileStreamAsync(this.options.inputDbFilePath);
                cleanUp.addCb(c);
                stream=s;
            }else{
                stream=await navigator.mediaDevices.getUserMedia({
                    audio:!options.enableVideo,
                    video:options.enableVideo,
                });
            }
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
                        this.triggerTrans(first.trans);
                        first=speechQueue.shift();
                    }
                }
                cleanUp.addSub(vad.onSpeechRecording.subscribe(s=>{
                    const q:(VadSpeechFile&{trans?:ConvoTranscriptionResultBase})={...s};
                    speechQueue.push(q);
                    this.transcribeAsync(s.file,id,false,index++).then(trans=>{
                        if(this.isDisposed || id!==this.currentRecordingId){
                            return;
                        }
                        if(trans && trans.timestamp===undefined){
                            trans.timestamp=s.time;
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
                await this.transcribeAsync(recording,id,true,index++);
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

    private triggerTrans(trans:ConvoTranscriptionResultBase){
        if(!trans.text.trim()){
            return;
        }
        this._audioTranscription.next(trans);
        this.options.onTranscription?.(trans,this.options.enableLiveMode,this);
    }

    private getDb(){
        return this.options.db??convoDbService.get();
    }

    private transcribeCount=0;
    private async transcribeAsync(recording:File,id:number,trigger:boolean,index:number){
        const service=this.options.transcriptionService;
        if(!service){
            return;
        }
        this.transcribeCount++;
        this._isTranscribing.next(true);
        try{

            const state:RecordingTranscriptionState={
                state:'init',
                uuid:uuid(),
                created:new Date().toISOString(),
                index,
                id,
                trigger,
                transcriptionDbPath:(
                    this.options.transcriptionsSaveDir?
                        this.getTemplateName(this.options.transcriptionsSaveDir,this.options.transcriptionFileNameTemplate,id,index,'wav'):undefined
                ),
                audioFileDbPath:(
                    this.options.audioSaveDir?
                        this.getTemplateName(this.options.audioSaveDir,this.options.audioFileNameTemplate,id,index,'wav'):undefined
                ),
                metadata:{...this.options.localStateMetadata}
            }
            activeTranscriptions.push(state);

            const copy=await recording.arrayBuffer();
            const createBlob=()=>{
                return new Blob([copy],{type:recording.type});
            }

            if(this.options.storeLocalState && copy){
                await this.saveLocalStateAsync(state,createBlob());
            }

            let completed=false;
            const tryComplete=()=>{
                if(completed){
                    return;
                }
                if(state.state==='failed'){
                    completed=true;
                    aryRemoveItem(activeTranscriptions,state);
                    if(this.options.storeLocalState){
                        this.saveLocalStateAsync(state);
                    }
                    return;
                }
                if( completed ||
                    state.state!=='complete' ||
                    (state.transcriptionDbPath && !state.transcriptionSaved) ||
                    (state.audioFileDbPath && !state.audioFileSaved) 
                ){
                    return;
                }
                completed=true;
                aryRemoveItem(activeTranscriptions,state);
                if(this.options.storeLocalState){
                    this.saveLocalStateAsync(state);
                }
            }

            if(state.audioFileDbPath && copy){
                (async ()=>{
                    const r=await this.getDb()?.writeBlobAsync(state.audioFileDbPath!,createBlob());
                    if(r?.success){
                        state.audioFileSaved=true;
                    }else{
                        const err=`Failed to write transcription audio file to db at path: ${state.audioFileDbPath}. error:${r?.error}`;
                        state.state='failed';
                        state.errorMessage=err;
                        console.error(err);
                    }
                    tryComplete();
                })();
            }
            
            const request:ConvoTranscriptionRequest={
                ...((typeof this.options.transcribe==='object')?this.options.transcribe:{}),
                audio:new File([copy],recording.name,{type:recording.type}),
            }
            const canTranscribe=await service.canTranscribe(convoTranscriptionRequestToSupportRequest(request));
            if(id!==this.currentRecordingId || !canTranscribe){
                state.state=id!==this.currentRecordingId?'cancelled':'failed';
                if(!canTranscribe){
                    state.errorMessage='No transcription service found that can transcribe';
                }
                if(this.options.storeLocalState){
                    await this.saveLocalStateAsync(state);
                }
                return;
            }
            state.state='transcribing';
            if(this.options.storeLocalState){
                await this.saveLocalStateAsync(state);
            }
            const r=await service.transcribeAsync(request);
            if(!r.success){
                state.state='failed';
                state.errorMessage=r.error.message;
                if(this.options.storeLocalState){
                    await this.saveLocalStateAsync(state);
                }
                return;
            }
            if(state.audioFileDbPath){
                r.audioFileDbPath=state.audioFileDbPath;
                r.audioFileDbFileName=getFileName(state.audioFileDbPath);
            }
            if(state.transcriptionDbPath){
                r.transcriptionDbPath=state.transcriptionDbPath;
                r.transcriptionDbFileName=getFileName(state.transcriptionDbPath);
            }
            if(id!==this.currentRecordingId){
                state.state='cancelled';
                if(this.options.storeLocalState){
                    await this.saveLocalStateAsync(state);
                }
                return;
            }

            state.state='complete';
            state.text=r.text;
            state.segments=r.segments;
            state.usage=r.usage;
            tryComplete();

            if(state.transcriptionDbPath){
                (async ()=>{
                    const insert=await this.getDb()?.insertNodeAsync({
                        path:state.transcriptionDbPath!,
                        type:'transcription',
                        data:{
                            text:r.text,
                            segments:r.segments,
                        }
                    });
                    if(insert?.success){
                        state.transcriptionSaved=true;
                    }else{
                        const err=`Failed to save transcription to db at path: ${state.transcriptionDbPath}. error:${insert?.error}`;
                        state.state='failed';
                        state.errorMessage=err;
                        console.error(err);
                    }
                    tryComplete();
                })();
            }

            if(trigger){
                this.triggerTrans(r);
            }

            return r;

        }finally{
            this.transcribeCount--;
            if(!this.transcribeCount){
                this._isTranscribing.next(false);
            }
        }
    }

    private async saveLocalStateAsync(state:RecordingTranscriptionState,recording?:Blob){
        if(!globalThis.indexedDB){
            return;
        }
        const db=await openTranscriptionDbAsync();
        if(state.state==='complete' || state.state==='cancelled'){
            await Promise.all([
                idbDeleteAsync(db,`${state.uuid}.json`),
                idbDeleteAsync(db,`${state.uuid}.blob`),
            ]);
        }else{
            await idbPutAsync(db,`${state.uuid}.json`,{...state});
            if(recording){
                await idbPutAsync(db,`${state.uuid}.blob`,recording);
            }
        }
    }

    private getTemplateName(dir:string,template:string,id:number,index:number,ext:string){
        const now=new Date();
        if(!dir.endsWith('/')){
            dir+='/';
        }
        return dir+template.replace(templateNameReg,(_:string,key:string)=>{
            switch(key){

                case 'id': return id.toString();
                case 'index': return index.toString();
                case 'ext': return ext;
                case 'date': return `${
                    now.getFullYear()
                }-${
                    (now.getMonth()+1).toString().padStart(2,'0')
                }-${
                    now.getDate().toString().padStart(2,'0')
                }`;
                case 'date-time': return `${
                    now.getFullYear()
                }-${
                    (now.getMonth()+1).toString().padStart(2,'0')
                }-${
                    now.getDate().toString().padStart(2,'0')
                }T${
                    now.getHours().toString().padStart(2,'0')
                }-${
                    now.getMinutes().toString().padStart(2,'0')
                }-${
                    now.getSeconds().toString().padStart(2,'0')
                }`;

                default: return 'UNKNOWN_KEY'
            }
        })
    }
}

const activeTranscriptions:RecordingTranscriptionState[]=[];
export const getPendingRecordingTranscriptionsAsync=async ():Promise<RecordingTranscriptionState[]>=>{
    if(!globalThis.indexedDB){
        return [];
    }
    const db=await openTranscriptionDbAsync();
    const all=await idbGetAllAsync<RecordingTranscriptionState>(db,jsonKeyReg);
    return all.filter(s=>!activeTranscriptions.some(a=>a.uuid===s.uuid));
}

export const getRecordingTranscriptionBlobAsync=async (uuid:string):Promise<Blob|undefined>=>{
    if(!globalThis.indexedDB){
        return undefined;
    }
    const db=await openTranscriptionDbAsync();
    const blob=await idbGetAsync<Blob>(db,`${uuid}.blob`);
    return blob??undefined;
}

const transcriptionDbName='convo-recording-transcriptions';
const transcriptionStoreName='records';
const jsonKeyReg=/\.json$/;

let transcriptionDbPromise:Promise<IDBDatabase>|undefined;
const openTranscriptionDbAsync=():Promise<IDBDatabase>=>{
    return transcriptionDbPromise??(transcriptionDbPromise=new Promise<IDBDatabase>((resolve,reject)=>{
        const req=globalThis.indexedDB.open(transcriptionDbName,1);
        req.onupgradeneeded=()=>{
            const db=req.result;
            if(!db.objectStoreNames.contains(transcriptionStoreName)){
                db.createObjectStore(transcriptionStoreName);
            }
        }
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
    }));
}

const idbPutAsync=(db:IDBDatabase,key:string,value:any):Promise<void>=>{
    return new Promise<void>((resolve,reject)=>{
        const tx=db.transaction(transcriptionStoreName,'readwrite');
        tx.objectStore(transcriptionStoreName).put(value,key);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
    });
}

const idbDeleteAsync=(db:IDBDatabase,key:string):Promise<void>=>{
    return new Promise<void>((resolve,reject)=>{
        const tx=db.transaction(transcriptionStoreName,'readwrite');
        tx.objectStore(transcriptionStoreName).delete(key);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
    });
}

const idbGetAsync=<T>(db:IDBDatabase,key:string):Promise<T|undefined>=>{
    return new Promise<T|undefined>((resolve,reject)=>{
        const tx=db.transaction(transcriptionStoreName,'readonly');
        const req=tx.objectStore(transcriptionStoreName).get(key);
        req.onsuccess=()=>resolve(req.result as T|undefined);
        req.onerror=()=>reject(req.error);
    });
}

const idbGetAllAsync=<T>(db:IDBDatabase,keyReg:RegExp):Promise<T[]>=>{
    return new Promise<T[]>((resolve,reject)=>{
        const tx=db.transaction(transcriptionStoreName,'readonly');
        const store=tx.objectStore(transcriptionStoreName);
        const results:T[]=[];
        const cursorReq=store.openCursor();
        cursorReq.onsuccess=()=>{
            const cursor=cursorReq.result;
            if(cursor){
                if(typeof cursor.key==='string' && keyReg.test(cursor.key)){
                    results.push(cursor.value as T);
                }
                cursor.continue();
            }else{
                resolve(results);
            }
        }
        cursorReq.onerror=()=>reject(cursorReq.error);
    });
}

const templateNameReg=/\[\[([\w-]+)\]\]/g;

export interface RecordingTranscriptionState
{
    state:'init'|'transcribing'|'cancelled'|'failed'|'complete';
    errorMessage?:string;
    created:string;
    uuid:string;
    id:number;
    index:number;
    trigger:boolean;
    transcriptionDbPath?:string;
    audioFileDbPath?:string;
    audioFileSaved?:boolean;
    transcriptionSaved?:boolean;
    text?:string;
    segments?:ConvoTranscriptionSegment[];
    usage?:ConvoTranscriptionUsage;
    metadata:Record<string,any>;

}