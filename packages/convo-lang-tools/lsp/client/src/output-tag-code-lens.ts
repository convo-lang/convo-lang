import * as vscode from 'vscode';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt';
import { executeShellOutputTagAsync, getFileBlockArgs, getOutputTags, HasArgs, outputPreviewContent, OutputTagCodeLensArgs, setClipboardUsingOutputTagAsync, showOutputDiffAsync, writeOutputTagAsync } from './code-block-lib';


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
    
    context.subscriptions.push(commands.registerCommand('convo.output-tag-write',writeOutputTagAsync));
    
    context.subscriptions.push(commands.registerCommand('convo.output-tag-diff',async (args?:OutputTagCodeLensArgs)=>{
        if(!args){
            return;
        }
        await showOutputDiffAsync(args);
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-copy',async (args?:OutputTagCodeLensArgs)=>{
        if(args){
            await setClipboardUsingOutputTagAsync(args);
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell',async (args:OutputTagCodeLensArgs|HasArgs)=>{
        args=getFileBlockArgs(args);
        await executeShellOutputTagAsync(context,args);
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell-complete',async (args:OutputTagCodeLensArgs|HasArgs)=>{
        args=getFileBlockArgs(args);
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
                            arguments:[{targetPath:tag.targetPath,index:tag.index,documentUri:document.uri,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                        new vscode.CodeLens(tag.range,{
                            title:'Write Output',
                            command:'convo.output-tag-write',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,documentUri:document.uri,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                        new vscode.CodeLens(tag.range,{
                            title:'Open Diff',
                            command:'convo.output-tag-diff',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,documentUri:document.uri,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                        new vscode.CodeLens(tag.range,{
                            title:'Copy Output',
                            command:'convo.output-tag-copy',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,documentUri:document.uri,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    break;

                case 'shell':
                    lenses.push(
                        new vscode.CodeLens(tag.range,{
                            title:'Run Script',
                            command:'convo.output-tag-execute-shell',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd,documentUri:document.uri,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    lenses.push(
                        new vscode.CodeLens(tag.range,{
                            title:'Run Script and complete',
                            command:'convo.output-tag-execute-shell-complete',
                            arguments:[{targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd,documentUri:document.uri,complete:true,codeBlock:tag.codeBlock} satisfies OutputTagCodeLensArgs],
                        }),
                    );
                    break;
            }
        }

        return lenses;
    }
}

