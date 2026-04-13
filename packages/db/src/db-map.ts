import { ConvoDbMap, ResultType } from "@convo-lang/convo-lang";
import { BunSqliteConvoDb } from "./BunSqliteConvoDb.js";
import { InMemoryConvoDb } from "./InMemoryConvoDb.js";

export const getConvoDbMapFromStrings=(mappings:string[]):ResultType<ConvoDbMap>=>{
    const mapped:ConvoDbMap={};

    for(const map of mappings){
        const [name,type,...args]=map.split(':');
        if(!name || !type){
            continue;
        }
        const noCache=name==='*';
        switch(type){
            
            case 'mem':{
                let db:InMemoryConvoDb|undefined;
                mapped[name]=()=>(noCache?null:db)??(db=new InMemoryConvoDb());
                break;
            }

            case 'sqlite':{
                let db:BunSqliteConvoDb|undefined;
                mapped[name]=()=>(noCache?null:db)??(db=new BunSqliteConvoDb({dbPath:args[0]}));
                break;
            }
        }
    }

    return {
        success:true,
        result:mapped,
    };
}