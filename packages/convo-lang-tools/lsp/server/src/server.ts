/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { parseConvoCode } from '@convo-lang/convo-lang';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity, DidChangeConfigurationNotification, InitializeParams, InitializeResult, ProposedFeatures, TextDocumentSyncKind, TextDocuments, createConnection } from 'vscode-languageserver/node';



const connection=createConnection(ProposedFeatures.all);

const documents:TextDocuments<TextDocument>=new TextDocuments(TextDocument);

let hasConfigurationCapability=false;

connection.onInitialize((params:InitializeParams) => {
	const capabilities=params.capabilities;

	hasConfigurationCapability=!!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);

	const result:InitializeResult={
		capabilities:{
			textDocumentSync:TextDocumentSyncKind.Incremental,
		}
	};

	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type,undefined);
	}
});


documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument:TextDocument):Promise<void> {
	const text=textDocument.getText();

	const diagnostics:Diagnostic[]=[];

    const r=parseConvoCode(text);
    if(r.error){
        const diagnostic:Diagnostic={
			severity:DiagnosticSeverity.Error,
			range:{
				start:textDocument.positionAt(r.error.index),
				end:textDocument.positionAt(r.error.index+1)
			},
			message:r.error.message,
			source:'convo'
		};
		diagnostics.push(diagnostic);
    }

	connection.sendDiagnostics({uri:textDocument.uri,diagnostics});
}

documents.listen(connection);
connection.listen();
