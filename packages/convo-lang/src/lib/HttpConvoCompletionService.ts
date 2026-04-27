import { CancelToken, HttpClientRequestOptions, HttpMethod, NotFoundError, Scope, ScopeRegistration, aryRandomize, defineStringParam, deleteUndefined, getErrorMessage, getObjKeyCount, getSortedObjectHash, httpClient, joinPaths, objectToQueryParams } from "@iyio/common";
import type { ZodType } from "zod";
import { getSerializableFlatConvoConversation, passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib.js";
import { convoRagService } from "./convo-rag-lib.js";
import { ConvoRagSearch, ConvoRagSearchResult, ConvoRagService } from "./convo-rag-types.js";
import { ConvoCompletionChunk, ConvoCompletionCtx, ConvoCompletionMessage, ConvoCompletionService, ConvoCompletionServiceFeatureSupport, ConvoEmbeddingsGenerationRequest, ConvoEmbeddingsGenerationResult, ConvoEmbeddingsGenerationSupportRequest, ConvoEmbeddingsService, ConvoHttpToInputRequest, ConvoModelInfo, ConvoTranscriptionRequest, ConvoTranscriptionResult, ConvoTranscriptionService, ConvoTranscriptionSupportRequest, ConvoTtsRequest, ConvoTtsResult, ConvoTtsService, FlatConvoConversationBase } from "./convo-types.js";
import { convoCompletionService, convoTranscriptionService, convoTtsService } from "./convo.deps.js";
import type { ConvoDb, ConvoDbCommand, ConvoDbCommandResult, ConvoDbDriverFunction, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeKeySelection, ConvoNodePermissionType, ConvoNodeQuery, ConvoNodeQueryResult, ConvoNodeStreamItem, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from "./db/convo-db-types.js";
import { ConvoDbAuthManager } from "./db/ConvoDbAuthManager.js";
import { PromiseResultType, PromiseResultTypeVoid, ResultType, StatusCode } from "./result-type.js";

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
    scope.implementService(convoTtsService,scope=>HttpConvoCompletionService.fromScope(scope));
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

    /**
     * Name of the database the ConvoDb functions use.
     * @default 'default'
     */
    dbName?:string;
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
    ConvoTtsService,
    ConvoEmbeddingsService,
    ConvoDb
{

    public readonly serviceId='http';

    public readonly auth:ConvoDbAuthManager;

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

    public readonly dbName:string;

    private readonly getRequestOptions?:()=>HttpClientRequestOptions|Promise<HttpClientRequestOptions>;

    public constructor({
        endpoint,
        getRequestOptions,
        dbName='default',
    }:HttpConvoCompletionServiceOptions){
        if(Array.isArray(endpoint)){
            endpoint=[...endpoint];
            aryRandomize(endpoint);
        }
        this.endpoint=endpoint;
        this.dbName=dbName;

        this.getRequestOptions=async ()=>{
            let options:HttpClientRequestOptions={};
            if(!getRequestOptions && !this.auth.jwt){
                return options;
            }

            if(this.auth.jwt){
                options.headers={
                    Authorization:`Bearer ${this.auth.jwt.jwt}`,
                }
            }
            
            if(getRequestOptions){
                const o=await getRequestOptions();
                options={...options,...o,headers:{...options.headers,...o.headers}};
                
            }

            return options;
        }
        this.auth=new ConvoDbAuthManager(this);
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

    public async getNodeByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNode|undefined>
    {
        const r=await this.queryNodesAsync({steps:[{path}],limit:1,permissionFrom});
        if(!r.success){
            return r;
        }
        return {
            success:true,
            result:r.result.nodes[0],
        }
    }

    public async requireNodeByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNode>
    {
        const node=await this.getNodeByPathAsync(path,permissionFrom);
        if(!node.success){
            return node;
        }
        if(!node.result){
            return {
                success:false,
                error:`Node not found by path: ${path}`,
                statusCode:404,
            }
        }
        return node as ResultType<ConvoNode>;
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
        const key=getSortedObjectHash(request);
        return await (this.transcribeSupportCache[key]??(this.transcribeSupportCache[key]=this._canConvertToSpeech(request)));
    }
    private async _canConvertToSpeech(request:ConvoTtsRequest):Promise<boolean>{
        const options=await this.getRequestOptions?.();
        const response=await httpClient().postAsync<Response>(
            joinPaths(this.getEndpoint(),`/tts/support`),
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
    public async convertToSpeechAsync(request:ConvoTtsRequest):Promise<ConvoTtsResult>{
        try{
            const r=await httpClient().postAsync<Response>(
                joinPaths(this.getEndpoint(),'/tts'),
                request,
                {
                    ...await this.getRequestOptions?.(),
                    returnFetchResponse:true,
                }
            );
            if(!r){
                return {
                    success:false,
                    error:'tts endpoint returned empty result',
                }
            }
            if(r.ok){
                const blob=await r.blob();
                return {
                    success:true,
                    tts:{
                        audio:blob,
                    }
                }
            }else{
                const text=await r.text();
                return {
                    success:false,
                    error:`Error returned from API - ${text}`
                }
            }
        }catch(ex){
            return {
                success:false,
                error:getErrorMessage(ex),
            }
        }
    }

    private readonly embeddingsSupportCache:Record<string,PromiseResultType<boolean>>={};
    public canGenerateEmbeddings(request:ConvoEmbeddingsGenerationSupportRequest):PromiseResultType<boolean>
    {
        const key=`${request.provider??'.'}::${request.model??'.'}::${request.format??'.'}::${request.dimensions??'.'}`;
        return this.embeddingsSupportCache[key]??(this.embeddingsSupportCache[key]=this._canGenerateEmbeddings(request));
    }
    private async _canGenerateEmbeddings(request:ConvoEmbeddingsGenerationSupportRequest):PromiseResultType<boolean>{
        const options=await this.getRequestOptions?.();
        const response=await httpClient().postAsync<Response>(
            joinPaths(this.getEndpoint(),`/embeddings/support`),
            request,
            {
                ...options,
                returnFetchResponse:true,
            }
        );
        if(!response){
            return {
                success:false,
                error:'Request failed',
                statusCode:500,
            }
        }
        if(!response?.ok){
            try{
                const text=await response.text();
                return {
                    success:false,
                    error:text,
                    statusCode:response.status as StatusCode,
                }
            }catch(ex){
                return {
                    success:false,
                    error:'Error',
                    statusCode:response.status as StatusCode,
                }
            }
        }
        try{
            return {
                success:true,
                result:(await response.json())?true:false,
            }
        }catch(ex){
            return {
                success:false,
                error:'Failed to ready response from server',
                statusCode:500,
            }
        }
    }

    public async generateEmbeddingsAsync(request:ConvoEmbeddingsGenerationRequest):PromiseResultType<ConvoEmbeddingsGenerationResult>
    {
        try{
            const r=await httpClient().postAsync<Response>(
                joinPaths(this.getEndpoint(),'/embeddings'),
                request,
                {
                    ...await this.getRequestOptions?.(),
                    returnFetchResponse:true,
                }
            );
            if(!r){
                return {
                    success:false,
                    error:'Empty response from server',
                    statusCode:500,
                }
            }
            if(!r.ok){
                try{
                    return {
                        success:false,
                        error:await r.text(),
                        statusCode:r.status as StatusCode,
                    }
                }catch{
                    return {
                        success:false,
                        error:r.statusText,
                        statusCode:r.status as StatusCode,
                    }
                }
            }
            const result=await r.json() as ConvoEmbeddingsGenerationResult;
            return {
                success:true,
                result,
            }
            
        }catch(ex){
            return {
                success:false,
                error:getErrorMessage(ex),
                statusCode:500
            }
        }
    }

    private async requestAsync<R,T>(method:HttpMethod,path:string,body:T):PromiseResultType<R>{
        try{
            if(method==='GET' && body){
                deleteUndefined(body);
                if(getObjKeyCount(body)){
                    path+='?'+objectToQueryParams(body);
                }
                body=undefined as any;
            }
            const r=await httpClient().requestAsync<Response>(
                method,
                joinPaths(this.getEndpoint(),path),
                body,
                {
                    ...await this.getRequestOptions?.(),
                    returnFetchResponse:true,
                }
            );
            if(!r){
                return {
                    success:false,
                    error:'Empty response from server',
                    statusCode:500,
                }
            }
            if(!r.ok){
                try{
                    return {
                        success:false,
                        error:await r.text(),
                        statusCode:r.status as StatusCode,
                    }
                }catch{
                    return {
                        success:false,
                        error:r.statusText,
                        statusCode:r.status as StatusCode,
                    }
                }
            }

            return {
                success:true,
                result:await r.json(),
            }

        }catch(ex){
            return {
                success:false,
                error:getErrorMessage(ex),
                statusCode:500
            }
        }
    }

    public async *streamNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(
        query:ConvoNodeQuery<TKeys>,
        cancel?:CancelToken
    ):AsyncIterableIterator<ConvoNodeStreamItem<
        TKeys extends null|undefined ? keyof ConvoNode :
        TKeys extends "*" ? keyof ConvoNode :
        TKeys extends keyof ConvoNode ? TKeys :
        TKeys extends (infer U)[] ?
            "*" extends U ? keyof ConvoNode :
            Exclude<U, "*"|null|undefined>&keyof ConvoNode :
        keyof ConvoNode
    >>
    {
        const options=await this.getRequestOptions?.();
        
        for await(const evt of httpClient().streamSseAsync<ConvoNodeStreamItem<any>>({
            url:joinPaths(this.getEndpoint(),`/db/${this.dbName}/stream`),
            body:query,
            ...options,
        })){
            if(cancel?.isCanceled){
                break;
            }
            if(!evt.data){
                continue;
            }
            yield evt.data;
        }
    }


    public async executeCommandAsync<TKeys extends ConvoNodeKeySelection='*'>(command:ConvoDbCommand<TKeys>):PromiseResultType<ConvoDbCommandResult<TKeys>>
    {
        const r=await this.executeCommandsAsync([command]);
        if(!r.success){
            return r;
        }
        const first=r.result[0];
        if(!first){
            return {
                success:false,
                error:'No command result returned',
                statusCode:500
            }
        }
        return {
            success:true,
            result:first,
        }
    }

    public async executeCommandsAsync(commands:ConvoDbCommand<any>[]):PromiseResultType<ConvoDbCommandResult<any>[]>
    {
        return await this.requestAsync('POST',`/db/${this.dbName}`,commands);
    }

    public async queryNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(
        query:ConvoNodeQuery<TKeys>
    ):PromiseResultType<ConvoNodeQueryResult<
        TKeys extends null|undefined ? keyof ConvoNode :
        TKeys extends "*" ? keyof ConvoNode :
        TKeys extends keyof ConvoNode ? TKeys :
        TKeys extends (infer U)[] ?
            "*" extends U ? keyof ConvoNode :
            Exclude<U, "*"|null|undefined>&keyof ConvoNode :
        keyof ConvoNode
    >>
    {
        const r=await this.executeCommandAsync<TKeys>({queryNodes:{query}});
        return r.success?{success:true,result:r.result.queryNodes!}:r;
    }

    private async proxyDriverCallAsync(fn:ConvoDbDriverFunction,args:any[]):Promise<any>{
        const r=await this.executeCommandAsync({driverCmd:{fn,args:args as any}});
        return r.success?{success:true,result:r.result.driverCmd}:r;
    }
    readonly _driver={
        selectEdgesByPathsAsync:(...args:any[])=>this.proxyDriverCallAsync('selectEdgesByPathsAsync',args),
        selectNodesByPathsAsync:(...args:any[])=>this.proxyDriverCallAsync('selectNodesByPathsAsync',args),
        selectNodePathsForPathAsync:(...args:any[])=>this.proxyDriverCallAsync('selectNodePathsForPathAsync',args),
        selectNodePathsForConditionAsync:(...args:any[])=>this.proxyDriverCallAsync('selectNodePathsForConditionAsync',args),
        selectNodePathsForPermissionAsync:(...args:any[])=>this.proxyDriverCallAsync('selectNodePathsForPermissionAsync',args),
        selectNodePathsForEmbeddingAsync:(...args:any[])=>this.proxyDriverCallAsync('selectNodePathsForEmbeddingAsync',args),
        selectEdgeNodePathsForConditionAsync:(...args:any[])=>this.proxyDriverCallAsync('selectEdgeNodePathsForConditionAsync',args),
        insertNodeAsync:(...args:any[])=>this.proxyDriverCallAsync('insertNodeAsync',args),
        updateNodeAsync:(...args:any[])=>this.proxyDriverCallAsync('updateNodeAsync',args),
        deleteNodeAsync:(...args:any[])=>this.proxyDriverCallAsync('deleteNodeAsync',args),
        insertEdgeAsync:(...args:any[])=>this.proxyDriverCallAsync('insertEdgeAsync',args),
        updateEdgeAsync:(...args:any[])=>this.proxyDriverCallAsync('updateEdgeAsync',args),
        deleteEdgeAsync:(...args:any[])=>this.proxyDriverCallAsync('deleteEdgeAsync',args),
        insertEmbeddingAsync:(...args:any[])=>this.proxyDriverCallAsync('insertEmbeddingAsync',args),
        deleteEmbeddingAsync:(...args:any[])=>this.proxyDriverCallAsync('deleteEmbeddingAsync',args),
        updateEmbeddingAsync:(...args:any[])=>this.proxyDriverCallAsync('updateEmbeddingAsync',args),
        queryEdgesAsync:(...args:any[])=>this.proxyDriverCallAsync('queryEdgesAsync',args),
        queryEmbeddingsAsync:(...args:any[])=>this.proxyDriverCallAsync('queryEmbeddingsAsync',args),
    }

    public async getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>>
    {
        const r=await this.executeCommandAsync({getNodesByPath:{path,permissionFrom}});
        return r.success?{success:true,result:r.result.getNodesByPath!}:r;
    }

    public async getNodePermissionAsync(fromPath:string,toPath:string):PromiseResultType<ConvoNodePermissionType>
    {
        const r=await this.executeCommandAsync({getNodePermission:{fromPath,toPath}});
        return r.success?{success:true,result:r.result.getNodePermission!}:r;
    }

    public async checkNodePermissionAsync(fromPath:string,toPath:string,type:ConvoNodePermissionType,matchAny?:boolean):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({checkNodePermission:{fromPath,toPath,type,matchAny}});
        if(r.success && r.result.checkNodePermission===false){
            return {success:false,error:'permission denied',statusCode:401};
        }
        return r.success?{success:true}:r;
    }

    public async insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>
    {
        const r=await this.executeCommandAsync({insertNode:{node,options}});
        return r.success?{success:true,result:r.result.insertNode!}:r;
    }

    public async updateNodeAsync(node:ConvoNodeUpdate,options?:UpdateConvoNodeOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({updateNode:{node,options}});
        return r.success?{success:true}:r;
    }

    public async deleteNodeAsync(path:string,options?:DeleteConvoNodeOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({deleteNode:{path,options}});
        return r.success?{success:true}:r;
    }

    public async queryEdgesAsync(query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>
    {
        const r=await this.executeCommandAsync({queryEdges:{query}});
        return r.success?{success:true,result:r.result.queryEdges!}:r;
    }

    public async getEdgeByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEdge>
    {
        const r=await this.executeCommandAsync({getEdgeById:{id,permissionFrom}});
        return r.success?{success:true,result:r.result.getEdgeById!}:r;
    }

    public async insertEdgeAsync(edge:Omit<ConvoNodeEdge,'id'>,options?:InsertConvoNodeEdgeOptions):PromiseResultType<ConvoNodeEdge>
    {
        const r=await this.executeCommandAsync({insertEdge:{edge,options}});
        return r.success?{success:true,result:r.result.insertEdge!}:r;
    }

    public async updateEdgeAsync(update:ConvoNodeEdgeUpdate,options?:UpdateConvoNodeEdgeOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({updateEdge:{update,options}});
        return r.success?{success:true}:r;
    }

    public async deleteEdgeAsync(id:string,options?:DeleteConvoNodeEdgeOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({deleteEdge:{id,options}});
        return r.success?{success:true}:r;
    }

    public async queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbeddingQueryResult>
    {
        const r=await this.executeCommandAsync({queryEmbeddings:{query}});
        return r.success?{success:true,result:r.result.queryEmbeddings!}:r;
    }

    public async getEmbeddingByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEmbedding>
    {
        const r=await this.executeCommandAsync({getEmbeddingById:{id,permissionFrom}});
        return r.success?{success:true,result:r.result.getEmbeddingById!}:r;
    }

    public async insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,'id'>,options?:InsertConvoNodeEmbeddingOptions):PromiseResultType<ConvoNodeEmbedding>
    {
        const r=await this.executeCommandAsync({insertEmbedding:{embedding,options}});
        return r.success?{success:true,result:r.result.insertEmbedding!}:r;
    }

    public async updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options?:UpdateConvoNodeEmbeddingOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({updateEmbedding:{update,options}});
        return r.success?{success:true}:r;
    }

    public async deleteEmbeddingAsync(id:string,options?:DeleteConvoNodeEmbeddingOptions):PromiseResultTypeVoid
    {
        const r=await this.executeCommandAsync({deleteEmbedding:{id,options}});
        return r.success?{success:true}:r;
    }

    public async callFunctionAsync<T extends Record<string,any>=Record<string,any>>(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<T|undefined>
    {
        const r=await this.callFunctionReturnNodeAsync(path,args,permissionFrom);
        if(!r.success){
            return r;
        }
        return {
            success:true,
            result:r.result?.data as T|undefined,
        }
    }

    public async callFunctionWithSchemaAsync<TInput,TOutput>(inputSchema:ZodType<TInput>,outputSchema:ZodType<TOutput>,path:string,args:TInput,permissionFrom?:string):PromiseResultType<TOutput>
    {
        const inputParsed=inputSchema.safeParse(args);
        if(inputParsed.error){
            return {
                success:false,
                error:inputParsed.error.message,
                statusCode:400
            }
        }

        const r=await this.callFunctionReturnValueAsync(path,inputParsed.data as any);
        if(!r.success){
            return r;
        }

        const outputParsed=outputSchema.safeParse(r.result);
        if(outputParsed.error){
            return {
                success:false,
                error:outputParsed.error.message,
                statusCode:500,
            }
        }

        return {
            success:true,
            result:outputParsed.data,
        }
    }


    public async callFunctionReturnValueAsync<T extends Record<string,any>=Record<string,any>>(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<T>
    {
        const r=await this.callFunctionReturnNodeAsync(path,args,permissionFrom);
        if(!r.success){
            return r;
        }
        const data=r.result?.data;
        if(!data){
            return {
                success:false,
                error:'Called function did not return a value',
                statusCode:500,
            }
        }

        return {
            success:true,
            result:data as T,
        }
    }

    
    public async callFunctionReturnNodeAsync(path:string,args:Record<string,any>,permissionFrom?:string):PromiseResultType<ConvoNode|undefined>
    {
        const r=await this.queryNodesAsync({steps:[{path,call:{args}}],limit:1,permissionFrom});
        if(!r.success){
            return r;
        }
        const node=r.result.nodes[0];
        return {
            success:true,
            result:node,
        }
    }
}
