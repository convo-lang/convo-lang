import { ConvoDataStore } from "./convo-lang-ui-types";

export interface LocalStorageConvoDataStoreOptions
{
    prefix?:string;
}

/**
 * Saves conversations to local storage.
 */
export class LocalStorageConvoDataStore implements ConvoDataStore
{

    public readonly prefix:string;

    public constructor({
        prefix='LocalStorageConvoDataStore/'
    }:LocalStorageConvoDataStoreOptions={}){
        this.prefix=prefix;
    }

    public loadConvo(id:string):string|undefined{
        return globalThis.localStorage?.getItem(`${this.prefix}${id}`)??undefined;
    }

    public saveConvo(id:string,convo:string):void{
        globalThis.localStorage?.setItem(`${this.prefix}${id}`,convo);
    }

    public deleteConvo(id:string):void{
        globalThis.localStorage?.removeItem(`${this.prefix}${id}`);
    }
}
