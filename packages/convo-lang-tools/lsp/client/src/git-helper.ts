import { Extension, extensions } from "vscode";
import { API as BuiltInGitApi, GitExtension } from './git.js';

export const isIgnoredAsync=async (path:string):Promise<boolean>=>{
    const api=await getBuiltInGitApiAsync();
    if(!api){
        return false;
    }
    const repo=api.repositories?.[0];
    if(!repo){
        return false;
    }

    const ignored=await repo.checkIgnore([path]);

    return ignored.size?true:false;

}

export const getBuiltInGitApiAsync=async ():Promise<BuiltInGitApi|undefined>=>{
    try{
        const extension=extensions.getExtension('vscode.git') as Extension<GitExtension>;
        if(extension!==undefined){
            const gitExtension=extension.isActive?extension.exports:await extension.activate();
            return gitExtension.getAPI(1);
        }else{
            return undefined;
        }
    }catch{
        return undefined;
    }
}
