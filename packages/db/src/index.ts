import { ConvoDbConnectionStringHandler } from "@convo-lang/convo-lang";
import { InMemoryConvoDb } from "./InMemoryConvoDb.js";

export const inMemory:ConvoDbConnectionStringHandler=(type,_args)=>{
    if(type!=='mem'){
        return null;
    }
    return (name:string)=>new InMemoryConvoDb({name});
}