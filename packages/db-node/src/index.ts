import { ConvoDbConnectionStringHandler } from "@convo-lang/convo-lang";
import { getFileName } from "@iyio/common";
import { NodeFsConvoDb } from "./NodeFsConvoDb.js";
import { NodeSqliteConvoDb } from "./NodeSqliteConvoDb.js";

export const sqlite:ConvoDbConnectionStringHandler=(type,_args)=>{
    if(!globalThis.Bun || (type!=='node-sqlite' && type!=='sqlite' && type!=='sql')){
        return null;
    }
    return (name:string)=>new NodeSqliteConvoDb({dbPath:name,name:getFileName(name)});
}

export const fs:ConvoDbConnectionStringHandler=(type,_args)=>{
    if(!globalThis.Bun || (type!=='fs' && type!=='node-fs')){
        return null;
    }
    return (name:string)=>new NodeFsConvoDb({root:name,name:getFileName(name)});
}