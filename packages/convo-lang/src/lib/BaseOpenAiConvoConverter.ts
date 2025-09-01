import { asType, deleteUndefined, getErrorMessage, parseMarkdownImages, zodTypeToJsonScheme } from "@iyio/common";
import { parseJson5 } from '@iyio/json5';
import { createFunctionCallConvoCompletionMessage, createTextConvoCompletionMessage, getLastConvoContentMessage, getNormalizedFlatMessageList } from "./convo-lib";
import { ConvoCompletionMessage, ConvoConversationConverter, ConvoModelInfo, FlatConvoConversation } from "./convo-types";
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionContentPart, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionTool, ChatCompletionUserMessageParam } from './open-ai/resources/chat';

export interface BaseOpenAiConvoConverterOptions
{
    chatModel?:string;
    visionModel?:string;
    supportedInputTypes?:string[];
    supportedOutputTypes?:string[];
    /**
     * Roles that will map to the user role
     */
    userRoles?:string[];

    /**
     * Roles that will map to the assistant role
     */
    assistantRoles?:string[];

    /**
     * Roles that will map to the system role
     */
    systemRoles?:string[];

    /**
     * Roles that will map to the function role
     */
    functionRoles?:string[];

    models?:ConvoModelInfo[];

    hasVision?:(modelName:string)=>boolean;

    transformInput?:(input:ChatCompletionCreateParamsNonStreaming)=>ChatCompletionCreateParamsNonStreaming;
    transformOutput?:(output:ChatCompletion)=>ChatCompletion;
}

/**
 * A conversation converter for OpenAI like APIs
 */
export class BaseOpenAiConvoConverter implements ConvoConversationConverter<ChatCompletionCreateParamsNonStreaming,ChatCompletion>
{

    public readonly supportedInputTypes:string[];

    public readonly supportedOutputTypes:string[];

    public readonly userRoles:string[];
    public readonly assistantRoles:string[];
    public readonly systemRoles:string[];
    public readonly functionRoles:string[];
    public readonly chatModel?:string;
    public readonly visionModel?:string;
    public readonly models?:ConvoModelInfo[];
    public readonly hasVision?:(modelName:string)=>boolean;

    public readonly transformInput?:(input:ChatCompletionCreateParamsNonStreaming)=>ChatCompletionCreateParamsNonStreaming;
    public readonly transformOutput?:(output:ChatCompletion)=>ChatCompletion;
    public readonly getModelsAsync?:()=>Promise<ConvoModelInfo[]>


    public constructor({
        chatModel,
        visionModel,
        supportedInputTypes,
        supportedOutputTypes,
        userRoles,
        assistantRoles,
        systemRoles,
        functionRoles,
        models,
        hasVision,
        transformInput,
        transformOutput,
    }:BaseOpenAiConvoConverterOptions){
        this.chatModel=chatModel;
        this.visionModel=visionModel;
        this.supportedInputTypes=supportedInputTypes?[...supportedInputTypes]:[];
        Object.freeze(this.supportedInputTypes);
        this.supportedOutputTypes=supportedOutputTypes?[...supportedOutputTypes]:[];
        Object.freeze(this.supportedOutputTypes);
        this.userRoles=userRoles?[...userRoles]:['user'];
        Object.freeze(this.userRoles);
        this.assistantRoles=assistantRoles?[...assistantRoles]:['assistant'];
        Object.freeze(this.assistantRoles);
        this.systemRoles=systemRoles?[...systemRoles]:['system'];
        Object.freeze(this.systemRoles);
        this.functionRoles=functionRoles?[...functionRoles]:['function'];
        Object.freeze(this.functionRoles);
        this.models=models?[...models]:undefined;
        Object.freeze(this.models);
        this.hasVision=hasVision;
        this.transformInput=transformInput;
        this.transformOutput=transformOutput;


    }

    public convertOutputToConvo(
        output:ChatCompletion,
        outputType:string,
        input:ChatCompletionCreateParamsNonStreaming,
        inputType:string,
        flat:FlatConvoConversation):ConvoCompletionMessage[]
    {
        if(this.transformOutput){
            output=this.transformOutput(output);
        }
        const msg=output.choices[0];
        if(!msg){
            return []
        }

        let params:Record<string,any>|undefined;
        let callError:string|undefined;;

        const tool=msg.message.tool_calls?.find(t=>t.function);
        const toolFn=tool?.function;
        let fnName:string|undefined=undefined;
        const toolId=(tool && toolFn)?tool.id:undefined;
        if(toolFn){
            try{
                fnName=toolFn.name;
                params=parseJson5(toolFn.arguments??'{}');
            }catch(ex){
                callError=
                    `Unable to parse arguments for ${toolFn.name} - ${getErrorMessage(ex)}\n${toolFn.arguments}`
            }
        }

        if(fnName){
            if(callError){
                return [createTextConvoCompletionMessage({
                    flat,
                    role:msg.message.role,
                    content:callError,
                    model:output.model,
                    models:this.models,
                    inputTokens:output.usage?.prompt_tokens,
                    outputTokens:output.usage?.completion_tokens,
                })];
            }
            return [createFunctionCallConvoCompletionMessage({
                flat,
                callFn:fnName,
                callParams:params,
                toolId,
                model:output.model,
                models:this.models,
                inputTokens:output.usage?.prompt_tokens,
                outputTokens:output.usage?.completion_tokens,
            })];
        }else{
            let content=msg.message.content;
            if(msg.message.images?.length){
                const urls=msg.message.images.filter(i=>i?.image_url?.url && i?.type==='image_url').map(i=>`![image](${i.image_url.url})`);
                if(urls.length){
                    content+='\n\n'+urls.join('\n\n');
                }
            }
            return [createTextConvoCompletionMessage({
                flat,
                role:msg.message.role,
                content,
                model:output.model,
                models:this.models,
                inputTokens:output.usage?.prompt_tokens,
                outputTokens:output.usage?.completion_tokens,
            })];
        }
    }

    public convertConvoToInput(flat:FlatConvoConversation,inputType:string):ChatCompletionCreateParamsNonStreaming{

        const messages=getNormalizedFlatMessageList(flat);

        let visionCapable=flat.capabilities?.includes('vision');
        const lastContentMessage=getLastConvoContentMessage(messages);

        const model=flat?.responseModel??(visionCapable?this.visionModel:this.chatModel);
        if(!model){
            throw new Error('Chat AI model not defined');
        }

        const info=this.models?.find(m=>m.name===model);
        if(info && info.inputCapabilities?.includes('image') || this.hasVision?.(model)){
            visionCapable=true;
        }

        const oMsgs:ChatCompletionMessageParam[]=[];
        const oFns:ChatCompletionTool[]=[];
        for(const m of messages){
            if(m.fn){
                oFns.push({
                    type:"function",
                    function:deleteUndefined({
                        name:m.fn.name,
                        description:m.fn.description,
                        parameters:(m._fnParams??(m.fnParams?(zodTypeToJsonScheme(m.fnParams)??{}):{})) as Record<string,any>
                    })
                })
            }else if(m.content!==undefined){
                let content:string|Array<ChatCompletionContentPart>;
                const vc=(visionCapable || m.vision) && m.vision!==false && m.role!=='system';
                if(vc){
                    const items=parseMarkdownImages(m.content??'',{requireImgProtocol:true});
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
                    role:this.isKnownRole(m.role)?m.role:'user',
                    content
                })))
            }else if(m.called){
                const toolId=m.tags?.['toolId']??m.called.name;
                oMsgs.push({
                    role:'assistant',
                    content:null,
                    tool_calls:[{
                        id:toolId,
                        type:'function',
                        function:{
                            name:m.called.name,
                            arguments:JSON.stringify(m.calledParams),
                        }
                    }]
                })
                oMsgs.push({
                    role:'tool',
                    tool_call_id:toolId,
                    content:m.calledReturn===undefined?'function-called':JSON.stringify(m.calledReturn),
                })
            }
        }

        const jsonMode=lastContentMessage?.responseFormat==='json';

        const cParams:ChatCompletionCreateParamsNonStreaming={
            model,
            response_format:jsonMode?{type:'json_object'}:undefined,
            stream:false,
            messages:oMsgs,
            tools:oFns?.length?oFns:undefined,
            user:flat?.userId,
            tool_choice:flat.toolChoice?(
                (typeof flat.toolChoice === 'string')?
                flat.toolChoice:{type:"function","function":flat.toolChoice}
            ):undefined
        };

        if(flat.temperature!==undefined){
            cParams.temperature=flat.temperature;
        }

        if(flat.topP!==undefined){
            cParams.top_p=flat.topP;
        }
        if(flat.frequencyPenalty!==undefined){
            cParams.frequency_penalty=flat.frequencyPenalty;
        }
        if(flat.presencePenalty!==undefined){
            cParams.presence_penalty=flat.presencePenalty;
        }
        if(flat.logprobs!==undefined){
            cParams.logprobs=flat.logprobs;
        }
        if(flat.reasoningEffort!==undefined){
            cParams.reasoning_effort=(
                flat.reasoningEffort==='min'?
                'minimal'
                :flat.reasoningEffort==='md'?
                    'medium'
                :
                    flat.reasoningEffort
            );
        }
        if(flat.seed!==undefined){
            cParams.seed=flat.seed;
        }
        if(flat.serviceTier!==undefined && (
            flat.serviceTier==='auto' ||
            flat.serviceTier==='flex' ||
            flat.serviceTier==='priority' ||
            flat.serviceTier=='default'
        )){
            cParams.service_tier=flat.serviceTier;
        }
        if(flat.topLogprobs!==undefined){
            cParams.top_logprobs=flat.topLogprobs;
        }
        if(flat.maxTokens!==undefined){
            cParams.max_completion_tokens=flat.maxTokens;
        }
        if(flat.responseVerbosity!==undefined){
            cParams.verbosity=flat.responseVerbosity==='md'?'medium':flat.responseVerbosity;
        }
        if(flat.logitBias!==undefined){
            cParams.logit_bias=flat.logitBias;
        }

        if(flat.modelParams){
            for(const e in flat.modelParams){
                (cParams as any)[e]=flat.modelParams[e];
            }
        }

        if(this.transformInput){
            return this.transformInput(cParams);
        }else{
            return cParams;
        }
    }

    private isKnownRole(role:string){
        return (
            this.userRoles.includes(role) ||
            this.assistantRoles.includes(role) ||
            this.systemRoles.includes(role) ||
            this.functionRoles.includes(role)
        )
    }
}
