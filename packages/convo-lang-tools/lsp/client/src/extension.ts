/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { Conversation, convoDefaultModelParam, convoResultErrorName, flatConvoMessagesToTextView, getSerializableFlatConvoConversation, openAiApiKeyParam, openAiBaseUrlParam, parseConvoCode } from '@convo-lang/convo-lang';
import { awsBedrockApiKeyParam, awsBedrockProfileParam, awsBedrockRegionParam } from '@convo-lang/convo-lang-bedrock';
import { ConvoCli, ConvoCliConfig, createConvoCliAsync } from '@convo-lang/convo-lang-cli';
import { Lock, createJsonRefReplacer, deleteUndefined, getErrorMessage } from '@iyio/common';
import { pathExistsAsync } from '@iyio/node-common';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, Range, Selection, TextDocument, Uri, commands, languages, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ConvoDocumentLinkProvider } from './link-provider';

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

    registerCommands(context);
    startLsp(context);

    context.subscriptions.push(
  languages.registerDocumentLinkProvider(
    { pattern: '**/*.convo' },
    new ConvoDocumentLinkProvider()
  )
);
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

const registerCommands=(context:ExtensionContext)=>{

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

    const getConvoEditorContextAsync=async ():Promise<{cli:ConvoCli,src:string,convo:Conversation,document:TextDocument}|undefined>=>{
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
            config:getCliConfig(),
            bufferOutput:true,
            exeCwd:document.uri.scheme==='file'?path.dirname(document.uri.fsPath):undefined,
            sourcePath:document.isUntitled?undefined:document.uri.fsPath,
        });

        const convo=cli.convo;
        convo.append(src,{disableAutoFlatten:true,filePath:document.isUntitled?undefined:document.uri.fsPath});

        return {
            cli,
            convo,
            src,
            document
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
            config:getCliConfig(),
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

    const completeAsync=async () => {

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
                    config:getCliConfig(),
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
                    }
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
                const suggestConfig=/(40\d|unauthorized|denied|api\s*key)/i.test(err);
                await setCodeAsync(`${src}\n\n> result\n${convoResultErrorName}=${err}${suggestConfig?`\n\n// ${tryMsg}\n// Click the settings (🛠️) icon above the top right of this file`:''}`,true,false);
                if(suggestConfig){
                    window.showInformationMessage(
                        tryMsg,
                        'Open Convo-Lang Settings'
                    ).then(selection => {
                        if (selection === 'Open Convo-Lang Settings') {
                            commands.executeCommand('workbench.action.openSettings','@ext:iyio.convo-lang-tools');
                        }
                    });
                }
            }finally{
                done=true;
            }


        });

    }

    context.subscriptions.push(commands.registerCommand('convo.open-settings',()=>{
        commands.executeCommand('workbench.action.openSettings','@ext:iyio.convo-lang-tools');
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

    context.subscriptions.push(commands.registerCommand('convo.list-models', async () => {

        const cli=await createConvoCliAsync({config:getCliConfig()});
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

    const getCliConfig=():ConvoCliConfig=>{
        // Read the 'convo.openAiApiKey' setting from the extension configuration
        const config=workspace.getConfiguration('convo');

        return {
            overrideEnv:true,
            defaultModel:config.get<string>('defaultModel')?.trim()||undefined,
            env:deleteUndefined({
                [openAiApiKeyParam.typeName]:config.get<string>('openAiApiKey')?.trim()||undefined,
                [openAiBaseUrlParam.typeName]:config.get<string>('openAiBaseUrl')?.trim()||undefined,

                [awsBedrockProfileParam.typeName]:config.get<string>('awsBedrockProfile')?.trim()||undefined,
                [awsBedrockRegionParam.typeName]:config.get<string>('awsBedrockRegion')?.trim()||undefined,
                [awsBedrockApiKeyParam.typeName]:config.get<string>('awsBedrockApiKey')?.trim()||undefined,

                [convoDefaultModelParam.typeName]:config.get<string>('defaultModel')?.trim()||undefined,
            }) as Record<string,string>
        };
    }
}
