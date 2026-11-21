import { unescapeHtml } from '@iyio/common';
import { unescapeConvo } from './convo-parser.js';
import { ConvoCodeBlock, ConvoMessage, convoMessageSourceReferenceKey, isConvoFileOpType } from './convo-types.js';


export const defaultConvoFindReplaceSeparator='//// replace-with ////';

/**
 * Name of the self-closing XML tag used to define file operations
 */
export const convoFileOpTagName='FILE_OP';

const blockReg=/(?<start>(^|\r|\n)[ \t]*)<(?<tagName>[\w-]+)(?<attributes>[^>]*)>[ \t\r\n]*```+[ \t]*(?<lang>[\w-]*)(?<content>[\s\S]*?)```+[ \t\r\n]*<\/\k<tagName>>/g;
const fileOpReg=/(?<start>(^|\r|\n)[ \t]*)<FILE_OP(?<attributes>(\s[^>]*?)?)\/>/g;
const attReg=/(?<name>[\w-]+)([ \t]*=[ \t]*("(?<dq>[^"]*)"|'(?<sq>[^']*)'))?/g;

const parseConvoCodeBlockAttributes=(attributes:string):Record<string,string>=>{
    const atts:Record<string,string>={};
    attReg.lastIndex=0;
    let attMatch:RegExpExecArray|null;
    while(attMatch=attReg.exec(attributes)){
        atts[attMatch.groups?.['name']??'']=unescapeHtml(attMatch.groups?.['dq']??attMatch.groups?.['sq']??'');
    }
    return atts;
}

/**
 * Parses XML tagged code blocks and self-closing `FILE_OP` tags. Blocks are returned in order of
 * appearance. `FILE_OP` tags inside of the content of another block are ignored.
 */
export const parseConvoCodeBlocks=(text:string,messageIndex:number,indexOffsetOrParentMessage?:ConvoMessage|number,blockIndexOffset=0):ConvoCodeBlock[]|undefined=>{
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

    const found:Omit<ConvoCodeBlock,'index'>[]=[];

    blockReg.lastIndex=0;
    let match:RegExpMatchArray|null;
    while(match=blockReg.exec(text)){
        const start=match.groups?.['start']??'';
        const tagName=match.groups?.['tagName']??'';
        const lang=match.groups?.['lang']||'txt';
        const atts=parseConvoCodeBlockAttributes(match.groups?.['attributes']??'');

        found.push({
            tagName,
            attributes:atts,
            lang,
            content:normalizeConvoCodeBlockContent(tagName,match.groups?.['content']??'',atts),
            startIndex:indexOffset+(match.index??0)+start.length,
            endIndex:indexOffset+(match.index??0)+match[0].length,
            messageIndex,
            findReplace:parseConvoBlockFindReplace(atts['find-replace']),
            findReplaceSeparator:atts['find-replace-separator'],
        });
    }

    fileOpReg.lastIndex=0;
    while(match=fileOpReg.exec(text)){
        const start=match.groups?.['start']??'';
        const startIndex=indexOffset+(match.index??0)+start.length;
        if(found.some(b=>startIndex>=b.startIndex && startIndex<b.endIndex)){
            continue;
        }
        const atts=parseConvoCodeBlockAttributes(match.groups?.['attributes']??'');
        const op=atts['op'];
        found.push({
            tagName:convoFileOpTagName,
            attributes:atts,
            lang:'',
            content:'',
            startIndex,
            endIndex:indexOffset+(match.index??0)+match[0].length,
            messageIndex,
            fileOp:isConvoFileOpType(op)?op:undefined,
        });
    }

    if(!found.length){
        return undefined;
    }

    found.sort((a,b)=>a.startIndex-b.startIndex);
    return found.map((b,i)=>({...b,index:blockIndexOffset+i}));
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

/**
 * A range of content replaced by a find-replace code block
 */
export interface ConvoBlockReplaceRange
{
    /**
     * Start index of the matched content in the source content
     */
    sourceStart:number;
    /**
     * End index, exclusive, of the matched content in the source content
     */
    sourceEnd:number;
    /**
     * Start index of the replacement in the resulting content
     */
    start:number;
    /**
     * End index, exclusive, of the replacement in the resulting content
     */
    end:number;
}

export interface ReplaceConvoBlockResult{
    content:string;
    replaceCount:number;
    /**
     * Ranges of each replacement in order of appearance
     */
    ranges:ConvoBlockReplaceRange[];
}
export const replaceConvoBlockContent=(content:string,block:ConvoCodeBlock):ReplaceConvoBlockResult=>{
    const sep=block.findReplaceSeparator??defaultConvoFindReplaceSeparator;
    const i=block.content.indexOf(sep);
    const find=trimBlockEnd(i===-1?block.content:block.content.substring(0,i));
    const replace=trimBlockEnd(trimBlockStart(i===-1?'':block.content.substring(i+sep.length)));

    const ranges:ConvoBlockReplaceRange[]=[];

    const parts=content.split(find);
    if(parts.length===1){
        return {content,replaceCount:0,ranges};
    }

    const limit=block.findReplace==='all'?Number.MAX_SAFE_INTEGER:(block.findReplace??1);
    const output:string[]=[];
    let sourceIndex=0;
    let index=0;
    for(let p=0;p<parts.length;p++){
        const part=parts[p]!;
        output.push(part);
        sourceIndex+=part.length;
        index+=part.length;
        if(p===parts.length-1){
            break;
        }
        if(ranges.length<limit){
            ranges.push({sourceStart:sourceIndex,sourceEnd:sourceIndex+find.length,start:index,end:index+replace.length});
            output.push(replace);
            index+=replace.length;
        }else{
            output.push(find);
            index+=find.length;
        }
        sourceIndex+=find.length;
    }

    return {content:output.join(''),replaceCount:ranges.length,ranges};
}

/**
 * Maps an index in the source content of a replacement to the index in the resulting content.
 * Indexes inside of a replaced range are clamped to the replacement.
 */
export const mapConvoBlockReplaceIndex=(index:number,ranges:ConvoBlockReplaceRange[]):number=>{
    let offset=0;
    for(const r of ranges){
        if(index<r.sourceStart){
            break;
        }
        if(index<r.sourceEnd){
            return Math.min(r.start+index-r.sourceStart,r.end);
        }
        offset=r.end-r.sourceEnd;
    }
    return index+offset;
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
