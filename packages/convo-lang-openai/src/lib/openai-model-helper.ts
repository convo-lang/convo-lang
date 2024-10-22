import { Scope } from "@iyio/common";
import { openAiAudioModelParam, openAiChatModelParam, openAiImageModelParam, openAiVisionModelParam } from "./convo-lang-openai-params";
import { OpenAiModels } from "./openai-types";

export const getOpenAiModelsFromScope=(scope:Scope):OpenAiModels=>{
    return {
        chatModel:scope.to(openAiChatModelParam).get(),
        audioModel:scope.to(openAiAudioModelParam).get(),
        imageModel:scope.to(openAiImageModelParam).get(),
        visionModel:scope.to(openAiVisionModelParam).get(),
    }
}
