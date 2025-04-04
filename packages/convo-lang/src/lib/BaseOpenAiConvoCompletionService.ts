import { ConvoCompletionService, ConvoModelInfo, FlatConvoConversationBase } from "@convo-lang/convo-lang";
import { NotFoundError, SecretManager, httpClient, joinPaths } from "@iyio/common";
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from './open-ai/resources/chat';

export interface BaseOpenAiConvoCompletionServiceOptions
{
    apiKey?:string;
    apiBaseUrl?:string;
    completionsEndpoint?:string;
    secretManager?:SecretManager;
    secretsName?:string;
    models:ConvoModelInfo[];
    inputType:string;
    outputType:string;
    apiKeyHeader?:string;
    apiKeyHeaderValuePrefix?:string|null;
    headers?:Record<string,string>;
    updateRequest?:(requestBody:Record<string,any>,headers:Record<string,string|undefined>)=>void;
    completeAsync?:(input:ChatCompletionCreateParamsNonStreaming,flat:FlatConvoConversationBase,apiKey:string|undefined,url:string)=>Promise<ChatCompletion|undefined>;
    isFallback?:boolean;
}

export class BaseOpenAiConvoCompletionService implements ConvoCompletionService<ChatCompletionCreateParamsNonStreaming,ChatCompletion>
{

    public readonly inputType:string;
    public readonly outputType:string;

    private readonly secretManager?:SecretManager;
    private readonly apiKey?:string;
    private readonly apiBaseUrl:string;
    private readonly completionsEndpoint:string;
    private readonly secretsName?:string;
    private readonly models:ConvoModelInfo[];
    private readonly apiKeyHeader:string;
    private readonly apiKeyHeaderValuePrefix?:string;
    private readonly headers:Record<string,string>;
    private readonly isFallback:boolean;
    private readonly updateRequest?:(requestBody:Record<string,any>,headers:Record<string,string|undefined>)=>void;
    private readonly completeAsync?:(input:ChatCompletionCreateParamsNonStreaming,flat:FlatConvoConversationBase,apiKey:string|undefined,url:string)=>Promise<ChatCompletion|undefined>;

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
        completeAsync,
        updateRequest,
    }:BaseOpenAiConvoCompletionServiceOptions){
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
        this.completeAsync=completeAsync;
        this.headers=headers;
        this.updateRequest=updateRequest;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        if(!model){
            return this.isFallback;
        }
        return this.models.some(m=>m.name===model);
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

    public async completeConvoAsync(input:ChatCompletionCreateParamsNonStreaming,flat:FlatConvoConversationBase):Promise<ChatCompletion>
    {
        const client=await this.getApiClientAsync(flat.apiKey??undefined,flat.responseEndpoint);

        const headers:Record<string,string|undefined>={
            [this.apiKeyHeader]:client.apiKey?((this.apiKeyHeaderValuePrefix??'')+client.apiKey):undefined,
            ...this.headers
        }

        if(this.updateRequest){
            input={...input}
            this.updateRequest(input,headers);
        }

        const r=await (
            this.completeAsync?this.completeAsync(input,flat,client.apiKey,client.url)
        :
            httpClient().postAsync<ChatCompletion>(
                client.url,
                input,
                {
                    headers,
                    readErrors:true,
                    log:true
                }
            )
        );

        console.log('hio 👋 👋 👋 api response',JSON.stringify(r,null,4));

        if(!r){
            throw new NotFoundError();
        }

        return r;
    }

    public getModelsAsync(){
        return Promise.resolve([...this.models]);
    }
}

interface ApiClient
{
    apiKey?:string;
    url:string;
}
