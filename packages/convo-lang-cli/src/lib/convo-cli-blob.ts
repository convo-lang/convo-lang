import { ConvoDbInstanceMap } from "@convo-lang/convo-lang";
import { joinPaths } from "@iyio/common";
import { pathExistsAsync } from "@iyio/node-common";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { Readable } from "node:stream";
import { ConvoCliOptions } from "./convo-cli-types";

export const loadCliDbBlobsAsync=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions)=>{
    if(!options.loadDbBlob?.length){
        return;
    }
    const pairs=options.loadDbBlob;
    for(let i=0;i<pairs.length;i++){
        const p=pairs[i];
        if(!p){
            continue;
        }
        
        const [dbName,localPath,...pathAry]=p.split(':');

        if(localPath?.endsWith('/*')){

            const dir=localPath.substring(0,localPath.length-2);
            if(!pathExistsAsync(dir)){
                continue;
            }
            pairs.splice(i,1);
            const items=await readdir(dir,{withFileTypes:true});
            for(let x=0;x<items.length;x++){
                const item=items[x];
                if(!item){
                    break;
                }
                const path=joinPaths(item.parentPath,item.name);
                pairs.splice(i+x,0,`${dbName}:${path}:${joinPaths(pathAry.join(':'),item.name)}`);
            }
            i--;
            continue;
        }

        if(!dbName){
            console.error('Expected a dbName');
            process.exit(1);
        }

        if(!localPath){
            console.error('local path required');
            process.exit(1);
        }

        const db=await dbMap.getDbAsync(dbName);
        if(!db){
            console.log(`No database found by name: ${dbName}`);
            process.exit(1);
        }
        const stream=createReadStream(localPath);
        const path=pathAry.join(':');
        const r=await db.writeBlobAsync(path,Readable.toWeb(stream) as any);
        if(r.success){
            console.log(`Load blob:${dbName}, ${localPath} -> ${path}`);
        }else{
            console.error(`Failed to load file into db: ${localPath} -> ${path}`);
            process.exit(1);
        }
    }
}

export const deleteCliDbBlobsAsync=async (dbMap:ConvoDbInstanceMap,options:ConvoCliOptions)=>{
    const pairs=options.loadDbBlob;
    if(!pairs?.length){
        return;
    }
    for(const p of pairs){
        const [dbName,...pathAry]=p.split(':');

        if(!dbName){
            console.error('Expected a dbName');
            process.exit(1);
        }

        const path=pathAry.join('');
        if(!path){
            console.error('path required');
            process.exit(1);
        }

        const db=await dbMap.getDbAsync(dbName);
        if(!db){
            console.log(`No database found by name: ${dbName}`);
            process.exit(1);
        }
        const r=await db.deleteNodeAsync(pathAry.join(':'));

        if(r.success){
            console.log(`Delete blob:${dbName}, ${path}`);
        }else{
            console.error(`Failed to load file into db: ${dbName}: ${path}`);
            process.exit(1);
        }
    }
}