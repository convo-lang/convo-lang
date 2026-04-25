import { HttpConvoCompletionService } from "@convo-lang/convo-lang";
import { BunSqliteConvoDb } from "@convo-lang/db/BunSqliteConvoDb.js";
import { InMemoryConvoDb } from "@convo-lang/db/InMemoryConvoDb.js";
import { NodeSQLiteConvoDb } from "@convo-lang/db/NodeSQLiteConvoDb.js";
import { uuid } from "@iyio/common";

export type DbType='bun-sqlite'|'node'|'mem'|'http';


export const createTestDb=(type:DbType)=>{
    return (type==='http'?
        new HttpConvoCompletionService({endpoint:"http://localhost:7222/api/convo-lang",dbName:uuid()})
    :type==='bun-sqlite'?
        new BunSqliteConvoDb({})
    :type==='node'?
        new NodeSQLiteConvoDb({})
    :
        new InMemoryConvoDb({}))
}