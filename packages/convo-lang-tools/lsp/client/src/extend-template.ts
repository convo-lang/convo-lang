import { pathExistsAsync } from '@iyio/node-common';
import * as path from 'path';
import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { revealDocumentEndAsync } from './util.js';

/**
 * Registers the `convo.extend-template` command. The command creates a new convo file in the same
 * directory as the active convo file that imports the active file.
 */
export const registerExtendTemplateCommand=(context:ExtensionContext,ext:ConvoExt)=>{

    context.subscriptions.push(commands.registerCommand('convo.extend-template',async ()=>{
        const document=window.activeTextEditor?.document;
        if(document?.languageId!=='source.convo'){
            void window.showWarningMessage('Extend template requires an open convo file');
            return;
        }

        if(document.isUntitled || document.uri.scheme!=='file'){
            void window.showWarningMessage('Save the convo file before extending it');
            return;
        }

        if(document.isDirty && !await document.save()){
            return;
        }

        const filePath=document.uri.fsPath;
        const saveTo=await getNextDatedConvoPathAsync(filePath);
        const content=`@import ./${path.basename(filePath)}\n\n> user\n\n`;

        const uri=Uri.file(saveTo);
        await workspace.fs.writeFile(uri,Buffer.from(content,'utf8') as Uint8Array);

        const doc=await workspace.openTextDocument(uri);
        const editor=await window.showTextDocument(doc,{preview:false});
        await revealDocumentEndAsync(editor);
    }));
}

/**
 * Returns the next available dated path for the given convo file. If the file name already
 * contains a date suffix the base name is reused and the number is incremented.
 */
const getNextDatedConvoPathAsync=async (filePath:string):Promise<string>=>{
    const dir=path.dirname(filePath);
    let baseName=path.basename(filePath);
    if(baseName.startsWith('_') && baseName.length>1){
        baseName=baseName.substring(1);
    }
    let n=1;

    const match=/-(\d{4}-\d{2}-\d{2}-(\d+))\.convo$/i.exec(baseName);
    if(match){
        n=Number(match[2])+1;
        baseName=baseName.substring(0,match.index);
    }else if(baseName.toLowerCase().endsWith('.convo')){
        baseName=baseName.substring(0,baseName.length-6);
    }

    const d=new Date();
    const date=`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

    while(true){
        const p=path.join(dir,`${baseName}-${date}-${n.toString().padStart(4,'0')}.convo`);
        if(!await pathExistsAsync(p)){
            return p;
        }
        n++;
    }
}
