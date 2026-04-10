import { HttpClientRequestOptions, NotFoundError, NotImplementedError, Scope, ScopeRegistration, aryRandomize, defineStringParam, getErrorMessage, getSortedObjectHash, httpClient, joinPaths } from "@iyio/common";
import { getSerializableFlatConvoConversation, passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib.js";
import { convoRagService } from "./convo-rag-lib.js";
import { ConvoRagSearch, ConvoRagSearchResult, ConvoRagService } from "./convo-rag-types.js";
import { ConvoCompletionChunk, ConvoCompletionCtx, ConvoCompletionMessage, ConvoCompletionService, ConvoCompletionServiceFeatureSupport, ConvoHttpToInputRequest, ConvoModelInfo, ConvoTranscriptionRequest, ConvoTranscriptionResult, ConvoTranscriptionService, ConvoTranscriptionSupportRequest, ConvoTtsRequest, ConvoTtsResult, ConvoTtsService, FlatConvoConversationBase } from "./convo-types.js";
import { convoCompletionService, convoTranscriptionService } from "./convo.deps.js";

export const defaultConvoHttpEndpointPrefix='/convo-lang';
export const defaultConvoHttpApiEndpointPrefix='/api'+defaultConvoHttpEndpointPrefix;

export const httpConvoCompletionEndpointParam=defineStringParam('httpConvoCompletionEndpoint',defaultConvoHttpApiEndpointPrefix);

const endpointCache:Record<string,HttpConvoCompletionService>={};
export const getHttpConvoCompletionServiceForEndpoint=(endpoint:string):HttpConvoCompletionService=>{
    return endpointCache[endpoint]??(endpointCache[endpoint]=new HttpConvoCompletionService({endpoint}));
}

export const convoHttpRelayModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>HttpConvoCompletionService.fromScope(scope));
    scope.implementService(convoRagService,scope=>HttpConvoCompletionService.fromScope(scope));
    scope.implementService(convoTranscriptionService,scope=>HttpConvoCompletionService.fromScope(scope));
}

export interface HttpConvoCompletionServiceOptions
{
    /**
     * Endpoint to relay messages to. If an array is provided load balancing will be preformed
     * by evenly distributing request between each URL.
     */
    endpoint:string|string[];

    /**
     * Allows http request options to be customize
     */
    getRequestOptions?:()=>HttpClientRequestOptions|Promise<HttpClientRequestOptions>;
}

/**
 * Forwards messages to an convo-lang api endpoint or pool of convo-lang api endpoints.
 *
 * ## Endpoint structure
 *
 * ### POST /completion (flat:FlatConvoConversationBase) => ConvoCompletionMessage[]
 * Completes a posted flat conversation and returns the completed messages.
 *
 * ### POST /convo (convo:string) => string
 * Completes a convo conversation as a string and returns the completed messages as a string
 *
 * ### GET /models ()=>ConvoModelInfo[]
 * Returns all models known to the server
 */
export class HttpConvoCompletionService implements
    ConvoCompletionService<FlatConvoConversationBase,ConvoCompletionMessage[]>,
    ConvoRagService,
    ConvoTranscriptionService,
    ConvoTtsService
{

    public readonly serviceId='http';

    public static fromScope(scope:Scope,endpoint?:string|string[],getRequestOptions?:()=>HttpClientRequestOptions|Promise<HttpClientRequestOptions>){
        if(!endpoint){
            const ep=httpConvoCompletionEndpointParam().split(',').map(e=>e.trim()).filter(e=>e);
            endpoint=ep.length===1?ep[0]:ep;
        }
        if(!endpoint){
            throw new Error('Empty HttpConvoCompletionService provided');
        }
        return new HttpConvoCompletionService({
            endpoint,
            getRequestOptions
        })
    }

    public readonly inputType=passthroughConvoInputType;

    public readonly outputType=passthroughConvoOutputType;

    private readonly endpoint:string|string[];

    private readonly getRequestOptions?:()=>HttpClientRequestOptions|Promise<HttpClientRequestOptions>;

    public constructor({
        endpoint,
        getRequestOptions
    }:HttpConvoCompletionServiceOptions){
        if(Array.isArray(endpoint)){
            endpoint=[...endpoint];
            aryRandomize(endpoint);
        }
        this.endpoint=endpoint;
        this.getRequestOptions=getRequestOptions;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        return true;
    }

    private endpointIndex=0;
    private getEndpoint(){
        if(Array.isArray(this.endpoint)){
            const e=this.endpoint[this.endpointIndex];

            this.endpointIndex++;
            if(this.endpointIndex>=this.endpoint.length){
                this.endpointIndex=0;
                aryRandomize(this.endpoint);
            }

            return e??'';
        }else{
            return this.endpoint;
        }
    }

    public async completeConvoAsync(flat:FlatConvoConversationBase,_:FlatConvoConversationBase,ctx:ConvoCompletionCtx<FlatConvoConversationBase,ConvoCompletionMessage[]>):Promise<ConvoCompletionMessage[]>
    {
        let support:ConvoCompletionServiceFeatureSupport|undefined;
        if(flat.enableStreaming && flat.model){
            support=await this.getSupportAsync(flat.model.name);
        }
        const stream=(flat.enableStreaming && support?.streaming)??false;

        const options=await this.getRequestOptions?.();
        if(!stream){
            const r=await httpClient().postAsync<ConvoCompletionMessage[]>(
                joinPaths(this.getEndpoint(),'/completion'+(stream?'/stream':'')),
                getSerializableFlatConvoConversation(flat),
                options,
            );
            if(!r){
                throw new Error('convo-lang API endpoint returned empty response');
            }
            if(!Array.isArray(r) && (r as any).messages){
                return (r as any).messages;
            }else{
                return r;
            }
        }else{
            for await(const evt of httpClient().streamSseAsync<ConvoCompletionChunk>({
                url:joinPaths(this.getEndpoint(),'/completion'+(stream?'/stream':'')),
                body:getSerializableFlatConvoConversation(flat),
                ...options,
            })){
                if(!evt.data){
                    continue;
                }
                const chunk=evt.data;

                if(ctx.onChunk){
                    await ctx.onChunk(this,chunk,flat);
                }
                if(chunk.completion){
                    return chunk.completion;
                }
            }
            throw new Error('No completion found in stream');
        }
    }

    private supportMap:Record<string,Promise<ConvoCompletionServiceFeatureSupport>>={};
    public async getSupportAsync(modelName:string):Promise<ConvoCompletionServiceFeatureSupport>
    {
        return await (this.supportMap[modelName]??(this.supportMap[modelName]=this._getSupportAsync(modelName)));
    }

    private async _getSupportAsync(modelName:string):Promise<ConvoCompletionServiceFeatureSupport>
    {
        const options=await this.getRequestOptions?.();
        const response=await httpClient().getAsync<Response>(
            joinPaths(this.getEndpoint(),`/completion/support/${encodeURIComponent(modelName)}`),
            {
                ...options,
                returnFetchResponse:true,
            }
        );
        if(!response){
            throw new Error('convo-lang API endpoint returned empty response');
        }
        if(response.status===404){
            return {}
        }
        return await response.json();
    }

    public async getModelsAsync():Promise<ConvoModelInfo[]|undefined>
    {
        return await httpClient().getAsync<ConvoModelInfo[]>(
            joinPaths(this.getEndpoint(),'/models'),
            await this.getRequestOptions?.()
        );
    }

    public async relayConvertConvoToInputAsync(flat:FlatConvoConversationBase,inputType?:string):Promise<FlatConvoConversationBase>{
        const request:ConvoHttpToInputRequest={
            flat:getSerializableFlatConvoConversation(flat),
            inputType
        };
        const r=await httpClient().postAsync<FlatConvoConversationBase>(
            joinPaths(this.getEndpoint(),'/convert'),
            request,
            await this.getRequestOptions?.()
        );
        if(!r){
            throw new NotFoundError();
        }
        return r;
    }

    public async searchAsync(search:ConvoRagSearch):Promise<ConvoRagSearchResult>
    {
        const r=await httpClient().postAsync<ConvoRagSearchResult>(
            joinPaths(this.getEndpoint(),'/rag/search'),
            search,
            await this.getRequestOptions?.()
        );
        if(!r){
            throw new Error('convo-lang API endpoint returned empty response');
        }
        return r;
    }

    private transcribeSupportCache:Record<string,Promise<boolean>>={};

    public async canTranscribe(request:ConvoTranscriptionSupportRequest):Promise<boolean>{
        const key=getSortedObjectHash(request);
        return await (this.transcribeSupportCache[key]??(this.transcribeSupportCache[key]=this._canTranscribe(request)));
    }
    private async _canTranscribe(request:ConvoTranscriptionSupportRequest):Promise<boolean>{
        const options=await this.getRequestOptions?.();
        const response=await httpClient().postAsync<Response>(
            joinPaths(this.getEndpoint(),`/transcribe/support`),
            request,
            {
                ...options,
                returnFetchResponse:true,
            }
        );
        if(!response){
            throw new Error('convo-lang API endpoint returned empty response');
        }
        if(response.status===404){
            return false;
        }
        return (await response.json())?true:false;
    }

    public async transcribeAsync(request:ConvoTranscriptionRequest):Promise<ConvoTranscriptionResult>{
        try{
            const r=await httpClient().postAsync<ConvoTranscriptionResult>(
                joinPaths(this.getEndpoint(),'/transcribe'),
                {
                    audio:request.audio,
                    request:{...request,audio:undefined}
                },
                {
                    ...await this.getRequestOptions?.(),
                    convertBodyToFormData:true,
                }
            );
            if(!r){
                return {
                    success:false,
                    error:{
                        message:'transcribe endpoint returned empty result',
                        error:null,
                    }
                }
            }
            if(r.success){
                return {
                    ...r,
                    file:request.audio,
                }
            }else{
                return r;
            }
        }catch(ex){
            return {
                success:false,
                error:{
                    message:getErrorMessage(ex),
                    error:ex,
                }
            }
        }
    }

    public async canConvertToSpeech(request:ConvoTtsRequest):Promise<boolean>
    {
        const support=await this.getSupportAsync(request.model??'default');
        return support.tts??false;
    }
    public convertToSpeechAsync(request:ConvoTtsRequest):Promise<ConvoTtsResult>{
        throw new NotImplementedError();
    }
}
