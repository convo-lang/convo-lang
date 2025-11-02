import { convoStdImportPrefix } from "./convo-lib.js";
import { ConvoImport, ConvoModule } from "./convo-types.js";

export const getStdConvoImportAsync=async (name:string):Promise<ConvoModule|undefined>=>{
    if(name.startsWith(convoStdImportPrefix)){
        name=name.substring(convoStdImportPrefix.length);
    }
    return (
        (await import('./make/convo-make-convo-exports.js')).convoMakeExports(name)
    )
}

export const convoStdImportHandler=async (_import:ConvoImport):Promise<ConvoModule|undefined>=>{
    if(!_import.name.startsWith(convoStdImportPrefix)){
        return undefined;
    }
    return await getStdConvoImportAsync(_import.name);
}
