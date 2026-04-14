import { convoStdImportPrefix } from "./convo-lib.js";
import { ConvoImport, ConvoModule } from "./convo-types.js";

export const getStdConvoImportAsync=async (name:string):Promise<ConvoModule|undefined>=>{
    if(name.startsWith(convoStdImportPrefix)){
        name=name.substring(convoStdImportPrefix.length);
    }
    switch(name){
        
        case 'make.convo':
            return (await import('./make/convo-make-convo-exports.js')).convoMakeExports(name);

        case 'db.convo':
        case 'db-extern-functions.convo':
            return (await import('./db/convo-db-convo-exports.js')).convoDbExports(name);

        default:
            return undefined;
    }
}

export const convoStdImportHandler=async (_import:ConvoImport):Promise<ConvoModule|undefined>=>{
    if(!_import.name.startsWith(convoStdImportPrefix)){
        return undefined;
    }
    return await getStdConvoImportAsync(_import.name);
}
