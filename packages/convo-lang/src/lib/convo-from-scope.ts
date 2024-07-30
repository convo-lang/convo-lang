import { Scope, rootScope } from "@iyio/common"
import { Conversation, ConversationOptions } from "./Conversation"
import { ConvoCapability, allConvoCapabilityAry } from "./convo-types"
import { convoCapabilitiesParams } from "./convo.deps"

/**
 * Creates a new Conversation configured using values defined in the given scope or the root scope.
 */
export const createConversationFromScope=(
    scope:Scope=rootScope,
    defaultOptions?:ConversationOptions,
    overridingOptions?:ConversationOptions
)=>{
    return new Conversation({
        ...defaultOptions,
        capabilities:(
            scope.to(convoCapabilitiesParams)
            .get()?.split(',')
            .filter(c=>allConvoCapabilityAry.includes(c as any)) as ConvoCapability[]
        )??defaultOptions?.capabilities,
        ...overridingOptions,
    })
}
