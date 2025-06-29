import { convoCompletionService, convoConversationConverterProvider } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { BedrockConvoCompletionService } from "./BedrockConvoCompletionService";
import { BedrockConvoConverter } from "./BedrockConvoConverter";

export const convoBedrockModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>BedrockConvoCompletionService.fromScope(scope));
    scope.addProvider(convoConversationConverterProvider,()=>new BedrockConvoConverter());
}

