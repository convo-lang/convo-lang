import { Scope, ScopeRegistration, secretManager } from "@iyio/common";
import { BaseOpenAiConvoCompletionService } from "../BaseOpenAiConvoCompletionService";
import { BaseOpenAiConvoConverter } from "../BaseOpenAiConvoConverter";
import { convoCompletionService, convoConversationConverterProvider } from "../convo.deps";
import { convoOpenAiInputType, convoOpenAiOutputType } from "./openai-lib";
import { defaultOpenAiChatModel, openAiModels } from "./openai-models";
import { openAiApiKeyParam, openAiBaseUrlParam, openAiChatModelParam, openAiSecretsParam, openAiVisionModelParam } from "./openai-params";

export const convoOpenAiModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,createOpenAiConvoServiceFromScope);
    scope.addProvider(convoConversationConverterProvider,createOpenAiConvoConverterFromScope);
}

export const createOpenAiConvoServiceFromScope=(scope:Scope):BaseOpenAiConvoCompletionService=>{
    return new BaseOpenAiConvoCompletionService({
        serviceId:'open-ai',
        apiKey:scope.to(openAiApiKeyParam).get(),
        apiBaseUrl:scope.to(openAiBaseUrlParam).get(),
        secretManager:scope.to(secretManager).get(),
        secretsName:scope.to(openAiSecretsParam).get(),
        inputType:convoOpenAiInputType,
        outputType:convoOpenAiOutputType,
        models:openAiModels,
        isFallback:true,
    });
}
export const createOpenAiConvoConverterFromScope=(scope:Scope):BaseOpenAiConvoConverter=>{
    return new BaseOpenAiConvoConverter({
        chatModel:scope.to(openAiChatModelParam).get()??defaultOpenAiChatModel.name,
        visionModel:scope.to(openAiVisionModelParam).get(),
        supportedInputTypes:[convoOpenAiInputType],
        supportedOutputTypes:[convoOpenAiOutputType],
        models:openAiModels,
        hasVision:model=>model.startsWith('gtp-4o')
    });
}
