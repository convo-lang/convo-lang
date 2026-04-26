import { ConvoDbInstanceMap, ConvoNode, ConvoNodeQuery, ConvoNodeQueryKeysToSelection, ConvoNodeQueryResult, PromiseResultType } from "@convo-lang/convo-lang";
import { parseJson5 } from "@iyio/json5";
import { ConvoCliOptions } from "./convo-cli-types";

export const executeCliConvoDbCommands=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions)=>{

    const query=options.executeDbCommands;
    if(!query){
        return;
    }

    
    if(!query.dbName){
        throw new Error('query must define dbName');
    }

    const db=dbMap.getDb(query.dbName);
    if(!db){
        throw new Error(`Db not found by name ${query.dbName}`);
    }

    return await db.executeCommandsAsync(query.commands);
}

export const executeCliConvoDbQuery=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions):PromiseResultType<ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<'*'>>>=>{

    const query=options.queryDb;
    if(!query){
        return {
            success:false,
            error:'queryDb not defined',
            statusCode:400
        }
    }

    
    if(!query.dbName){
        throw new Error('query must define dbName');
    }

    const db=dbMap.getDb(query.dbName);
    if(!db){
        throw new Error(`Db not found by name ${query.dbName}`);
    }

    delete (query as any).dbName;

    const nodes:Partial<ConvoNode>[]=[];
    let nextToken=query.nextToken;
    while(true){
        const r=await db.queryNodesAsync({...query,nextToken});
        if(!r.success){
            return r;
        }
        nodes.push(...r.result.nodes);
        nextToken=r.result.nextToken;
        if(!nextToken){
            break;
        }
    }
    return {
        success:true,
        result:{
            nodes:nodes as any
        }
    }
}

export const executeCliCallConvoDbFunction=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions)=>{

    const call=options.callDbFunction;
    if(!call){
        return;
    }

    const [dbName,path]=call.split(':');
    if(!dbName){
        throw new Error('dbName required by db function call');
    }
    if(!path){
        throw new Error('path required by db function call');
    }

    const db=dbMap.getDb(dbName);
    if(!db){
        throw new Error(`Db not found by name ${dbName}`);
    }

    return await db.queryNodesAsync({
        steps:[{
            path,
            call:{args:options.callDbFunctionArgs}
        }]
    });
}

export const parseQuery=(q:string)=>{
    if(q[0]==='{'){
        return parseJson5(q);
    }else{
        const [dbName,path]=q.split(':');
        if(!dbName || !path){
            console.error('Expected: `[dbName]:[path]`');
            process.exit(1);
        }
        return {
            steps:[{path}],
            dbName,
        } satisfies ConvoNodeQuery&{dbName:string};
    }
}