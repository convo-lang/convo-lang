import { getErrorMessage } from "@iyio/common";
import { Database } from "bun:sqlite";
import { PromiseResultType } from "../result-type.js";
import { BaseSqliteConvoNodeStore, BaseSqliteConvoNodeStoreOptions } from "./BaseSqliteConvoNodeStore.js";

export interface BunSqliteConvoNodeStoreOptions extends BaseSqliteConvoNodeStoreOptions
{
    /**
     * Path to database on disk. If not defined in memory db will be used
     */
    dbPath?:string;

    initSchema?:boolean;
}

export class BunSqliteConvoNodeStore extends BaseSqliteConvoNodeStore
{

    private readonly dbPath?:string;
    private readonly db:Database;

    public constructor({
        dbPath,
        initSchema,
        ...baseProps
    }:BunSqliteConvoNodeStoreOptions){
        super(baseProps);
        this.dbPath=dbPath;
        this.db=new Database(dbPath||'');
        this.db.run("PRAGMA foreign_keys = ON;");
        this.db.run("PRAGMA journal_mode = WAL;");
        if(!dbPath || !initSchema){
            this.createSchema();
        }
    }

    protected override async execSqlAsync(sql: string, bind:any[]=[]): PromiseResultType<any[]> {
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

    private createSchema()
    {
        const sql=this.getSchemaStatements();
        for(const s of sql){
            this.execSql(s);
        }
    }

}