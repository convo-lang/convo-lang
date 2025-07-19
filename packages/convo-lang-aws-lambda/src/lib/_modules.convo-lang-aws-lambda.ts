import { convoCompletionService } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { LambdaAiCompletionProvider } from "./LambdaAiCompletionProvider";

export const aiCompleteLambdaModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>LambdaAiCompletionProvider.fromScope(scope));
}
