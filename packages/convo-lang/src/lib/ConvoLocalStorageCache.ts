import { ConvoHashCacheBase } from "./ConvoHashCacheBase.js";
import { commonConvoCacheTypes } from "./convo-lib.js";
import { ConvoCompletionMessage } from "./convo-types.js";



export interface ConvoLocalStorageCacheOptions
{
    /**
     * Key prefixed using when storing values in local storage.
     */
    keyPrefix?:string;
}

/**
 * Caches conversation responses in memory
 */
export class ConvoLocalStorageCache extends ConvoHashCacheBase
{

    private keyPrefix:string;

    public constructor({
        keyPrefix='ConvoLocalStorageCache::'
    }:ConvoLocalStorageCacheOptions={}){
        super(commonConvoCacheTypes.localStorage);
        this.keyPrefix=keyPrefix;
    }

    public override getMessagesByKey(key:string):ConvoCompletionMessage[]|null|undefined|Promise<ConvoCompletionMessage[]|null|undefined>
    {
        const v=globalThis.localStorage?.getItem(this.keyPrefix+key);
        return v?JSON.parse(v):undefined;
    }

    public override cacheMessagesByKey(key:string,messages:ConvoCompletionMessage[])
    {
        globalThis.localStorage?.setItem(this.keyPrefix+key,JSON.stringify(messages));
    }
}
