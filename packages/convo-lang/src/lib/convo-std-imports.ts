import { convoStdImportPrefix } from "./convo-lib";
import { ConvoImport, ConvoModule } from "./convo-types";

export const getStdConvoImportAsync=async (name:string):Promise<ConvoModule|undefined>=>{
    if(name.startsWith(convoStdImportPrefix)){
        name=name.substring(convoStdImportPrefix.length);
    }
    return (
        (await import('./make/convo-make-convo-exports')).convoMakeExports(name)
    )
}

export const convoStdImportHandler=async (_import:ConvoImport):Promise<ConvoModule|undefined>=>{
    if(!_import.name.startsWith(convoStdImportPrefix)){
        return undefined;
    }
    return await getStdConvoImportAsync(_import.name);
}
