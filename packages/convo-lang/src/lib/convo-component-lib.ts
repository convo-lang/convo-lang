import { parseXml } from "@iyio/common";
import { ConvoComponent } from "./convo-component-types.js";
import { ConvoComponentMode, FlatConvoMessage, isConvoComponentMode } from "./convo-types.js";

/**
 * Finds the component type of a message.
 */
export const getConvoMessageComponentMode=(content:string|null|undefined):ConvoComponentMode|undefined=>{
    const types=(content?/^\s*```([^\n]*).*```\s*$/s.exec(content):null)?.[1]?.trim().split(' ');
    if(!types){
        return undefined;
    }
    const last=types[types.length-1];
    return isConvoComponentMode(last)?last:undefined;
}

const convoComponentCacheKey=Symbol('convoComponentCacheKey');
/**
 * Parses message content as a convo component. Components are written in xml. The parsed component
 * is cached and stored on the message using a private symbol.
 * @param msg The message to parse
 */
export const getConvoMessageComponent=(msg:FlatConvoMessage|null|undefined):ConvoComponent|undefined=>{
    if(!msg?.content){
        return undefined;
    }
    const cached=(msg as any)[convoComponentCacheKey];
    if(cached){
        return cached;
    }

    const comp=parseConvoComponent(msg.content);
    if(comp){
        (msg as any)[convoComponentCacheKey]=comp;
    }
    return comp;
}


const transformComponentReg=/^(\w+)\s+(\w+)(\s+(\w+))?(\s+\?\s*(!?\s*.*))?$/;
export interface ParseConvoComponentTransformResult
{
    componentName:string;
    propType:string;
    groupName?:string;
    condition?:string;
}
/**
 * Parses the value of the `transformComponent` tag
 * @param value [groupName] {componentName} {propType} [?[!] condition]
 */
export const parseConvoComponentTransform=(value:string|null|undefined):ParseConvoComponentTransformResult|undefined=>{
    if(!value){
        return undefined;
    }
    const m=transformComponentReg.exec(value);
    if(!m){
        return undefined;
    }
    const hasGroup=m[4]?true:false;
    const ni=hasGroup?2:1;
    return {
        componentName:m[ni]??'',
        propType:m[hasGroup?ni+2:2]??'',
        groupName:(hasGroup?m[1]:m[ni])||undefined,
        condition:m[6]?.trim()||undefined,
    }
}

const mdFenceReg=/^[\n\s]*```[^\n]*/
const jsonReg=/^[\n\s]*\{/

export const parseConvoMessageComponents=(content:string,defaultComponentName?:string):ConvoComponent[]|undefined=>{
    const fenceMatch=mdFenceReg.exec(content);
    if(fenceMatch){
        content=content.substring(fenceMatch[0].length).trim();
        if(content.endsWith('```')){
            content=content.substring(0,content.length-3);
        }
    }
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


/**
 * Parses message content as a convo component. Components are written in xml.
 * @param content string content to parse
 */
export const parseConvoComponent=(content:string|null|undefined):ConvoComponent|undefined=>{

    if(!content){
        return undefined;
    }

    const codeBlockMatch=/^\s*```[^\n]*(.*)```\s*$/s.exec(content);
    if(codeBlockMatch?.[1]){
        content=codeBlockMatch[1];
    }

    const xml=parseXml(content,{parseJsonAtts:true,stopOnFirstNode:true});

    if(xml.error){
        console.error('convo component parsing failed',xml.error);
    }

    return xml.result?.[0];
}
