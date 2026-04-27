import { getFileName } from '@iyio/common';
import { file } from 'bun';
import { stat as _stat, access, readdir } from 'fs/promises';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import * as Path from 'path';



interface RedirectRegex
{
    match:RegExp;
    path:string;
    isFallback?:boolean;
}

const pathExistsAsync=async (path:string,embeddedFileMap:Record<string,string>|undefined):Promise<boolean>=>
{
    if(embeddedFileMap){
        return embeddedFileMap[path]?true:false;
    }
    try{
        await access(path);
        return true;
    }catch{
        return false;
    }
}

const defaultExtensions=['.html','.htm'];
const ignore=['node_modules','venv'];
const staticFiles:string[]=[];


async function getRegexRedirectMapAsync(dir:string,embeddedFileMap?:Record<string,string>,exts:string[]=defaultExtensions,ignorePaths?:string[]):Promise<RedirectRegex[]>
{
    
    const map:RedirectRegex[]=[{match:/^\/$/i,path:'/index.html'}];
    await scanRegexAsync(dir,map,exts,'',ignorePaths,embeddedFileMap);
    map.push({match:/^\/index$/i,path:'/index.html'});
    return map;
}

const dynamicReg=/\[[^\]]+\]/g;

const readDirAsync=async (dir:string,embeddedFileMap:Record<string,string>|undefined):Promise<string[]>=>{
    if(!embeddedFileMap){
        return await readdir(dir);
    }
    const r:string[]=[];
    if(dir.startsWith('./')){
        dir=dir.substring(1);
    }else if(dir==='.'){
        dir='/'
    }else if(!dir.startsWith('/')){
        dir='/'+dir;
    }
    if(!dir.endsWith('/')){
        dir+='/';
    }
    for(const e in embeddedFileMap){
        if(!e.startsWith(dir)){
            continue;
        }
        const i=e.indexOf('/',dir.length);
        if(i===-1){
            r.push(getFileName(e.substring(1)));
        }else{
            const subDir=getFileName(e.substring(0,i))+'/';
            if(!r.includes(subDir)){
                r.push(subDir);
            }
        }
    }
    return r;
}

const scanRegexAsync=async (dir:string, map:RedirectRegex[], exts:string[], basePath:string,ignorePaths?:string[],embeddedFileMap?:Record<string,string>)=>
{
    if(await pathExistsAsync(Path.join(dir,'.redirect-map-ignore'),embeddedFileMap)){
        return;
    }

    const items=await readDirAsync(dir,embeddedFileMap);

    for(const item of items){
        const name=item.toLowerCase();
        if(ignore.includes(name)){
            continue;
        }
        const path=Path.join(dir,item);
        if(embeddedFileMap){
            if(item.endsWith('/')){
                await scanRegexAsync(path.substring(0,path.length-1),map,exts,basePath+'/'+item.substring(0,item.length-1),ignorePaths,embeddedFileMap);
            }else{
                staticFiles.push(basePath+'/'+item);
            }
        }else{
            const stat=await _stat(path);
            if(stat.isDirectory()){
                await scanRegexAsync(path,map,exts,basePath+'/'+item,ignorePaths,embeddedFileMap);
            }else if(!basePath.startsWith('/_next/')){
                staticFiles.push(basePath+'/'+item);
            }
        }
        const ext=exts.find(e=>name.endsWith(e));
        if(ext){
            let mPath:string;
            let mBase:string;
            const noExt=name.substring(0,name.length-ext.length);
            if(noExt==='index'){
                mPath=basePath+'/'+item;
                mBase=basePath;
            }else{
                mPath=basePath+'/'+item;
                mBase=basePath+'/'+noExt;
            }
            let lp=mPath.toLowerCase();
            if(!lp.startsWith('/')){
                lp='/'+lp;
            }
            if(mPath==='/index.html' || ignorePaths?.some(p=>lp.startsWith(p.toLocaleLowerCase()))){
                continue;
            }
            let isFallback=false;
            const match=new RegExp('^'+mBase.replace(dynamicReg,v=>{
                if(v.includes('...')){
                    isFallback=true;
                    return '.*';
                }else{
                    return '[^/]+';
                }
            })+'$','i');
            const r:RedirectRegex={
                match,
                path:mPath
            };
            if(isFallback){
                r.isFallback=true;
            }
            map.push(r);
        }
    }
}



const nonA=/\W/;

const toSortStr=(str:string)=>{
    const chars:string[]=[];
    for(let i=0;i<str.length;i++){
        const c=str.charAt(i)??'_';
        chars.push(nonA.test(c)?'b':'a');
        chars.push(c);
    }
    return chars.join('');
}

export const getStaticHonoRoutesAsync=async (app:Hono,root:string,embeddedFileMap?:Record<string,string>)=>{
    
    const redirects=await getRegexRedirectMapAsync(root,embeddedFileMap);
    redirects.sort((a,b)=>toSortStr(a.path).localeCompare(toSortStr(b.path)))
    console.log('routes',redirects);

    const rewriteRequestPath=(path:string)=>{
        if(path.startsWith('/_next/') || staticFiles.includes(path)){
            return path;
        }
        for(let i=0;i<redirects.length;i++){
            const r=redirects[i] as RedirectRegex;
            if(r.match.test(path)){
                return r.path;
            }
        }
        return path;
    }

    if(embeddedFileMap){
        let r=root;
        if(r.startsWith('./')){
            r=r.substring(1);
        }else if(!r.startsWith('/')){
            r='/'+r;
        }
        app.get(':path{.+}?', c=>{
            const path=rewriteRequestPath('/'+c.req.param('path'));

            const f=embeddedFileMap[r+path];
            if(!f){
                return c.notFound();
            }

            return new Response(file(f),{status:200});
        });

    }else{
        app.use('/*', serveStatic({ 
            root,
            rewriteRequestPath,
        }));
    }
}