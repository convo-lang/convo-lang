import { ConvoCodeBlock, ConvoMessage, parseConvoCode } from '@convo-lang/convo-lang';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, Range, Uri, window, workspace } from "vscode";
import { revealDocumentEndAsync } from './util';

export interface OutputTagCodeLensArgs
{
    targetPath:string;
    index:number;
    cwd?:string;
    complete?:boolean;
}

export interface OutputTagInfo
{
    targetPath:string;
    content:string;
    range:Range;
    type:'file'|'shell'|'other';
    cwd?:string;
    index:number;
    codeBlock:ConvoCodeBlock;
}

export interface ParsedOutputTagInfo extends OutputTagInfo
{
    message:ConvoMessage;
    messageIndex:number;
}

export interface ParsedOutputTagGroup
{
    message:ConvoMessage;
    messageIndex:number;
    tags:ParsedOutputTagInfo[];
}

export const getOutputTags=(document:vscode.TextDocument):OutputTagInfo[]=>{
    return getOutputTagsFromSource(document.getText(),document,document.uri.scheme==='file'?document.uri.fsPath:undefined);
}

export const getOutputTagsFromSource=(source:string,document:vscode.TextDocument,filePath?:string):OutputTagInfo[]=>{
    const baseDir=filePath?path.dirname(filePath):'';

    const result=parseConvoCode(source,{
        enableCodeBlocks:true,
    });

    const messages=result.result ?? [];
    const tags:OutputTagInfo[]=[];

    for(const message of messages){
        const codeBlocks=message.codeBlocks;
        if(!codeBlocks?.length){
            continue;
        }

        for(const b of codeBlocks){
            const type=(
                ('target-output-path' in b.attributes)?
                    'file'
                :('target-shell-type' in b.attributes)?
                    'shell'
                :
                    'other'
            );
            const start=document.positionAt(b.startIndex);
            const end=document.positionAt(b.endIndex);
            const targetPath=b.attributes['target-output-path']??'';

            const ac=b.attributes['cwd'];

            tags.push({
                codeBlock:b,
                targetPath:(baseDir && type==='file')?
                        path.resolve(baseDir,targetPath)
                    :type==='shell'?
                        (b.attributes['script-name']??'script')
                    :
                        targetPath,
                    content:b.content,
                    type,
                    range:new vscode.Range(start,end),
                    index:b.index,
                    cwd:ac?path.join(baseDir,ac):baseDir
            });
        }
    }

    return tags;
}

export const getParsedOutputTagGroups=(document:vscode.TextDocument):ParsedOutputTagGroup[]=>{
    if(document.languageId!=='source.convo'){
        return [];
    }

    const result=parseConvoCode(document.getText(),{
        enableCodeBlocks:true,
    });

    const messages=result.result ?? [];
    const baseDir=document.uri.scheme==='file'?path.dirname(document.uri.fsPath):'';
    const groups:ParsedOutputTagGroup[]=[];

    for(let messageIndex=0;messageIndex<messages.length;messageIndex++){
        const message=messages[messageIndex];
        if(!message){
            continue;
        }
        const codeBlocks=message.codeBlocks;
        if(!codeBlocks?.length){
            continue;
        }

        const tags:ParsedOutputTagInfo[]=[];

        for(const b of codeBlocks){
            const type=(
                ('target-output-path' in b.attributes)?
                    'file'
                :('target-shell-type' in b.attributes)?
                    'shell'
                :
                    'other'
            );
            const start=document.positionAt(message.s ?? b.startIndex);
            const end=document.positionAt(message.e ?? b.endIndex);
            const targetPath=b.attributes['target-output-path']??'';

            tags.push({
                codeBlock:b,
                message,
                messageIndex,
                targetPath:(baseDir && type==='file')?
                        path.resolve(baseDir,targetPath)
                    :type==='shell'?
                        (b.attributes['script-name']??'script')
                    :
                        targetPath,
                content:b.content,
                type,
                range:new vscode.Range(start,end),
                index:b.index,
                cwd:b.attributes['cwd'],
            });
        }

        groups.push({
            message,
            messageIndex,
            tags,
        });
    }

    return groups;
}

export const getOutputTagForTargetPath=(document:vscode.TextDocument,targetPath:string,index:number):OutputTagInfo|undefined=>{
    const normalizedTargetPath=path.normalize(targetPath);
    return getOutputTags(document).find(t=>path.normalize(t.targetPath)===normalizedTargetPath && t.index===index);
}

export const getActiveOutputTag=(targetPath:string,index:number):OutputTagInfo|undefined=>{
    const editor=window.activeTextEditor;
    if(!editor){
        return undefined;
    }

    return getOutputTagForTargetPath(editor.document,targetPath,index);
}

const createOutputPreviewUri=(targetPath:string):Uri=>{
    return Uri.parse(`convo-output:${encodeURIComponent(targetPath)}`);
}
export const outputPreviewContent=new Map<string,string>();
export const showOutputDiffAsync=async (
    targetPath:string,
    content:string,
):Promise<boolean>=>{
    const previewUri=createOutputPreviewUri(targetPath);
    outputPreviewContent.set(previewUri.toString(),content);

    let targetExists=true;
    try{
        await workspace.fs.stat(Uri.file(targetPath));
    }catch{
        targetExists=false;
    }

    const leftUri=targetExists?
        Uri.file(targetPath)
    :
        Uri.parse('untitled:'+targetPath);

    await commands.executeCommand(
        'vscode.diff',
        leftUri,
        previewUri,
        `Output Diff: ${path.basename(targetPath)}`,
    );

    return true;
}

const _writeOutputTagAsync=async (targetPath:string,content:string):Promise<void>=>{
    await fs.mkdir(path.dirname(targetPath),{recursive:true});
    await fs.writeFile(targetPath,content,'utf8');

    const openEditors=workspace.textDocuments.filter(d=>d.uri.scheme==='file' && path.normalize(d.uri.fsPath)===path.normalize(targetPath));
    for(const doc of openEditors){
        await doc.save();
    }

    void window.showInformationMessage(`Wrote output to ${targetPath}`);
}

export const writeOutputTagAsync=async (args?:OutputTagCodeLensArgs|HasArgs)=>{
    args=getFileBlockArgs(args);
    const targetPath=args?.targetPath;
    if(!targetPath || !args){
        return;
    }

    const tag=getActiveOutputTag(targetPath,args.index);
    if(!tag){
        void window.showErrorMessage('Unable to find output tag content for the selected target.');
        return;
    }

    const action=await window.showWarningMessage(
        `Write output to ${path.basename(targetPath)}?`,
        { modal:true },
        'Write File',
        'View Diff',
    );

    if(action==='View Diff'){
        await showOutputDiffAsync(targetPath,tag.content);
        return;
    }

    if(action!=='Write File'){
        return;
    }

    await _writeOutputTagAsync(targetPath,tag.content);
}


export const executeShellOutputTagAsync=async (
    context:ExtensionContext,
    args?:OutputTagCodeLensArgs|HasArgs,
):Promise<void>=>{
    args=getFileBlockArgs(args);
    const targetPath=args?.targetPath;
    if(!targetPath || !args){
        return;
    }


    const tag=getActiveOutputTag(targetPath,args.index);
    if(!tag){
        void window.showErrorMessage('Unable to find output tag content for the selected target.');
        return;
    }

    const allowed=await confirmShellRunAsync(context,tag);
    if(!allowed){
        return;
    }

    const editor=window.activeTextEditor;
    if(!editor){
        return;
    }

    const document=editor.document;
    const scriptName=escapeXmlAttr(targetPath);
    const header=createScriptOutputHeader(document.getText(),scriptName);
    const footer='\n```\n</SCRIPT_OUTPUT>\n';

    await editor.edit(builder=>{
        builder.insert(document.positionAt(document.getText().length),header);
    });

    await revealDocumentEndAsync(editor);

    const processCwd=args.cwd || process.cwd();
    const child=spawn('bash',['-lc',tag.content],{
        cwd:processCwd,
        env:process.env,
    });

    let appendQueue=Promise.resolve();
    let killed=false;

    const appendAsync=(value:string)=>{
        if(!value){
            return appendQueue;
        }
        return appendQueue=appendQueue.then(async ()=>{
            const activeEditor=window.activeTextEditor;
            if(!activeEditor || activeEditor.document.uri.toString()!==document.uri.toString()){
                return;
            }
            await activeEditor.edit(builder=>{
                builder.insert(
                    activeEditor.document.positionAt(activeEditor.document.getText().length),
                    value,
                );
            });
            await revealDocumentEndAsync(activeEditor);
        });
    };

    child.stdout.on('data',(data)=>{
        void appendAsync(data.toString());
    });

    child.stderr.on('data',(data)=>{
        void appendAsync(data.toString());
    });

    child.on('error',(err)=>{
        void appendAsync(`\n[process error] ${err.message}\n`);
    });

    await window.withProgress({
        location:vscode.ProgressLocation.Notification,
        title:'Running script',
        cancellable:true,
    },async (progress,token)=>{
        const pid=child.pid ?? 'unknown';
        progress.report({message:`PID: ${pid}`});

        token.onCancellationRequested(()=>{
            killed=true;
            try{
                child.kill('SIGTERM');
            }catch{
            }
        });

        await new Promise<void>((resolve)=>{
            child.on('close',(code,signal)=>{
                let endNote='';
                if(killed){
                    endNote=`\n[process killed${child.pid?` pid ${child.pid}`:''}]\n`;
                }else if(signal){
                    endNote=`\n[process exited by signal ${signal}]\n`;
                }else if(code!==0){
                    endNote=`\n[process exited with code ${code}]\n`;
                }
                appendAsync(endNote).then(async ()=>{
                    await appendQueue;
                    const activeEditor=window.activeTextEditor;
                    if(activeEditor && activeEditor.document.uri.toString()===document.uri.toString()){
                        await activeEditor.edit(builder=>{
                            builder.insert(
                                activeEditor.document.positionAt(activeEditor.document.getText().length),
                                footer,
                            );
                        });
                        await revealDocumentEndAsync(activeEditor);
                    }
                    if(args.complete && !killed){
                        await vscode.commands.executeCommand('convo.complete');
                    }
                    resolve();
                });
            });
        });
    });
}


const confirmShellRunAsync=async (
    context:ExtensionContext,
    tag:OutputTagInfo,
):Promise<boolean>=>{
    const config=workspace.getConfiguration('convo');
    const alwaysRun=config.get<boolean>('alwaysRunOutputScripts') ?? false;
    if(alwaysRun){
        return true;
    }

    const detail=[
        `Script: ${tag.targetPath}`,
        tag.cwd?`CWD: ${tag.cwd}`:undefined,
    ].filter(Boolean).join('\n');

    const action=await window.showWarningMessage(
        'Run shell script from convo output?',
        { modal:true, detail },
        'Run Script',
        'Always Run Script',
    );

    if(action==='Always Run Script'){
        await config.update('alwaysRunOutputScripts',true,vscode.ConfigurationTarget.Global);
        return true;
    }

    return action==='Run Script';
}


const createScriptOutputHeader=(text:string,scriptName:string):string=>{
    const trimmedEnd=text.trimEnd();
    const endsWithUser=/>\s*user\s*$/m.test(trimmedEnd) && trimmedEnd.split(/\r?\n/).slice(-1)[0]?.trim()==='> user';
    return `${text.length?'\n\n':''}${endsWithUser?'':'> user\n\n'}<SCRIPT_OUTPUT script-name="${scriptName}">\n\`\`\` output\n`;
}

const escapeXmlAttr=(value:string):string=>{
    return value
        .replace(/&/g,'&amp;')
        .replace(/"/g,'&quot;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
}


export interface HasArgs
{
    args:OutputTagCodeLensArgs;
}

export const isHasArgs=(value:any):value is HasArgs=>{
    return typeof value?.args === 'object';
}

export const getFileBlockArgs=(args:OutputTagCodeLensArgs|HasArgs|undefined):OutputTagCodeLensArgs|undefined=>{
    if(isHasArgs(args)){
        return args.args;
    }else{
        return args;
    }
}