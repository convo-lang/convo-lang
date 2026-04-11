import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { cn } from "./util.js";

export const defaultConvoFunctionCallMaxArgsCharLength=26;
export type ConvoThemeMergeMode='merge'|'replace';
export const mergeConvoViewThemes=(baseTheme:ConvoViewTheme,mode:ConvoThemeMergeMode,...overrides:ConvoViewTheme[]):ConvoViewTheme=>{
    const theme={...baseTheme};

    for(const e in theme){
        const v=(theme as any)[e];
        if(v===undefined || v===''){
            delete (theme as any)[e];
        }
    }

    for(const override of overrides){
        for(const e in override){
            const v=(override as any)[e];
            if(v===undefined || v===''){
                continue;
            }
            if(typeof v === 'string'){
                const cv=(theme as any)[e];
                if(mode=='merge' && (typeof cv==='string')){
                    (theme as any)[e]=cn(cv,v);
                }else{
                    (theme as any)[e]=v;
                }
            }else{
                (theme as any)[e]=v;
            }
        }
    }

    return theme;
}


export const formatConvoArgsString=(content:string,theme:ConvoViewTheme,trimStart:boolean):string=>{
    const len=theme.functionCallMaxArgsCharLength??defaultConvoFunctionCallMaxArgsCharLength;
    content=content.replace(ws,' ');
    if(content.length>len){
        content=trimStart?'\u2026'+content.substring(content.length-len):content.substring(0,len)+'\u2026';
    }
    return content;
}

const ws=/\s\r\n/g;