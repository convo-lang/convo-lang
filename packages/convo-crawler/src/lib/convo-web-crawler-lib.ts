import { escapeConvoMessageContent } from "@iyio/convo-lang";
import { pathExistsAsync, readFileAsJsonAsync } from "@iyio/node-common";
import { mkdir } from "fs/promises";
import { join } from "path";
import { ConvoPageCaptureActionItem, ConvoWebCrawlerOptions, ConvoWebInstruction, ConvoWebTunnelUrls } from "./convo-web-crawler-types";

export const defaultConvoWebCrawlOptionsMaxDepth=2;
export const defaultConvoWebCrawlOptionsMaxConcurrent=3;
export const defaultConvoWebCrawlOptionsResultLimit=3;
export const defaultConvoWebSearchOptionsMaxConcurrent=3;

export const defaultConvoWebOutDir='convo-crawler-out';
export const defaultConvoWebDataDir='convo-crawler-data';

export const convoWebActionItemToMdLink=(link:ConvoPageCaptureActionItem):string=>{
    return `[${escapeConvoMessageContent(link.text,false,{removeNewLines:true})}](${escapeConvoMessageContent(link.href??'#',false,{removeNewLines:true})})`
}

export const getConvoCrawlerApiOptionsFromEnvAsync=async ():Promise<Partial<ConvoWebCrawlerOptions>>=>{
    const json=process.env['CONVO_CRAWLER_DEFAULT_API_OPTIONS'];
    const obj:Partial<ConvoWebCrawlerOptions>=json?JSON.parse(json):{};
    const tunnelUrlsPath=join(defaultConvoWebDataDir,'tunnel-urls.json');
    if(await pathExistsAsync(tunnelUrlsPath)){
        const urls=await readFileAsJsonAsync<ConvoWebTunnelUrls>(tunnelUrlsPath);
        if(urls.http){
            obj.httpAccessPoint=urls.http;
        }
    }
    return {
        googleSearchApiKey:process.env['NX_GOOGLE_SEARCH_API_KEY'],
        googleSearchCx:process.env['NX_GOOGLE_SEARCH_CX'],
        headed:true,
        ...obj
    }
}


export const getConvoWebDataDirAsync=async (dataDir:string):Promise<string>=>
{
    if(!await pathExistsAsync(dataDir)){
        await mkdir(dataDir,{recursive:true});
    }
    return dataDir;
}


export const parseConvoWebInstruction=(instruction:string,index=0):ConvoWebInstruction=>{
    const parts=instruction.split('::');
    if(parts.length===1){
        return {
            id:(index+1).toString(),
            title:`Instruction ${(index+1).toString()}`,
            instruction:parts[0]??''
        }
    }else if(parts.length===2){
        return {
            id:(index+1).toString(),
            title:parts[0]??'',
            instruction:parts[1]??''
        }
    }else{
        return {
            id:parts.shift()??'',
            title:parts.shift()??'',
            instruction:parts.join('::')
        }
    }

}
