import { getSortedObjectHash } from "@iyio/common";
import { ConvoCompletionMessage, ConvoConversationCache, FlatConvoConversation } from "./convo-types.js";

/**
 * Base conversation cache that uses the sorted object hash of the messages of a conversation as
 * a caching key. `getSortedObjectHash` from @iyio/iyio-common is used to hash the messages.
 * ConvoHashCacheBase does not itself cache messages but serves as a base for caches that use
 * message hash based caching. ConvoHashCacheBase can act as a pass-through cache for testing or
 * as a placeholder.
 */
export class ConvoHashCacheBase implements ConvoConversationCache
{

    public readonly cacheType:string;

    public constructor(type:string){
        this.cacheType=type;
    }

    public getCachedResponse(flat:FlatConvoConversation):ConvoCompletionMessage[]|null|undefined|Promise<ConvoCompletionMessage[]|null|undefined>
    {
        const key=getSortedObjectHash(flat.messages);
        return this.getMessagesByKey(key);
    }

    public getMessagesByKey(key:string):ConvoCompletionMessage[]|null|undefined|Promise<ConvoCompletionMessage[]|null|undefined>
    {
        return undefined;
    }

    public cachedResponse(flat:FlatConvoConversation,messages:ConvoCompletionMessage[]):void|Promise<void>
    {
        const key=getSortedObjectHash(flat.messages);
        return this.cacheMessagesByKey(key,messages);
    }

    public cacheMessagesByKey(key:string,messages:ConvoCompletionMessage[])
    {
        // do nothing
    }
}
