import { ConvoDbFunction, ConvoDbInstanceMap } from "@convo-lang/convo-lang";
import { getDirectoryName, getFileNameNoExt, joinPaths } from "@iyio/common";
import { spawnAsync } from "@iyio/node-common";
import { readdir } from "fs/promises";
import { ConvoCliOptions } from "./convo-cli-types";

export const loadCliDbFunctionsAsync=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions)=>{
    const list=options.loadDbFunction;
    if(!list?.length){
        return;
    }

    const loads:LoadItem[]=[];
    await Promise.all(list.map(async line=>{
        const item=parseLoadItem(line);
        if(item.src.endsWith('*')){
            const dir=getDirectoryName(item.src);
            const items=await readdir(dir,{withFileTypes:true});
            for(const di of items){
                if(di.isFile() && (di.name.toLowerCase().endsWith('.ts') || di.name.toLowerCase().endsWith('.js'))){
                    loads.push({
                        ...item,
                        path:joinPaths(item.path,getFileNameNoExt(di.name)),
                        src:joinPaths(di.parentPath,di.name),
                    });
                }
            }
        }else{
            loads.push(item);
        }
    }));


    while(loads.length){
        const batch=loads.splice(0,4);
        await Promise.all(batch.map(async (item)=>{
            const cmd=`dbFunctionSrcFilePath=${JSON.stringify(item.src)}; ${options.dbFunctionBundleCommand??'bun build "$dbFunctionSrcFilePath"'}`;
            console.log(`Build db function: ${cmd}`);
            let src=await spawnAsync({cmd,silent:true});
            if(options.loadDbFunctionDropExport){
                const ei=src.lastIndexOf('export');
                if(ei!==-1){
                    src=src.substring(0,ei);
                }
            }

            const db=dbMap.getDb(item.dbName);
            if(!db){
                throw new Error(`Unable to get database by name: ${item.dbName}`);
            }
            const existingR=await db.getNodeByPathAsync(item.path);
            if(!existingR.success){
                throw new Error(existingR.error);
            }

            const existing=existingR.result;
            const data={
                isExecutable:true,
                function:{
                    format:'js',
                    effects:'readWrite',
                    main:src,
                } satisfies ConvoDbFunction
            }
            if(existing){
                await db.updateNodeAsync({
                    path:item.path,
                    data,
                },{mergeData:false});
            }else{
                await db.insertNodeAsync({
                    path:item.path,
                    type:'function',
                    data,
                })
            }

            console.log(`${existing?'updated':'inserted'} function: ${item.dbName}:${item.path}:${item.src}, ${Math.ceil(src.length/1000)}kb`);

        }));
    }
}

const parseLoadItem=(line:string):LoadItem=>{
    const [dbName,path,src]=line.split(':');
    if(!dbName){
        throw new Error('dbName required');
    }
    if(!path){
        throw new Error('path required');
    }
    if(!src){
        throw new Error('src required');
    }
    return {dbName,path,src};
}

interface LoadItem
{
    dbName:string;
    path:string;
    src:string;
}