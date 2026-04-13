import { ConvoDbMap, ResultType } from "@convo-lang/convo-lang";
import { BunSqliteConvoNodeStore } from "./BunSqliteConvoNodeStore.js";
import { InMemoryConvoNodeStore } from "./InMemoryConvoNodeStore.js";

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
                let db:InMemoryConvoNodeStore|undefined;
                mapped[name]=()=>(noCache?null:db)??(db=new InMemoryConvoNodeStore());
                break;
            }

            case 'sqlite':{
                let db:BunSqliteConvoNodeStore|undefined;
                mapped[name]=()=>(noCache?null:db)??(db=new BunSqliteConvoNodeStore({dbPath:args[0]}));
                break;
            }
        }
    }

    return {
        success:true,
        result:mapped,
    };
}