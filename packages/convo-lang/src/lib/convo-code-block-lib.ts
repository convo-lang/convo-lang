import { ConvoCodeBlock, ConvoMessage, convoMessageSourceReferenceKey, unescapeConvo } from '@convo-lang/convo-lang';
import { unescapeHtml } from '@iyio/common';


const blockReg=/(?<start>(^|\r|\n)[ \t]*)<(?<tagName>[\w-]+)(?<attributes>[^>]*)>[ \t\r\n]*```[ \t]*(?<lang>[\w-]+)(?<content>[\s\S]*?)```[ \t\r\n]*<\/\k<tagName>>/g;
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
        const lang=match.groups?.['lang']??'';

        const atts:Record<string,string>={};

        attReg.lastIndex=0;
        let attMatch:RegExpExecArray|null;
        while(attMatch=attReg.exec(attributes)){
            atts[attMatch.groups?.['name']??'']=unescapeHtml(attMatch.groups?.['dq']??attMatch.groups?.['sq']??'');
        }
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
        })

    }

    return blocks;
}

export const normalizeConvoCodeBlockContent=(tag:string,content:string,attrs?:Record<string,string>):string=>{
    content=content.trim();

    content=unescapeConvo(content);

    const closing=attrs?.['closing-escape'];
    
    if(closing){
        content=content.split(closing).join(`</${tag}>`);
    }

    return content.endsWith('\n')?content:content+'\n';
}
