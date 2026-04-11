import { NotFoundError, SecretManager, getErrorMessage, httpClient, joinPaths, shortUuid, uuid } from "@iyio/common";
import { ChatCompletionRequest } from "./convo-openai-types.js";
import { ConvoCompletionCtx, ConvoCompletionService, ConvoCompletionServiceFeatureSupport, ConvoModelInfo, ConvoTranscriptionRequest, ConvoTranscriptionResult, ConvoTranscriptionResultProviderBase, ConvoTranscriptionService, ConvoTranscriptionSupportRequest, ConvoTtsRequest, ConvoTtsResult, ConvoTtsService, FlatConvoConversationBase } from "./convo-types.js";
import { ChatCompletion, ChatCompletionChunk, ChatCompletionMessageToolCall } from './open-ai/resources/chat/index.js';
import { CompletionUsage } from "./open-ai/resources/completions.js";

export interface BaseOpenAiConvoCompletionServiceOptions
{
    apiKey?:string;
    apiBaseUrl?:string;
    completionsEndpoint?:string;
    secretManager?:SecretManager;
    secretsName?:string;
    models?:ConvoModelInfo[];
    getModelsAsync?:()=>Promise<ConvoModelInfo[]>;
    inputType:string;
    outputType:string;
    apiKeyHeader?:string;
    apiKeyHeaderValuePrefix?:string|null;
    headers?:Record<string,string>;
    updateRequest?:(requestBody:Record<string,any>,headers:Record<string,string|undefined>)=>void;
    completeAsync?:(input:ChatCompletionRequest,flat:FlatConvoConversationBase,apiKey:string|undefined,url:string)=>Promise<ChatCompletion|undefined>;
    isFallback?:boolean;
    serviceId:string;
    /** Whether to log HTTP requests and responses for debugging purposes */
    logRequests?:boolean;
    canComplete?:(model:string|undefined,flat:FlatConvoConversationBase)=>boolean;
    supportsTranscription?:boolean;
    supportsTts?:boolean;
}

export class BaseOpenAiConvoCompletionService implements ConvoCompletionService<ChatCompletionRequest,ChatCompletion>, ConvoTranscriptionService, ConvoTtsService
{
    public readonly serviceId:string;
    public readonly inputType:string;
    public readonly outputType:string;

    private readonly secretManager?:SecretManager;
    private readonly apiKey?:string;
    private readonly apiBaseUrl:string;
    private readonly completionsEndpoint:string;
    private readonly secretsName?:string;
    private readonly models?:ConvoModelInfo[];
    private readonly apiKeyHeader:string;
    private readonly apiKeyHeaderValuePrefix?:string;
    private readonly headers:Record<string,string>;
    private readonly isFallback:boolean;
    private readonly logRequests:boolean;
    private readonly supportsTranscription:boolean;
    private readonly supportsTts:boolean;
    private readonly updateRequest?:(requestBody:Record<string,any>,headers:Record<string,string|undefined>)=>void;
    private readonly completeAsync?:(input:ChatCompletionRequest,flat:FlatConvoConversationBase,apiKey:string|undefined,url:string)=>Promise<ChatCompletion|undefined>;
    private readonly _getModelsAsync?:()=>Promise<ConvoModelInfo[]>;
    private readonly _canComplete?:(model:string|undefined,flat:FlatConvoConversationBase)=>boolean;

    public constructor({
        apiKey,
        secretManager,
        secretsName,
        apiBaseUrl='https://api.openai.com',
        completionsEndpoint='/v1/chat/completions',
        inputType,
        outputType,
        models,
        isFallback=false,
        apiKeyHeader='Authorization',
        apiKeyHeaderValuePrefix='Bearer ',
        headers={
            'Content-Type':'application/json'
        },
        serviceId,
        logRequests=false,
        completeAsync,
        updateRequest,
        getModelsAsync,
        canComplete,
        supportsTranscription=false,
        supportsTts=false,
    }:BaseOpenAiConvoCompletionServiceOptions){
        this.serviceId=serviceId;
        this.apiKey=apiKey;
        this.apiBaseUrl=apiBaseUrl;
        this.completionsEndpoint=completionsEndpoint;
        this.secretManager=secretManager;
        this.secretsName=secretsName;
        this.inputType=inputType;
        this.outputType=outputType;
        this.isFallback=isFallback;
        this.models=models;
        this.apiKeyHeader=apiKeyHeader;
        this.apiKeyHeaderValuePrefix=apiKeyHeaderValuePrefix??undefined;
        this.logRequests=logRequests;
        this.supportsTranscription=supportsTranscription;
        this.supportsTts=supportsTts;
        this.completeAsync=completeAsync;
        this.headers=headers;
        this.updateRequest=updateRequest;
        this._getModelsAsync=getModelsAsync;
        this._canComplete=canComplete;
    }

    public getSupportAsync(modelName:string):Promise<ConvoCompletionServiceFeatureSupport>{
        return Promise.resolve({
            streaming:true,
        });
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        if(!model){
            return this.isFallback;
        }
        if(this._canComplete){
            return this._canComplete(model,flat);
        }
        return this.models?.some(m=>m.name===model)??false;
    }

    private clientPromises:Record<string,Promise<ApiClient>>={};
    private async getApiClientAsync(apiKeyOverride:string|undefined,endpoint:string|undefined,childEndpoint?:string):Promise<ApiClient>
    {
        const url=endpoint??joinPaths(this.apiBaseUrl,childEndpoint??this.completionsEndpoint);
        const key=`${url}:::${apiKeyOverride??'.'}`

        return await (this.clientPromises[key]??(this.clientPromises[key]=(async ()=>{
            let apiKey=apiKeyOverride??this.apiKey;
            if(!apiKey && this.secretManager && this.secretsName){
                const {apiKey:key}=await this.secretManager.requireSecretTAsync<{apiKey:string}>(this.secretsName,true);
                apiKey=key;
            }
            return {
                apiKey,
                url,
            }
        })()));
    }

    public async completeConvoAsync(
        input:ChatCompletionRequest,
        flat:FlatConvoConversationBase,
        ctx:ConvoCompletionCtx<ChatCompletionRequest,ChatCompletion>
    ):Promise<ChatCompletion>{
        const client=await this.getApiClientAsync(flat.apiKey??undefined,flat.responseEndpoint);
        if(flat.apiKey && flat.apiKey===client.apiKey){
            flat.apiKeyUsedForCompletion=true;
        }

        const headers:Record<string,string|undefined>={
            [this.apiKeyHeader]:client.apiKey?((this.apiKeyHeaderValuePrefix??'')+client.apiKey):undefined,
            ...this.headers
        }

        if(this.updateRequest){
            input={...input}
            this.updateRequest(input,headers);
        }

        await ctx.beforeComplete?.(this,input,flat);

        let completion:ChatCompletion|undefined;

        if(this.completeAsync){
            completion=await this.completeAsync(input,flat,client.apiKey,client.url);
        }else{

            if(!input.stream){
                completion=await httpClient().postAsync<ChatCompletion>(
                    client.url,
                    input,
                    {
                        headers,
                        readErrors:true,
                        log:this.logRequests,
                    }
                );
            }else{
                const content:string[]=[];
                const argBuffers:Record<number,string[]>={};
                let model='';
                let usage:CompletionUsage|undefined;
                const choice:ChatCompletion.Choice={
                    index:0,
                    finish_reason:'stop',
                    logprobs:null,
                    message:{
                        role:'assistant',
                        content:null,
                        refusal:null
                    }
                }

                const mid=shortUuid();

                for await(const evt of httpClient().streamSseAsync<ChatCompletionChunk>({
                    url:client.url,
                    body:input,
                    headers,
                    endDataFlag:'[DONE]',
                    logStreamErrors:true,
                    readErrors:true,
                    log:this.logRequests,
                })){
                    if(!evt.data){
                        continue;
                    }

                    const chunk=evt.data;


                    if(chunk.model){
                        model=chunk.model;
                    }

                    if(chunk.usage){
                        usage=chunk.usage;
                    }

                    const c=chunk.choices?.[0];

                    if(!c){
                        continue;
                    }
                    if(c.finish_reason){
                        choice.finish_reason=c.finish_reason;
                    }
                    if(c.logprobs){
                        choice.logprobs=c.logprobs;
                    }
                    if(c.delta){
                        for(const e in c.delta){
                            switch(e as keyof typeof c.delta){

                                case 'content':
                                    if(c.delta.content!==null && c.delta.content!==undefined){
                                        content.push(c.delta.content);
                                        if(ctx.onChunk){
                                            await ctx.onChunk(this,{id:nextChunkId(),mid,type:'content',chunk:c.delta.content},flat);
                                        }
                                    }
                                    break;

                                case 'tool_calls':
                                    if(c.delta.tool_calls){
                                        choice.message.tool_calls=await this.mergeToolCallsAsync(ctx,flat,mid,argBuffers,choice.message.tool_calls??[],c.delta.tool_calls);
                                    }
                                    break;

                                default:{
                                    const v=c.delta[e as keyof typeof c.delta];
                                    if(v!==undefined && v!==null){
                                        (choice.message as any)[e]=v;
                                    }
                                }

                            }
                        }
                    }

                }

                for(const e in argBuffers){
                    const buf=argBuffers[e];
                    if(!buf){
                        continue;
                    }
                    const index=Number(e);
                    const fn=choice.message.tool_calls?.[index];
                    if(fn?.function){
                        fn.function.arguments=buf.join('');
                    }
                }

                if(content.length){
                    choice.message.content=content.join('');
                }

                completion={
                    id:mid,
                    created:Date.now(),
                    model,
                    usage,
                    object:'chat.completion',
                    choices:[choice],
                }
            }
        }

        if(!completion){
            throw new NotFoundError();
        }

        return completion;
    }

    private async mergeToolCallsAsync(
        ctx:ConvoCompletionCtx<ChatCompletionRequest,ChatCompletion>,
        flat:FlatConvoConversationBase,
        mid:string,
        argBuffers:Record<number,string[]>,
        calls:ChatCompletionMessageToolCall[],
        deltas:ChatCompletionChunk.Choice.Delta.ToolCall[]
    ):Promise<ChatCompletionMessageToolCall[]>{
        for(let i=0;i<deltas.length;i++){
            const d=deltas[i];
            if(!d){
                continue;
            }
            const call=calls[i]??(calls[i]={
                id:d.id??uuid(),
                function:{name:d.function?.name??'',arguments:''},
                type:'function',
            });

            if(d.function?.arguments){
                const buf=argBuffers[i]??(argBuffers[i]=[]);
                buf.push(d.function.arguments);
                if(ctx.onChunk){
                    await ctx.onChunk(this,{id:nextChunkId(),mid,type:'function',functionName:call.function.name,chunk:d.function.arguments},flat);
                }
            }

        }
        return calls;
    }

    public async getModelsAsync(){
        if(this.models){
            return [...this.models];
        }
        if(this._getModelsAsync){
            return await this._getModelsAsync();
        }
        return [];
    }

    protected maxSpeakerRefs=4;

    public canTranscribe(request:ConvoTranscriptionSupportRequest):Promise<boolean>{
        return this.canTranscribeAsync(request);
    }
    protected canTranscribeAsync(request:ConvoTranscriptionSupportRequest):Promise<boolean>{
        return Promise.resolve(this.supportsTranscription);
    }
    public async transcribeAsync({
        audio,
        labelSpeakers,
        includeSegments=labelSpeakers,
        speakerRefs,
        model=includeSegments?'gpt-4o-transcribe-diarize':'gpt-4o-mini-transcribe',
    }:ConvoTranscriptionRequest):Promise<ConvoTranscriptionResult>
    {
        const startTime=Date.now();
        const index=++nextTransIndex;
        const getDefaults=()=>{
            const now=Date.now();
            return {
                startTime,
                endTime:now,
                requestTime:now-startTime,
                index,
                file:audio,
            }
        }
        try{
            const form=new FormData();
            form.append('model',model);
            form.append('chunking_strategy','auto');
            form.append('file',audio);
            form.append('response_format',includeSegments?'diarized_json':'json');
            if(labelSpeakers && speakerRefs){
                speakerRefs.sort((a,b)=>(b.priority??0)-(a.priority??0));
                for(let i=0,l=Math.min(this.maxSpeakerRefs,speakerRefs.length);i<l;i++){
                    const s=speakerRefs[i];
                    if(!s){
                        continue;
                    }
                    form.append(`known_speaker_names[]`,s.id);
                    form.append(`known_speaker_references[]`,s.sampleBase64Url);
                }
            }
            const client=await this.getApiClientAsync(undefined,undefined,'/v1/audio/transcriptions');

            const headers:Record<string,string|undefined>={
                [this.apiKeyHeader]:client.apiKey?((this.apiKeyHeaderValuePrefix??'')+client.apiKey):undefined,
                ...this.headers
            }
            const r=await httpClient().postAsync<ConvoTranscriptionResultProviderBase>(
                client.url,
                form,
                {
                    rawBody:true,
                    headers:{...headers,'Content-Type':undefined},
                    readErrors:true,
                    log:this.logRequests,
                }
            );
            if(!r){
                return {
                    success:false,
                    error:{
                        message:'Empty response returned',
                        error:null,
                    },
                    ...getDefaults(),
                }
            }else{
                return {
                    success:true,
                    ...r,
                    ...getDefaults(),
                }
            }
        }catch(ex){
            console.error('Transcription failed',ex);
            return {
                success:false,
                error:{
                    message:getErrorMessage(ex),
                    error:ex,
                },
                ...getDefaults(),
            }
        }
    }



    public canConvertToSpeech(request:ConvoTtsRequest):Promise<boolean>
    {
        return this.canConvertToSpeechAsync(request);
    }
    protected canConvertToSpeechAsync(request:ConvoTtsRequest):Promise<boolean>{
        return Promise.resolve(this.supportsTts);
    }
    public async convertToSpeechAsync(request:ConvoTtsRequest):Promise<ConvoTtsResult>{

        const client=await this.getApiClientAsync(undefined,undefined,'/v1/audio/speech');

        const headers:Record<string,string|undefined>={
            [this.apiKeyHeader]:client.apiKey?((this.apiKeyHeaderValuePrefix??'')+client.apiKey):undefined,
            ...this.headers
        };

        const r=await httpClient().postAsync<Response>(
            client.url,
            {
                model:request.model??'tts-1',
                input:request.text,
                voice:request.voice||'ash'
            },
            {
                headers,
                readErrors:true,
                log:this.logRequests,
                returnFetchResponse:true,
            }
        );

        if(!r){
            return {
                success:false,
                error:'No response return from API',
            };
        }
        if(!r.ok){
            try{
                const text=await r.text();
                return {
                    success:false,
                    error:text,
                }
            }catch{
                return {
                    success:false,
                    error:`API error response - ${r.status}`,
                }
            }
        }else{
            try{
                return {
                    success:true,
                    tts:{audio:await r.blob()},
                }
            }catch(ex){
                return {
                    success:false,
                    error:`Failed to read audio from API - ${getErrorMessage(ex)}`,
                }
            }
        }

    }
}


let nextTransIndex=1;


interface ApiClient
{
    apiKey?:string;
    url:string;
}

let chunkId=0;
let prefix='';
const nextChunkId=()=>{
    chunkId++;
    if(chunkId>100000000){
        prefix+='_';
        chunkId=1;
    }
    return prefix+chunkId;
}
