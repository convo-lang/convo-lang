import { unescapeConvo } from '@convo-lang/convo-lang';
import { spawn } from 'child_process';
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

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell',async (args?:OutputTagCodeLensArgs)=>{
        const targetPath=args?.targetPath;
        if(!targetPath){
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
    }));
}

export interface OutputTagCodeLensArgs
{
    targetPath:string;
    index:number;
    cwd?:string;
    complete?:boolean;
}

interface OutputTagInfo
{
    targetPath:string;
    content:string;
    range:vscode.Range;
    type:'file'|'shell';
    cwd?:string;
    index:number;
}

export class OutputTagCodeLensProvider implements vscode.CodeLensProvider
{
    public provideCodeLenses(document:vscode.TextDocument):vscode.CodeLens[]
    {
        const lenses:vscode.CodeLens[]=[];
        const outputTags=getOutputTags(document);

        for(const tag of outputTags){
            switch(tag.type){

                case 'file':
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
                    break;

                case 'shell':
                    lenses.push(
                        new vscode.CodeLens(tag.range,{
                            title:'Run Script',
                            command:'convo.output-tag-execute-shell',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    lenses.push(
                        new vscode.CodeLens(tag.range,{
                            title:'Run Script and complete',
                            command:'convo.output-tag-execute-shell',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd,complete:true} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    break;
            }
        }

        return lenses;
    }
}

const getOutputTags=(document:vscode.TextDocument):OutputTagInfo[]=>{
    const text=document.getText();
    const tags:OutputTagInfo[]=[];
    const tagRegex=/<(?<tagName>[\w-]+)\b(?<attrs>[^>]*)\b(?<blockType>target-output-path|target-shell-type)\s*=\s*("(?<targetPath1>[^"]*)"|'(?<targetPath2>[^']*)')(?<attrs2>[^>]*)>(?<content>[\s\S]*?)<\/\k<tagName>>/g;

    let match:RegExpExecArray|null;
    let index=0;
    while((match=tagRegex.exec(text))!==null){
        const targetPath=match.groups?.['targetPath1'] ?? match.groups?.['targetPath2'];
        if(!targetPath){
            continue;
        }

        const attrs=(match.groups?.['attrs']??'')+' '+(match.groups?.['attrs2']??'');
        const type=match.groups?.['blockType']==='target-output-path'?'file':'shell';
        const rawContent=match.groups?.['content'] ?? '';
        const content=normalizeOutputTagContent(match.groups?.['tagName']??'',rawContent,attrs,type!=='shell');
        const start=document.positionAt(match.index);
        const end=document.positionAt(match.index+match[0].length);
        const baseDir=document.uri.scheme==='file'?
            path.dirname(document.uri.fsPath):
            '';

        const cwdMatch=/cwd\s*=\s*("([^"]*)"|'([^']*)')/.exec(attrs);
        const cwd=cwdMatch?.[2] ?? cwdMatch?.[3];

        const nameMatch=/script-name\s*=\s*("([^"]*)"|'([^']*)')/.exec(attrs);
        const name=nameMatch?.[2] ?? nameMatch?.[3];

        tags.push({
            targetPath:(baseDir && type==='file')?
                path.resolve(baseDir,targetPath)
            :type==='shell'?
                (name??'script')
            :
                targetPath,
            content,
            type,
            range:new vscode.Range(start,end),
            index:index++,
            cwd,
        });
    }

    return tags;
}

const normalizeOutputTagContent=(tag:string,content:string,attrs:string,requireFenced:boolean):string=>{
    let value=content.trim();
    if(!requireFenced || /\bfenced\b/.test(attrs)){
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

const createScriptOutputHeader=(text:string,scriptName:string):string=>{
    const trimmedEnd=text.trimEnd();
    const endsWithUser=/>\s*user\s*$/m.test(trimmedEnd) && trimmedEnd.split(/\r?\n/).slice(-1)[0]?.trim()==='> user';
    return `${text.length?'\n\n':''}${endsWithUser?'':'> user\n\n'}<SCRIPT_OUTPUT script-name="${scriptName}">\n\`\`\` output\n`;
}

const revealDocumentEndAsync=async (editor:vscode.TextEditor):Promise<void>=>{
    const doc=editor.document;
    const end=doc.positionAt(doc.getText().length);
    editor.selection=new vscode.Selection(end,end);
    editor.revealRange(new vscode.Range(end,end),vscode.TextEditorRevealType.Default);
}

const escapeXmlAttr=(value:string):string=>{
    return value
        .replace(/&/g,'&amp;')
        .replace(/"/g,'&quot;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
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

const outputPreviewContent=new Map<string,string>();
