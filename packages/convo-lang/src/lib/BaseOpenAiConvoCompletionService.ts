import { NotFoundError, SecretManager, httpClient, joinPaths, shortUuid, uuid } from "@iyio/common";
import { ChatCompletionRequest } from "./convo-openai-types.js";
import { ConvoCompletionCtx, ConvoCompletionService, ConvoModelInfo, FlatConvoConversationBase } from "./convo-types.js";
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
}

export class BaseOpenAiConvoCompletionService implements ConvoCompletionService<ChatCompletionRequest,ChatCompletion>
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
        canComplete
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
        this.completeAsync=completeAsync;
        this.headers=headers;
        this.updateRequest=updateRequest;
        this._getModelsAsync=getModelsAsync;
        this._canComplete=canComplete;
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
    private async getApiClientAsync(apiKeyOverride:string|undefined,endpoint:string|undefined):Promise<ApiClient>
    {
        const url=endpoint??joinPaths(this.apiBaseUrl,this.completionsEndpoint);
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

        let r:ChatCompletion|undefined;

        if(this.completeAsync){
            r=await this.completeAsync(input,flat,client.apiKey,client.url);
        }else{
            const response=await httpClient().postAsync<Response|ChatCompletion>(
                client.url,
                input,
                {
                    headers,
                    readErrors:true,
                    log:this.logRequests,
                    returnFetchResponse:input.stream?true:false,
                }
            );
            if(!input.stream){
                r=response as ChatCompletion;
            }else if(response){
                const reader=(response as Response).body?.getReader();
                if(!reader){
                    throw new Error('Unable to get response reader');
                }

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

                const decoder=new TextDecoder("utf-8");
                const mid=shortUuid();
                const patchedLines:number[]=[];
                let prev='';

                readLoop: while(true){
                    const {done,value}=await reader.read();
                    if(done){
                        break;
                    }
                    const lines=decoder.decode(value).split('\n');
                    for(let i=0;i<lines.length;i++){
                        let line=lines[i] as string;
                        if(prev){
                            line=prev+line;
                            prev='';
                        }
                        const char=streamCharReg.exec(line)?.[1];
                        if(char==='{'){
                            let chunk:ChatCompletionChunk;

                            try{
                                chunk=JSON.parse(line.substring(5));
                            }catch(ex){
                                prev=line;
                                continue;
                            }


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

                        }else if(char==='['){
                            const msg=line.substring(5).trim();
                            if(msg==='[DONE]'){
                                break readLoop;
                            }
                        }else if(line.trim()){
                            console.error(`Unexpected streaming chunk - ${line}`);
                        }
                    }
                }

                if(prev){
                    const msg='Orphaned streaming chunk remaining';
                    console.error(msg);
                    throw new Error(msg);
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

                r={
                    id:mid,
                    created:Date.now(),
                    model,
                    usage,
                    object:'chat.completion',
                    choices:[choice],
                }
            }
        }

        if(!r){
            throw new NotFoundError();
        }

        return r;
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
                    await ctx.onChunk(this,{id:nextChunkId(),mid,type:'function',chunk:d.function.arguments},flat);
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
}

const streamCharReg=/data:\s*(\S)/;




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
