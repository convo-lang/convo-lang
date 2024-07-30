import { parseXml } from "@iyio/common";
import { ConvoMessageComponent, ConvoPromptMedia, ConvoPromptMediaPurpose, convoPromptImagePropKey } from "./convo-lang-ui-types";

export const getConvoPromptMediaUrl=(img:string|ConvoPromptMedia|null|undefined,purpose:ConvoPromptMediaPurpose):string|undefined=>{
    if(typeof img === 'string'){
        return img
    }

    if(!img){
        return undefined;
    }

    return img.url??img.getUrl?.(purpose)??img[convoPromptImagePropKey]?.();
}

export const parseConvoMessageComponents=(content:string):ConvoMessageComponent[]|undefined=>{
    return parseXml(content,{parseJsonAtts:true}).result;
}
