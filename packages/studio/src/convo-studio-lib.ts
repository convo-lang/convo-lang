import { areShallowEqual, getFileName, joinPaths, normalizePath, queryParamsToObject } from "@iyio/common";
import { StudioDocTask, StudioUri } from "./convo-studio-types.js";

export const defaultStudioDocTask='edit' satisfies StudioDocTask;

/**
 * Parses a URI relative to an optional workspace path.
 * @param uri URI to parse
 * @param workspacePath Absolute path to workspace. I provided all relative file paths will be considered relative to the workspace path.
 */
export const parseStudioUri=(uri:string|StudioUri|null|undefined,workspacePath?:string):StudioUri|undefined=>
{
    if(!uri){
        return undefined;
    }

    if(typeof uri === 'object'){
        return uri;
    }

    const match=uriReg.exec(uri);
    if(!match){
        return undefined;
    }
    const protocol=match.groups?.['protocol']??'file';
    const path=match.groups?.['path'];
    const query=match.groups?.['query'];
    if(!path){
        return undefined;
    }
    const q=uri.indexOf('?');

    const u:StudioUri={
        basename:getFileName(path),
        uri,
        uriBase:q===-1?uri:uri.substring(0,q),
        protocol,
        path,
    }

    if(query){
        u.queryParams=queryParamsToObject(query);
    }

    if(workspacePath && !workspacePath.endsWith('/')){
        workspacePath+='/';
    }

    if(protocol==='http' || protocol==='https'){
        const i=u.path.indexOf('/');
        u.pathIsAbsolute=true;
        if(i===-1){
            u.domain=u.path;
            u.path='/';
        }else{
            u.domain=u.path.substring(0,i);
            u.path=u.path.substring(i);
        }
    }else if(protocol==='file'){
        u.path=normalizePath(u.path);
        if(path.startsWith('/')){
            u.pathIsAbsolute=true;
            if(workspacePath && u.path.startsWith(workspacePath)){
                u.workspacePath=u.path.substring(workspacePath.length);
            }
        }else{
            if(workspacePath){
                u.workspacePath=u.path;
                u.path=joinPaths(workspacePath,u.path);
                u.pathIsAbsolute=true;
            }
        }
    }

    return u;
}

const uriReg=/^((?<protocol>\w+):\/\/)?(?<path>[^\?]+)(\?(?<query>.*))?$/;

export const areStudioUrisEqual=(a:StudioUri|null|undefined,b:StudioUri|null|undefined):boolean=>{
    if((a??null)===(b??null)){
        return true;
    }
    if(!a || !b){
        return false;
    }
    return (
        a.path===b.path &&
        a.protocol===b.protocol &&
        a.domain===b.domain &&
        a.workspacePath===b.workspacePath &&
        areShallowEqual(a.queryParams,b.queryParams)
    )
}
