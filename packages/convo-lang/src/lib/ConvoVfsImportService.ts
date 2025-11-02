import { getUriProtocol } from "@iyio/common";
import { VfsDirReadRecursiveOptions, vfs } from "@iyio/vfs";
import { ConvoImport, ConvoImportService, ConvoModule } from "./convo-types.js";

export class ConvoVfsImportService implements ConvoImportService
{
    public canImport(path:string):boolean
    {
        const proto=getUriProtocol(path);
        return !proto || proto==='file';
    }

    public async handleImport(_import:ConvoImport):Promise<ConvoModule|ConvoModule[]|null>{
        const path=_import.targetPath??_import.name;
        if(path.includes('*')){
            let rOptions:VfsDirReadRecursiveOptions|undefined;
            if(path.includes('**')){
                const [p,f]=path.split('**');
                rOptions=f?{path:p||'/',filter:{endsWith:f}}:undefined;
            }

            const items=await (rOptions?vfs().readDirRecursiveAsync(rOptions):vfs().readDirAsync(path));
            return await Promise.all(items.items.filter(i=>i.type==='file').map<Promise<ConvoModule>>(async i=>{
                const isConvo=i.name?.toLowerCase().endsWith('.convo');
                const file=await vfs().readStringAsync(i.path);
                return {
                    name:i.path,
                    convo:isConvo?file:undefined,
                    content:isConvo?undefined:file,
                    filePath:i.path
                }
            }));
        }else{

            const isConvo=_import.name?.toLowerCase().endsWith('.convo');
            const file=await vfs().readStringAsync(path);
            return {
                name:_import.name,
                convo:isConvo?file:undefined,
                content:isConvo?undefined:file,
                filePath:path
            }
        }
    }
}
