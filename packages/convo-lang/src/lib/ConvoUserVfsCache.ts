import { currentBaseUser } from "@iyio/common";
import { ConvoHashCacheBase } from "./ConvoHashCacheBase.js";
import { ConvoLocalStorageCache, ConvoLocalStorageCacheOptions } from "./ConvoLocalStorageCache.js";
import { ConvoVfsCache, ConvoVfsCacheOptions } from "./ConvoVfsCache.js";
import { commonConvoCacheTypes } from "./convo-lib.js";
import { ConvoCompletionMessage } from "./convo-types.js";

export interface ConvoUserVfsCacheOptions
{
    vfsOptions?:ConvoVfsCacheOptions;
    localStorageOptions?:ConvoLocalStorageCacheOptions
}

/**
 * Uses a combination of local storage and the virtual file system to cache. Read attempts will
 * first try the vfs then fallback to local storage. Writing to the vfs will only occur if a user
 * is signed in. This cache type is good for applications that want user to be able to always read
 * from the vfs cache but don't want unauthorized user to write to the cache.
 */
export class ConvoUserVfsCache extends ConvoHashCacheBase
{

    private localStorageCache:ConvoLocalStorageCache;
    private vfsCache:ConvoVfsCache;

    public constructor(options:ConvoUserVfsCacheOptions={}){
        super(commonConvoCacheTypes.userVfs);
        this.localStorageCache=new ConvoLocalStorageCache(options.localStorageOptions);
        this.vfsCache=new ConvoVfsCache(options.vfsOptions);
    }

    public override async getMessagesByKey(key:string):Promise<ConvoCompletionMessage[]|null|undefined>
    {
        const user=currentBaseUser.get();
        if(user){
            return await this.vfsCache.getMessagesByKey(key);
        }else{
            const [fs,ls]=await Promise.all([
                this.vfsCache.getMessagesByKey(key),
                this.localStorageCache.getMessagesByKey(key)
            ]);
            return fs??ls;
        }
    }

    public override async cacheMessagesByKey(key:string,messages:ConvoCompletionMessage[])
    {
        const user=currentBaseUser.get();
        if(user){
            await this.vfsCache.cacheMessagesByKey(key,messages);
        }else{
            this.localStorageCache.cacheMessagesByKey(key,messages);
        }
    }
}
