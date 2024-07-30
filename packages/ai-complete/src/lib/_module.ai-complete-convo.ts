import { ScopeRegistration } from "@iyio/common";
import { convoCompletionService } from "@iyio/convo-lang";
import { aiComplete } from "./_type.ai-complete";

export const aiCompleteConvoModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>aiComplete(scope))
}
