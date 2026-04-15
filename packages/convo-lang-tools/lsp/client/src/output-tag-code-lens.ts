import { unescapeConvo } from '@convo-lang/convo-lang';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt';


export const registerOutTagCommands=(context:ExtensionContext,ext:ConvoExt)=>{
    
    context.subscriptions.push(workspace.registerTextDocumentContentProvider('convo-output',{
        provideTextDocumentContent(uri:Uri):string{
            return outputPreviewContent.get(uri.toString()) ?? '';
        },
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-open',async (args?:OutputTagCodeLensArgs)=>{
        const targetPath=args?.targetPath;
        if(!targetPath){
            return;
        }
        const doc=await workspace.openTextDocument(Uri.file(targetPath));
        await window.showTextDocument(doc);
    }));
    
    context.subscriptions.push(commands.registerCommand('convo.output-tag-write',async (args?:OutputTagCodeLensArgs)=>{
        const targetPath=args?.targetPath;
        if(!targetPath){
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

        await writeOutputTagAsync(targetPath,tag.content);
    }));
    
    context.subscriptions.push(commands.registerCommand('convo.output-tag-diff',async (args?:OutputTagCodeLensArgs)=>{
        const targetPath=args?.targetPath;
        if(!targetPath){
            return;
        }

        const tag=getActiveOutputTag(targetPath,args.index);
        if(!tag){
            void window.showErrorMessage('Unable to find output tag content for the selected target.');
            return;
        }

        await showOutputDiffAsync(targetPath,tag.content);
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-copy',async (args?:OutputTagCodeLensArgs)=>{
        const targetPath=args?.targetPath;
        if(!targetPath){
            return;
        }

        const tag=getActiveOutputTag(targetPath,args.index);
        if(!tag){
            void window.showErrorMessage('Unable to find output tag content for the selected target.');
            return;
        }

        await vscode.env.clipboard.writeText(tag.content);
        void window.showInformationMessage(`Copied output for ${path.basename(targetPath)}`);
    }));
}

export interface OutputTagCodeLensArgs
{
    targetPath:string;
    index:number;
}

interface OutputTagInfo
{
    targetPath:string;
    content:string;
    range:vscode.Range;
    index:number;
}

export class OutputTagCodeLensProvider implements vscode.CodeLensProvider
{
    public provideCodeLenses(document:vscode.TextDocument):vscode.CodeLens[]
    {
        const lenses:vscode.CodeLens[]=[];
        const outputTags=getOutputTags(document);

        for(const tag of outputTags){
            lenses.push(
                new vscode.CodeLens(tag.range,{
                    title:'Open Output',
                    command:'convo.output-tag-open',
                    arguments:[{targetPath:tag.targetPath,index:tag.index} satisfies OutputTagCodeLensArgs],
                }),
                new vscode.CodeLens(tag.range,{
                    title:'Write Output',
                    command:'convo.output-tag-write',
                    arguments:[{targetPath:tag.targetPath,index:tag.index} satisfies OutputTagCodeLensArgs],
                }),
                new vscode.CodeLens(tag.range,{
                    title:'Open Diff',
                    command:'convo.output-tag-diff',
                    arguments:[{targetPath:tag.targetPath,index:tag.index} satisfies OutputTagCodeLensArgs],
                }),
                new vscode.CodeLens(tag.range,{
                    title:'Copy Output',
                    command:'convo.output-tag-copy',
                    arguments:[{targetPath:tag.targetPath,index:tag.index} satisfies OutputTagCodeLensArgs],
                }),
            );
        }

        return lenses;
    }
}

const getOutputTags=(document:vscode.TextDocument):OutputTagInfo[]=>{
    const text=document.getText();
    const tags:OutputTagInfo[]=[];
    const tagRegex=/<(?<tagName>[\w-]+)\b(?<attrs>[^>]*)\btarget-output-path\s*=\s*("(?<targetPath1>[^"]*)"|'(?<targetPath2>[^']*)')(?<attrs2>[^>]*)>(?<content>[\s\S]*?)<\/\k<tagName>>/g;

    let match:RegExpExecArray|null;
    let index=0;
    while((match=tagRegex.exec(text))!==null){
        const targetPath=match.groups?.['targetPath1'] ?? match.groups?.['targetPath2'];
        if(!targetPath){
            continue;
        }

        const attrs=(match.groups?.['attrs']??'')+' '+(match.groups?.['attrs2']??'');
        const rawContent=match.groups?.['content'] ?? '';
        const content=normalizeOutputTagContent(match.groups?.['tagName']??'',rawContent,attrs);
        const start=document.positionAt(match.index);
        const end=document.positionAt(match.index+match[0].length);
        const baseDir=document.uri.scheme==='file'?
            path.dirname(document.uri.fsPath):
            '';

        tags.push({
            targetPath:baseDir?
                path.resolve(baseDir,targetPath)
            :
                targetPath,
            content,
            range:new vscode.Range(start,end),
            index:index++,
        });
    }

    return tags;
}

const normalizeOutputTagContent=(tag:string,content:string,attrs:string):string=>{
    let value=content.trim();
    if(/\bfenced\b/.test(attrs)){
        content=content.trim();
        const match=/^```.*/.exec(content);
        if(match){
            content=content.substring(match[0].length).trim();
        }
        if(content.endsWith('```')){
            content=content.substring(0,content.length-3).trim();
        }
        value=content;
    }

    value=unescapeConvo(value);

    const closing=/closing-escape=['"](?<closing>[^'"]+)['"]/.exec(attrs)?.groups?.['closing'];
    
    if(closing){
        value=value.split(closing).join(`</${tag}>`);
    }

    return value.endsWith('\n')?value:value+'\n';
}

const getOutputTagForTargetPath=(document:vscode.TextDocument,targetPath:string,index:number):OutputTagInfo|undefined=>{
    const normalizedTargetPath=path.normalize(targetPath);
    return getOutputTags(document).find(t=>path.normalize(t.targetPath)===normalizedTargetPath && t.index===index);
}

const getActiveOutputTag=(targetPath:string,index:number):OutputTagInfo|undefined=>{
    const editor=window.activeTextEditor;
    if(!editor){
        return undefined;
    }

    return getOutputTagForTargetPath(editor.document,targetPath,index);
}

const createOutputPreviewUri=(targetPath:string):Uri=>{
    return Uri.parse(`convo-output:${encodeURIComponent(targetPath)}`);
}

const showOutputDiffAsync=async (
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

const writeOutputTagAsync=async (targetPath:string,content:string):Promise<void>=>{
    await fs.mkdir(path.dirname(targetPath),{recursive:true});
    await fs.writeFile(targetPath,content,'utf8');

    const openEditors=workspace.textDocuments.filter(d=>d.uri.scheme==='file' && path.normalize(d.uri.fsPath)===path.normalize(targetPath));
    for(const doc of openEditors){
        await doc.save();
    }

    void window.showInformationMessage(`Wrote output to ${targetPath}`);
}

const outputPreviewContent=new Map<string,string>();