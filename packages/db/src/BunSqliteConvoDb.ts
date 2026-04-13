import { PromiseResultType } from "@convo-lang/convo-lang";
import { getErrorMessage } from "@iyio/common";
import type { Database } from "bun:sqlite";
import { BaseSqliteConvoDb, BaseSqliteConvoDbOptions } from "./BaseSqliteConvoDb.js";

export interface BunSqliteConvoDbOptions extends BaseSqliteConvoDbOptions
{
    /**
     * Path to database on disk. If not defined in memory db will be used
     */
    dbPath?:string;
}

export class BunSqliteConvoDb extends BaseSqliteConvoDb
{

    private readonly dbPath?:string;
    private readonly initSchema?:boolean;
    private db?:Database;

    public constructor({
        dbPath,
        ...baseProps
    }:BunSqliteConvoDbOptions){
        super(baseProps);
        this.dbPath=dbPath;
    }

    
    
    protected override async _initAsync()
    {
        const sqliteMod=await import('bun:sqlite');
        this.db=new sqliteMod.Database(this.dbPath||'');
        await super._initAsync();
    }

    protected override async _execSqlAsync(sql:string,bind:any[]=[]):PromiseResultType<any[]>{
        try{
            const results=this.execSql(sql,bind);
            return {
                success:true,
                result:results,
            }
        }catch(ex){
            return {
                success:false,
                error:`Query failed - ${getErrorMessage(ex)}`,
                statusCode:500
            }
        }

    }

    private execSql(sql: string, bind:any[]=[]):any[]
    {
        if(!this.db){
            throw new Error('BunSqliteNodeStore not inited');
        }
        if(this.loggingEnabled){
            console.log('SQL:',sql,bind);
        }
        const stmt=this.db.prepare(sql);
        const results=stmt.all(...bind) as any[];
        if(this.loggingEnabled){
            console.log('SQL Result:',results);
        }
        return results;
    }

}