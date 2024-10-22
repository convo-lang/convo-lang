import { passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib";
import { ConvoCompletionMessage, ConvoConversationConverter, FlatConvoConversation } from "./convo-types";

export class PassthroughConvoConversationConverter implements ConvoConversationConverter<FlatConvoConversation,ConvoCompletionMessage[]>
{
    public readonly supportedInputTypes=[passthroughConvoInputType];

    public readonly supportedOutputTypes=[passthroughConvoOutputType];

    public convertConvoToInput(flat:FlatConvoConversation,inputType:string):FlatConvoConversation{
        return flat;
    }

    public convertOutputToConvo(target:ConvoCompletionMessage[],outputType:string):ConvoCompletionMessage[]{
        return target;
    }
}
