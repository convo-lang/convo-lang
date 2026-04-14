import { PromiseResultType } from "@convo-lang/convo-lang";
import { getErrorMessage } from "@iyio/common";
import type { DatabaseSync } from "node:sqlite";
import { BaseSqliteConvoDb, BaseSqliteConvoDbOptions } from "./BaseSqliteConvoDb.js";

export interface NodeSQLiteConvoDbOptions extends BaseSqliteConvoDbOptions
{
    /**
     * Path to database on disk. If not defined in memory db will be used
     */
    dbPath?:string;
}

export class NodeSQLiteConvoDb extends BaseSqliteConvoDb
{

    public static fromConnectionString(connectionString?:string){
        return new NodeSQLiteConvoDb({dbPath:connectionString})
    }

    private readonly dbPath?:string;
    private db?:DatabaseSync;

    public constructor({
        dbPath,
        ...baseProps
    }:NodeSQLiteConvoDbOptions){
        super(baseProps);
        this.dbPath=dbPath;
    }

    
    
    protected override async _initAsync()
    {
        const Db=(await import('node:sqlite')).default.DatabaseSync;
        this.db=new Db(this.dbPath||"test.db");
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