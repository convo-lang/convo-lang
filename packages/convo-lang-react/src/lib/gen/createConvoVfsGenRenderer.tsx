import { Lock, getFileName, joinPaths, strHashBase64Fs } from "@iyio/common";
import { ErrorBoundary, JsonView } from "@iyio/react-common";
import { vfs } from "@iyio/vfs";
import { GenNode } from "./GenNode.js";
import { GenItemRenderer, GenNodeSuccessState } from "./gen-lib.js";

export interface ConvoGenFile
{
    id:string;
    hash:string;
}
export interface ConvoVfsGenCompReg
{
    files:Record<string,ConvoGenFile>;
}

export type ConvoGenCompRenderer=(id:string)=>any;

export interface ConvoVfsGenRendererOptions
{
    renderer:ConvoGenCompRenderer;
    registry:ConvoVfsGenCompReg;
    componentDir:string;
}
export const createConvoVfsGenRenderer=({
    renderer,
    registry,
    componentDir
}:ConvoVfsGenRendererOptions):GenItemRenderer=>{
    registry={...registry}

    return (item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>{
        if(node.id===undefined){
            const err='Gen component writer used with GenNode without an id'
            console.error(err);
            return err;
        }
        if(typeof item !== 'string'){
            const err='Generated content should be a string containing the code for a React component'
            console.error(err);
            return err;
        }
        item=item.trim()+'\n';
        const fMatch=fenceReg.exec(item);
        if(fMatch){
            item=item.substring(fMatch[0].length).trim();
            if(item.endsWith('```')){
                item=item.substring(0,item.length-3)
            }
            item+='\n';
        }

        const hash=strHashBase64Fs(item);

        const file=registry.files[node.id];
        if(file?.hash!==hash){
            writeFileAsync(componentDir,item,node,registry,hash);
        }


        return (
            <ErrorBoundary key={hash} fallbackWithError={err=><JsonView value={err}/>}>
                {renderer(node.id)}
            </ErrorBoundary>
        )

    }
}

const fenceReg=/^\s*```[^\n]*/

const ext='.generated.tsx';
const updateLock=new Lock(1);

const writeFileAsync=async (componentDir:string,content:string,node:GenNode,registry:ConvoVfsGenCompReg,hash:string)=>{
    const path=joinPaths(componentDir,getFileName(node.id)+ext);
    try{
        await vfs().writeStringAsync(path,content);

        registry.files[node.id??'']={
            id:node.id??'',
            hash
        }

        const release=await updateLock.waitAsync();
        try{
            await updateRegAsync(componentDir,registry);
        }finally{
            release();
        }

    }catch(ex){
        console.error(`Failed to write component to ${path}`,ex);
    }
}

const updateRegAsync=async (componentDir:string,registry:ConvoVfsGenCompReg)=>{
    const regFilename='_component-registry.ts';
    const rendererFilename='_renderer.tsx';
    const regPath=joinPaths(componentDir,regFilename);
    const renderPath=joinPaths(componentDir,rendererFilename);
    const items=await vfs().readDirAsync(componentDir);
    const rendererOut:string[]=[];

    items.items.sort((a,b)=>a.name.localeCompare(b.name));

    rendererOut.push('import { Suspense, lazy } from "react";');
    rendererOut.push('const importMap:Record<string,any>={}')
    for(const item of items.items){
        if(!item.name.endsWith(ext)){
            continue;
        }
        rendererOut.push(`importMap[${JSON.stringify(item.name)}]=lazy(()=>import(${JSON.stringify('./'+item.name.substring(0,item.name.length-4))}));`);
        const id=item.name.substring(0,ext.length);
        const regItem=registry.files[id];
        if(!regItem){
            const content=await vfs().readStringAsync(joinPaths(componentDir,item.name));
            const hash=strHashBase64Fs(content);
            registry.files[id]={id,hash};
        }
    }

    rendererOut.push('export const localConvoVfsGenRenderer=(id:string)=>{');
    rendererOut.push(`    const Comp=importMap[id+"${ext}"];`);
    rendererOut.push('    if(Comp){');
    rendererOut.push('        return <Suspense fallback={<code>Render Error</code>}><Comp/></Suspense>');
    rendererOut.push('    }else{');
    rendererOut.push('        return <code>Component Not Found</code>');
    rendererOut.push('    }');
    rendererOut.push('}');

    await Promise.all([
        vfs().writeStringAsync(regPath,`export const localConvoVfsGenRegistry=${JSON.stringify(registry,null,4)}`),
        vfs().writeStringAsync(renderPath,rendererOut.join('\n')),
    ])


}
