import { convoCompletionService } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { aiComplete } from "./_type.ai-complete";

export const aiCompleteConvoModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>aiComplete(scope))
}
