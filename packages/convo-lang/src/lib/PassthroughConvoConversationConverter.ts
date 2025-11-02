import { flatConvoConversationToBase, passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib.js";
import { ConvoCompletionMessage, ConvoConversationConverter, FlatConvoConversation, FlatConvoConversationBase } from "./convo-types.js";

export class PassthroughConvoConversationConverter implements ConvoConversationConverter<FlatConvoConversationBase,ConvoCompletionMessage[]>
{
    public readonly supportedInputTypes=[passthroughConvoInputType];

    public readonly supportedOutputTypes=[passthroughConvoOutputType];

    public convertConvoToInput(flat:FlatConvoConversation,inputType:string):FlatConvoConversationBase{
        return flatConvoConversationToBase(flat);
    }

    public convertOutputToConvo(target:ConvoCompletionMessage[],outputType:string):ConvoCompletionMessage[]{
        return target;
    }
}
