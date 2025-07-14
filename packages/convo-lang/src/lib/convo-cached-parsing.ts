import { CodeParsingResult, strHashBase64 } from "@iyio/common";
import { ConvoExecutionContext } from "./ConvoExecutionContext";
import { parseConvoCode } from "./convo-parser";
import { ConvoMessage } from "./convo-types";

const parsingCache:Record<string,CodeParsingResult<ConvoMessage[]>>={}
export const parseConvoCachedKeyed=(code:string)=>{
    const key=strHashBase64(code);
    const cached=parsingCache[key];
    if(cached){
        return {result:cached,key};
    }
    const r=parseConvoCode(code);
    parsingCache[key]=r;
    return {result:r,key}
}
export const parseConvoCached=(code:string)=>{
    return parseConvoCachedKeyed(code).result;
}

const typeCache:Record<string,any>={};
export const parseConvoType=(typeName:string,convo:string)=>{
    const r=parseConvoCachedKeyed(convo);
    const fn=r.result.result?.[0]?.fn;
    if(!fn){
        return undefined;
    }
    const key=r.key+':'+typeName;
    const cached=typeCache[key];
    if(cached!==undefined){
        return cached??undefined;
    }
    const exe=new ConvoExecutionContext();
    exe.executeFunction(fn)
    const type=exe.getVar(typeName);
    typeCache[key]=type??null;
    return type;

}
