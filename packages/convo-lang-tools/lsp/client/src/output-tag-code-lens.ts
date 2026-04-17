import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt';
import { getActiveOutputTag, getOutputTags, outputPreviewContent, OutputTagCodeLensArgs, OutputTagInfo, showOutputDiffAsync, writeOutputTagAsync } from './code-block-lib';
import { revealDocumentEndAsync } from './util';


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
        await executeShellOutputTagAsync(context,args);
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell-complete',async (args?:OutputTagCodeLensArgs)=>{
        await executeShellOutputTagAsync(context,args?{...args,complete:true}:args);
    }));
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
                            command:'convo.output-tag-execute-shell-complete',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd,complete:true} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    break;
            }
        }

        return lenses;
    }
}

export const executeShellOutputTagAsync=async (
    context:ExtensionContext,
    args?:OutputTagCodeLensArgs,
):Promise<void>=>{
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
