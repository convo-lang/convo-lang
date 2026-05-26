import { HttpConvoCompletionService } from "@convo-lang/convo-lang";
import { BunSqliteConvoDb } from "@convo-lang/db-bun/BunSqliteConvoDb.js";
import { NodeFsConvoDb } from "@convo-lang/db-node/NodeFsConvoDb.js";
import { NodeSqliteConvoDb } from "@convo-lang/db-node/NodeSQLiteConvoDb.js";
import { IndexDbConvoDb } from "@convo-lang/db/IndexDbConvoDb.js";
import { InMemoryConvoDb } from "@convo-lang/db/InMemoryConvoDb.js";
import { LocalStorageConvoDb } from "@convo-lang/db/LocalStorageConvoDb.js";
import { LocalStorageConvoDbInfMock } from "@convo-lang/db/LocalStorageConvoDbInfMock.js";
import { uuid } from "@iyio/common";
import { indexedDB as fakeIndexedDB } from "fake-indexeddb";

export type DbType='bun-sqlite'|'node-sqlite'|'mem'|'http'|'fs'|'local-storage'|'index-db';
export const defaultTestDbType='fs' satisfies DbType;


export const createTestDb=(type=defaultTestDbType)=>{
    return (type==='http'?
        new HttpConvoCompletionService({endpoint:"http://localhost:7222/api/convo-lang",dbName:uuid()})
    :type==='bun-sqlite'?
        new BunSqliteConvoDb({name:'default'})
    :type==='node-sqlite'?
        new NodeSqliteConvoDb({name:'default'})
    :type==='fs'?
        new NodeFsConvoDb({name:'default',root:`./data/fs-dbs/${uuid()}`})
    :type==='local-storage'?
        new LocalStorageConvoDb({name:'default',inf:new LocalStorageConvoDbInfMock()})
    :type==='index-db'?
        new IndexDbConvoDb({name:uuid(),openDb:(name,version)=>fakeIndexedDB.open(name,version)})
    :
        new InMemoryConvoDb({name:'default'}))
}