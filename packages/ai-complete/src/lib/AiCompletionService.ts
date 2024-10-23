import { ConvoCompletionMessage, ConvoCompletionService, FlatConvoConversation, FlatConvoConversationBase, convoTags, passthroughConvoInputType, passthroughConvoOutputType } from '@convo-lang/convo-lang';
import { ProviderTypeDef, Scope, TypeDef, UnauthorizedError, aryUnique, shortUuid, zodTypeToJsonScheme } from "@iyio/common";
import { ZodType, ZodTypeAny, z } from "zod";
import { AiCompletionProviders, aiCompletionMaxAudioLengthParam, aiCompletionMaxImageLengthParam, aiCompletionMaxTextLengthParam } from "./_type.ai-complete";
import { CallAiFunctionInterfaceResult, aiCompleteDefaultModel, applyResultToAiMessage, callAiFunctionInterfaceAsync, mergeAiCompletionMessages } from "./ai-complete-lib";
import { AiCompletionFunction, AiCompletionFunctionInterface, AiCompletionMessage, AiCompletionMessageType, AiCompletionProvider, AiCompletionRequest, AiCompletionResult, CompletionOptions, isAiCompletionRole } from "./ai-complete-types";
import { parseAiCompletionMessages } from "./ai-message-converter";

export interface AiCompletionServiceOptions
{
    providers:ProviderTypeDef<AiCompletionProvider>;
    defaultMaxTextTokenLength?:number;
    defaultMaxAudioTokenLength?:number;
    defaultMaxImageTokenLength?:number;
}

export class AiCompletionService implements ConvoCompletionService<FlatConvoConversationBase,ConvoCompletionMessage[]>
{

    public readonly inputType=passthroughConvoInputType;

    public readonly outputType=passthroughConvoOutputType;

    public static fromScope(scope:Scope){
        return new AiCompletionService({
            providers:scope.to(AiCompletionProviders),
            defaultMaxTextTokenLength:aiCompletionMaxTextLengthParam(scope),
            defaultMaxAudioTokenLength:aiCompletionMaxAudioLengthParam(scope),
            defaultMaxImageTokenLength:aiCompletionMaxImageLengthParam(scope),
        })
    }

    private readonly providers:TypeDef<AiCompletionProvider>;


    public readonly defaultMaxTextTokenLength:number;
    public readonly defaultMaxAudioTokenLength:number;
    public readonly defaultMaxImageTokenLength:number;

    public constructor({
        providers,
        defaultMaxTextTokenLength=3000,
        defaultMaxAudioTokenLength=3000,
        defaultMaxImageTokenLength=3000,
    }:AiCompletionServiceOptions){

        this.providers=providers;
        this.defaultMaxTextTokenLength=defaultMaxTextTokenLength;
        this.defaultMaxAudioTokenLength=defaultMaxAudioTokenLength;
        this.defaultMaxImageTokenLength=defaultMaxImageTokenLength;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean{
        return true;
    }

    private getProvider(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):AiCompletionProvider|undefined{
        return this.providers.getFirst(null,p=>{
            if(p.canComplete?.(lastMessage,request,options)){
                return p;
            }else{
                return undefined;
            }
        }) ?? this.providers.getFirst(null,p=>{
            if(p.canComplete===undefined){
                return p;
            }else{
                return undefined;
            }
        })
    }

    public async completeAsync(requestOrMessages:AiCompletionRequest|string,options?:CompletionOptions):Promise<AiCompletionResult>
    {

        let request:AiCompletionRequest;

        if(typeof requestOrMessages === 'string'){
            const messages=parseAiCompletionMessages(requestOrMessages);
            request={
                messages
            }
        }else{
            request=requestOrMessages;
        }

        request={...request};
        request.messages=[...request.messages];

        let result:AiCompletionResult|null=null;
        let lastMessage:AiCompletionMessage|undefined=request.messages[request.messages.length-1];

        const mergeResult=(r:AiCompletionResult)=>{
            r.options.sort((a,b)=>b.confidence-a.confidence);
            if(result){
                if(result.inputTokens===undefined){
                    result.inputTokens=r.inputTokens;
                }else if(r.inputTokens!==undefined){
                    result.inputTokens+=r.inputTokens;
                }
                if(result.outputTokens===undefined){
                    result.outputTokens=r.outputTokens;
                }else if(r.outputTokens!==undefined){
                    result.outputTokens+=r.outputTokens;
                }
                if(result.tokenPrice===undefined){
                    result.tokenPrice=r.tokenPrice;
                }else if(r.tokenPrice!==undefined){
                    result.tokenPrice+=r.tokenPrice;
                }
                if(!result.preGeneration){
                    result.preGeneration=[];
                }
                if(r.model){
                    result.model=r.model;
                }
                const prevOpt=result.options[0];
                if(prevOpt){
                    result.preGeneration.push(prevOpt.message);
                }
                if(r.preGeneration){
                    result.preGeneration.push(...r.preGeneration);
                    mergeAiCompletionMessages(r.preGeneration,request.messages);
                }
                result.options=r.options;
                if(!result.preGeneration.length){
                    delete result.preGeneration;
                }
            }else{
                result=r;
                if(r.preGeneration){
                    mergeAiCompletionMessages(r.preGeneration,request.messages);
                }
            }

            let lm=result.options[0]?.message;
            if(lm){
                request.messages.push(lm);
            }

            lm=request.messages[request.messages.length-1];
            if(lastMessage && lm && lm.id===lastMessage.id){
                lastMessage=undefined;
            }else{
                lastMessage=lm;
            }

        }

        const complete=async (msg:AiCompletionMessage)=>{
            const provider=this.getProvider(msg,request,options);
            if(!provider){
                return false;
            }

            if(msg.model){
                checkModelAccess(msg.model,provider,options);
            }

            try{
                mergeResult(await provider.completeAsync(msg,request,options));
                return true;
            }catch(ex){
                request.debug?.(`Error - ${(ex as any)?.message}`,ex);
                mergeResult({options:[{
                    confidence:1,
                    message:{
                        id:shortUuid(),
                        role:'assistant',
                        type:'error',
                        content:(ex as any)?.message,
                        errorCausedById:msg.id,
                        isError:true,
                    }
                }]})
                return false;
            }
        }

        if(lastMessage?.role==='user' && lastMessage.type==='audio'){
            const success=await complete(lastMessage);
            if(!success){
                return result??{options:[]}
            }
        }

        if(request.preGenerateOnly){
            return result??{options:[]}
        }

        if(lastMessage?.role==='user' || lastMessage?.called){
            const success=await complete(lastMessage);
            if(!success){
                return result??{options:[]}
            }
        }

        return result??{options:[]}
    }

    public async generateImageAsync(prompt:string):Promise<AiCompletionMessage|null>
    {
        const result=await this.completeAsync({messages:[{
            id:shortUuid(),
            role:'user',
            type:'text',
            requestedResponseType:'image',
            content:prompt
        }]})

        const msg=result.options[0]?.message;
        return (msg?.type==='image' && msg.url)?msg:null;
    }

    public async generateFunctionParamsAsync<Z extends ZodTypeAny=ZodType<any>,T=z.infer<Z>>(
        functionName:string,
        description:string,
        params:Z,
        prompt:string|AiCompletionMessage|AiCompletionMessage[],
    ):Promise<T|undefined>{
        if(typeof prompt === 'string'){
            prompt=parseAiCompletionMessages(prompt);
        }else if(!Array.isArray(prompt)){
            prompt=[prompt];
        }

        const fn:AiCompletionFunction={
            name:functionName,
            description,
            params:zodTypeToJsonScheme(params,10),
        }

        const result=await this.completeAsync({
            messages:prompt,
            functions:[fn],
        });

        const msg=result.options[0]?.message;
        if(!msg){
            return undefined;
        }
        if(msg.isError){
            throw new Error(msg.callError?.error??'Call failed');
        }

        if(!msg.call){
            return undefined;
        }

        return params.parse(msg.call.params);
    }

    public async generateFunctionInterfaceParamsAsync<Z extends ZodTypeAny=ZodType<any>,T=z.infer<Z>,C=any,V=any>(
        fi:AiCompletionFunctionInterface<Z,T,C,V>,
        prompt:string|AiCompletionMessage|AiCompletionMessage[],
        descriptionOverride?:string
    ):Promise<T|undefined>{

        return this.generateFunctionParamsAsync(
            fi.name,
            descriptionOverride??fi.description,
            fi.params,
            prompt,
        )
    }

    public async callFunctionInterfaceAsync<Z extends ZodTypeAny=ZodType<any>,T=z.infer<Z>,C=any,V=any>(
        fi:AiCompletionFunctionInterface<Z,T,C,V>,
        prompt:string|AiCompletionMessage|AiCompletionMessage[],
        {
            descriptionOverride,
            applyToMessage,
            render=applyToMessage?true:false,
        }:AiCompletionServiceCallFunctionOptions={}
    ):Promise<CallAiFunctionInterfaceResult<C,V>|undefined>{

        const params=await this.generateFunctionInterfaceParamsAsync(fi,prompt,descriptionOverride);
        if(!params){
            return undefined;
        }

        const callResult=await callAiFunctionInterfaceAsync(fi,render,params,this);
        if(applyToMessage){
            applyResultToAiMessage(applyToMessage,callResult);
        }

        return callResult;
    }

    public getMaxTokensForMessageType(messageType:AiCompletionMessageType,model?:string):number{
        const r=this.providers.getFirst(null,p=>{
            return p.getMaxTokensForMessageType?.(messageType,model);
        });

        if(r!==undefined){
            return r;
        }

        switch(messageType){
            case 'audio': return this.defaultMaxAudioTokenLength;
            case 'image': return this.defaultMaxImageTokenLength;
            default: return this.defaultMaxTextTokenLength;
        }
    }

    public getTokenEstimateForMessage(message:string,model?:string):number{
        return this.providers.getFirst(null,p=>{
            return p.getTokenEstimateForMessage?.(message,model);
        })??(message.length/2)
    }

    public flatConvoToRequest(flat:FlatConvoConversationBase):AiCompletionRequest
    {
        const messages:AiCompletionMessage[]=[];
        const functions:AiCompletionFunction[]=[];

        const baseId=shortUuid()+'_';
        let lastContentMessage:AiCompletionMessage|undefined;

        for(let i=0;i<flat.messages.length;i++){
            const msg=flat.messages[i];
            if(!msg || msg.renderOnly){
                continue;
            }

            if(msg.role==='rag'){
                if(!lastContentMessage?.content){
                    continue;
                }
                let content=msg.content??'';
                if(flat.ragPrefix){
                    content=flat.ragPrefix+'\n\n'+content;
                }
                if(flat.ragSuffix){
                    content+='\n\n'+flat.ragSuffix;
                }
                lastContentMessage.content+='\n\n'+content;
                continue;
            }

            if(msg.fn){

                functions.push({
                    name:msg.fn.name,
                    description:msg.fn.description??'',
                    params:msg.fnParams?zodTypeToJsonScheme(msg.fnParams):undefined
                });

            }else if(msg.called){
                messages.push({
                    id:baseId+i,
                    type:'function',
                    role:'assistant',
                    called:msg.called.name,
                    calledParams:msg.calledParams,
                    calledReturn:msg.calledReturn,
                    metadata:msg.tags,
                    model:msg.responseModel,
                    endpoint:msg.responseEndpoint,
                })
            }else if(msg.content!==undefined){
                messages.push(lastContentMessage={
                    id:baseId+i,
                    type:'text',
                    role:isAiCompletionRole(msg.role)?msg.role:'user',
                    content:msg.content,
                    metadata:msg.tags,
                    responseFormat:msg.responseFormat,
                    responseFormatTypeName:msg.responseFormatTypeName,
                    responseFormatIsArray:msg.responseFormatIsArray,
                    responseAssignTo:msg.responseAssignTo,
                    model:msg.responseModel,
                    endpoint:msg.responseEndpoint,
                    vision:msg.tags?.[convoTags.vision]==='false'?false:(msg.tags && (convoTags.vision in msg.tags))?true:undefined,
                });
            }
        }
        const request:AiCompletionRequest={
            messages,
            functions,
            //debug:flat.debug,
            capabilities:[],
            toolChoice:flat.toolChoice,
            apiKey:flat.apiKey??undefined,
            ragPrefix:flat.ragPrefix,
            ragSuffix:flat.ragSuffix,
        }

        // for(const c of flat.conversation.serviceCapabilities){
        //     const p=AiCompletionCapabilityScheme.safeParse(c);
        //     if(p.success===true){
        //         request.capabilities?.push(p.data);
        //     }
        // }

        return request;

    }

    public async completeConvoAsync(flat:FlatConvoConversation):Promise<ConvoCompletionMessage[]>
    {

        const request=this.flatConvoToRequest(flat);

        const result=await this.completeAsync(request,{allowAllModels:true});

        const resultMessage=result.options[0];
        if(!resultMessage){
            return []
        }

        if(resultMessage.message.call){
            return [{
                callFn:resultMessage.message.call.name,
                callParams:resultMessage.message.call.params,
                tags:resultMessage.message.metadata,
                inputTokens:result.inputTokens,
                outputTokens:result.outputTokens,
                tokenPrice:result.tokenPrice,
                model:result.model,
                endpoint:result.endpoint,
            }]
        }else{
            return [{
                role:resultMessage.message.role,
                content:resultMessage.message.content,
                tags:resultMessage.message.metadata,
                inputTokens:result.inputTokens,
                outputTokens:result.outputTokens,
                tokenPrice:result.tokenPrice,
                model:result.model,
                format:result.format,
                formatTypeName:result.formatTypeName,
                formatIsArray:result.formatIsArray,
                assignTo:result.assignTo,
                endpoint:result.endpoint,
            }]
        }
    }

    public toModelFormat(flat:FlatConvoConversation):any
    {

        const request=this.flatConvoToRequest(flat);
        const last=request.messages[request.messages.length-1];
        if(!last){
            return undefined;
        }

        const provider=this.getProvider(last,request);
        if(!provider){
            return undefined;
        }

        return provider.toModelFormat(last,request,{allowAllModels:true});
    }

}

export interface AiCompletionServiceCallFunctionOptions
{
    descriptionOverride?:string;
    render?:boolean;
    applyToMessage?:AiCompletionMessage;
}

const expandModels=(models:string[]|null|undefined,allowed:readonly string[]):readonly string[]=>{
    if(!models){
        return allowed;
    }

    if(models.includes(aiCompleteDefaultModel)){
        models=[...models];
        for(let i=0;i<models.length;i++){
            if(models[i]===aiCompleteDefaultModel){
                models.splice(i,1,...allowed);
                i+=allowed.length-1;
            }
        }
    }

    return models;
}

const checkModelAccess=(model:string,provider:AiCompletionProvider,options:CompletionOptions|undefined)=>{
    if(options?.allowAllModels){
        return;
    }
    const allowed=provider.getAllowedModels?.()??[];
    const expanded=expandModels(options?.allowedModels,allowed);

    if(!allowed.includes(model) || !expanded.includes(model)){
        throw new UnauthorizedError(`User does not have access to model (${model}). Allowed Models = ${aryUnique([...allowed,...expanded]).join(', ')}`);
    }
}
