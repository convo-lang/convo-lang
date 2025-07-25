import { defineService, safeParseNumber } from "@iyio/common";
import { addConvoUsageTokens, createEmptyConvoTokenUsage } from "./convo-lib";
import { ConvoDocumentReference, ConvoRagContext, ConvoRagSearch, ConvoRagSearchResult, ConvoRagService } from "./convo-rag-types";

export const convoRagService=defineService<ConvoRagService>('ConvoRagService');

export const defaultConvoRagSearchLimit=5;
export const defaultMaxConvoRagSearchLimit=50;

export const defaultConvoRagServiceCallback=async (
    ragContext:ConvoRagContext
):Promise<null|ConvoDocumentReference[]>=>{
    const services=convoRagService.all();
    if(!services.length){
        return null;
    }
    const paramValues=ragContext.params?.['values'];
    const search:ConvoRagSearch={
        content:ragContext.lastMessage.content,
        paths:Array.isArray(paramValues)?paramValues.filter(v=>typeof v === 'string'):undefined,
        tolerance:ragContext.tolerance,
        limit:safeParseNumber(ragContext.params?.['limit'],defaultConvoRagSearchLimit),
    }
    const removeTask=ragContext.conversation.addTask({name:'Retrieving related information'});
    try{
        const r=await Promise.all(services.map(s=>s.searchAsync(search)))

        return mergeConvoRagResults(r).items.map(i=>i.document);
    }finally{
        removeTask();
    }
}


export const mergeConvoRagResults=(r:ConvoRagSearchResult[]):ConvoRagSearchResult=>{

    if(r.length===1 && r[0]){
        return r[0];
    }

    const merged:ConvoRagSearchResult={items:[],usage:createEmptyConvoTokenUsage()}

    for(const result of r){
        merged.items.push(...result.items);
        addConvoUsageTokens(merged.usage,result.usage);
    }

    return merged;
}
