import { ConvoImport, ConvoImportService, ConvoModule } from "@convo-lang/convo-lang";
import { escapeRegex, getUriProtocol } from "@iyio/common";
import { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

/**
 * Directories skipped when matching globs
 */
const ignoredDirs=new Set(['node_modules','.git','venv']);

/**
 * Imports files from the local file system. Glob paths are supported where `*` matches within a
 * directory and `**` matches any depth.
 */
export class ConvoFsImportService implements ConvoImportService
{
    public canImport(path:string):boolean
    {
        const proto=getUriProtocol(path);
        return !proto || proto==='file';
    }

    public async handleImport(_import:ConvoImport):Promise<ConvoModule|ConvoModule[]|null>
    {
        const path=_import.targetPath??_import.name;
        if(!path.includes('*')){
            return await loadModuleAsync(path,_import.name,_import.sourceDirectory);
        }

        const files=await matchGlobAsync(path);
        return await Promise.all(files.map(f=>loadModuleAsync(f,f,_import.sourceDirectory)));
    }
}

const loadModuleAsync=async (filePath:string,name:string,sourceDirectory:string|undefined):Promise<ConvoModule>=>{
    const isConvo=filePath.toLowerCase().endsWith('.convo');
    const file=await readFile(filePath,'utf8');
    return {
        name,
        convo:isConvo?file:undefined,
        content:isConvo?undefined:file,
        filePath,
        relativeName:relative(resolve(sourceDirectory??'.'),resolve(filePath)).split(sep).join('/'),
    };
}

/**
 * Returns the sorted paths of all files matching the glob path. The static part of the path
 * before the first segment containing a `*` is used as the base directory.
 */
const matchGlobAsync=async (globPath:string):Promise<string[]>=>{
    const parts=globPath.split(/[\\/]/);
    const globStart=parts.findIndex(p=>p.includes('*'));
    const baseParts=parts.slice(0,globStart);
    const base=baseParts.length?(baseParts.join('/')||'/'):'.';
    const patternParts=parts.slice(globStart);
    const pattern=patternParts.join('/');
    const maxDepth=pattern.includes('**')?Number.POSITIVE_INFINITY:patternParts.length;

    const files:string[]=[];
    await walkAsync(base,'',1,maxDepth,globToRegex(pattern),files);
    return files.sort((a,b)=>a.localeCompare(b));
}

const walkAsync=async (dir:string,rel:string,depth:number,maxDepth:number,reg:RegExp,out:string[]):Promise<void>=>{
    let entries:Dirent[];
    try{
        entries=await readdir(dir,{withFileTypes:true});
    }catch{
        return;
    }
    for(const e of entries){
        const r=rel?`${rel}/${e.name}`:e.name;
        const full=join(dir,e.name);
        if(e.isDirectory()){
            if(depth<maxDepth && !ignoredDirs.has(e.name)){
                await walkAsync(full,r,depth+1,maxDepth,reg,out);
            }
        }else if(e.isFile() && reg.test(r)){
            out.push(full);
        }
    }
}

/**
 * Converts a glob pattern to a regex. `**` followed by a slash matches zero or more directories,
 * `**` matches any characters and `*` matches any characters within a directory.
 */
const globToRegex=(pattern:string):RegExp=>{
    const src=pattern.split(/(\*\*\/|\*\*|\*)/).map(p=>(
        p==='**/'?
            '(?:.*/)?'
        :p==='**'?
            '.*'
        :p==='*'?
            '[^/]*'
        :
            escapeRegex(p)
    )).join('');
    return new RegExp(`^${src}$`);
}
