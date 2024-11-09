import { joinPaths } from "@iyio/common";
import { vfs } from "@iyio/vfs";
import { ConvoHashCacheBase } from "./ConvoHashCacheBase";
import { commonConvoCacheTypes } from "./convo-lib";
import { ConvoCompletionMessage } from "./convo-types";


export const defaultVfsConvoCacheDir='/cache/conversations'

export interface ConvoVfsCacheOptions
{
    /**
     * The directory where cached items live.
     * @default "/cache/convo-conversations"
     */
    cacheDir?:string;

    logErrors?:boolean;
}

/**
 * Caches conversation using the virtual file system
 */
export class ConvoVfsCache extends ConvoHashCacheBase
{

    private cacheDir:string;
    public logErrors:boolean;

    public constructor({
        cacheDir=defaultVfsConvoCacheDir,
        logErrors=true,
    }:ConvoVfsCacheOptions={}){
        super(commonConvoCacheTypes.vfs);
        this.cacheDir=cacheDir;
        this.logErrors=logErrors;
    }

    public getHashPath(hash:string){
        if(hash.length>=3){
            return joinPaths(this.cacheDir,hash.substring(0,3),hash+'.json');
        }else{
            return joinPaths(this.cacheDir,hash+'.json');
        }
    }

    public override async getMessagesByKey(key:string):Promise<ConvoCompletionMessage[]|null|undefined>
    {
        try{
            return await vfs().readObjectAsync(this.getHashPath(key));
        }catch(ex){
            if(this.logErrors){
                console.error('Read cached messages attempt failed',ex);
            }
            return null;
        }
    }

    public override async cacheMessagesByKey(key:string,messages:ConvoCompletionMessage[])
    {
        await vfs().writeObjectAsync(this.getHashPath(key),messages);
    }
}
