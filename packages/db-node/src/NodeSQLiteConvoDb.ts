import { PromiseResultType } from "@convo-lang/convo-lang";
import { BaseSqliteConvoDb, BaseSqliteConvoDbOptions } from "@convo-lang/db/BaseSqliteConvoDb.js";
import { getDirectoryName, getErrorMessage, getFileName } from "@iyio/common";
import { pathExistsAsync } from "@iyio/node-common";
import { mkdir } from "fs/promises";
import type { DatabaseSync } from "node:sqlite";

export interface NodeSqliteConvoDbOptions extends BaseSqliteConvoDbOptions
{
    /**
     * Path to database on disk. If not defined in memory db will be used
     */
    dbPath?:string;
}

export class NodeSqliteConvoDb extends BaseSqliteConvoDb
{

    public static fromConnectionString(connectionString?:string){
        return new NodeSqliteConvoDb({dbPath:connectionString,name:connectionString?getFileName(connectionString):'default'})
    }

    private readonly dbPath?:string;
    private db?:DatabaseSync;

    public constructor({
        dbPath,
        ...baseProps
    }:NodeSqliteConvoDbOptions){
        super(baseProps);
        this.dbPath=dbPath;
    }

    
    
    protected override async _initAsync()
    {
        const dir=getDirectoryName(this.dbPath);
        if(!await pathExistsAsync(dir)){
            await mkdir(dir,{recursive:true});
        }
        const Db=(await import('node:sqlite')).default.DatabaseSync;
        this.db=new Db(this.dbPath||"test.db");
        return await super._initAsync();
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
            throw new Error('NodeSQLiteConvoDb not inited');
        }
        //if(this.loggingEnabled){
            console.log('SQL:',sql,bind);
        //}
        const stmt=this.db.prepare(sql);
        const results=stmt.all(...bind) as any[];
        //if(this.loggingEnabled){
            console.log('SQL Result:',results);
        //}
        return results;
    }

}