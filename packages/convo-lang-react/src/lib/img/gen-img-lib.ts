import { joinPaths } from "@iyio/common";
import { genMetadataToString } from "../gen/gen-lib";

export interface GenImgUrlOptions
{
    prompt:string;
    salt?:string;
    metadata?:Record<string,any>;
    artStyle?:string;
    maxPromptLength?:number;
    genEndpoint?:string;
    disableCaching?:boolean;
}

export const getGenImgUrl=({
    prompt,
    metadata,
    artStyle,
    maxPromptLength=800,
    salt='default',
    genEndpoint='/api/convo-lang/image',
    disableCaching,
}:GenImgUrlOptions)=>{

    if(prompt && prompt.length>maxPromptLength){
        const i=prompt.indexOf(' ',maxPromptLength);
        if(i===-1){
            prompt=prompt.substring(0,maxPromptLength);
        }else{
            prompt=prompt.substring(0,i);
        }
    }

    if(artStyle || metadata){
        prompt+=genMetadataToString({
            ...metadata,
            artStyle:artStyle??metadata?.['artStyle']??metadata?.['artStyle']
        });
    }

    return (
        joinPaths(genEndpoint,`${encodeURIComponent(salt)}/${encodeURIComponent(prompt)}`)+
        (disableCaching?'?cache=false':'')
    );
}
