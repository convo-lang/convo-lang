export interface ConvoAppState
{
    tasks:ConvoTaskState[];
}

export type ConvoTaskType='convo'|'capture';

export interface ConvoTaskState
{
    type:ConvoTaskType;
    id:string;
    userPrompt:string;
    convo:string;
    active:boolean;
    capture?:ConvoCaptureState;
    metadata?:Record<string,any>;
}

export interface ConvoCaptureState
{
    tabId?:number;
    title?:string;
    iconUrl?:string;
    tabStreamId?:string;
    captureType:'video'|'audio';
    stop?:boolean;
    cancel?:boolean;
    targetBucket?:string;
    targetKey?:string;
    transcribe?:boolean;
}

export interface ConvoCaptureConfig
{
    targetBucket?:string;
    beforeStartRecording?:(id:string)=>void;
}

export interface ConvoActionState
{
    id:string;
    created:number;
    items:ActionItem[];
}

export interface ActionItem
{
    id:string;
    type:string;
    x:number;
    y:number;
    w:number;
    h:number;
    elem?:Element;
    text:string;
}

export interface ExecuteAction{

    actionStateId:string;

    actionType:"click"|"enterText";

    targetId:string;

    text?:string;
}

export interface ExecuteActionResult
{
    success:boolean;
    errorMessage?:string;
}

export type CcMsg={
    taskId?:string;
    to?:string;
    requestId?:string;
    resultId?:string;
}&(
    {
        type:'ping';
    }|{
        type:'startTask';
        data:string;
    }|{
        type:'startTaskEx';
        data:ConvoTaskState;
    }|{
        type:'getAppState';
    }|{
        type:'returnAppState';
        data:ConvoAppState;
    }|{
        type:'updateState';
        data:ConvoTaskState;
    }|{
        type:'returnState';
        data:ConvoTaskState;
    }|{
        type:'getActionState';
    }|{
        type:'returnActionState';
        data:ConvoActionState;
    }|{
        type:'executeAction';
        data:ExecuteAction;
    }|{
        type:'executeActionResult';
        data:ExecuteActionResult;
    }|{
        type:'getData';
        key:string;
    }|{
        type:'setData';
        data:any;
        key:string;
    }|{
        type:'returnData';
        data:any;
        key:string;
    }|{
        type:'addTab';
        data:number;
    }
)

export interface CcMessageData
{
    key:string;
    data:any;
}

export type CcMsgType=CcMsg['type'];

export interface CcView
{
    route:string;
    render:()=>any;
}


export interface TranscriptionSegment
{
    "id": number;
    "seek": number;
    "start": number;
    "end": number;
    "text": string;
    "tokens": number[];
    "temperature":number;
    "avg_logprob":number;
    "compression_ratio":number;
    "no_speech_prob":number;
}

export interface TranscriptionPart
{
    index:number;
    text:string;
    segments:TranscriptionSegment[];
    language:string;
}

export interface TranscriptionEvent
{
    parts:TranscriptionPart[];
    captureState:ConvoCaptureState;
}
