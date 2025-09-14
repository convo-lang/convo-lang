import { convoCompletionService, convoConversationConverterProvider } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { OpenAiConvoCompletionService } from "./OpenAiConvoCompletionService.js";
import { OpenAiConvoConverter } from "./OpenAiConvoConverter.js";

/**
 * Use `convoOpenAiModule` exported from the core `@convo-lang/convo-lang` package instead.
 * @deprecated
 */
export const openaiConvoModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>OpenAiConvoCompletionService.fromScope(scope));
    scope.addProvider(convoConversationConverterProvider,scope=>OpenAiConvoConverter.fromScope(scope));
}
