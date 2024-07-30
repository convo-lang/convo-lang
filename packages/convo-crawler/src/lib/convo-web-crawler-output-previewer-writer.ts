import { pathExistsAsync, readFileAsJsonAsync } from "@iyio/node-common";
import { readdir } from "fs/promises";
import { join } from "path";
import { ConvoWebFileRef, CreateWebCrawlerOutputPreviewerOptions, createWebCrawlerOutputPreviewer } from "./convo-web-crawler-output-previewer";
import { ConvoWebCrawlerInput } from "./convo-web-crawler-types";

export const writeConvoCrawlerPreviewAsync=async (dir:string,options?:Partial<CreateWebCrawlerOutputPreviewerOptions>)=>{

    if(dir.endsWith('/')){
        dir=dir.substring(0,dir.length-1);
    }
    const parts=dir.split('/');
    const baseDir=parts[parts.length-1]??'';

    const files=(await readdir(dir)).filter(f=>!f.toLowerCase().endsWith('.html'));

    const html=createWebCrawlerOutputPreviewer({
        ...options,
        baseDir,
        files:files.map(f=>({
            name:f,
            path:f,
        })),
        fileAction:'load-file'
    });

    return html;

}

const inputCache:Record<string,ConvoWebCrawlerInput>={}

export const writeConvoCrawlerIndexAsync=async (dir:string,options?:Partial<CreateWebCrawlerOutputPreviewerOptions>)=>{

    if(dir.endsWith('/')){
        dir=dir.substring(0,dir.length-1);
    }
    const parts=dir.split('/');
    const baseDir=parts[parts.length-1]??'';

    const files=(await readdir(dir,{withFileTypes:true}))
        .filter(f=>f.isDirectory())
        .map<ConvoWebFileRef>(f=>({
            name:f.name,
            path:f.name
        }));

    await Promise.all(files.map<Promise<void>>(async f=>{
        const dateMatch=/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/.exec(f.name);
        if(dateMatch){
            f.date=`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}`;
        }
        const existing=inputCache[f.path];
        if(existing){
            f.name=existing.name||f.name;
            return;
        }
        const inputPath=join(dir,f.path,'_input.json');
        try{
            if(await pathExistsAsync(inputPath)){
                const input=await readFileAsJsonAsync<ConvoWebCrawlerInput>(inputPath);
                inputCache[f.path]=input;
                f.name=input.name||f.name;

            }else{
                inputCache[f.path]={name:f.name};
            }
        }catch(ex){
            console.error(`Unable to update file item name - ${inputPath}`,ex);
        }
    }))

    const html=createWebCrawlerOutputPreviewer({
        ...options,
        baseDir,
        files,
        fileAction:'link',
        wideLinks:true
    });

    return html;

}
