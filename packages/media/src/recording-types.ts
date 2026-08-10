import type { ConvoDb, ConvoTranscriptionRequest, ConvoTranscriptionResultBase, ConvoTranscriptionService } from "@convo-lang/convo-lang";
import type { RecordingCtrl } from "./RecordingCtrl.js";

export type RecordingCtrlState='stopped'|'recording'|'done';


export interface RecordingOptions
{
    enableVideo?:boolean;
    enableLiveMode?:boolean;
    transcribe?:boolean|Omit<ConvoTranscriptionRequest,'audio'>;
    transcriptionsSaveDir?:string;
    audioSaveDir?:string;
    /**
     * Name template used to when saving transcriptions
     * @default "[[date-time]]-[[index]]"
     */
    transcriptionFileNameTemplate?:string;
    /**
     * Name template used to when saving transcription audio files
     * @default "[[date-time]]-[[index]].[[ext]]"
     */
    audioFileNameTemplate?:string;

    /** If true local state of transcriptions will be saved in case of errors */
    storeLocalState?:boolean;

    localStateMetadata?:Record<string,any>;

    /** Path to a file in ConvoDb to use as a media stream */
    inputDbFilePath?:string;

}

export interface RecordingCtrlOptions extends RecordingOptions
{
    transcriptionService?:ConvoTranscriptionService;
    db?:ConvoDb;
    onTranscription?:(transcription:ConvoTranscriptionResultBase,liveMode:boolean,recorder:RecordingCtrl)=>void;
}