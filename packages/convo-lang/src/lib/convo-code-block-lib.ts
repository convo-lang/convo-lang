import { unescapeHtml } from '@iyio/common';
import { unescapeConvo } from './convo-parser.js';
import { ConvoCodeBlock, ConvoMessage, convoMessageSourceReferenceKey } from './convo-types.js';


export const defaultConvoFindReplaceSeparator='//// replace-with ////';

const blockReg=/(?<start>(^|\r|\n)[ \t]*)<(?<tagName>[\w-]+)(?<attributes>[^>]*)>[ \t\r\n]*```[ \t]*(?<lang>[\w-]*)(?<content>[\s\S]*?)```[ \t\r\n]*<\/\k<tagName>>/g;
const attReg=/(?<name>[\w-]+)([ \t]*=[ \t]*("(?<dq>[^"]*)"|'(?<sq>[^']*)'))?/g;

export const parseConvoCodeBlocks=(text:string,indexOffsetOrParentMessage?:ConvoMessage|number,blockIndexOffset=0):ConvoCodeBlock[]|undefined=>{
    let indexOffset:number;
    if(typeof indexOffsetOrParentMessage === 'number'){
        indexOffset=indexOffsetOrParentMessage;
    }else if(indexOffsetOrParentMessage){
        const src=indexOffsetOrParentMessage[convoMessageSourceReferenceKey];
        if(src && indexOffsetOrParentMessage.s!==undefined && indexOffsetOrParentMessage.e!==undefined){
            text=src.source.substring(indexOffsetOrParentMessage.s,indexOffsetOrParentMessage.e);
        }
        indexOffset=indexOffsetOrParentMessage.s??0;
    }else{
        indexOffset=0;
    }
    
    blockReg.lastIndex=0;

    let blocks:ConvoCodeBlock[]|undefined;

    let match:RegExpMatchArray|null;
    while(match=blockReg.exec(text)){
        const start=match.groups?.['start']??'';
        const tagName=match.groups?.['tagName']??'';
        const attributes=match.groups?.['attributes']??'';
        const lang=match.groups?.['lang']||'txt';

        const atts:Record<string,string>={};

        attReg.lastIndex=0;
        let attMatch:RegExpExecArray|null;
        while(attMatch=attReg.exec(attributes)){
            atts[attMatch.groups?.['name']??'']=unescapeHtml(attMatch.groups?.['dq']??attMatch.groups?.['sq']??'');
        }
        const findReplace=atts['find-replace'];
        const findReplaceSeparator=atts['find-replace-separator'];
        if(!blocks){
            blocks=[];
        }
        blocks.push({
            tagName,
            attributes:atts,
            lang,
            content:normalizeConvoCodeBlockContent(tagName,match.groups?.['content']??'',atts),
            index:blockIndexOffset+blocks.length,
            startIndex:indexOffset+(match.index??0)+start.length,
            endIndex:indexOffset+(match.index??0)+match[0].length,
            findReplace:parseConvoBlockFindReplace(findReplace),
            findReplaceSeparator,
        })

    }

    return blocks;
}

export const parseConvoBlockFindReplace=(value:string|null|undefined):number|'all'|undefined=>{
    if(value===''){
        return 1;
    }
    if(!value){
        return undefined;
    }
    if(value==='all'){
        return 'all';
    }
    const n=Number(value);
    return isFinite(n)?n:undefined;
}

const trimBlockStart=(content:string):string=>{
    if(content.startsWith('\r')){
        content=content.substring(1);
    }
    if(content.startsWith('\n')){
        content=content.substring(1);
    }
    return content;
}

const trimBlockEnd=(content:string):string=>{
    if(content.endsWith('\n')){
        content=content.substring(0,content.length-1);
        if(content.endsWith('\r')){
            content=content.substring(0,content.length-1);
        }
    }
    return content;
}

export const replaceConvoBlockContent=(content:string,block:ConvoCodeBlock):string=>{
    const sep=block.findReplaceSeparator??defaultConvoFindReplaceSeparator;
    const i=block.content.indexOf(sep);
    const find=trimBlockEnd(i===-1?block.content:block.content.substring(0,i));
    const replace=trimBlockEnd(trimBlockStart(i===-1?'':block.content.substring(i+sep.length)));

    const parts=content.split(find);
    if(parts.length===1){
        return parts[0]!;
    }
    for(let
        i=0,
        replaceCount=0,
        limit=block.findReplace==='all'?Number.MAX_SAFE_INTEGER:(block.findReplace??1);
        i<parts.length-1;
        i+=2
    ){
        parts.splice(i+1,0,replaceCount<limit?replace:find);
        replaceCount++;
    }

    return parts.join('');
}

export const normalizeConvoCodeBlockContent=(tag:string,content:string,attrs?:Record<string,string>):string=>{
    content=trimBlockStart(trimBlockEnd(content));

    content=unescapeConvo(content);

    const closing=attrs?.['closing-escape'];
    
    if(closing){
        content=content.split(closing).join(`</${tag}>`);
    }

    return content.endsWith('\n')?content:content+'\n';
}
