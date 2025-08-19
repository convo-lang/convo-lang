import { CodeParsingResult, strHashBase64 } from "@iyio/common";
import { ConvoExecutionContext } from "./ConvoExecutionContext";
import { parseConvoCode } from "./convo-parser";
import { ConvoMessage } from "./convo-types";

const parsingCache:Record<string,CodeParsingResult<ConvoMessage[]>>={}

/**
 * Parses Convo-Lang code with caching, returning both the parsing result and cache key.
 * Uses a hash-based cache to avoid re-parsing identical code strings.
 *
 * @param code - The Convo-Lang source code to parse
 * @returns Object containing the parsing result and the cache key used
 */
export const parseConvoCachedKeyed=(code:string)=>{
    const key=strHashBase64(code);
    const cached=parsingCache[key];
    if(cached){
        return {result:cached,key};
    }
    const r=parseConvoCode(code,{logErrors:true});
    parsingCache[key]=r;
    return {result:r,key}
}

/**
 * Parses Convo-Lang code with caching, returning only the parsing result.
 * This is a convenience wrapper around parseConvoCachedKeyed for when only the result is needed.
 *
 * @param code - The Convo-Lang source code to parse
 * @returns The parsing result containing parsed ConvoMessage array or errors
 */
export const parseConvoCached=(code:string)=>{
    return parseConvoCachedKeyed(code).result;
}

/**
 * Parses Convo-Lang code with caching and throws an error if the code fails to parse
 */
export const requireParseConvoCached=(code:string):ConvoMessage[]=>{
    const r=parseConvoCachedKeyed(code).result;
    if(!r?.result){
        console.error('Failed to parse required cached convo code code:',code);
        throw new Error()
    }
    return r.result;
}

const typeCache:Record<string,any>={};

/**
 * Parses and caches a specific type definition from Convo-Lang code.
 * Executes the parsed code to extract a named type definition and caches the result.
 *
 * @param typeName - The name of the type to extract from the parsed code
 * @param convo - The Convo-Lang source code containing the type definition
 * @returns The parsed type definition, or undefined if not found
 */
export const parseConvoType=(typeName:string,convo:string)=>{
    const r=parseConvoCachedKeyed(convo);
    const msg=r.result.result?.[0];
    const fn=msg?.fn;
    if(!fn || !msg){
        return undefined;
    }
    const key=r.key+':'+typeName;
    const cached=typeCache[key];
    if(cached!==undefined){
        return cached??undefined;
    }
    const exe=new ConvoExecutionContext();
    exe.executeFunction(fn,undefined,msg)
    const type=exe.getVar(typeName);
    typeCache[key]=type??null;
    return type;

}
