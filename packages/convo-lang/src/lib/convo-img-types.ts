export interface ConvoImageRequest
{
    prompt:string;
    cache?:boolean;
    model?:string;
    size?:string;
}

export interface ConvoImageResponse
{
    created?:number;
    url?:string;
    revisedPrompt?:string;
    data?:Blob;
}

export type ConvoImageGenerator=(request:ConvoImageRequest)=>Promise<ConvoImageResponse[]|undefined>
