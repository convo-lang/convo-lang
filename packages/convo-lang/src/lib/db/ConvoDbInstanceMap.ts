import { getErrorMessage, Scope } from "@iyio/common";
import { JSON5 } from "@iyio/json5";
import { convoDbProvider, convoDbService } from "../convo.deps.js";
import { PromiseResultType, PromiseResultTypeVoid } from "../result-type.js";
import { loadDynamicConvoDbFactoryAsync } from "./convo-db-factory-loader.js";
import { ConvoDb, ConvoDbConnectionStringHandler, ConvoDbFactory, ConvoDbMap } from "./convo-db-types.js";

export interface ConvoDbInstanceMapOptions
{
    dbMap?:ConvoDbMap;
    /**
     * Used to lazy initialize a db instance map
     */
    lazyInit?:(inst:ConvoDbInstanceMap)=>void|Promise<void>;

    scope?:Scope;

    importMap?:Record<string,string>;

    enabledDynamicImports?:boolean;
}

export class ConvoDbInstanceMap
{

    public readonly dbMap:ConvoDbMap;

    private readonly cache:Record<string,ConvoDb>={}

    /**
     * Used to lazy initialize a db instance map. Will be called the first time getDbAsync is called
     * before creating any db instances.
     */
    private lazyInit?:(inst:ConvoDbInstanceMap)=>void|Promise<void>;

    private scope?:Scope;

    private connectionStringHandlers:ConvoDbConnectionStringHandler[]=[];

    public readonly importMap:Record<string,string>;

    public enabledDynamicImports:boolean;

    public constructor({
        dbMap={},
        importMap={},
        enabledDynamicImports=false,
        lazyInit,
    }:ConvoDbInstanceMapOptions={})
    {
        this.dbMap=dbMap;
        this.importMap=importMap;
        this.enabledDynamicImports=enabledDynamicImports;
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

        const cached=this.cache[name];
        if(cached){
            return cached;
        }
        
        const named=this.dbMap[name];
        if(named){
            return this.cache[name]=named(name);
        }

        const fallback=this.dbMap['*'];
        if(fallback){
            let db=fallback(name);
            this.dbMap[name]=()=>db;
            this.cache[name]=db;
            return db;
        }
        if(name==='default'){
            const db=convoDbService.get();
            if(db){
                this.cache[name]=db;
                return db;
            }
        }
        return undefined;
    }

    public registerStringConnector(type:string,factory:ConvoDbFactory):void;
    public registerStringConnector(handler:ConvoDbConnectionStringHandler):void;
    registerStringConnector(handler:ConvoDbConnectionStringHandler|string,factory?:ConvoDbFactory):void{
        if(typeof handler === 'string'){
            if(factory){
                this.connectionStringHandlers.push(()=>{
                    return factory;
                })
            }
        }else{
            this.connectionStringHandlers.push(handler);
        }
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

            if(this.enabledDynamicImports){
                const factory=await this.getDynamicAsync(type,args);
                if(!factory.success){
                    return factory;
                }
                this.dbMap[name]=factory.result;
                return {
                    success:true
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

    private async getDynamicAsync(type:string,args:string[]):PromiseResultType<ConvoDbFactory>{

        let options:any;
        try{
            options=JSON5.parse(args.join(':'));
        }catch(ex){
            return {
                success:false,
                error:`Unable to parse options for: ${type}: ${getErrorMessage(ex)}`,
                statusCode:400,
            }
        }

        if(options.dbMap===undefined){
            options.dbMap=this;
        }

        if(!type.startsWith('@')){
            const mapped=this.importMap[type];
            if(mapped){
                type=mapped;
            }
        }


        return await loadDynamicConvoDbFactoryAsync(type,options);
    }

}