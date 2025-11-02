import { ConvoDocumentReference, ConvoRagSearch, ConvoRagSearchResult, ConvoRagSearchResultItem, ConvoRagService, createEmptyConvoTokenUsage, defaultConvoRagSearchLimit, mergeConvoRagResults } from "@convo-lang/convo-lang";
import { InternalOptions, Scope } from "@iyio/common";
import { Index, IntegratedRecord, Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { pineconeAllowedReadIndexesParam, pineconeAllowedWriteIndexesParam, pineconeApiKeyParam, pineconeAutoCreateIndexParam, pineconeCloudParam, pineconeIndexKeyParam, pineconeIndexMountsParam, pineconeIndexParam, pineconeModelParam, pineconeRegionParam } from "./convo-pinecone-deps.js";
import { defaultPineconeAutoCreateIndex, defaultPineconeCloud, defaultPineconeIndex, defaultPineconeIndexKey, defaultPineconeModel, defaultPineconeRegion } from "./pinecone-const.js";

export interface ConvoPineconeIndexMount
{
    path:string;
    index:string;
}

export interface ConvoPineconeRagServiceOptions
{
    apiKey:string;
    index?:string;
    /**
     * Array of additional indexes that are allowed to be used. If defined the array should include
     * the default index defined by the index property
     */
    allowedReadIndexes?:string[];
    allowedWriteIndexes?:string[];
    indexKey?:string;
    cloud?:string;
    region?:string;
    model?:string;
    autoCreateIndex?:boolean;

    /**
     * Maps filepaths to index
     */
    indexMounts?:ConvoPineconeIndexMount[];

}

export class ConvoPineconeRagService implements ConvoRagService
{

    public static fromScope(scope:Scope):ConvoPineconeRagService{
        const mnt=scope.to(pineconeIndexMountsParam).get();
        let indexMounts:ConvoPineconeIndexMount[]|undefined;
        if(mnt){
            indexMounts=mnt.split(/[,;]/g).map(v=>{
                const i=v.indexOf(':');
                if(i===-1){
                    throw new Error(`Invalid ConvoPineconeIndexMount expression - ${mnt}`);
                }
                const path=v.substring(0,i).trim();
                const index=v.substring(i+1).trim();
                if(!path || !index){
                    throw new Error(`Invalid ConvoPineconeIndexMount expression - ${mnt}`);
                }
                return {path,index}
            })
        }
        const index=pineconeIndexParam(scope);
        return new ConvoPineconeRagService({
            apiKey:pineconeApiKeyParam(scope),
            index,
            indexKey:pineconeIndexKeyParam(scope),
            cloud:pineconeCloudParam(scope),
            region:pineconeRegionParam(scope),
            model:pineconeModelParam(scope),
            autoCreateIndex:pineconeAutoCreateIndexParam(scope),
            allowedReadIndexes:scope.to(pineconeAllowedReadIndexesParam).get()?.split(',').map(i=>i.trim()).filter(i=>i)??indexMounts?.map(i=>i.index)??[index],
            allowedWriteIndexes:scope.to(pineconeAllowedWriteIndexesParam).get()?.split(',').map(i=>i.trim()).filter(i=>i),
            indexMounts
        })
    }

    private readonly options:InternalOptions<ConvoPineconeRagServiceOptions,'allowedReadIndexes'|'allowedWriteIndexes'|'indexMounts'>;

    public constructor({
        apiKey,
        index=defaultPineconeIndex,
        indexKey=defaultPineconeIndexKey,
        cloud=defaultPineconeCloud,
        region=defaultPineconeRegion,
        model=defaultPineconeModel,
        autoCreateIndex=defaultPineconeAutoCreateIndex,
        allowedReadIndexes,
        allowedWriteIndexes,
        indexMounts,
    }:ConvoPineconeRagServiceOptions){
        this.options={
            apiKey,
            index,
            indexKey,
            cloud,
            region,
            model,
            autoCreateIndex,
            allowedReadIndexes,
            allowedWriteIndexes,
            indexMounts,
        }
    }

    private _clientPromise:Promise<Pinecone>|null=null;
    private async getClientAsync(){
        return await this._clientPromise??(this._clientPromise=this.createClient());
    }

    private async createClient(){
        const client=new Pinecone({
            apiKey:this.options.apiKey,
        })
        return client;
    }

    private readonly indexPromises:Record<string,Promise<Index<RecordMetadata>>>={};

    private async getIndexAsync(index:string,forRead:boolean):Promise<Index<RecordMetadata>>{
        if(forRead?!this.isReadIndexAllowed(index):!this.isWriteIndexAllowed(index)){
            throw new Error(`${forRead?'Reading':'Writing to'} Pinecone index ${index} not allowed`);
        }
        const client=await this.getClientAsync();
        return await (this.indexPromises[index]??(this.indexPromises[index]=this.createIndexAsync(client,index)));
    }

    private async createIndexAsync(client:Pinecone,index:string)
    {
        try{
            const idx=await client.describeIndex(index);
            if(idx){
                return client.index(index);
            }
        }catch(ex){
            console.error(`Failed to check status of Pinecone index - ${index}`,ex)
        }

        if(!this.options.autoCreateIndex){
            throw new Error('Auto create Pinecone index not enabled');
        }

        await client.createIndexForModel({
            name:index,
            cloud:this.options.cloud as any,
            region:this.options.region,
            embed:{
                model:this.options.model,
                fieldMap:{text:this.options.indexKey}
            },
            waitUntilReady:true,

        });
        return client.index(index);
    }

    public isReadIndexAllowed(index:string){
        return this.options.allowedReadIndexes?this.options.allowedReadIndexes.includes(index):this.options.index===index
    }

    public isWriteIndexAllowed(index:string){
        return this.options.allowedWriteIndexes?.includes(index)??false;
    }

    private getMountedIndex(path?:string):{index:string,path?:string}|undefined{
        if(!path || !this.options.indexMounts){
            return {index:this.options.index,path}
        }
        if(path.startsWith('/')){
            path=path.substring(1);
        }
        const rootedPath='/'+path;
        for(const mnt of this.options.indexMounts){
            if(path.startsWith(mnt.path) || rootedPath.startsWith(mnt.path)){
                return {
                    index:mnt.index,
                    path,
                }
            }
        }
        return undefined;

    }

    public async searchAsync(search:ConvoRagSearch):Promise<ConvoRagSearchResult>
    {
        if(!search.content){
            return {items:[],usage:createEmptyConvoTokenUsage()}
        }

        if(search.paths){

            const indexMap:Record<string,(string|undefined)[]>={};
            for(const p of search.paths){
                const mnt=this.getMountedIndex(p);
                if(!mnt){
                    continue;
                }
                (indexMap[mnt.index]??(indexMap[mnt.index]=[])).push(mnt.path);
            }

            const keys=Object.keys(indexMap);
            if(!keys.length){
                return {items:[],usage:createEmptyConvoTokenUsage()};
            }
            const r=await Promise.all(keys.map(k=>this.searchIndexAsync(
                search,k,
                indexMap[k]?.filter(p=>p) as string[]|undefined,
            )));

            return mergeConvoRagResults(r);

        }else{
            return await this.searchIndexAsync(search,this.options.index);
        }

    }

    public async searchIndexAsync(search:ConvoRagSearch,index:string,paths?:string[]):Promise<ConvoRagSearchResult>
    {

        if(!search.content){
            return {items:[],usage:createEmptyConvoTokenUsage()}
        }

        const idx=await this.getIndexAsync(index,true);

        const r=await idx.searchRecords({
            query:{
                topK:search.limit??defaultConvoRagSearchLimit,
                inputs:{text:search.content},
            }
        });

        return {
            usage:createEmptyConvoTokenUsage(),
            items:r.result.hits.filter(h=>h._score<=search.tolerance).map<ConvoRagSearchResultItem>(h=>{

                const content=(h.fields as any)?.[this.options.indexKey]??'';

                return {
                    id:h._id,
                    distance:h._score,
                    document:{
                        sourceId:h._id,
                        content,
                    }
                }
            })
        }
    }

    public async upsertAsync(documents:ConvoDocumentReference[]):Promise<void>{
        const indexMap:Record<string,({mntPath:string|undefined,doc:ConvoDocumentReference})[]>={};
        for(const doc of documents){
            const mnt=this.getMountedIndex(doc.path);
            if(!mnt){
                continue;
            }
            (indexMap[mnt.index]??(indexMap[mnt.index]=[])).push({
                mntPath:mnt.path,
                doc,
            });
        }

        const keys=Object.keys(indexMap);

        await Promise.all(keys.map(async index=>{
            const docs=indexMap[index];
            if(!docs){
                return;
            }
            const idx=await this.getIndexAsync(index,false);
            await idx.upsertRecords(docs.map<IntegratedRecord>(d=>{
                const doc={...d.doc};
                delete doc.vector;
                if(doc.sourceId){
                    (doc as any)._id=doc.sourceId;
                    delete doc.sourceId;
                }
                return doc as IntegratedRecord;
            }))
        }))
    }
}
