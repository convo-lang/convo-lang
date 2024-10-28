import { AiCompletionProviders } from "@convo-lang/ai-complete";
import { ScopeRegistration } from "@iyio/common";
import { OpenAiCompletionProvider } from "./OpenAiCompletionProvider";

export const openAiModule=(scope:ScopeRegistration)=>{
    scope.addProvider(AiCompletionProviders,scope=>OpenAiCompletionProvider.fromScope(scope));
}
