import { ConvoImport, ConvoImportService, ConvoImportTest, ConvoModule, ConvoScopeFunction } from "@convo-lang/convo-lang";
import { CancelToken, getDirectoryName, getFileName, getFileNameNoExt, joinPaths, uuid } from "@iyio/common";
import { pathExistsAsync, readFileAsStringAsync, spawnAsync } from "@iyio/node-common";
import { writeFile } from "fs/promises";
import { Project } from "ts-morph";
import { convertConvoInterfacesAsync } from "./convo-interface-converter";

export class ConvoTsToolImportService implements ConvoImportService
{
    public priority=undefined;
    public canImport(path:string,importTest:ConvoImportTest):boolean{
        return path.toLowerCase().endsWith('.ts') && importTest.modifiers.includes('tools');
    }

    public async handleImport(_import:ConvoImport){
        return await this.parseFileAsync(_import);
    }

    private async parseFileAsync(_import:ConvoImport):Promise<ConvoModule>{
        const targetPath=_import.targetPath;
        if(!targetPath){
            throw new Error('Import as no targetPath')
        }
        const tsConfig=await getTsConfigAsync(getDirectoryName(targetPath),400);
        if(!tsConfig){
            throw new Error('No tsconfig file found');
        }
        const project=new Project({tsConfigFilePath:tsConfig});
        const file=project.getSourceFile(targetPath);

        const projects=await convertConvoInterfacesAsync({
            syncTsConfig:[tsConfig],
            syncOut:targetPath+'.ts-tools.convo',
            noOut:true,
            allExports:true,
            targetSourceFiles:[targetPath]
        },new CancelToken());

        const externScopeFunctions:Record<string,ConvoScopeFunction>={};
        for(const p of projects){
            for(const mod of p.mods){
                if(mod.externFunctions){
                    for(const n in mod.externFunctions){
                        externScopeFunctions[n]=async (scope)=>{
                            const id=uuid();
                            const tmpPath=targetPath+`.tmp-call-${id}.ts`;
                            const tag=`"""'''${id}__________TOOL_CALL_RESULT_${id}`
                            const src=(
`import { ${n} as _callTarget } from './${getFileNameNoExt(targetPath)}';
(async ()=>{
    try{
        const r=await _callTarget(${(scope.paramValues??[]).map(p=>JSON.stringify(p)).join(',')});
        console.log(${JSON.stringify(tag)}+JSON.stringify({result:r}));
    }catch(ex){
        console.log(${JSON.stringify(tag)}+JSON.stringify({error:ex}));
    }
})()`
                            );
                            try{
                                await writeFile(tmpPath,src);
                                const r=await spawnAsync({
                                    cwd:getDirectoryName(tmpPath),
                                    cmd:`bun ${getFileName(tmpPath)}`
                                });
                                const t=r.lastIndexOf(tag);
                                if(t===-1){
                                    throw new Error('Unable to find output tag');
                                }
                                const result=JSON.parse(r.substring(t+tag.length));
                                if(result.result){
                                    return result.result;
                                }
                                throw new Error(result.error??'Unexpected return');
                            }finally{
                                // todo - delete tmpPath
                            }
                        }
                    }
                }
            }
        }
        return {
            name:_import.name,
            convo:projects.map(p=>p.mods.map(m=>m.convo).join('\n\n')).join('\n\n'),
            externScopeFunctions,
            sourceContent:await readFileAsStringAsync(targetPath)
        }
    }
    


}

const getTsConfigAsync=async (dir:string,max:number)=>{
    const ts=joinPaths(dir,'tsconfig.json');
    if(await pathExistsAsync(ts)){
        return ts;
    }
    dir=getDirectoryName(dir);
    if(!dir || dir==='.' || dir==='/' || dir==='./' || max<=0){
        return undefined;
    }
    return await getTsConfigAsync(dir,max-1);
}