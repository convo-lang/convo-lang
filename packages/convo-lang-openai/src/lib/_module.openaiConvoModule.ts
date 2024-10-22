import { convoCompletionService, convoConversationConverterProvider } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { OpenAiConvoCompletionService } from "./OpenAiConvoCompletionService";
import { OpenAiConvoConverter } from "./OpenAiConvoConverter";

export const openaiConvoModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>OpenAiConvoCompletionService.fromScope(scope));
    scope.addProvider(convoConversationConverterProvider,scope=>OpenAiConvoConverter.fromScope(scope));
}
