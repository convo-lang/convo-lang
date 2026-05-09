import { getErrorMessage, Scope } from "@iyio/common";
import { convoDbProvider, convoDbService } from "../convo.deps.js";
import { PromiseResultTypeVoid } from "../result-type.js";
import { ConvoDb, ConvoDbConnectionStringHandler, ConvoDbMap } from "./convo-db-types.js";

export interface ConvoDbInstanceMapOptions
{
    dbMap?:ConvoDbMap;
    /**
     * Used to lazy initialize a db instance map
     */
    lazyInit?:(inst:ConvoDbInstanceMap)=>void|Promise<void>;

    scope?:Scope;
}

export class ConvoDbInstanceMap
{

    public readonly dbMap:ConvoDbMap;

    /**
     * Used to lazy initialize a db instance map. Will be called the first time getDbAsync is called
     * before creating any db instances.
     */
    private lazyInit?:(inst:ConvoDbInstanceMap)=>void|Promise<void>;

    private scope?:Scope;

    private connectionStringHandlers:ConvoDbConnectionStringHandler[]=[];

    public constructor({
        dbMap={},
        lazyInit,
    }:ConvoDbInstanceMapOptions={})
    {
        this.dbMap=dbMap;
        this.lazyInit=lazyInit;
    }

    private initPromise?:Promise<void>;
    private initAsync(){
        if(this.initPromise){
            return this.initPromise;
        }
        if(!this.lazyInit && !this.scope){
            this.initPromise=Promise.resolve();
            return this.initPromise;
        }
        this.initPromise=(async ()=>{
            await this.lazyInit?.(this);
        })();
        return this.initPromise;
    }

    public async getDbAsync(name:string):Promise<ConvoDb|undefined>{

        await this.initAsync();
        
        const named=this.dbMap[name];
        if(named){
            return named(name);
        }
        const fallback=this.dbMap['*'];
        if(fallback){
            let db=fallback(name);
            this.dbMap[name]=()=>db;
            return db;
        }
        if(name==='default'){
            return convoDbService.get();
        }
        return undefined;
    }

    public registerStringConnector(handler:ConvoDbConnectionStringHandler){
        this.connectionStringHandlers.push(handler);
    }

    public async addFactoryUsingConnectionStringAsync(connectionString:string):PromiseResultTypeVoid{
        try{

            const [name,type,...args]=connectionString.split(':');
            if(!name || !type){
                return {
                    success:false,
                    error:'Invalid connection string. Name and type required. Format = {name}:{type}[:additionalArgs,]',
                    statusCode:400,
                }
            }

            for(const h of this.connectionStringHandlers){
                let factory=h(type,args);
                if(factory){
                    if(typeof factory !== 'function'){
                        factory=await factory;
                        if(!factory){
                            continue;
                        }
                    }
                    this.dbMap[name]=factory;
                    return {
                        success:true
                    }
                }
            }

            const p=convoDbProvider.get(type);
            if(p){
                let factory=p(type,args);
                if(factory){
                    if(typeof factory !== 'function'){
                        factory=await factory;
                    }
                    if(factory){
                        this.dbMap[name]=factory;
                        return {
                            success:true
                        }
                    }
                }
            }

            return {
                success:false,
                error:'No string connection handler registered with support for provided connection string',
                statusCode:500,
            }

        }catch(ex){
            return {
                success:false,
                error:`Failed to create factory due to handler throwing exception: ${getErrorMessage(ex)}`,
                statusCode:500,
            }
        }
    }
}