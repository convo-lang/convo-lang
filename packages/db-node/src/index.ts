import { ConvoDbConnectionStringHandler } from "@convo-lang/convo-lang";
import { getFileName } from "@iyio/common";
import { NodeSQLiteConvoDb } from "./NodeSQLiteConvoDb.js";

export const sqlite:ConvoDbConnectionStringHandler=(type,_args)=>{
    if(!globalThis.Bun || (type!=='node-sqlite' && type!=='sqlite' && type!=='sql')){
        return null;
    }
    return (name:string)=>new NodeSQLiteConvoDb({dbPath:name,name:getFileName(name)});
}