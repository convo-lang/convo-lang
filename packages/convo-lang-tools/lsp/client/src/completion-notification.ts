import * as path from 'path';
import { TextDocument, window, workspace } from 'vscode';
import { revealDocumentEndAsync } from './util.js';

/**
 * Displays a notification with an Open button when a completion finishes for a document that is
 * not in the active text editor. Clicking Open shows the document in the editor group it is
 * already visible in, or the active group, and scrolls it to the end of the document.
 */
export const notifyCompletionAsync=async (document:TextDocument):Promise<void>=>{
    if(!workspace.getConfiguration('convo').get<boolean>('notifyOnCompletion',true)){
        return;
    }

    const uri=document.uri.toString();
    if(window.activeTextEditor?.document.uri.toString()===uri){
        return;
    }

    const action=await window.showInformationMessage(
        `Completion finished: ${path.basename(document.fileName)}`,
        'Open',
    );
    if(action!=='Open'){
        return;
    }

    const visible=window.visibleTextEditors.find(e=>e.document.uri.toString()===uri);
    const doc=await workspace.openTextDocument(document.uri);
    const editor=await window.showTextDocument(doc,{preview:false,viewColumn:visible?.viewColumn});
    await revealDocumentEndAsync(editor);
}
