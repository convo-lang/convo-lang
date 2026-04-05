import { ChatCompletionCreateParamsBase } from "./open-ai/resources/chat/completions.js";

export type ChatCompletionRequest=ChatCompletionCreateParamsBase & {
    stream?:null|boolean;
}
