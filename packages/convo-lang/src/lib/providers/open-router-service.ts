import { Scope, ScopeRegistration, secretManager } from "@iyio/common";
import { BaseOpenAiConvoCompletionService } from "../BaseOpenAiConvoCompletionService";
import { BaseOpenAiConvoConverter } from "../BaseOpenAiConvoConverter";
import { convoCompletionService, convoConversationConverterProvider } from "../convo.deps";
import { convoOpenRouterInputType, convoOpenRouterOutputType, defaultOpenRouterModel, openRouterAutoSelectModel, openRouterModel, openRouterModelPrefix } from "./open-router-lib";
import { getOpenRouterModelsAsync } from "./open-router-models";
import { openRouterApiKeyParam, openRouterBaseUrlParam, openRouterChatModelParam, openRouterSecretsParam, openRouterVisionModelParam } from "./open-router-params";
import { openAiChatModelParam, openAiVisionModelParam } from "./openai-params";

export const convoOpenRouterModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,createOpenRouterConvoServiceFromScope);
    scope.addProvider(convoConversationConverterProvider,createOpenRouterConvoConverterFromScope);
}

export const createOpenRouterConvoServiceFromScope=(scope:Scope):BaseOpenAiConvoCompletionService=>{
    return new BaseOpenAiConvoCompletionService({
        serviceId:'open-router',
        apiKey:scope.to(openRouterApiKeyParam).get(),
        apiBaseUrl:scope.to(openRouterBaseUrlParam).get(),
        secretManager:scope.to(secretManager).get(),
        secretsName:scope.to(openRouterSecretsParam).get(),
        inputType:convoOpenRouterInputType,
        outputType:convoOpenRouterOutputType,
        getModelsAsync:getOpenRouterModelsAsync,
        canComplete:model=>model?.startsWith(openRouterModelPrefix) || model===openRouterModel,
    });
}
export const createOpenRouterConvoConverterFromScope=(scope:Scope):BaseOpenAiConvoConverter=>{
    return new BaseOpenAiConvoConverter({
        includeModalities:true,
        chatModel:scope.to(openRouterChatModelParam).get()??scope.to(openAiChatModelParam).get()??defaultOpenRouterModel,
        visionModel:scope.to(openRouterVisionModelParam).get()??scope.to(openAiVisionModelParam).get(),
        supportedInputTypes:[convoOpenRouterInputType],
        supportedOutputTypes:[convoOpenRouterOutputType],
        transformInput:input=>{
            if(input.model===openRouterAutoSelectModel || input.model===openRouterModel){
                input.model='openrouter/auto'
            }else if(input.model.startsWith(openRouterModelPrefix)){
                input.model=input.model.substring(openRouterModelPrefix.length);
            }
            return input;
        },
        transformOutput:output=>{
            if(output.model==='openrouter/auto'){
                output.model=openRouterAutoSelectModel;
            }else if(!output.model.startsWith(openRouterModelPrefix)){
                output.model=openRouterModelPrefix+output.model;
            }
            return output;
        }
    });
}
