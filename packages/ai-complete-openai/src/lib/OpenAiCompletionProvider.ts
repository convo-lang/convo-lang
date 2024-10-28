import { AiCompletionFunctionCallError, AiCompletionMessage, AiCompletionMessageType, AiCompletionOption, AiCompletionProvider, AiCompletionRequest, AiCompletionResult, CompletionOptions, getLastNonCallAiCompleteMessage } from '@convo-lang/ai-complete';
import { Lock, Scope, SecretManager, asType, delayAsync, deleteUndefined, parseMarkdownImages, secretManager, shortUuid, unused } from '@iyio/common';
import { parse } from 'json5';
import OpenAIApi from 'openai';
import { ImagesResponse } from 'openai/resources';
import { ChatCompletionAssistantMessageParam, ChatCompletionContentPart, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionTool, ChatCompletionUserMessageParam } from 'openai/resources/chat';
import { openAiApiKeyParam, openAiAudioModelParam, openAiBaseUrlParam, openAiChatModelParam, openAiImageModelParam, openAiSecretsParam, openAiVisionModelParam } from './_types.ai-complete-openai';
import { OpenAiSecrets } from './ai-complete-openai-type';

const defaultTokenCharLength=3.75;
const maxImageGenAttempts=5;

export interface OpenAiCompletionProviderOptions
{
    apiKey?:string;
    apiBaseUrl?:string;
    chatModels?:string[];
    audioModels?:string[];
    imageModels?:string[];
    visionModels?:string[];
    secretManager?:SecretManager;
    secretsName?:string;
}

//const dalle2Model='dall-e-2';
const dalle3Model='dall-e-3';
const defaultVisionModel='gpt-4-vision-preview';
const visionModels=['gpt-4-vision','gpt-4o']

export class OpenAiCompletionProvider implements AiCompletionProvider
{

    public static fromScope(scope:Scope){
        return new OpenAiCompletionProvider({
            apiKey:scope.to(openAiApiKeyParam).get(),
            apiBaseUrl:scope.to(openAiBaseUrlParam).get(),
            secretManager:scope.to(secretManager).get(),
            secretsName:scope.to(openAiSecretsParam).get(),
            chatModels:scope.to(openAiChatModelParam).get()?.split(',').map(m=>m.trim()).filter(m=>m),
            audioModels:scope.to(openAiAudioModelParam).get()?.split(',').map(m=>m.trim()).filter(m=>m),
            imageModels:scope.to(openAiImageModelParam).get()?.split(',').map(m=>m.trim()).filter(m=>m),
            visionModels:scope.to(openAiVisionModelParam).get()?.split(',').map(m=>m.trim()).filter(m=>m),
        })
    }

    private readonly secretManager?:SecretManager;

    private readonly apiKey?:string;
    private readonly _apiBaseUrl?:string;

    private readonly secretsName?:string;

    private readonly _allowedModels:string[];

    private readonly _chatModel?:string;
    private readonly _audioModel?:string;
    private readonly _imageModel?:string;
    private readonly _visionModel?:string;


    private readonly imageGenLockLow:Lock=new Lock(1)
    private readonly imageGenLock:Lock=new Lock(3);

    public constructor({
        apiKey,
        secretManager,
        secretsName,
        apiBaseUrl,
        chatModels=['gpt-4o'],
        audioModels=['whisper-1'],
        imageModels=[dalle3Model],
        visionModels=[defaultVisionModel]
    }:OpenAiCompletionProviderOptions){
        this.apiKey=apiKey;
        this._apiBaseUrl=apiBaseUrl,
        this.secretManager=secretManager;
        this.secretsName=secretsName;
        this._allowedModels=[...chatModels,...audioModels,...imageModels,...visionModels];
        this._chatModel=chatModels[0];
        this._audioModel=audioModels[0];
        this._imageModel=imageModels[0];
        this._visionModel=visionModels[0];
    }

    public getAllowedModels():readonly string[]{
        return this._allowedModels;
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

    public async completeAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest):Promise<AiCompletionResult>
    {

        switch(lastMessage.requestedResponseType??lastMessage.type){

            case 'text':
            case 'function':
                return await this.completeChatAsync(lastMessage,request);

            case 'audio':
                return await this.completeAudioAsync(lastMessage,request);

            case 'image':
                return await this.completeImageAsync(lastMessage,request);

            default:
                return {options:[]}

        }
    }

    public toModelFormat(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):any
    {
        return this.getChatParams(lastMessage,request).cParams;
    }

    private getChatParams(lastMessage:AiCompletionMessage,request:AiCompletionRequest){
        let visionCapable=request.capabilities?.includes('vision');
        const lastContentMessage=getLastNonCallAiCompleteMessage(request.messages);

        const model=lastContentMessage?.model??(visionCapable?this._visionModel:this._chatModel);
        if(!model){
            throw new Error('Chat AI model not defined');
        }
        if(model.startsWith('gpt-4o')){
            visionCapable=true;
        }

        const oMsgs:ChatCompletionMessageParam[]=[];
        for(const m of request.messages){
            if(m.type==='text'){
                let content:string|Array<ChatCompletionContentPart>;
                const vc=(visionCapable || m.vision) && m.vision!==false && m.role!=='system';
                if(vc){
                    const items=parseMarkdownImages(m.content??'');
                    if(items.length===1 && (typeof items[0]?.text === 'string')){
                        content=items[0]?.text??'';
                    }else{
                        content=items.map<ChatCompletionContentPart>(i=>i.image?{
                            type:'image_url',
                            image_url:{url:i.image.url}
                        }:{
                            type:'text',
                            text:i.text??''
                        })
                    }
                }else{
                    content=m.content??'';
                }
                oMsgs.push(deleteUndefined(asType<ChatCompletionUserMessageParam|ChatCompletionAssistantMessageParam|ChatCompletionSystemMessageParam>({
                    role:(m.role??'user') as any,
                    content
                })))
            }else if(m.type==='function' && m.called){
                const toolId=m.metadata?.['toolId']??m.called;
                oMsgs.push({
                    role:'assistant',
                    content:null,
                    tool_calls:[{
                        id:toolId,
                        type:'function',
                        function:{
                            name:m.called,
                            arguments:JSON.stringify(m.calledParams),
                        }
                    }]
                })
                if(m.calledReturn!==undefined){
                    oMsgs.push({
                        role:'tool',
                        tool_call_id:toolId,
                        content:JSON.stringify(m.calledReturn),
                    })
                }
            }
        }

        const oFns=request.functions?.map<ChatCompletionTool>(f=>{
            return {
                type:"function",
                function:deleteUndefined({
                    name:f.name,
                    description:f.description,
                    parameters:f.params??{}
                })
            }
        })

        const jsonMode=lastContentMessage?.responseFormat==='json';

        const cParams:ChatCompletionCreateParamsNonStreaming={
            model,
            response_format:jsonMode?{type:'json_object'}:undefined,
            stream:false,
            messages:oMsgs,
            tools:oFns?.length?oFns:undefined,
            user:lastContentMessage?.userId,
            tool_choice:request.toolChoice?(
                (typeof request.toolChoice === 'string')?
                request.toolChoice:{type:"function","function":request.toolChoice}
            ):undefined
        };

        return {
            cParams,
            model,
            jsonMode,
            lastContentMessage,
        };
    }

    private async completeChatAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest):Promise<AiCompletionResult>
    {

        const {
            cParams,
            model,
            jsonMode,
            lastContentMessage,
        }=this.getChatParams(lastMessage,request);

        const endpoint=lastMessage.endpoint;

        request.debug?.('snd > OpenAi.ChatCompletionCreateParams',cParams);

        const api=await this.getApiAsync(request.apiKey,endpoint);

        const r=await api.chat.completions.create(cParams);

        request.debug?.('rec < OpenAi.ChatCompletionCreateParams',r);

        return {
            outputTokens:r.usage?.completion_tokens,
            inputTokens:r.usage?.prompt_tokens,
            tokenPrice:(
                this.getMaxTokenPrice('text','in',model)*(r.usage?.prompt_tokens??0)+
                this.getMaxTokenPrice('text','out',model)*(r.usage?.completion_tokens??0)
            ),
            model,
            endpoint:endpoint,
            format:jsonMode?'json':undefined,
            formatTypeName:jsonMode?lastContentMessage?.responseFormatTypeName:undefined,
            formatIsArray:jsonMode?lastContentMessage?.responseFormatIsArray:undefined,
            assignTo:lastContentMessage?.responseAssignTo,
            options:r.choices.map<AiCompletionOption>(c=>{

                let params:Record<string,any>|undefined;
                let callError:AiCompletionFunctionCallError|undefined;;

                const tool=c.message.tool_calls?.find(t=>t.function);
                const toolFn=tool?.function??c.message.function_call;
                let fnName:string|undefined=undefined;
                const toolId=(tool && toolFn)?tool.id:undefined;
                if(toolFn){
                    try{

                        fnName=toolFn.name;
                        params=parse(toolFn.arguments??'{}');
                    }catch(ex){
                        callError={
                            name:toolFn.name,
                            error:`Unable to parse arguments - ${(ex as any)?.message}\n${toolFn.arguments}`
                        }
                    }
                }

                return {
                    message:{
                        id:shortUuid(),
                        type:callError?'function-error':fnName?'function':'text',
                        role:c.message?.role,
                        content:c.message?.content??'',
                        call:(fnName && !callError)?{
                            name:fnName,
                            params:params??{}
                        }:undefined,
                        callError,
                        errorCausedById:callError?lastMessage.id:undefined,
                        isError:callError?true:undefined,
                        metadata:toolId?{toolId}:undefined,

                    },
                    confidence:1,
                }
            })
        };
    }

    private async completeAudioAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest):Promise<AiCompletionResult>
    {
        // const model=lastMessage?.model??this._audioModel;
        // if(!model){
        //     throw new Error('Audio AI model not defined');
        // }

        // const api=await this.getApiAsync(request.apiKey,lastMessage.endpoint);

        // const type=lastMessage.dataContentType??'audio/mp3';

        // const file=(lastMessage.dataUrl?
        //     await (async ()=>{
        //         const r=await httpClient().getResponseAsync(lastMessage.dataUrl??'');
        //         if(!r){
        //             throw new Error('Fetch file failed')
        //         }
        //         const contentType=r.headers.get('Content-Type')||r.headers.get('content-type')||'';
        //         const m=/\w+\/(\w+)/.exec(contentType);
        //         const file=await toFile(r.blob(),`tmp.${m?.[1]??'file'}`);
        //         return file;
        //     })():
        //     new FileBlob([Buffer.from(lastMessage.data??'','base64')],'audio.'+(type.split('/')[1]??'mp3'),{type})
        // );

        // if(!file){
        //     throw new Error('Unable to load data URL');
        // }

        // const r=await api.audio.transcriptions.create({
        //     file,
        //     model,
        //     prompt:lastMessage.content,
        //     response_format:'text',
        // })

        // const text=r;

        // return {
        //     tokenPrice:1,// todo - use real price - for now just say $1, which is very high
        //     options:[],
        //     preGeneration:[{
        //         id:shortUuid(),
        //         type:'text',
        //         role:lastMessage.role,
        //         content:text,
        //         replaceId:lastMessage.id,
        //     }]
        // }
        return null as any;
    }

    private async completeImageAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest):Promise<AiCompletionResult>
    {
        const model=lastMessage?.model??this._imageModel;
        if(!model){
            throw new Error('Image AI model not defined');
        }

        const api=await this.getApiAsync(request.apiKey,lastMessage.endpoint);

        let r:ImagesResponse|undefined=undefined;

        for(let i=1;i<=maxImageGenAttempts;i++){
            try{
                const release=await (model===dalle3Model?this.imageGenLockLow:this.imageGenLock).waitAsync();
                try{
                    r=await api.images.generate({
                        prompt:lastMessage.content??'',
                        n:1,
                        size:model===dalle3Model?'1024x1024':'512x512',
                        user:lastMessage.userId,
                        model
                    });
                }finally{
                    release();
                }
                break;
            }catch(ex){
                if(i>=maxImageGenAttempts){
                    throw ex;
                }
                await delayAsync(i*1000+Math.round(1000*Math.random()));
            }
        }

        if(!r){
            throw new Error('Image not generated');
        }

        return {
            options:[{
                message:{
                    role:'assistant',
                    id:shortUuid(),
                    type:'image',
                    url:r.data[0]?.url,
                },
                confidence:1,
            }],
            tokenPrice:1,// todo - use real price - for now just say $1, which is very high
        }
    }



    public getMaxTokensForMessageType?(messageType:AiCompletionMessageType,model?:string):number|undefined
    {

        if(!model){
            switch(messageType){

                case 'text':
                    model=this._chatModel;
                    break;

                case 'image':
                    model=this._imageModel;
                    break;

                case 'audio':
                    model=this._audioModel;
                    break;

                default:
                    model=this._chatModel;
                    break;
            }
        }

        switch(model){
            case 'gpt-4o-mini':
            case 'gpt-4o-mini-2024-07-18': return 128000;
            case 'gpt-4o': return 128000;
            case 'gpt-4o-2024-05-13': return 128000;
            case 'gpt-4-1106-preview': return 128000;
            case 'gpt-4-vision-preview': return 128000;
            case 'gpt-4': return 8192;
            case 'gpt-4-0314': return 8192;
            case 'gpt-4-0613': return 8192;
            case 'gpt-4-32k': return 32768;
            case 'gpt-4-32k-0314': return 32768;
            case 'gpt-4-32k-0613': return 32768;
            case 'gpt-3.5-turbo-1106': return 4096;
            case 'gpt-3.5-turbo': return  4096;
            case 'gpt-3.5-turbo-16k': return 16385;
            case 'gpt-3.5-turbo-0301': return  16385;
            case 'gpt-3.5-turbo-0613': return 16385;
            case 'gpt-3.5-turbo-16k-0613': return  16385;
        }

        return 4096;
    }

    public getMaxTokenPrice(messageType:AiCompletionMessageType,tokenType:'in'|'out',model?:string):number
    {

        if(!model){
            switch(messageType){

                case 'text':
                    model=this._chatModel;
                    break;

                case 'image':
                    model=this._imageModel;
                    break;

                case 'audio':
                    model=this._audioModel;
                    break;

                default:
                    model=this._chatModel;
                    break;
            }
        }

        const isIn=tokenType==='in';
        switch(model){
            case 'gpt-4o':
            case 'gpt-4o-2024-05-13': return (isIn?5:15)/1000000;
            case 'gpt-4o-2024-08-06':return (isIn?2.5:10)/1000000;
            case 'gpt-4o-mini':
            case 'gpt-4o-mini-2024-07-18': return (isIn?0.15:0.6)/1000000;
            case 'gpt-4-0125-preview':
            case 'gpt-4-1106-preview':
            case 'gpt-4-vision-preview': return (isIn?0.01:0.03)/1000;
            case 'gpt-4':
            case 'gpt-4-0314':
            case 'gpt-4-0613': return (isIn?0.03:0.06)/1000;
            case 'gpt-4-32k':
            case 'gpt-4-32k-0314':
            case 'gpt-4-32k-0613': return (isIn?0.06:0.12)/1000;
            case 'gpt-3.5-turbo':
            case 'gpt-3.5-turbo-0301':
            case 'gpt-3.5-turbo-0613':
            case 'gpt-3.5-turbo-1106': return (isIn?0.001:0.002)/1000;
            case 'gpt-3.5-turbo-16k':
            case 'gpt-3.5-turbo-16k-0613': return (isIn?0.001:0.002)/1000;
            case 'gpt-3.5-turbo-instruct': return (isIn?0.0015:0.002)/1000;
        }

        return (isIn?0.01:0.03)/1000;
    }

    public getTokenEstimateForMessage?(message:string,model?:string):number|undefined
    {
        unused(model);
        // todo - check based on model
        return message.length/defaultTokenCharLength;
    }

}

const isVisionModel=(model:string|null|undefined)=>{
    if(!model){
        return false;
    }
    return visionModels.some(v=>model.startsWith(v)) || model?.includes('vision');
}
