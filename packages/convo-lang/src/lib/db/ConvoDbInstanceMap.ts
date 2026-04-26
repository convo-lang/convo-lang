import { convoDbService } from "../convo.deps.js";
import { ConvoDb, ConvoDbMap } from "./convo-db-types.js";

export class ConvoDbInstanceMap
{

    public readonly dbMap?:ConvoDbMap;

    public constructor(dbMap?:ConvoDbMap)
    {
        this.dbMap=dbMap;
    }

    public getDb(name:string):ConvoDb|undefined{
        if(!this.dbMap){
            return name==='default'?convoDbService.get():undefined;
        }
        const named=this.dbMap[name];
        if(named){
            return named(name);
        }
        const fallback=this.dbMap['*'];
        if(fallback){
            let db=fallback(name);
            this.dbMap[name]=()=>db;
            return db;
        }
        return undefined;
    }
}