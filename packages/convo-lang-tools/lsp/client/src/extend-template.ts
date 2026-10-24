import { pathExistsAsync } from '@iyio/node-common';
import * as path from 'path';
import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { revealDocumentEndAsync } from './util.js';

/**
 * Registers the `convo.extend-template` command. The command creates a new convo file in the same
 * directory as the active convo file that imports the active file. If the active file already
 * extends one or more templates using the `!template` import modifier the new file extends the
 * same templates instead.
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

        const filePath=document.uri.fsPath;
        const dir=path.dirname(filePath);
        const templates=getTemplateImports(document.getText());

        let saveTo:string;
        let imports:string[];
        if(templates[0]){
            saveTo=await getNextDatedConvoPathAsync(dir,path.basename(templates[0]));
            imports=templates.map(t=>rebuildImportPath(t,dir));
        }else{
            if(document.isDirty && !await document.save()){
                return;
            }
            saveTo=await getNextDatedConvoPathAsync(dir,path.basename(filePath));
            imports=[`./${path.basename(filePath)}`];
        }

        const content=`${imports.map(i=>`@import ${i} !template`).join('\n')}\n\n> user\n\n`;

        const uri=Uri.file(saveTo);
        await workspace.fs.writeFile(uri,Buffer.from(content,'utf8') as Uint8Array);

        const doc=await workspace.openTextDocument(uri);
        const editor=await window.showTextDocument(doc,{preview:false});
        await revealDocumentEndAsync(editor);
    }));
}

/**
 * Returns the import paths of all imports using the `!template` modifier
 */
const getTemplateImports=(content:string):string[]=>{
    const imports:string[]=[];
    for(const match of content.matchAll(/^@import[ \t]+(\S+)[^\n]*!template/gm)){
        const importPath=match[1];
        if(importPath && !importPath.startsWith('!')){
            imports.push(importPath);
        }
    }
    return imports;
}

/**
 * Rebuilds a relative import path relative to the given directory. Non-relative imports such as
 * URIs and absolute paths are returned as-is.
 */
const rebuildImportPath=(importPath:string,dir:string):string=>{
    if(/^[\w-]+:/.test(importPath) || path.isAbsolute(importPath)){
        return importPath;
    }
    const rel=path.relative(dir,path.resolve(dir,importPath)).split(path.sep).join('/');
    return rel.startsWith('.')?rel:`./${rel}`;
}

/**
 * Returns the next available dated path in the given directory for the given convo file name. If
 * the file name already contains a date suffix the base name is reused and the number is incremented.
 */
const getNextDatedConvoPathAsync=async (dir:string,fileName:string):Promise<string>=>{
    let baseName=fileName;
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
