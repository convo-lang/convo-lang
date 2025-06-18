import { ContentBlock, ConversationRole, ConverseCommandInput, ConverseCommandOutput, Message, SystemContentBlock, Tool, ToolChoice } from "@aws-sdk/client-bedrock-runtime";
import { ConvoCompletionMessage, ConvoConversationConverter, FlatConvoConversation, convoAnyModelName, createFunctionCallConvoCompletionMessage, createTextConvoCompletionMessage, getLastNonCalledConvoFlatMessage, getNormalizedFlatMessageList } from "@convo-lang/convo-lang";
import { deleteUndefined, log, parseMarkdownImages, uuid, zodTypeToJsonScheme } from "@iyio/common";
import { parseJson5 } from "@iyio/json5";
import { convoBedrockInputType, convoBedrockOutputType, defaultBedrockModel } from "./bedrock-lib";
import { bedrockModels } from "./bedrock-models";


interface FormatOptions
{
    callReturnValuesAsObject?:boolean;
}



export interface BedrockConvoConverterOptions
{
    supportedInputTypes?:string[];
    supportedOutputTypes?:string[];
}

const functionCallReg=/^\s*\{"type":\s*"function",\s*"name":\s*"(\w+)"/

/**
 * A conversation converter for OpenAI like APIs
 */
export class BedrockConvoConverter implements ConvoConversationConverter<ConverseCommandInput,ConverseCommandOutput>
{

    public readonly supportedInputTypes:string[];

    public readonly supportedOutputTypes:string[];

    private readonly formatOptions:FormatOptions={
        callReturnValuesAsObject:true
    }

    public constructor({
        supportedInputTypes=[convoBedrockInputType],
        supportedOutputTypes=[convoBedrockOutputType],
    }:BedrockConvoConverterOptions={}){
        this.supportedInputTypes=supportedInputTypes?[...supportedInputTypes]:[];
        Object.freeze(this.supportedInputTypes);
        this.supportedOutputTypes=supportedOutputTypes?[...supportedOutputTypes]:[];
        Object.freeze(this.supportedOutputTypes);
    }

    public convertOutputToConvo(
        output:ConverseCommandOutput,
        outputType:string,
        input:ConverseCommandInput,
        inputType:string,
        flat:FlatConvoConversation):ConvoCompletionMessage[]
    {

        flat.debug?.('Bedrock response',output);
        const msg=output.output?.message;
        if(!msg?.content){
            return []
        }

        const out:ConvoCompletionMessage[]=[];

        for(const block of msg.content){

            if(block.toolUse?.name){
                out.push(createFunctionCallConvoCompletionMessage({
                    flat,
                    callFn:block.toolUse.name,
                    callParams:(block.toolUse.input??{}) as Record<string,any>,
                    toolId:block.toolUse.toolUseId??uuid(),
                    model:input.modelId??convoAnyModelName,
                    models:bedrockModels,
                    inputTokens:output.usage?.inputTokens,
                    outputTokens:output.usage?.outputTokens,
                }))
            }else if(block.text!==undefined){
                const fnName=functionCallReg.exec(block.text)?.[1];
                if(fnName){
                    const callResult=this.createCallReturnUsingJsonText(fnName,block.text,input,output,flat);
                    if(callResult){
                        out.push(...callResult);
                        continue;
                    }
                }
                out.push(createTextConvoCompletionMessage({
                    flat,
                    role:msg.role??'assistant',
                    content:block.text,
                    model:input.modelId??convoAnyModelName,
                    models:bedrockModels,
                    inputTokens:output.usage?.inputTokens,
                    outputTokens:output.usage?.outputTokens,
                }))
            }

        }

        return out;
    }

    private formatCallReturnValue(value:any){
        const {callReturnValuesAsObject}=this.formatOptions;
        if(!callReturnValuesAsObject){
            return value;
        }

        if(value && (typeof value === 'object')){
            return value;
        }

        return {value}

    }

    private createCallReturnUsingJsonText(
        name:string,
        jsonText:string,
        input:ConverseCommandInput,
        output:ConverseCommandOutput,
        flat:FlatConvoConversation,
    ):ConvoCompletionMessage[]|undefined{
        try{
            const callJson=parseJson5(jsonText);
            const params=callJson?.parameters;
            const tool=input.toolConfig?.tools?.find(t=>t.toolSpec?.name===name);
            if(!tool || !params){
                return undefined;
            }
            return [createFunctionCallConvoCompletionMessage({
                flat,
                callFn:name,
                callParams:params,
                toolId:uuid(),
                model:input.modelId??convoAnyModelName,
                models:bedrockModels,
                inputTokens:output.usage?.inputTokens,
                outputTokens:output.usage?.outputTokens,
            })]
        }catch(ex){
            log.warn('createCallReturnUsingJsonText failed',ex);
            return undefined;
        }
    }

    public convertConvoToInput(flat:FlatConvoConversation,inputType:string):ConverseCommandInput{

        const messages=getNormalizedFlatMessageList(flat,{
            mergeSystemMessages:true,
        });

        const visionCapable=flat.capabilities?.includes('vision');

        const lastContentMessage=getLastNonCalledConvoFlatMessage(messages);
        const jsonMode=lastContentMessage?.responseFormat==='json';

        const model=flat.responseModel??defaultBedrockModel;

        const oMsgs:Message[]=[];
        const systemMessages:SystemContentBlock[]=[];
        let tools:Tool[]|undefined;
        let toolChoice:ToolChoice|false|undefined=(typeof flat.toolChoice === 'string'?
            (
                flat.toolChoice==='auto'?
                    {auto:{}}
                :flat.toolChoice==='none'?
                    false
                :flat.toolChoice==='required'?
                    {any:{}}
                :
                    false
            )
        :flat.toolChoice?.name?
            {tool:{name:flat.toolChoice?.name}}
        :
            {auto:{}}
        )

        for(const m of messages){
            if(m.fn){
                if(!tools){
                    tools=[];
                }
                tools.push({toolSpec:deleteUndefined({
                    name:m.fn.name,
                    description:m.fn.description,
                    inputSchema:{json:(m._fnParams??(m.fnParams?(zodTypeToJsonScheme(m.fnParams)??{}):{})) as Record<string,any>}
                })})
            }else if(m.content!==undefined){
                const content:ContentBlock[]=[];
                const vc=(visionCapable || m.vision) && m.vision!==false && m.role!=='system';
                if(vc){
                    const items=parseMarkdownImages(m.content??'',{requireImgProtocol:true});
                    for(const item of items){

                        if(item.image){
                            // content.push({image:{
                            //     source:{
                            //         bytes:[] // todo - decode base64 encoded uri
                            //     }
                            // }});
                        }else{
                            content.push({text:item.text??''})
                        }

                    }
                }else{
                    content.push({text:m.content??''});
                }
                if(m.role==='system'){
                    systemMessages.push({
                        text:content.map(c=>c.text??'').join(' ')
                    })
                }else{
                    oMsgs.push(({
                        role:(this.isKnownRole(m.role)?m.role:'user') as ConversationRole,
                        content
                    }))
                }
            }else if(m.called){
                const toolId=m.tags?.['toolId']??m.called.name;
                oMsgs.push({
                    role:'assistant',
                    content:[{
                        toolUse:{
                            toolUseId:toolId,
                            name:m.called.name,
                            input:m.calledParams
                        }
                    }]
                })
                oMsgs.push({
                    role:'user',
                    content:[{
                        toolResult:{
                            toolUseId:toolId,
                            content:[{
                                json:m.calledReturn===undefined?{"message":"function-called"}:this.formatCallReturnValue(m.calledReturn)
                            }],
                        }
                    }]
                })
            }
        }


        const input:ConverseCommandInput={
            modelId:model,
            toolConfig:(toolChoice===false || !tools?.length)?undefined:{
                tools,
                toolChoice
            },
            messages:oMsgs,
            system:systemMessages,
        };

        flat.debug?.('convo > ConverseCommandInput',input);


        return input;
    }

    private isKnownRole(role:string){
        const r=role as ConversationRole;
        return r==='assistant' || r==='user';
    }
}
