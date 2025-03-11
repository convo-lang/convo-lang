import { Scope, ScopeRegistration, secretManager } from "@iyio/common";
import { BaseOpenAiConvoCompletionService } from "../BaseOpenAiConvoCompletionService";
import { BaseOpenAiConvoConverter } from "../BaseOpenAiConvoConverter";
import { convoCompletionService, convoConversationConverterProvider } from "../convo.deps";
import { convoAnthropicInputType, convoAnthropicOutputType } from "./anthropic-lib";
import { defaultAnthropicChatModel, knownConvoAnthropicModels } from "./anthropic-models";
import { anthropicApiKeyParam, anthropicBaseUrlParam, anthropicChatModelParam, anthropicSecretsParam, anthropicVisionModelParam } from "./anthropic-params";

export const convoAnthropicModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,createAnthropicConvoServiceFromScope);
    scope.addProvider(convoConversationConverterProvider,createAnthropicConvoConverterFromScope);
}

export const createAnthropicConvoServiceFromScope=(scope:Scope):BaseOpenAiConvoCompletionService=>{
    return new BaseOpenAiConvoCompletionService({
        apiKey:scope.to(anthropicApiKeyParam).get(),
        apiBaseUrl:scope.to(anthropicBaseUrlParam).get(),
        completionsEndpoint:'/v1/messages',
        secretManager:scope.to(secretManager).get(),
        secretsName:scope.to(anthropicSecretsParam).get(),
        inputType:convoAnthropicInputType,
        outputType:convoAnthropicOutputType,
        models:knownConvoAnthropicModels,
        apiKeyHeader:'x-api-key',
        apiKeyHeaderValuePrefix:null,
        headers:{
            'content-type':'application/json',
            'anthropic-version':'2023-06-01',
        },
        updateRequest:(body)=>{
            body['max_tokens']=8000;
        }

    });
}
export const createAnthropicConvoConverterFromScope=(scope:Scope):BaseOpenAiConvoConverter=>{
    return new BaseOpenAiConvoConverter({
        chatModel:scope.to(anthropicChatModelParam).get()??defaultAnthropicChatModel.name,
        visionModel:scope.to(anthropicVisionModelParam).get(),
        supportedInputTypes:[convoAnthropicInputType],
        supportedOutputTypes:[convoAnthropicOutputType],
        models:knownConvoAnthropicModels,
        transformOutput:(output)=>{
            const co:any=output;
            const out={...output};
            out.choices=[{
                index:0,
                message:{
                    role:co.role,
                    content:co.content.filter?.((c:any)=>c.type==='text').map?.((c:any)=>c.text)?.join('\n')??null,
                    refusal:null,
                },
                logprobs:null,
                finish_reason:co.stop_reason??'stop',
            }]
            out.usage={
                prompt_tokens:co.usage.input_tokens,
                completion_tokens:co.usage.output_tokens,
                total_tokens:co.usage.input_tokens+co.usage.output_tokens
            }
            return out;
        }
    });
}
