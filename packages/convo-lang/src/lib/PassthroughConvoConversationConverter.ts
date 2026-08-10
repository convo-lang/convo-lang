import { flatConvoConversationToBase, passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib.js";
import { ConvoCompletionMessage, ConvoConversationConverter, FlatConvoConversation, FlatConvoConversationBase } from "./convo-types.js";

export class PassthroughConvoConversationConverter implements ConvoConversationConverter<FlatConvoConversationBase,ConvoCompletionMessage[]>
{
    public readonly supportedInputTypes=[passthroughConvoInputType];

    public readonly supportedOutputTypes=[passthroughConvoOutputType];

    public convertConvoToInputAsync(flat:FlatConvoConversation,inputType:string):Promise<FlatConvoConversationBase>{
        return Promise.resolve(flatConvoConversationToBase(flat));
    }

    public convertOutputToConvoAsync(target:ConvoCompletionMessage[],outputType:string):Promise<ConvoCompletionMessage[]>{
        return Promise.resolve(target);
    }
}
