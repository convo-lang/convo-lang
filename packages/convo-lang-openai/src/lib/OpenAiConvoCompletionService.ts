import { ConvoCompletionCtx, ConvoCompletionService, FlatConvoConversationBase } from "@convo-lang/convo-lang";
import { Scope, SecretManager, secretManager } from "@iyio/common";
import OpenAIApi from 'openai';
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/index.js';
import { openAiApiKeyParam, openAiBaseUrlParam, openAiSecretsParam } from "./convo-lang-openai-params.js";
import { openAiConvoInputType, openAiConvoOutputType } from "./openai-lib.js";
import { getOpenAiModelsFromScope } from "./openai-model-helper.js";
import { defaultOpenAiChantModel, defaultOpenAiImageModel, defaultOpenAiSpeechToTextModel, defaultOpenAiVisionModel, openAiModels } from "./openai-models.js";
import { OpenAiModels, OpenAiSecrets } from "./openai-types.js";


/**
 * @deprecated
 */
export interface OpenAiConvoCompletionServiceOptions extends OpenAiModels
{
    apiKey?:string;
    apiBaseUrl?:string;
    secretManager?:SecretManager;
    secretsName?:string;
}

/**
 * Use `createOpenAiConvoServiceFromScope` exported from the core `@convo-lang/convo-lang` package instead.
 * @deprecated
 */
export class OpenAiConvoCompletionService implements ConvoCompletionService<ChatCompletionCreateParamsNonStreaming,ChatCompletion>
{
    public readonly serviceId='open-ai';

    public static fromScope(scope:Scope){
        return new OpenAiConvoCompletionService({
            apiKey:scope.to(openAiApiKeyParam).get(),
            apiBaseUrl:scope.to(openAiBaseUrlParam).get(),
            secretManager:scope.to(secretManager).get(),
            secretsName:scope.to(openAiSecretsParam).get(),
            ...getOpenAiModelsFromScope(scope),
        })
    }

    public readonly inputType=openAiConvoInputType;
    public readonly outputType=openAiConvoOutputType;

    private readonly secretManager?:SecretManager;
    private readonly _chatModel?:string;
    private readonly _audioModel?:string;
    private readonly _imageModel?:string;
    private readonly _visionModel?:string;
    private readonly apiKey?:string;
    private readonly _apiBaseUrl?:string;
    private readonly secretsName?:string;

    public constructor({
        apiKey,
        secretManager,
        secretsName,
        apiBaseUrl,
        chatModel=defaultOpenAiChantModel.name,
        audioModel=defaultOpenAiSpeechToTextModel.name,
        imageModel=defaultOpenAiImageModel.name,
        visionModel=defaultOpenAiVisionModel.name,
    }:OpenAiConvoCompletionServiceOptions){
        this.apiKey=apiKey;
        this._apiBaseUrl=apiBaseUrl,
        this.secretManager=secretManager;
        this.secretsName=secretsName;
        this._chatModel=chatModel;
        this._audioModel=audioModel;
        this._imageModel=imageModel;
        this._visionModel=visionModel;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        if(!model){
            return true;
        }
        return openAiModels.some(m=>m.name===model);
    }

    private apiPromises:Record<string,Promise<OpenAIApi>>={};
    private async getApiAsync(apiKeyOverride:string|undefined,endpoint:string|undefined):Promise<OpenAIApi>
    {

        const key=`${endpoint??'.'}:::${apiKeyOverride??'.'}`
        return await (this.apiPromises[key]??(this.apiPromises[key]=(async ()=>{
            let apiKey=apiKeyOverride??this.apiKey;
            if(!apiKey && this.secretManager && this.secretsName){
                const {apiKey:key}=await this.secretManager.requireSecretTAsync<OpenAiSecrets>(this.secretsName,true);
                apiKey=key;
            }
            if(!apiKey){
                if(this._apiBaseUrl){
                    apiKey=this._apiBaseUrl;
                }else{
                    throw new Error('Unable to get OpenAi apiKey');
                }
            }
            return new OpenAIApi({
                apiKey,
                dangerouslyAllowBrowser:true,
                baseURL:endpoint||this._apiBaseUrl
            })
        })()));
    }

    public async  completeConvoAsync(
        input:ChatCompletionCreateParamsNonStreaming,
        flat:FlatConvoConversationBase,
        ctx:ConvoCompletionCtx<ChatCompletionCreateParamsNonStreaming,ChatCompletion>
    ):Promise<ChatCompletion>
    {
        const api=await this.getApiAsync(flat.apiKey??undefined,flat.responseEndpoint);
        if(flat.apiKey){
            flat.apiKeyUsedForCompletion=true;
        }

        await ctx.beforeComplete?.(this,input,flat);

        return await api.chat.completions.create(input);
    }

    public getModelsAsync(){
        return Promise.resolve([...openAiModels]);
    }
}
