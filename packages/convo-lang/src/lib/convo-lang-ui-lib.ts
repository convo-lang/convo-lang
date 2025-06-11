import { parseXml } from "@iyio/common";
import { ConvoMarkdownEnableState, ConvoMessageComponent, ConvoPromptMedia, ConvoPromptMediaPurpose, convoPromptImagePropKey } from "./convo-lang-ui-types";

export const getConvoPromptMediaUrl=(img:string|ConvoPromptMedia|null|undefined,purpose:ConvoPromptMediaPurpose):string|undefined=>{
    if(typeof img === 'string'){
        return img
    }

    if(!img){
        return undefined;
    }

    return img.url??img.getUrl?.(purpose)??img[convoPromptImagePropKey]?.();
}

const jsonReg=/^[\n\s]*\{/

export const parseConvoMessageComponents=(content:string,defaultComponentName?:string):ConvoMessageComponent[]|undefined=>{
    if(jsonReg.test(content)){
        const json=JSON.parse(content);
        return [{
            isJson:true,
            name:defaultComponentName??'Json',
            atts:json?((typeof json === 'object')?json:{value:json}):{value:json},
        }]
    }else{
        return parseXml(content,{parseJsonAtts:true}).result;
    }
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
