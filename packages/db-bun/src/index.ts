import { ConvoDbConnectionStringHandler } from "@convo-lang/convo-lang";
import { getFileName } from "@iyio/common";
import { BunSqliteConvoDb } from "./BunSqliteConvoDb.js";

export const sqlite:ConvoDbConnectionStringHandler=(type,_args)=>{
    if(!globalThis.Bun || (type!=='bun-sqlite' && type!=='sqlite' && type!=='sql')){
        return null;
    }
    return (name:string)=>new BunSqliteConvoDb({dbPath:name,name:getFileName(name)});
}