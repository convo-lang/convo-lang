import { ConvoMemoryGraphStore, ConvoMemoryGraphStoreOptions } from "./ConvoMemoryGraphStore";

const defaultStoreKey='convo-graph-store';

export interface ConvoLocalStorageGraphStoreOptions extends ConvoMemoryGraphStoreOptions
{
    storeKey?:string;
}

export class ConvoLocalStorageGraphStore extends ConvoMemoryGraphStore
{

    private readonly storeKey:string;


    public constructor({
        storeKey,
        ...options
    }:ConvoLocalStorageGraphStoreOptions){
        super(options);
        if(!storeKey){
            storeKey=defaultStoreKey+'::'+options.graphId;
        }
        this.storeKey=storeKey;

        const json=globalThis.localStorage?.getItem(storeKey);
        if(json){
            try{
                this.db=JSON.parse(json);
                if(!this.db.inputs){
                    this.db.inputs=[];
                }
            }catch(ex){
                console.error('Invalid convo graph json',ex);
            }
        }

        this.onDbChange.subscribe(()=>this.save());
    }

    private save()
    {
        globalThis.localStorage.setItem(this.storeKey,JSON.stringify(this.db));
    }

    public override saveChangesAsync():Promise<void>{
        this.save();
        return Promise.resolve();
    }

}
