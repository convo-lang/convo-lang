import { applyConvoBlockToContent, ConvoCodeBlock, ConvoMessage, defaultConvoFindReplaceSeparator, escapeConvo, isPartialConvoCodeBlock, parseConvoCode } from '@convo-lang/convo-lang';
import { getErrorMessage } from '@iyio/common';
import { readFileAsStringAsync } from '@iyio/node-common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import * as vscode from 'vscode';
import { commands, ExtensionContext, Range, Uri, window, workspace, WorkspaceEdit } from "vscode";
import { revealDocumentInVisibleEditorsAsync } from './util';

export interface OutputTagBase
{

    targetPath:string;
    /**
     * URI of document the code block is defined in
     */
    documentUri:Uri;
    index:number;
    cwd?:string;
    codeBlock:ConvoCodeBlock;
    autoConfirm?:boolean;
}

export interface OutputTagCodeLensArgs extends OutputTagBase
{
    complete?:boolean;
}

export interface OutputTagInfo extends OutputTagBase
{
    range:Range;
    type:'file'|'shell'|'op'|'other';
}

export interface ParsedOutputTagInfo extends OutputTagInfo
{
    message:ConvoMessage;
    messageIndex:number;
}

export interface MessageTagGroup
{
    message:ConvoMessage;
    messageUri:Uri;
    messageIndex:number;
    tags:ParsedOutputTagInfo[];
    isLast:boolean;
}

const getBlockType=(b:ConvoCodeBlock):OutputTagInfo['type']=>(
    ('target-output-path' in b.attributes)?
        'file'
    :('target-shell-type' in b.attributes)?
        'shell'
    :b.fileOp?
        'op'
    :
        'other'
);

/**
 * Returns the target path of a block. File and op paths are resolved relative to baseDir. For
 * rename ops the `from` path is used.
 */
const getBlockTargetPath=(b:ConvoCodeBlock,type:OutputTagInfo['type'],baseDir:string):string=>{
    switch(type){
        case 'shell':
            return b.attributes['script-name']??'script';
        case 'op':{
            const p=b.attributes['path']??b.attributes['from']??'';
            return baseDir?path.resolve(baseDir,p):p;
        }
        default:{
            const p=b.attributes['target-output-path']??'';
            return (baseDir && type==='file')?path.resolve(baseDir,p):p;
        }
    }
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
            const type=getBlockType(b);
            const start=document.positionAt(b.startIndex);
            const end=document.positionAt(b.endIndex);

            const ac=b.attributes['cwd'];

            tags.push({
                codeBlock:b,
                targetPath:getBlockTargetPath(b,type,baseDir),
                type,
                range:new vscode.Range(start,end),
                index:b.index,
                cwd:ac?path.join(baseDir,ac):baseDir,
                documentUri:document.uri,
            });
        }
    }

    return tags;
}

export const getParsedOutputTagGroups=(document:vscode.TextDocument):MessageTagGroup[]=>{
    if(document.languageId!=='source.convo'){
        return [];
    }

    const result=parseConvoCode(document.getText(),{
        enableCodeBlocks:true,
    });

    const messages=result.result ?? [];
    const baseDir=document.uri.scheme==='file'?path.dirname(document.uri.fsPath):'';
    const groups:MessageTagGroup[]=[];

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
            const type=getBlockType(b);
            const start=document.positionAt(message.s ?? b.startIndex);
            const end=document.positionAt(message.e ?? b.endIndex);

            tags.push({
                codeBlock:b,
                message,
                messageIndex,
                targetPath:getBlockTargetPath(b,type,baseDir),
                type,
                range:new vscode.Range(start,end),
                index:b.index,
                cwd:b.attributes['cwd'],
                documentUri:document.uri,
            });
        }

        groups.push({
            message,
            messageIndex,
            tags,
            isLast:false,
            messageUri:document.uri,
        });
    }

    const last=groups[groups.length-1];
    if(last){
        last.isLast=true;
    }

    return groups;
}

export const getOutputTagForTargetPath=(document:vscode.TextDocument,targetPath:string,index:number):OutputTagInfo|undefined=>{
    const normalizedTargetPath=path.normalize(targetPath);
    return getOutputTags(document).find(t=>path.normalize(t.targetPath)===normalizedTargetPath && t.index===index);
}

/**
 * Returns the most up to date output tag for the given args using the document the tag is
 * defined in. Falls back to the active editor if the args do not define a document URI.
 */
export const getOutputTagFromArgsAsync=async (args:OutputTagBase):Promise<OutputTagInfo|undefined>=>{
    try{
        const document=args.documentUri?
            await workspace.openTextDocument(args.documentUri)
        :
            window.activeTextEditor?.document;
        return document?getOutputTagForTargetPath(document,args.targetPath,args.index):undefined;
    }catch(ex){
        console.error('Failed to open document for output tag',ex);
        return undefined;
    }
}

/**
 * Returns the open text document for the given file path if one exists
 */
const getOpenFileDocument=(filePath:string):vscode.TextDocument|undefined=>{
    const normalized=path.normalize(filePath);
    return workspace.textDocuments.find(d=>d.uri.scheme==='file' && path.normalize(d.uri.fsPath)===normalized);
}

const createOutputPreviewUri=(targetPath:string):Uri=>{
    return Uri.parse(`convo-output:${encodeURIComponent(targetPath)}`);
}
export const outputPreviewContent=new Map<string,string>();

/**
 * Fires when the content of an output preview document changes
 */
export const outputPreviewChangeEmitter=new vscode.EventEmitter<Uri>();

export const showOutputDiffAsync=async (
    tag:OutputTagBase,
):Promise<boolean>=>{
    const targetPath=tag.targetPath;
    const content=await getCodeBlockOutputAsync(tag);
    if(content===undefined){
        return false;
    }
    const previewUri=createOutputPreviewUri(targetPath);
    outputPreviewContent.set(previewUri.toString(),content);
    outputPreviewChangeEmitter.fire(previewUri);

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

/**
 * Returns the content of the given file using the open text document of the file if one exists.
 * Undefined is returned if the file does not exist.
 */
export const readFileContentAsync=async (filePath:string):Promise<string|undefined>=>{
    const openDoc=getOpenFileDocument(filePath);
    if(openDoc){
        return openDoc.getText();
    }
    try{
        return await readFileAsStringAsync(filePath);
    }catch{
        return undefined;
    }
}

/**
 * Writes content to the target path. If the target is open in an editor it is updated through the
 * editor and saved. Returns true if the content was written.
 */
export const writeFileContentAsync=async (targetPath:string,content:string):Promise<boolean>=>{
    const openDoc=getOpenFileDocument(targetPath);
    if(openDoc){
        const edit=new WorkspaceEdit();
        edit.replace(openDoc.uri,new Range(openDoc.positionAt(0),openDoc.positionAt(openDoc.getText().length)),content);
        return await workspace.applyEdit(edit) && await openDoc.save();
    }
    await fs.mkdir(path.dirname(targetPath),{recursive:true});
    await fs.writeFile(targetPath,content,'utf8');
    return true;
}

const _writeOutputTagAsync=async (tag:OutputTagBase):Promise<void>=>{
    const targetPath=tag.targetPath;
    const outputContent=await getCodeBlockOutputAsync(tag);
    if(outputContent===undefined){
        return;
    }

    if(!await writeFileContentAsync(targetPath,outputContent)){
        void window.showErrorMessage(`Failed to write output to ${targetPath}`);
        return;
    }

    void window.showInformationMessage(`Wrote output to ${targetPath}`);
}

export interface CodeBlockOutputOptions
{
    /**
     * If true undefined is returned when any find-replace target is not found
     */
    failOnNotFound?:boolean;
}

/**
 * Returns the output of a file block. Find-replace, append and prepend blocks targeting the same
 * file in the same message are applied in order to the current content of the file. Missing
 * files are treated as empty.
 */
export const getCodeBlockOutputAsync=async (tag:OutputTagBase,options?:CodeBlockOutputOptions):Promise<string|undefined>=>{
    const targetPath=tag.targetPath;
    if(!isPartialConvoCodeBlock(tag.codeBlock)){
        return tag.codeBlock.content;
    }
    try{
        const doc=await workspace.openTextDocument(tag.documentUri);
        if(!doc){
            const msg=`Failed to find document for Convo-Lang file-replace block: ${tag.documentUri}`;
            console.error(msg);
            await window.showErrorMessage(msg);
            return;
        }
        const outputs=getOutputTags(doc).filter(t=>t.targetPath===tag.targetPath && isPartialConvoCodeBlock(t.codeBlock) && t.codeBlock.messageIndex===tag.codeBlock.messageIndex);
        outputs.sort((a,b)=>a.index-b.index);
        let content=await readFileContentAsync(targetPath)??'';
        const notFound:string[]=[];
        for(const r of outputs){
            const replacement=applyConvoBlockToContent(content,r.codeBlock);
            if(!replacement.replaceCount){
                notFound.push(`find-replace target not found. path:${tag.documentUri}, index:${r.codeBlock.index}, separator:${r.codeBlock.findReplaceSeparator??defaultConvoFindReplaceSeparator}`)
            }else{
                content=replacement.content;
            }
        }
        if(notFound.length){
            window.showErrorMessage(notFound.join('\n'));
            if(options?.failOnNotFound){
                return undefined;
            }
        }
        return content;
    }catch(ex){
        const msg=`Failed to read content of targetPath for Convo-Lang file-replace block: ${targetPath}. Error:${getErrorMessage(ex)}`;
        console.error(msg,ex);
        await window.showErrorMessage(msg);
        return undefined;
    }
    
}

export const writeOutputTagAsync=async (args:OutputTagCodeLensArgs|HasArgs)=>{
    args=getFileBlockArgs(args);
    const targetPath=args?.targetPath;
    if(!targetPath || !args){
        return;
    }

    const tag=await getOutputTagFromArgsAsync(args);
    if(!tag){
        void window.showErrorMessage('Unable to find output tag content for the selected target.');
        return;
    }

    if(!args.autoConfirm){
        const action=await window.showWarningMessage(
            `Write output to ${path.basename(targetPath)}?`,
            { modal:true },
            'Write File',
            'View Diff',
        );

        if(action==='View Diff'){
            await showOutputDiffAsync(tag);
            return;
        }

        if(action!=='Write File'){
            return;
        }
    }

    await _writeOutputTagAsync(tag);
}

export const setClipboardUsingOutputTagAsync=async (tag:OutputTagBase)=>{
    const targetPath=tag?.targetPath;
    if(!targetPath){
        return;
    }
    const outputContent=await getCodeBlockOutputAsync(tag);
    if(outputContent===undefined){
        return;
    }
    await vscode.env.clipboard.writeText(outputContent);
    void window.showInformationMessage(`Copied output for ${path.basename(targetPath)}`);
}

/**
 * Appends text to the end of the given document without requiring the document to be focused
 */
const appendToDocumentAsync=async (document:vscode.TextDocument,text:string):Promise<void>=>{
    const edit=new WorkspaceEdit();
    edit.insert(document.uri,document.positionAt(document.getText().length),text);
    if(await workspace.applyEdit(edit)){
        await revealDocumentInVisibleEditorsAsync(document);
    }
}

export const executeShellOutputTagAsync=async (
    context:ExtensionContext,
    args:OutputTagCodeLensArgs|HasArgs,
):Promise<void>=>{
    args=getFileBlockArgs(args);
    const targetPath=args?.targetPath;
    if(!targetPath || !args){
        return;
    }


    const tag=await getOutputTagFromArgsAsync(args);
    if(!tag){
        void window.showErrorMessage('Unable to find output tag content for the selected target.');
        return;
    }

    if(!args.autoConfirm){
        const allowed=await confirmShellRunAsync(context,tag);
        if(!allowed){
            return;
        }
    }

    const document=await workspace.openTextDocument(tag.documentUri);
    const scriptName=escapeXmlAttr(targetPath);
    const header=createScriptOutputHeader(document.getText(),scriptName);
    const footer='\n```\n</SCRIPT_OUTPUT>\n';

    await appendToDocumentAsync(document,header);

    const processCwd=args.cwd || process.cwd();
    let command:string;
    let commandArgs:string[];
    let stdIn:string|undefined;
    let exitCode:number|undefined;
    const shellType=tag.codeBlock.attributes['target-shell-type'];
    switch(shellType){

        case 'bash':
            command='bash';
            commandArgs=[];
            stdIn=tag.codeBlock.content;
            break;

        case 'node':
            command='node';
            commandArgs=['--input-type=module'];
            stdIn=tag.codeBlock.content;
            break;

        case 'bun':
            command='bun';
            commandArgs=['run','-'];
            stdIn=tag.codeBlock.content;
            break;

        case 'python':
            command='python3';
            commandArgs=['-'];
            stdIn=tag.codeBlock.content;
            break;

        default:
            command='echo';
            commandArgs=[`Unknown shell type - ${JSON.stringify(shellType)}`];
            exitCode=1;
            break;

    }
    const child=spawn(command,commandArgs,{
        cwd:processCwd,
        env:process.env,
    });

    if(stdIn!==undefined){
        const stream=Readable.from(stdIn);
        stream.pipe(child.stdin,{end:true});
    }
    

    let appendQueue=Promise.resolve();
    let killed=false;
    let prevEnd:string='';
    const appendAsync=(value:string,end:boolean)=>{
        return appendQueue=appendQueue.then(async ()=>{
            let v=prevEnd+value;
            if(end){
                prevEnd='';
            }else{
                const ei=v.lastIndexOf('\n');
                if(ei===-1){
                    prevEnd=v;
                    return;
                }
                prevEnd=v.substring(ei+1);
                v=v.substring(0,ei+1);
            }
            if(v){
                await appendToDocumentAsync(document,escapeConvo(v));
            }
        });
    };

    child.stdout.on('data',(data)=>{
        void appendAsync(data.toString(),false);
    });

    child.stderr.on('data',(data)=>{
        void appendAsync(data.toString(),false);
    });

    child.on('error',(err)=>{
        void appendAsync(`\n[process error] ${err.message}\n`,false);
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
                if(exitCode!==undefined){
                    code=exitCode;
                }
                let endNote='';
                if(killed){
                    endNote+=`\n[process killed${child.pid?` pid ${child.pid}`:''}]\n`;
                }else if(signal){
                    endNote+=`\n[process exited by signal ${signal}]\n`;
                }else if(code!==0){
                    endNote+=`\n[process exited with code ${code}]\n`;
                }
                appendAsync(endNote,true).then(async ()=>{
                    await appendQueue;
                    await appendToDocumentAsync(document,footer);
                    if(args.complete && !killed){
                        await window.showTextDocument(document,{preview:false});
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

export const getFileBlockArgs=(args:OutputTagCodeLensArgs|HasArgs):OutputTagCodeLensArgs=>{
    if(isHasArgs(args)){
        return args.args;
    }else{
        return args;
    }
}
