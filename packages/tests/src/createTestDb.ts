import { HttpConvoCompletionService } from "@convo-lang/convo-lang";
import { BunSqliteConvoDb } from "@convo-lang/db-bun/BunSqliteConvoDb.js";
import { NodeSQLiteConvoDb } from "@convo-lang/db-node/NodeSQLiteConvoDb.js";
import { InMemoryConvoDb } from "@convo-lang/db/InMemoryConvoDb.js";
import { uuid } from "@iyio/common";

export type DbType='bun-sqlite'|'node'|'mem'|'http';


export const createTestDb=(type:DbType)=>{
    return (type==='http'?
        new HttpConvoCompletionService({endpoint:"http://localhost:7222/api/convo-lang",dbName:uuid()})
    :type==='bun-sqlite'?
        new BunSqliteConvoDb({name:'default'})
    :type==='node'?
        new NodeSQLiteConvoDb({name:'default'})
    :
        new InMemoryConvoDb({name:'default'}))
}