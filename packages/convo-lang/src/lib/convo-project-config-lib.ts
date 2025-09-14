import { joinPaths, normalizePath } from "@iyio/common";
import { vfs, VfsCtrl } from "@iyio/vfs";
import { ConvoProjectConfig } from "./convo-types.js";

export interface LoadConfigProjectConfigOptions
{
    basePath?:string;
    filename?:string;
    maxParentDepth?:number;
    vfs?:VfsCtrl;
}

export const loadConvoProjectConfigFromVfsAsync=async ({
    basePath='.',
    filename='convo-config.json',
    maxParentDepth=255,
    vfs:vfsCtrl=vfs(),
}:LoadConfigProjectConfigOptions):Promise<ConvoProjectConfig|undefined>=>{
    basePath=normalizePath(basePath);
    let depth=0;
    while(depth<maxParentDepth){
        const configPath=joinPaths(basePath,filename);
        if(await vfsCtrl.getItemAsync(configPath)){
            const config=await vfsCtrl.readObjectAsync<ConvoProjectConfig>(configPath);
            if(config){
                config.path=basePath;
                return config;
            }
        }

        if(!basePath || basePath==='.' || basePath==='/'){
            break;
        }

        basePath=normalizePath(joinPaths(basePath,'..'));
        depth++;
    }
    return undefined;
}
