import { ConvoCodeBlock, ConvoMessage, parseConvoCode } from '@convo-lang/convo-lang';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, Range, Uri, window, workspace } from "vscode";

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
                    cwd:b.attributes['cwd'],
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

export const writeOutputTagAsync=async (targetPath:string,content:string):Promise<void>=>{
    await fs.mkdir(path.dirname(targetPath),{recursive:true});
    await fs.writeFile(targetPath,content,'utf8');

    const openEditors=workspace.textDocuments.filter(d=>d.uri.scheme==='file' && path.normalize(d.uri.fsPath)===path.normalize(targetPath));
    for(const doc of openEditors){
        await doc.save();
    }

    void window.showInformationMessage(`Wrote output to ${targetPath}`);
}
