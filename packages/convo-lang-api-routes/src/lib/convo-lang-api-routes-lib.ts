import { ConvoCompletionCtx, ConvoCompletionMessage, ConvoCompletionService, ConvoImageGenerator, FlatConvoConversation } from "@convo-lang/convo-lang";
import { HttpRequestContext } from "@iyio/node-common";
import { z } from "zod";

export const defaultConvoLangFsRoot='./convo-lang'

export interface ConvoCompletionRequestCtx{
    httpCtx:HttpRequestContext;
    flat:FlatConvoConversation;
    completionService?:ConvoCompletionService<any,any>;
    result:ConvoCompletionMessage[];
    error?:any;
    success:boolean;
}

export interface ConvoLangRouteOptionsBase
{
    /**
     * Root directory where resources are stored
     */
    fsRoot?:string;

    /**
     * Directory to store cached resources in. cacheDir is relative to fsRoot
     * @default "cache" if enableCaching is true
     */
    cacheDir?:string;

    /**
     * If true images will be written to a cache on disk or the in the virtual file system.
     */
    enableCaching?:boolean;

    /**
     * If true redirects will be used to redirect requests to a URL that points to the generated
     * content
     */
    useResourceRedirects?:boolean;

    /**
     * Name of a client query or route param that can be used to control caching
     */
    cacheQueryParam?:number|string;

    /**
     * Public web directory used to serve resources
     */
    publicWebBasePath?:string;

    /**
     * If true the virtual file system will be used for caching images
     */
    enableVfs?:boolean;

}

export interface ConvoLangRouteOptions extends ConvoLangRouteOptionsBase
{
    /**
     * Route prefix
     */
    prefix?:string;

    /**
     * Image generation endpoint options
     */
    imageGenOptions?:Partial<ImageGenRouteOptions>;

    /**
     * Callback used to generate images
     */
    imageGenCallback?:ConvoImageGenerator;

    onCompletion?:(requestCtx:ConvoCompletionRequestCtx)=>void;

    completionCtx?:ConvoCompletionCtx;

    getUsage?:(ctx:HttpRequestContext)=>ConvoTokenQuota|undefined|Promise<ConvoTokenQuota|undefined>;
}




export interface ImageGenRouteOptions extends ConvoLangRouteOptionsBase
{
    /**
     * Callback used to generate images
     */
    imageGenerator:ConvoImageGenerator;

    /**
     * Route match regular expression
     */
    routeMatch:RegExp;

    /**
     * The route or query parameter to get the prompt used to generated images from
     */
    promptQueryParam:number|string;

    /**
     * The route or query parameter used as salt for the query. Salt allows the same prompt to
     * generate different images
     */
    saltQueryParam?:number|string;

    /**
     * If true revised prompts used to generate images with be written to disk next to cached images.
     */
    writeRevisedPromptsToDisk?:boolean;

    /**
     * Subdirectory in the cache where to write images to.
     */
    imageCacheSubDir?:string;
}


export const ConvoTokenQuotaScheme=z.object({
    id:z.string(),
    usage:z.number(),
    cap:z.number().optional(),
})
export type ConvoTokenQuota=z.infer<typeof ConvoTokenQuotaScheme>;

