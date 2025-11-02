import { isVfsFilePath, vfs } from "@iyio/vfs";
import { convoTraverserProxyVar, getConvoTraverserForSaving, getConvoTraverserStoreId, getConvoTraverserStoreIdById } from "./convo-graph-lib.js";
import { ConvoStateVarProxyMap, ConvoTraverser } from "./convo-graph-types.js";
import { ConvoMemoryGraphStore, ConvoMemoryGraphStoreOptions } from "./ConvoMemoryGraphStore.js";

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

    public override async getTraverserAsync(id:string,storeSuffix?:string):Promise<ConvoTraverser|undefined>
    {
        id=getConvoTraverserStoreIdById(id,storeSuffix,'.json');
        if(!id.endsWith('.json')){
            id+='.json'
        }
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
        const id=getConvoTraverserStoreId(traverser,'.json');
        if(this.shouldProxy('traverser')){
            if(isVfsFilePath(id)){
                await vfs().writeObjectAsync(id,getConvoTraverserForSaving(traverser));
            }
        }else{
            await super.putTraverserAsync(traverser);
        }
    }
    public override async deleteTraverserAsync(id:string,storeSuffix?:string):Promise<void>
    {
        id=getConvoTraverserStoreIdById(id,storeSuffix,'.json');
        if(this.shouldProxy('traverser')){
            if(isVfsFilePath(id)){
                await vfs().removeAsync(id);
            }
        }else{
            await super.deleteTraverserAsync(id);
        }

    }

    public async loadTraverserProxiesAsync?(tv:ConvoTraverser,loadKeys?:string[]):Promise<void>
    {
        const map=tv.state[convoTraverserProxyVar] as ConvoStateVarProxyMap|undefined;
        if(!map || (typeof map !=='object')){
            return;
        }
        const keys=Object.keys(map);
        await Promise.all(keys.map(async e=>{
            const p=map[e];
            if(!p || (loadKeys && !loadKeys.includes(e))){
                return;
            }
            let path:string;
            if(typeof p === 'string'){
                path=p;
            }else{
                path=p?.path;
            }
            if(!path){
                return;
            }
            const value=await vfs().readObjectAsync(path);
            if(value!==undefined){
                tv.state[e]=value;
            }
        }));
    }

    public async putTraverserProxiesAsync?(tv:ConvoTraverser):Promise<void>
    {
        const map=tv.state[convoTraverserProxyVar] as ConvoStateVarProxyMap|undefined;
        if(!map || (typeof map !=='object')){
            return;
        }
        const keys=Object.keys(map);
        await Promise.all(keys.map(async e=>{
            const p=map[e];
            if(!p){
                return;
            }
            let path:string;
            if(typeof p === 'string'){
                path=p;
            }else{
                if(p.readonly){
                    return;
                }
                path=p?.path;
            }
            if(!path){
                return;
            }
            const value=tv.state[e];
            if(value===undefined){
                await vfs().removeAsync(path);
            }else{
                await vfs().writeObjectAsync(path,value);
            }
        }));

    }


}
