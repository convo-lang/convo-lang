import { ConversationOptions, ConvoCompletion, ConvoDocQueryResult } from "@convo-lang/convo-lang";
import { addSpacesToCamelCase } from "@iyio/common";
import { createContext, useContext } from "react";
import { GenNode } from "./GenNode";

export const GenNodeReactContext=createContext<GenNode|null>(null);

export const useGenNode=()=>{
    return useContext(GenNodeReactContext);
}

export interface GenNodeOptions
{
    conversationOptions?:ConversationOptions;
    completeOnCalled?:boolean;
    allowAppend?:boolean;

    _render?:GenItemRenderer;
    _cache?:boolean;
    _allowAppend?:boolean;
    _sharedConvo?:string;
    _passDownOptions?:boolean;

}

export const GenNodeOptionsReactContext=createContext<GenNodeOptions|null>(null);

export const useGenNodeOptions=()=>{
    return useContext(GenNodeOptionsReactContext);
}

export type GenNodeSuccessState={
    convo:string;
    status:'generated';
    value:any;
    docQueryResult?:ConvoDocQueryResult;
    completion?:ConvoCompletion;
    vars:Record<string,any>;
}

export type GenNodeState={
    convo:string;
} & ({
    status:'ready'|'generating'|'querying-document'
}|{
    status:'error';
    errorMessage:string;
    error:any;
}|GenNodeSuccessState);

export type GenNodeStatus=GenNodeState['status'];

export interface GenMetadataCtx
{
    metadata:Record<string,any>;
}

export const genMetadataToString=(metadata:Record<string,any>):string=>{
    const out:string[]=['\n\n<metadata>\n'];
    for(const key in metadata){
        if(key==='className' || key==="key"){
            continue;
        }
        const v=metadata[key];
        try{
            out.push(`${addSpacesToCamelCase(key,true)}: ${(typeof v === 'string')?v:JSON.stringify(v)}\n`);
        }catch{
            out.push(`${addSpacesToCamelCase(key,true)}: ${v}\n`);
        }
    }
    out.push('</metadata>');
    return out.join('')

}

export const GenMetadataReactContext=createContext<GenMetadataCtx|null>(null);
export const useGenMetadata=()=>{
    return useContext(GenMetadataReactContext)?.metadata;
}

export type GenItemRenderer=(item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>any;
export type GenListRenderer=(item:any,index:number,vars:Record<string,any>,value:any,state:GenNodeSuccessState,node:GenNode)=>any;
export type GenListWrapperRenderer=(content:any,item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>any;
