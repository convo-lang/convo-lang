import { safeParseNumber } from "@iyio/common";
import { ConvoWebCrawler } from "./ConvoWebCrawler";
import { getConvoCrawlerApiOptionsFromEnvAsync } from "./convo-web-crawler-lib";
import { writeConvoCrawlerIndexAsync } from "./convo-web-crawler-output-previewer-writer";
import { ConvoWebSearchAndResearchOptions } from "./convo-web-crawler-types";
import { ConvoWebRoute, createConvoWebHandlerResult } from "./convo-web-routing";

const createCrawlerAsync=async ()=>new ConvoWebCrawler(await getConvoCrawlerApiOptionsFromEnvAsync());

export const convoWebRoutes:ConvoWebRoute[]=[

    {
        path:['/','index.html'],
        handler:async ({filePath})=>{
            return createConvoWebHandlerResult({
                html:await writeConvoCrawlerIndexAsync(filePath)
            })
        }
    },

    {
        path:'/health-check',
        handler:()=>'ok'
    },

    {
        method:'POST',
        path:'/api/capture',
        handler:async ({body})=>{
            const crawler=await createCrawlerAsync();
            return await crawler.capturePageAsync(body);
        }
    },

    {
        method:'POST',
        path:'/api/convert',
        handler:async ({body})=>{
            const crawler=await createCrawlerAsync();
            return await crawler.convertPageAsync(body);
        }
    },

    {
        method:'POST',
        path:'/api/research',
        handler:async ({body})=>{
            const request:ConvoWebSearchAndResearchOptions=body;
            const crawler=await createCrawlerAsync();
            const task=crawler.searchAndRunResearchAsync(request);
            if(request.callbackUrl){
                return crawler.options.id;
            }else{
                return await task;

            }
        }
    },

    {
        method:'GET',
        path:'/api/research',
        handler:async ({query})=>{
            const crawler=await createCrawlerAsync();
            return await crawler.getResearchInfoListAsync(safeParseNumber(query['limit'],100));
        }
    },

    {
        method:'GET',
        match:/^\/api\/research\/([^/]+)$/,
        handler:async ({query})=>{
            const crawler=await createCrawlerAsync();
            return await crawler.getResearchResultAsync(query['1']??'');
        }
    },

    {
        method:'GET',
        match:/^\/api\/research\/([^/]+)\/doc$/,
        handler:async ({query})=>{
            const crawler=await createCrawlerAsync();
            return createConvoWebHandlerResult({
                markdown:await crawler.getResearchDocumentAsync(query['1']??'')
            });
        }
    },

    {
        method:'GET',
        path:'/api/research-docs',
        handler:async ({query})=>{
            const crawler=await createCrawlerAsync();
            return await crawler.getResearchDocumentsAsync(safeParseNumber(query['limit'],10));
        }
    },

]
