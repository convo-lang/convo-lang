import { Conversation, ConvoMakeTargetRebuild, FlattenConvoOptions, convoResultErrorName, convoRoles, convoVars, flatConvoMessagesToTextView, getSerializableFlatConvoConversation, parseConvoCode } from '@convo-lang/convo-lang';
import { ConvoBrowserCtrl } from "@convo-lang/convo-lang-browser";
import { ConvoCli, ConvoCliOptions, createConvoCliAsync, initConvoCliAsync } from '@convo-lang/convo-lang-cli';
import { ConvoMakeCtrl, getConvoMakeOptionsFromVars } from "@convo-lang/convo-lang-make";
import { CancelToken, Lock, LogLevel, createJsonRefReplacer, getDirectoryName, getErrorMessage, getFileExt, getFileName, joinPaths, normalizePath } from '@iyio/common';
import { pathExistsAsync, readFileAsStringAsync } from '@iyio/node-common';
import { realpath } from 'fs/promises';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, Range, Selection, TextDocument, Uri, ViewColumn, WorkspaceEdit, commands, window, workspace } from 'vscode';
import { extensionPublisher } from './build-const.js';
import { OutputTagCodeLensArgs, getCodeBlockOutputAsync, getParsedOutputTagGroups, writeFileContentAsync } from './code-block-lib.js';
import { notifyCompletionAsync } from './completion-notification.js';
import { ConvoCliShell } from './ConvoCliShell.js';
import { ConvoExt } from './ConvoExt.js';
import { ConvoMakeExtBuild } from './make/ConvoMakeExtBuild.js';
import { ConvoMakeExtTarget } from './make/ConvoMakeExtTarget.js';
import { registerOutTagCommands } from './output-tag-code-lens.js';
import { revealDocumentEndAsync } from './util.js';

export const registerCompletionCommands=(context:ExtensionContext,ext:ConvoExt)=>{

    registerOutTagCommands(context,ext);

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

    const getFlat=async (options?:FlattenConvoOptions)=>{
        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }

        const flat=getSerializableFlatConvoConversation(await ctx.convo.flattenAsync(undefined,options),true);
        const obj:any={}
        for(const e in flat){
            const v=(flat as any)[e];
            if((typeof v !== 'object') || v===null){
                obj[e]=v;
            }
        }
        obj.messages=flat.messages;
        obj.vars=(flat as any).vars;
        for(const e in flat){
            if(e in obj){
                continue;
            }
            const v=(flat as any)[e];
            if((typeof v === 'object') && v!==null){
                obj[e]=v;
            }
        }
        return obj;
    }

    context.subscriptions.push(commands.registerCommand('convo.flat-all', async () => {

        const obj=await getFlat({nodeBehavior:'keepAll'});

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(obj,null,4),
        });

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.flat', async () => {

        const obj=await getFlat();

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(obj,null,4),
        });

        await window.showTextDocument(doc);
    }));

    context.subscriptions.push(commands.registerCommand('convo.messages', async () => {
        const ctx=await getConvoEditorContextAsync();
        if(!ctx){
            return;
        }

        const doc=await workspace.openTextDocument({
            language:'json',
            content:JSON.stringify(ctx.convo.messages,createJsonRefReplacer(),4),
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
            captureConsoleLogLevel:defaultMakeLogLevel,
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

    context.subscriptions.push(commands.registerCommand('convo.make-target-sync', async (target?:ConvoMakeExtTarget) => {
        const targetPath=target?.obj.outPath;
        const ctrl=target?.ctrl;
        if(!targetPath || !ctrl){
            return;
        }

        await makeAsync({build:ctrl.filePath,sync:targetPath});

    }));

    context.subscriptions.push(commands.registerCommand('convo.make-sync', async (target?:ConvoMakeExtBuild) => {
        const ctrl=target?.obj;
        if(!ctrl){
            return;
        }

        await makeAsync({build:ctrl.filePath,sync:true});

    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-open-convo', async (target?:ConvoMakeExtTarget) => {
        const convoFile=target?.obj.convoFile;
        if(convoFile){
            const document=await workspace.openTextDocument(Uri.file(convoFile));
            const editor=await window.showTextDocument(document);
            const pos=document.positionAt(document.getText().length);
            editor.selection=new Selection(pos,pos);
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-single', async (target?:ConvoMakeExtTarget) => {
        const targetPath=target?.obj.outPath;
        const ctrl=target?.ctrl;
        if(!targetPath || !ctrl){
            return;
        }

        await makeAsync({build:ctrl.filePath,rebuild:targetPath});

    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-single-review', async (target?:ConvoMakeExtTarget) => {
        const targetPath=target?.obj.outPath;
        const ctrl=target?.ctrl;
        if(!targetPath || !ctrl){
            return;
        }

        await makeAsync({build:ctrl.filePath,rebuild:targetPath,forceReview:true});

    }));

    context.subscriptions.push(commands.registerCommand('convo.make-target-open', async (target?:ConvoMakeExtTarget|string) => {
        const targetPath=(typeof target === 'string')?target:target?.obj.outPath;
        if(targetPath){
            const doc=await workspace.openTextDocument(Uri.file(targetPath));
            await window.showTextDocument(doc);
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.make-delete-all', async (target?:ConvoMakeExtBuild) => {
        const ctrl=target?.obj;
        if(!ctrl){
            return;
        }

        const confirm=await window.showWarningMessage(
            `Delete outputs of ${getFileName(ctrl.filePath)}\n\nAre you sure you want to delete all outputs of "${ctrl.filePath}"?`,
            {modal:true},
            'Delete'
        );
        if(confirm === 'Delete'){
            const targets=await target.getTargetsAsync(true);
            const confirm=await window.showWarningMessage(
                `Are you sure you want to delete ${targets.length} outputs?`,
                {modal:true},
                'Delete'
            );
            if(confirm==='Delete'){
                for(const t of targets){
                    await workspace.fs.delete(Uri.file(t.obj.outPath),{useTrash:true});
                }
                await ext.scanMakeCtrlsAsync();
            }
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

    interface MakeOptions
    {
        build?:ConvoMakeExtBuild|string;
        rebuild?:boolean|ConvoMakeTargetRebuild|string|(string|ConvoMakeTargetRebuild)[];
        sync?:string|boolean;
        forceReview?:boolean;
    }
    const makeAsync=async ({
        build,
        rebuild,
        sync,
        forceReview
    }:MakeOptions) => {

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
            captureConsoleLogLevel:defaultMakeLogLevel,
            ...options,
            forceReview,
            rebuild,
            browserInf:new ConvoBrowserCtrl(),
            shell:new ConvoCliShell(),
        });
        ext.addMakeCtrl(ctrl);
        token.onCancel(()=>{
            ctrl.dispose();
        })
        commands.executeCommand('convoMakeBuild.focus');
        try{
            if(sync===true){
                await ctrl.syncAllTargetCachesWithOutput();
            }else if(sync){
                await ctrl.syncTargetCacheWithOutput(sync);
            }else{
                await ctrl.buildAsync();
            }
        }finally{
            ctrl.dispose();
        }
        if(sync){
            await ext.scanMakeCtrlsAsync();
        }
    }

    context.subscriptions.push(commands.registerCommand('convo.make',v=>makeAsync({build:v})));

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

    const completeAsync=async (cliOptions:ConvoCliOptions={},{
        nextCommand,
        preventDefaultNextCommand=false,
        progressTitle,
        progressMessage,
        onComplete,
    }:CompletionOptions={}) => {

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
            title: cliOptions.graph?"Completing Graph":(progressTitle??"Completing conversation"),
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
            progress.report({ message:progressMessage?`${document.uri.path} · ${progressMessage}`:document.uri.path });

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
                    const getRange=()=>append?
                        new Range(document.positionAt(startLength),document.positionAt(document.getText().length)):
                        new Range(document.positionAt(0),document.positionAt(document.getText().length));

                    if(isFinal){
                        return await applyFinalEditAsync(document,code,getRange());
                    }

                    try{
                        const edit=new WorkspaceEdit();
                        edit.replace(document.uri,getRange(),code);
                        if(await workspace.applyEdit(edit)){
                            await revealDocumentInVisibleEditorsAsync(document);
                        }
                    }catch{
                        //
                    }
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
                const lastMsg=cli.convo.messages[cli.convo.messages.length-1];
                const applied=await setCodeAsync(cli.buffer.join('')+(lastMsg?.role===convoRoles.goto?'\n':'\n\n> user\n'),true,false);
                if(applied){
                    void notifyCompletionAsync(document);
                }

                if(nextCommand){
                    commands.executeCommand(nextCommand);
                }
                if(!preventDefaultNextCommand){
                    commands.executeCommand('convo.code-blocks-refresh');
                }

                if(applied && onComplete){
                    try{
                        await onComplete(document);
                    }catch(ex){
                        console.error('Completion onComplete handler failed',ex);
                        void window.showErrorMessage(`Failed to apply completion result. ${getErrorMessage(ex)}`);
                    }
                }
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

    const rebuildAsync=async (document:TextDocument,getRebuildOptions:(outPath:string,makePath:string)=>ConvoMakeTargetRebuild)=>{
        const text=document.getText();
        const conversation=new Conversation();
        conversation.append(text);
        const vars=(await conversation.flattenAsync()).exe.sharedVars;
        const root=vars[convoVars.__makeRoot];
        const file=vars[convoVars.__makeFile];
        const out=vars[convoVars.__makeOut];

        const makePath=normalizePath(await realpath(joinPaths(getDirectoryName(document.fileName),root,file)));
        const outPath=normalizePath(await realpath(joinPaths(getDirectoryName(document.fileName),root,out)));

        await makeAsync({build:makePath,rebuild:getRebuildOptions(outPath,makePath)});

        const editor=await window.showTextDocument(document);
        const pos=document.positionAt(document.getText().length);
        editor.selection=new Selection(pos,pos);
    }

    context.subscriptions.push(commands.registerCommand('convo.complete',async ()=>{

        const document=window.activeTextEditor?.document;
        const ext=getFileExt(document?.fileName,false,true);

        switch(ext){

            case 'convo-make-target':{

                if(!document || !await document.save()){
                    return;
                }

                await rebuildAsync(document,(outPath)=>({
                    path:outPath,
                    continueConversation:true,
                }));

                break;
            }

            default:
                await completeAsync();
                break;
        }

    }));

    context.subscriptions.push(commands.registerCommand('convo.complete-graph', async () => {
        await completeAsync({graph:true})
    }));

    context.subscriptions.push(commands.registerCommand('convo.complete-apply-all', async () => {
        await completeAsync({},{
            progressTitle:'Completing and applying',
            progressMessage:'File blocks will be written and scripts will be executed automatically',
            onComplete:applyLastAssistantBlocksAsync,
        });
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
        const document=window.activeTextEditor?.document;
        const ext=getFileExt(document?.fileName,false,true);

        switch(ext){

            case 'convo-make-target':{

                if(!document || !await document.save()){
                    return;
                }

                await rebuildAsync(document,(outPath)=>({
                    path:outPath,
                }));

                break;
            }

            default:
                await splitAsync(true);
                break;
        }
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
        if(e.affectsConfiguration('convo') && !e.affectsConfiguration('convo.notifyOnCompletion')){
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

interface CompletionOptions
{
    nextCommand?:string;
    preventDefaultNextCommand?:boolean;
    /**
     * Title of the progress notification
     */
    progressTitle?:string;
    /**
     * Message appended to the document path in the progress notification
     */
    progressMessage?:string;
    /**
     * Called after the completion has been applied to the document
     */
    onComplete?:(document:TextDocument)=>Promise<void>|void;
}


const defaultMakeLogLevel=LogLevel.log|LogLevel.warn|LogLevel.error;

/**
 * Applies the final completion edit in the background without focusing the document. The
 * document is saved after the edit and visible editors of the document are scrolled to the end.
 * If the edit fails the response is opened in a new untitled convo document. Returns true if the
 * edit was applied to the document.
 */
const applyFinalEditAsync=async (document:TextDocument,code:string,range:Range):Promise<boolean>=>{
    const edit=new WorkspaceEdit();
    edit.replace(document.uri,range,code);

    let applied=false;
    try{
        applied=await workspace.applyEdit(edit);
    }catch(ex){
        console.error('Failed to apply completion edit',ex);
    }

    if(!applied){
        const fallback=await workspace.openTextDocument({
            language:'source.convo',
            content:`// Unable to append the following response to ${path.basename(document.fileName)}\n\n${code}`,
        });
        await window.showTextDocument(fallback,{
            preview:false,
            preserveFocus:true,
            viewColumn:ViewColumn.Beside,
        });
        return false;
    }

    const doc=await workspace.openTextDocument(document.uri);
    if(!doc.isUntitled){
        await doc.save();
    }

    await revealDocumentInVisibleEditorsAsync(doc);
    return true;
}

/**
 * Scrolls all visible editors of the given document to the end without changing focus
 */
const revealDocumentInVisibleEditorsAsync=async (document:TextDocument):Promise<void>=>{
    const uri=document.uri.toString();
    for(const editor of window.visibleTextEditors){
        if(editor.document.uri.toString()===uri){
            await revealDocumentEndAsync(editor);
        }
    }
}

/**
 * Writes the file blocks and runs the script blocks of the last assistant message of the given
 * document in the order they appear. Find-replace blocks targeting the same file are combined into
 * a single write. Scripts ask for confirmation unless `convo.alwaysRunOutputScripts` is true.
 * Stops applying blocks if a find-replace target is not found.
 */
const applyLastAssistantBlocksAsync=async (document:TextDocument):Promise<void>=>{
    const doc=await workspace.openTextDocument(document.uri);
    const messages=parseConvoCode(doc.getText(),{enableCodeBlocks:true}).result??[];

    let assistantIndex=-1;
    for(let i=messages.length-1;i>=0;i--){
        if(messages[i]?.role===convoRoles.assistant){
            assistantIndex=i;
            break;
        }
    }

    const group=getParsedOutputTagGroups(doc).find(g=>g.messageIndex===assistantIndex);
    if(!group?.tags.length){
        void window.showInformationMessage('No code blocks found in the last assistant message');
        return;
    }

    const replaced=new Set<string>();
    const written=new Set<string>();
    for(const tag of group.tags){
        const args:OutputTagCodeLensArgs={
            targetPath:tag.targetPath,
            index:tag.index,
            cwd:tag.cwd,
            codeBlock:tag.codeBlock,
            documentUri:doc.uri,
        };
        if(tag.type==='file'){
            if(tag.codeBlock.findReplace){
                if(replaced.has(tag.targetPath)){
                    continue;
                }
                replaced.add(tag.targetPath);
            }
            const content=await getCodeBlockOutputAsync(args,{failOnNotFound:true});
            if(content===undefined){
                void window.showErrorMessage(`Stopped applying code blocks at ${path.basename(tag.targetPath)}`);
                return;
            }
            if(!await writeFileContentAsync(tag.targetPath,content)){
                void window.showErrorMessage(`Failed to write output to ${tag.targetPath}. Stopped applying code blocks.`);
                return;
            }
            written.add(tag.targetPath);
        }else if(tag.type==='shell'){
            await commands.executeCommand('convo.output-tag-execute-shell',args);
        }
    }

    void window.showInformationMessage(`Wrote ${written.size} file${written.size===1?'':'s'}`);
}

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