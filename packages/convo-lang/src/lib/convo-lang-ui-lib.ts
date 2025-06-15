import { ConvoMarkdownEnableState, ConvoPromptMedia, ConvoPromptMediaPurpose, convoPromptImagePropKey } from "./convo-lang-ui-types";

export const getConvoPromptMediaUrl=(img:string|ConvoPromptMedia|null|undefined,purpose:ConvoPromptMediaPurpose):string|undefined=>{
    if(typeof img === 'string'){
        return img
    }

    if(!img){
        return undefined;
    }

    return img.url??img.getUrl?.(purpose)??img[convoPromptImagePropKey]?.();
}

export const isMdConvoEnabledFor=(role:'user'|'assistant'|'all',state:ConvoMarkdownEnableState):boolean=>{
    if(state==='all'){
        return true;
    }
    if(state===true || state==='assistant'){
        return role==='assistant';
    }else if(state==='user'){
        return role==='user';
    }else{
        return false;
    }
}
