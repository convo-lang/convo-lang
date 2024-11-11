import { ConvoCompletionMessage, ConvoConversationConverter, FlatConvoConversation, createFunctionCallConvoCompletionMessage, createTextConvoCompletionMessage, getLastNonCalledConvoFlatMessage, getNormalizedFlatMessageList } from "@convo-lang/convo-lang";
import { Scope, asType, deleteUndefined, getErrorMessage, parseMarkdownImages, zodTypeToJsonScheme } from "@iyio/common";
import { parse as parseJson5 } from 'json5';
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionContentPart, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionTool, ChatCompletionUserMessageParam } from 'openai/resources/chat';
import { openAiConvoInputType, openAiConvoOutputType, openAiMessageRoles } from "./openai-lib";
import { getOpenAiModelsFromScope } from "./openai-model-helper";
import { defaultOpenAiChantModel, defaultOpenAiImageModel, defaultOpenAiSpeechToTextModel, defaultOpenAiVisionModel, openAiModels } from "./openai-models";
import { OpenAiModels } from "./openai-types";

export type OpenAiConvoConverterOptions=OpenAiModels;

export class OpenAiConvoConverter implements ConvoConversationConverter<ChatCompletionCreateParamsNonStreaming,ChatCompletion>
{

    public static fromScope(scope:Scope){
        return new OpenAiConvoConverter(getOpenAiModelsFromScope(scope))
    }

    public readonly supportedInputTypes=[openAiConvoInputType];

    public readonly supportedOutputTypes=[openAiConvoOutputType];


    private readonly _chatModel?:string;
    private readonly _audioModel?:string;
    private readonly _imageModel?:string;
    private readonly _visionModel?:string;

    public constructor({
        chatModel=defaultOpenAiChantModel.name,
        audioModel=defaultOpenAiSpeechToTextModel.name,
        imageModel=defaultOpenAiImageModel.name,
        visionModel=defaultOpenAiVisionModel.name,
    }:OpenAiConvoConverterOptions){
        this._chatModel=chatModel;
        this._audioModel=audioModel;
        this._imageModel=imageModel;
        this._visionModel=visionModel;
    }

    public convertOutputToConvo(
        output:ChatCompletion,
        outputType:string,
        input:ChatCompletionCreateParamsNonStreaming,
        inputType:string,
        flat:FlatConvoConversation):ConvoCompletionMessage[]
    {
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
                    models:openAiModels,
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
                models:openAiModels,
                inputTokens:output.usage?.prompt_tokens,
                outputTokens:output.usage?.completion_tokens,
            })];
        }else{
            return [createTextConvoCompletionMessage({
                flat,
                role:msg.message.role,
                content:msg.message.content,
                model:output.model,
                models:openAiModels,
                inputTokens:output.usage?.prompt_tokens,
                outputTokens:output.usage?.completion_tokens,
            })];
        }
    }

    public convertConvoToInput(flat:FlatConvoConversation,inputType:string):ChatCompletionCreateParamsNonStreaming{

        const messages=getNormalizedFlatMessageList(flat);

        let visionCapable=flat.capabilities?.includes('vision');
        const lastContentMessage=getLastNonCalledConvoFlatMessage(messages);

        const model=flat?.responseModel??(visionCapable?this._visionModel:this._chatModel);
        if(!model){
            throw new Error('Chat AI model not defined');
        }

        const info=openAiModels.find(m=>m.name===model);
        if(info && info.inputCapabilities?.includes('image') || model.startsWith('gtp-4o')){
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
                    role:((openAiMessageRoles.includes(m.role as any)?m.role:'user')??'user') as any,
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
                if(m.calledReturn!==undefined){
                    oMsgs.push({
                        role:'tool',
                        tool_call_id:toolId,
                        content:JSON.stringify(m.calledReturn),
                    })
                }
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

        return cParams;
    }
}
