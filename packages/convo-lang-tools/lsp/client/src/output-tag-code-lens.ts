import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt';
import { executeShellOutputTagAsync, getActiveOutputTag, getFileBlockArgs, getOutputTags, HasArgs, outputPreviewContent, OutputTagCodeLensArgs, showOutputDiffAsync, writeOutputTagAsync } from './code-block-lib';


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

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
        args=getFileBlockArgs(args);
        await executeShellOutputTagAsync(context,args);
    }));

    context.subscriptions.push(commands.registerCommand('convo.output-tag-execute-shell-complete',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
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

