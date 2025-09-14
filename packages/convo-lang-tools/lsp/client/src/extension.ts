/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { Conversation, convoResultErrorName, flatConvoMessagesToTextView, getSerializableFlatConvoConversation, parseConvoCode } from '@convo-lang/convo-lang';
import { ConvoBrowserCtrl } from "@convo-lang/convo-lang-browser";
import { ConvoCli, ConvoCliOptions, createConvoCliAsync, initConvoCliAsync } from '@convo-lang/convo-lang-cli';
import { ConvoMakeCtrl, getConvoMakeOptionsFromVars } from "@convo-lang/convo-lang-make";
import { CancelToken, Lock, createJsonRefReplacer, getErrorMessage } from '@iyio/common';
import { pathExistsAsync, readFileAsStringAsync } from '@iyio/node-common';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, Range, Selection, TextDocument, Uri, commands, languages, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { extensionPublisher } from './build-const.js';
import { ConvoExt } from './ConvoExt.js';
import { ConvoDocumentLinkProvider } from './link-provider.js';
import { ConvoMakeExtBuild } from './make/ConvoMakeExtBuild.js';
import { ConvoMakeExtTarget } from './make/ConvoMakeExtTarget.js';
import { ConvoMakeExtTree } from './make/ConvoMakeExtTree.js';

let client:LanguageClient;

const example=/*convo*/`
# Builds a vehicle for the user
> buildVehicle(

    # A short description of the vehicle
    description:string;

    # The color of the vehicle
    color?:string

    # The type of the vehicle
    type:enum('car' 'truck' 'van' 'boat')

    # The top speed of the vehicle in miles per hour
    topSpeed:number

    # The max payload capcapty the vehicle can cary in pounds
    payloadCapacity?:number;
) -> (

    return({
        isTruck:eq(type,'truck')
        isFast:gte(topSpeed,150)
    })
)

> system
You are funny mechanical engineer helping a customer build a vehicle. Use the buildVehicle function
to build vehicles.

> user
I need a car that can do the quarter mile in 7 seconds or less

> user
Use the buildVehicle function to build my vehicle

`

export function activate(context:ExtensionContext){

    const ext=new ConvoExt();

    registerCommands(context,ext);
    startLsp(context);

    const treeView=window.createTreeView('convoMakeBuild',{
        treeDataProvider:new ConvoMakeExtTree({ext})
    });
    treeView.onDidChangeVisibility(e=>{
        if(e.visible){
            ext.scanMakeCtrlsAsync();
        }
    })
    context.subscriptions.push(languages.registerDocumentLinkProvider(
        {pattern: '**/*.convo'},
        new ConvoDocumentLinkProvider()
    ));
}

export function deactivate():Thenable<void>|undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

const startLsp=(context:ExtensionContext)=>{

	const serverModule=context.asAbsolutePath(
		path.join('lsp','server','out','server.js')
	);

	const serverOptions:ServerOptions={
		run:{module:serverModule,transport:TransportKind.ipc},
		debug:{
			module:serverModule,
			transport:TransportKind.ipc,
		}
	};

	const clientOptions:LanguageClientOptions={
		documentSelector:[{scheme:'file',language:'source.convo'}],
	};

	client=new LanguageClient(
		'convoLanguageServer',
		'Convo Language Server',
		serverOptions,
		clientOptions
	);

	client.start();

}

const registerCommands=(context:ExtensionContext,ext:ConvoExt)=>{

    context.subscriptions.push(commands.registerCommand('convo.parse', async () => {
        const document=window.activeTextEditor?.document;
        if(!document){
            return;
        }

        let src:string|undefined=undefined;

        if(document.languageId==='source.convo'){
            src=document?.getText();
        }else{
            const selection=window.activeTextEditor?.selection
            if(selection){
                src=document.getText(new Range(selection.start,selection.end));
            }
        }

        if(!src){
            return;
        }

        const r=parseConvoCode(src);

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(r.result??r,null,4)
        })

        await window.showTextDocument(doc);


    }));



    context.subscriptions.push(commands.registerCommand('convo.new', async () => {
        const doc=await workspace.openTextDocument({
            language:'source.convo',
            content:'> user\n',
        });
        const editor=await window.showTextDocument(doc);
        const pos=doc.positionAt(doc.getText().length);
        editor.selection=new Selection(pos,pos);
    }));

    const getConvoEditorContextAsync=async (cliOptions:ConvoCliOptions={},docPath?:string):Promise<{cli:ConvoCli,src:string,convo:Conversation,document?:TextDocument,cwd:string|undefined}|undefined>=>{
        const document=window.activeTextEditor?.document;
        if(!document && !docPath){
            return;
        }

        if(!docPath && document){
            docPath=document.uri.scheme==='file'?document.uri.fsPath:undefined;
        }
        if(!docPath){
            return;
        }

        let src:string|undefined=undefined;

        if(docPath){
            src=await readFileAsStringAsync(docPath);
        }else if(document?.languageId==='source.convo'){
            src=document?.getText();
        }else{
            const selection=window.activeTextEditor?.selection
            if(selection){
                src=document?.getText(new Range(selection.start,selection.end));
            }
        }

        if(!src){
            return;
        }

        const cwd=docPath?path.dirname(docPath):undefined;
        const cli=await createConvoCliAsync({
            config:ext.getCliConfig(),
            bufferOutput:true,
            exeCwd:cwd,
            sourcePath:docPath,
            ...cliOptions
        });

        const convo=cli.convo;
        convo.append(src,{disableAutoFlatten:true,filePath:docPath});

        return {
            cli,
            convo,
            src,
            document,
            cwd
        }
    }

    context.subscriptions.push(commands.registerCommand('convo.modules', async () => {

        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }

        const src=ctx.convo.getDebuggingModulesCode();

        const doc=await workspace.openTextDocument({
            language:'source.convo',
            content:src
        })

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.text', async () => {
        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }
        const flat=await ctx.convo.flattenAsync();

        const src=flatConvoMessagesToTextView(flat.messages);

        const doc=await workspace.openTextDocument({
            language:'source.convo',
            content:src
        })

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.vars', async () => {
        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }

        const flat=await ctx.convo.flattenAsync();

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(flat.exe.getUserSharedVars(),createJsonRefReplacer(),4),
        })

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.flat', async () => {
        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }

        const flat=await ctx.convo.flattenAsync();

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(getSerializableFlatConvoConversation(flat),null,4),
        });

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-targets', async () => {
        const document=window.activeTextEditor?.document;
        if(!document){
            return;
        }
        await initConvoCliAsync({
            config:ext.getCliConfig(),
            sourcePath:document.isUntitled?undefined:document.uri.fsPath,
            bufferOutput:true,
            exeCwd:document.uri.scheme==='file'?path.dirname(document.uri.fsPath):undefined,
        })
        const ctx=await getConvoEditorContextAsync();
        if(!ctx?.cwd){
            return;
        }

        const flat=await ctx.convo.flattenAsync();
        const options=getConvoMakeOptionsFromVars(
            document.uri.fsPath,
            ctx.cwd,
            flat.exe.sharedVars
        );
        if(!options){
            return;
        }
        const ctrl=new ConvoMakeCtrl({
            ...options,
            browserInf:new ConvoBrowserCtrl(),
        });
        try{
            const debugOutput=await ctrl.getDebugOutputAsync();
            const doc=await workspace.openTextDocument({
                language:'json',
                content:JSON.stringify(debugOutput,null,4),
            });

            await window.showTextDocument(doc);
        }finally{
            ctrl.dispose();
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-single', async (target?:ConvoMakeExtTarget) => {
        const targetPath=target?.obj.outPath;
        const ctrl=target?.ctrl;
        if(!targetPath || !ctrl){
            return;
        }

        await makeAsync(ctrl.filePath,targetPath);

    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-open', async (target?:ConvoMakeExtTarget|string) => {
        const targetPath=(typeof target === 'string')?target:target?.obj.outPath;
        if(targetPath){
            const doc=await workspace.openTextDocument(Uri.file(targetPath));
            await window.showTextDocument(doc);
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-delete', async (target?:ConvoMakeExtTarget|string) => {
        const targetPath=(typeof target === 'string')?target:target?.obj.outPath;
        if(targetPath){
            const confirm=await window.showWarningMessage(
                `Are you sure you want to delete "${targetPath}"?`,
                {modal:true},
                'Delete'
            );
            if(confirm === 'Delete'){
                await workspace.fs.delete(Uri.file(targetPath),{useTrash:true});
                await ext.scanMakeCtrlsAsync();
            }
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-open', async (build?:ConvoMakeExtBuild|string) => {
        const targetPath=(typeof build === 'string')?build:build?.ctrl.filePath;
        if(targetPath){
            const doc=await workspace.openTextDocument(Uri.file(targetPath));
            await window.showTextDocument(doc);
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-stop', async (build?:ConvoMakeExtBuild|string) => {
        const document=window.activeTextEditor?.document;

        const sourcePath=(typeof build ==='string')?build:(build?.ctrl.filePath??((document?.isUntitled || document?.uri.scheme!=='file')?undefined:document?.uri.fsPath));
        if(!sourcePath){
            return;
        }

        const ctrls=[...ext.makeCtrls];
        for(const ctrl of ctrls){
            if(!ctrl.preview){
                ctrl.dispose();
            }
        }
    }));

    const makeAsync=async (build?:ConvoMakeExtBuild|string,singleFile?:string) => {

        const token=new CancelToken();

        const document=window.activeTextEditor?.document;

        const sourcePath=(typeof build ==='string')?build:(build?.ctrl.filePath??((document?.isUntitled || document?.uri.scheme!=='file')?undefined:document?.uri.fsPath));
        if(!sourcePath){
            return;
        }

        await initConvoCliAsync({
            config:ext.getCliConfig(),
            sourcePath:sourcePath,
            bufferOutput:true,
            exeCwd:path.dirname(sourcePath),
        })
        if(token.isCanceled){return}

        const ctx=await getConvoEditorContextAsync(undefined,sourcePath);
        if(token.isCanceled){return}

        if(!ctx?.cwd){
            return;
        }

        const flat=await ctx.convo.flattenAsync();
        if(token.isCanceled){return}

        const options=getConvoMakeOptionsFromVars(
            sourcePath,
            ctx.cwd,
            flat.exe.sharedVars
        );
        if(!options){
            return;
        }
        const ctrl=new ConvoMakeCtrl({
            ...options,
            //echoMode:true,
            continueReview:singleFile,
            browserInf:new ConvoBrowserCtrl(),
        });
        ext.addMakeCtrl(ctrl);
        token.onCancel(()=>{
            ctrl.dispose();
        })
        commands.executeCommand('convoMakeBuild.focus');
        try{
            await ctrl.buildAsync();
        }finally{
            ctrl.dispose();
        }
    }

    context.subscriptions.push(commands.registerCommand('convo.make',v=>makeAsync(v)));

    context.subscriptions.push(commands.registerCommand('convo.convert', async () => {
        const document=window.activeTextEditor?.document;
        if(!document){
            return;
        }

        let src:string|undefined=undefined;

        if(document.languageId==='source.convo'){
            src=document?.getText();
        }else{
            const selection=window.activeTextEditor?.selection
            if(selection){
                src=document.getText(new Range(selection.start,selection.end));
            }
        }

        if(!src){
            return;
        }

        const cli=await createConvoCliAsync({
            config:ext.getCliConfig(),
            bufferOutput:true,
            exeCwd:document.uri.scheme==='file'?path.dirname(document.uri.fsPath):undefined,
            sourcePath:document.isUntitled?undefined:document.uri.fsPath,
        });

        try{

            const convo=cli.convo;
            convo.append(src,{disableAutoFlatten:true,filePath:document.isUntitled?undefined:document.uri.fsPath});
            const flat=await convo.flattenAsync();
            const converted=await convo.toModelInputAsync(flat);

            const doc=await workspace.openTextDocument({
                language:'json',
                content:JSON.stringify(converted,createJsonRefReplacer(),4),
            })

            await window.showTextDocument(doc);
        }finally{
            cli.dispose();
        }
    }));

    const completeAsync=async (cliOptions:ConvoCliOptions={}) => {

        const document=window.activeTextEditor?.document;

        if(document?.languageId!=='source.convo'){

            let createdNew=false;

            const selection=window.activeTextEditor?.selection
            if(document && selection){
                const text=document.getText(new Range(selection.start,selection.end));
                if(text){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:text})
                    await window.showTextDocument(doc);
                    createdNew=true;
                }
            }

            if(!createdNew){

                const option=await window.showWarningMessage(
                    'Conversation completion requires a .convo file', 'Complete example', 'Create empty', 'Dismiss'
                );

                if(option==='Create empty'){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:'> system\nsystem prompt here\n\n> user\nprompt here\n'})
                    await window.showTextDocument(doc);
                    return;
                }else if(option==='Complete example'){
                    const doc=await workspace.openTextDocument({language:'source.convo',content:example})
                    await window.showTextDocument(doc);
                }else{
                    return;
                }
            }

        }

        await window.withProgress({
            location: ProgressLocation.Notification,
            title: "Completing conversation",
            cancellable: true
        }, async (progress, token) => {

            const document=window.activeTextEditor?.document;
            if(!document){
                return;
            }

            const src=document?.getText();
            if(!src){
                return;
            }
            progress.report({ message:document.uri.path });

            let done=false;

            const startLength=src.length;
            let tmpAppend='';

            const lock=new Lock(1);

            const setCodeAsync=async (code:string,isFinal:boolean,append:boolean)=>{
                if(token.isCancellationRequested){
                    return;
                }
                const release=await lock.waitAsync();
                try{
                    if(done && !isFinal){
                        return;
                    }
                    if(!isFinal && tmpAppend){
                        code=tmpAppend+'\n\n'+code;
                    }
                    const editor=await window.showTextDocument(document);

                    await editor.edit(builder=>{
                        if(done && !isFinal){
                            return;
                        }
                        const all=append?
                            new Range(document.positionAt(startLength),document.positionAt(document.getText().length)):
                            new Range(document.positionAt(0),document.positionAt(document.getText().length));
                        builder.replace(all,code);
                    })
                }finally{
                    release();
                }
            }

            try{


                let msg=`\n\n// completing...`;
                await setCodeAsync(msg,false,true);

                const cli=await createConvoCliAsync({
                    config:ext.getCliConfig(),
                    inline:src,
                    sourcePath:document.isUntitled?undefined:document.uri.fsPath,
                    bufferOutput:true,
                    exeCwd:document.uri.scheme==='file'?path.dirname(document.uri.fsPath):undefined,
                    allowExec:async (command)=>{
                        if(token.isCancellationRequested){
                            return false;
                        }
                        const option=await window.showWarningMessage(
                            `exec > ${command}`, 'Deny', 'Allow'
                        );
                        tmpAppend+=`\n// exec > ${command.split('\n').join(' ')}`;
                        await setCodeAsync(msg,false,true);
                        return option==='Allow';
                    },
                    ...cliOptions,
                });

                token.onCancellationRequested(()=>{
                    cli.convo.dispose();
                })

                let firstAppend=true;
                cli.convo.onAppend.subscribe(v=>{
                    if(firstAppend){
                        firstAppend=false;
                        return;
                    }
                    tmpAppend+='\n\n'+v.text
                    setCodeAsync(msg,false,true);
                })

                await cli.executeAsync();
                done=true;

                if(token.isCancellationRequested){
                    return;
                }
                await setCodeAsync(cli.buffer.join('')+'\n\n> user\n',true,false);
            }catch(ex){
                const err=JSON.stringify({...(typeof ex === 'object'?ex:null),message:getErrorMessage(ex)},null,4);
                const tryMsg='Try adding an OpenAI or AWS Bedrock API key to the Convo-Lang extension settings.'
                const suggestConfig=/(401|403|unauthorized|denied|api\s*key)/i.test(err);
                await setCodeAsync(`${src}\n\n> result\n${convoResultErrorName}=${err}${suggestConfig?`\n\n// ${tryMsg}\n// Click the settings (🛠️) icon above the top right of this file`:''}`,true,false);
                if(suggestConfig){
                    window.showInformationMessage(
                        tryMsg,
                        'Open Convo-Lang Settings'
                    ).then(selection => {
                        if (selection === 'Open Convo-Lang Settings') {
                            commands.executeCommand('workbench.action.openSettings',`@ext:${extensionPublisher}.convo-lang-tools`);
                        }
                    });
                }
            }finally{
                done=true;
            }


        });

    }

    context.subscriptions.push(commands.registerCommand('convo.open-settings',()=>{
        commands.executeCommand('workbench.action.openSettings',`@ext:${extensionPublisher}.convo-lang-tools`);
    }));

    context.subscriptions.push(commands.registerCommand('convo.complete',async ()=>{
        await completeAsync();
    }));

    const splitAsync=async (complete:boolean)=>{
        const document=window.activeTextEditor?.document;
        if(document?.languageId!=='source.convo'){
            return;
        }

        const selection=window.activeTextEditor?.selection;
        let text:string|undefined;
        if(selection){
            text=document.getText(new Range(selection.start,selection.end));
        }

        if(!text){
            text=document.getText();
        }

        let saveTo:string|undefined;
        if(!document.isUntitled && document.uri.scheme==='file'){
            const dir=path.dirname(document.uri.path);

            let fileName=path.basename(document.uri.path);
            let n=1;
            const match=/-(\d{4}-\d{2}-\d{2}-(\d+))\.convo/i.exec(fileName);
            if(match){
                n=Number(match[2])+1;
                fileName=fileName.substring(0,match.index);
            }else if(fileName.toLowerCase().endsWith('.convo')){
                fileName=fileName.substring(0,fileName.length-6);
            }
            while(true){
                const d=new Date();
                const name=`${
                    fileName
                }-${
                    d.getFullYear()
                }-${
                    (d.getMonth()+1).toString().padStart(2,'0')
                }-${
                    d.getDate().toString().padStart(2,'0')
                }-${
                    n.toString().padStart(4,'0')
                }.convo`;
                saveTo=path.join(dir,name);
                if(!await pathExistsAsync(saveTo)){
                    break;
                }
                n++;
            }

        }
        let doc:TextDocument;

        if(saveTo){
            const uri=Uri.file(saveTo);
            await workspace.fs.writeFile(Uri.file(saveTo),Buffer.from(text,'utf8') as Uint8Array);
            doc=await workspace.openTextDocument(uri);
        }else{
            doc=await workspace.openTextDocument({language:'source.convo',content:text});
        }

        await window.showTextDocument(doc);

        if(complete){
            await completeAsync();
        }
    }
    context.subscriptions.push(commands.registerCommand('convo.split-complete',async ()=>{
        await splitAsync(true);
    }));
    context.subscriptions.push(commands.registerCommand('convo.split',async ()=>{
        await splitAsync(false);
    }));

    context.subscriptions.push(commands.registerCommand('convo.refresh-make-targets', async () => {
        await ext.scanMakeCtrlsAsync();
    }));

    context.subscriptions.push(commands.registerCommand('convo.list-models', async () => {

        const cli=await createConvoCliAsync({config:ext.getCliConfig()});
        try{
            const models=await cli.convo.getAllModelsAsync();

            const doc=await workspace.openTextDocument({
                language:'json',
                content:JSON.stringify(models,null,4),
            })

            await window.showTextDocument(doc);
        }finally{
            cli.dispose();
        }
    }));

    let configChangeIv:any;
    let showingConfigChange=false;
    workspace.onDidChangeConfiguration((e)=>{
        if(showingConfigChange){
            return;
        }
        if(e.affectsConfiguration('convo')){
            clearTimeout(configChangeIv);
            configChangeIv=setTimeout(()=>{
                showingConfigChange=true;
                window.showInformationMessage('Convo-Lang setting changed. Reload window to apply changes?','Reload').then(selection => {
                    showingConfigChange=false;
                    if(selection==='Reload'){
                        commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            },1600);
        }
    })
}
