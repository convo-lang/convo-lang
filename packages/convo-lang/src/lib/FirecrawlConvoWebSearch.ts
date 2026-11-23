import { defineStringParam, getErrorMessage, joinPaths } from "@iyio/common";
import { defaultConvoWebSearchLimit } from "./convo-lib.js";
import { ConvoWebSearch, ConvoWebSearchRequest, ConvoWebSearchResult } from "./convo-types.js";
import { PromiseResultType, StatusCode } from "./result-type.js";

export const firecrawlApiKeyParam=defineStringParam('firecrawlApiKey');
export const firecrawlBaseUrlParam=defineStringParam('firecrawlBaseUrl','https://api.firecrawl.dev');

export interface FirecrawlConvoWebSearchOptions
{
    /**
     * Firecrawl API key. Defaults to the `firecrawlApiKey` param
     */
    apiKey?:string;
    /**
     * Defaults to the `firecrawlBaseUrl` param
     */
    baseUrl?:string;
}

interface FirecrawlSearchRequest
{
    query:string;
    limit:number;
    scrapeOptions?:{formats:'markdown'[];onlyMainContent?:boolean};
}

interface FirecrawlSearchWebItem
{
    url:string;
    title?:string;
    description?:string;
    markdown?:string;
}

interface FirecrawlSearchResponse
{
    success:boolean;
    data?:{web?:FirecrawlSearchWebItem[]};
    warning?:string;
    error?:string;
}

/**
 * Searches the web using the Firecrawl v2 search API. Offsets are not supported by Firecrawl and
 * are ignored.
 */
export class FirecrawlConvoWebSearch implements ConvoWebSearch
{
    private readonly apiKey?:string;
    private readonly baseUrl?:string;

    public constructor({apiKey,baseUrl}:FirecrawlConvoWebSearchOptions={}){
        this.apiKey=apiKey;
        this.baseUrl=baseUrl;
    }

    public async searchAsync({
        query,
        limit=defaultConvoWebSearchLimit,
        includeLinkTarget,
    }:ConvoWebSearchRequest):PromiseResultType<ConvoWebSearchResult>{
        const apiKey=this.apiKey??firecrawlApiKeyParam.get();
        if(!apiKey){
            return {success:false,error:'Firecrawl API key not configured',statusCode:401};
        }

        const body:FirecrawlSearchRequest={query,limit};
        if(includeLinkTarget){
            body.scrapeOptions={formats:['markdown'],onlyMainContent:true};
        }

        try{
            const r=await fetch(joinPaths(this.baseUrl??firecrawlBaseUrlParam(),'/v2/search'),{
                method:'POST',
                headers:{
                    'Authorization':`Bearer ${apiKey}`,
                    'Content-Type':'application/json',
                },
                body:JSON.stringify(body),
            });
            const data=await r.json().catch(()=>undefined) as FirecrawlSearchResponse|undefined;
            if(!r.ok || !data?.success){
                return {
                    success:false,
                    error:data?.error??`Firecrawl search failed with status ${r.status}`,
                    statusCode:(r.ok?500:r.status) as StatusCode,
                };
            }
            return {
                success:true,
                result:{
                    results:(data.data?.web??[]).map(item=>({
                        link:item.url,
                        result:formatFirecrawlResult(item,includeLinkTarget),
                    })),
                },
            };
        }catch(ex){
            return {success:false,error:getErrorMessage(ex),statusCode:500};
        }
    }
}

/**
 * Returns the title and description of the item. When includeLinkTarget is true the markdown of
 * the linked page is appended in a LINK_TARGET_CONTENT tag.
 */
const formatFirecrawlResult=(item:FirecrawlSearchWebItem,includeLinkTarget?:boolean):string=>{
    const text=[item.title,item.description].filter(Boolean).join('\n\n');
    return (includeLinkTarget && item.markdown)?
        `${text}\n\n<LINK_TARGET_CONTENT>\n${item.markdown}\n</LINK_TARGET_CONTENT>`
    :
        text;
}
