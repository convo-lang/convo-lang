import type MarkdownIt from 'markdown-it';
import * as path from 'path';
import { ExtensionContext, languages, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { createConvoPathCompletionProvider } from './autocomplete-provider.js';
import { registerCompletionCommands } from './completion-provider.js';
import { registerConvoCodeBlockView } from './convo-code-block-view.js';
import { registerConvoStdDocumentProvider } from './convo-std-document-provider.js';
import { ConvoExt } from './ConvoExt.js';
import { createFoldingProviders } from './folding-provider.js';
import { ConvoDocumentLinkProvider } from './link-provider.js';
import { ConvoMakeExtTree } from './make/ConvoMakeExtTree.js';
import { convoMarkdownPreviewPlugin } from './markdown-preview.js';
import { OutputTagCodeLensProvider } from './output-tag-code-lens.js';
import { registerImagePasteHandler } from './register-image-paste-handler.js';
import { registerTypingHandler } from './typing-handler.js';

let client:LanguageClient;


export function activate(context:ExtensionContext){

    const ext=new ConvoExt();

    registerCompletionCommands(context,ext);
    registerTypingHandler(context);
    registerImagePasteHandler(context,ext);
    registerConvoCodeBlockView(context,ext);
    registerConvoStdDocumentProvider(context);
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
        'source.convo',
        new ConvoDocumentLinkProvider()
    ));
    context.subscriptions.push(languages.registerCodeLensProvider(
        'source.convo',
        new OutputTagCodeLensProvider()
    ));
    context.subscriptions.push(languages.registerCompletionItemProvider(
        {language:'source.convo',scheme:'file'},
        createConvoPathCompletionProvider(),
        '.',
        '@',
        '/',
        '\\'
    ));

    context.subscriptions.push(...createFoldingProviders());
    return {
        extendMarkdownIt(md:MarkdownIt) {
            return md.use(convoMarkdownPreviewPlugin);
        }
    }
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
