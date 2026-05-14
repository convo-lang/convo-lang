import { convoDbProvider } from "../convo.deps.js";
import { ConvoDb } from "./convo-db-types.js";

export const getConvoDbUsingConnectionStringAsync=async (connection:string):Promise<ConvoDb|undefined>=>{
    const [name,type,...args]=connection.split(':');
    if(!type || !name){
        return undefined;
    }
    const r=await convoDbProvider.get(type)?.(type,args);
    return r?.(name);
}