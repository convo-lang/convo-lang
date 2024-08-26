import { ConvoMemoryGraphStore, ConvoMemoryGraphStoreOptions, ConvoTraverser } from "@convo-lang/convo-lang";
import { isVfsFilePath, vfs } from "@iyio/vfs";

export type ConvoVfsProxyType='all'|'none'|'traverser'|'node'|'edge';

export interface ConvoVfsGraphStoreOptions extends ConvoMemoryGraphStoreOptions
{
    proxy?:ConvoVfsProxyType|ConvoVfsProxyType[];
}

export class ConvoVfsGraphStore extends ConvoMemoryGraphStore
{

    public readonly proxyType:ConvoVfsProxyType|ConvoVfsProxyType[];

    public constructor({
        proxy='all',
        ...options
    }:ConvoVfsGraphStoreOptions){
        super(options);
        this.proxyType=proxy;
    }

    private shouldProxy(type:ConvoVfsProxyType):boolean
    {
        return (typeof this.proxyType === 'string')?(type===this.proxyType):this.proxyType.includes(type);
    }

    public override async getTraverserAsync(id:string):Promise<ConvoTraverser|undefined>
    {
        if(this.shouldProxy('traverser')){
            if(isVfsFilePath(id)){
                return await vfs().readObjectAsync(id);
            }else{
                return undefined;
            }
        }else{
            return await super.getTraverserAsync(id);
        }
    }

    public override async putTraverserAsync(traverser:ConvoTraverser):Promise<void>
    {
        const id=traverser.id;
        if(this.shouldProxy('traverser')){
            if(isVfsFilePath(id)){
                await vfs().writeObjectAsync(id,traverser);
            }
        }else{
            await super.putTraverserAsync(traverser);
        }
    }
    public override async deleteTraverserAsync(id:string):Promise<void>
    {
        if(this.shouldProxy('traverser')){
            if(isVfsFilePath(id)){
                await vfs().removeAsync(id);
            }
        }else{
            await super.deleteTraverserAsync(id);
        }

    }


}
