import { convoDbProvider } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";

export const convoDbModule=(scope:ScopeRegistration)=>{

    scope.implement(convoDbProvider,()=>async (connectionString?:string)=>{
        const {InMemoryConvoDb}=await import('./InMemoryConvoDb.js');
        return new InMemoryConvoDb();
    },'mem');

    scope.implement(convoDbProvider,()=>async (connectionString?:string)=>{
        if(globalThis.Bun){
            const {BunSqliteConvoDb}=await import('./BunSqliteConvoDb.js');
            return BunSqliteConvoDb.fromConnectionString(connectionString);
        }else{
            const {NodeSQLiteConvoDb}=await import('./NodeSQLiteConvoDb.js');
            return NodeSQLiteConvoDb.fromConnectionString(connectionString);
        }
        
    },'sqlite');

}