import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { revealDocumentEndAsync } from './util.js';

/**
 * Registers the internal `convo.code-block-go-to-end` command used by the divider items and the
 * `Go to end` items of the Code Blocks view. The command moves the cursor to the end of the given
 * convo document.
 */
export const registerCodeBlockGoToEnd=(context:ExtensionContext,ext:ConvoExt)=>{
    context.subscriptions.push(commands.registerCommand('convo.code-block-go-to-end',goToDocumentEndAsync));
}

/**
 * Shows the document in the editor group it is already visible in, or the active group, focuses
 * it and moves the cursor to the end of the document.
 */
export const goToDocumentEndAsync=async (uri?:Uri):Promise<void>=>{
    if(!uri){
        return;
    }
    const key=uri.toString();
    const visible=window.visibleTextEditors.find(e=>e.document.uri.toString()===key && e.viewColumn!==undefined);
    const doc=await workspace.openTextDocument(uri);
    const editor=await window.showTextDocument(doc,{preview:false,preserveFocus:false,viewColumn:visible?.viewColumn});
    await revealDocumentEndAsync(editor);
}
