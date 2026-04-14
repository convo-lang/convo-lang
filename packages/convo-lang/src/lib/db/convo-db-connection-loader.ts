import { convoDbProvider } from "../convo.deps.js";
import { ConvoDb } from "./convo-db-types.js";

export const getConvoDbUsingConnectionStringAsync=async (connection:string):Promise<ConvoDb|undefined>=>{
    const i=connection.indexOf(':');
    const tag=i===-1?connection:connection.substring(0,i).trim();
    let con=i===-1?undefined:connection.substring(i+1).trim();
    return await convoDbProvider.get(tag)?.(con);   
}