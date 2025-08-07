import { httpClient, isHttp } from "@iyio/common";
import { ConvoImport, ConvoImportService, ConvoModule } from "./convo-types";

export class ConvoHttpImportService implements ConvoImportService
{
    public canImport(path:string):boolean
    {
        return isHttp(path);
    }

    public async handleImport(_import:ConvoImport):Promise<ConvoModule|ConvoModule[]|null>{
        const path=_import.targetPath??_import.name;
        const isConvo=path?.toLowerCase().endsWith('.convo');
        const file=await httpClient().getStringAsync(path);
        return {
            name:_import.name,
            convo:isConvo?file:undefined,
            content:isConvo?undefined:file,
            filePath:path
        }
    }
}
