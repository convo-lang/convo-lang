import { passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib.js";
import { ConvoCompletionMessage, ConvoCompletionService, FlatConvoConversation, FlatConvoConversationBase } from "./convo-types.js";

export class CallbackConvoCompletionService implements ConvoCompletionService<FlatConvoConversation,ConvoCompletionMessage[]>
{

    public readonly serviceId='callback';

    public readonly inputType=passthroughConvoInputType;

    public readonly outputType=passthroughConvoOutputType;

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        return true;
    }

    private completeAsync:(flat:FlatConvoConversation)=>Promise<ConvoCompletionMessage[]>;

    public constructor(completeAsync:(flat:FlatConvoConversation)=>Promise<ConvoCompletionMessage[]>)
    {
        this.completeAsync=completeAsync;
    }

    public completeConvoAsync(flat:FlatConvoConversation):Promise<ConvoCompletionMessage[]>
    {
        return this.completeAsync(flat);
    }
}
