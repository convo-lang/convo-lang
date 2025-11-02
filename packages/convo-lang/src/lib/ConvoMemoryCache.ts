import { ConvoHashCacheBase } from "./ConvoHashCacheBase.js";
import { commonConvoCacheTypes } from "./convo-lib.js";
import { ConvoCompletionMessage } from "./convo-types.js";

/**
 * Caches conversation responses in memory
 */
export class ConvoMemoryCache extends ConvoHashCacheBase
{

    private readonly _cache:Record<string,string>={};

    public constructor()
    {
        super(commonConvoCacheTypes.memory)
    }

    public override getMessagesByKey(key:string):ConvoCompletionMessage[]|null|undefined|Promise<ConvoCompletionMessage[]|null|undefined>
    {
        const v=this._cache[key];
        return v?JSON.parse(v):undefined;
    }

    public override cacheMessagesByKey(key:string,messages:ConvoCompletionMessage[])
    {
        this._cache[key]=JSON.stringify(messages);
    }
}
