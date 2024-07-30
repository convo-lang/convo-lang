import { ConvoCompletionMessage, ConvoCompletionService, FlatConvoConversation } from "./convo-types";

export class CallbackConvoCompletionService implements ConvoCompletionService
{

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
