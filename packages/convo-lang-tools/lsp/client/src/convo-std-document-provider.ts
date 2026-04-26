import { getStdConvoImportAsync } from '@convo-lang/convo-lang';
import { removeUriProtocol } from '@iyio/common';
import { CancellationToken, Event, EventEmitter, ExtensionContext, TextDocumentContentProvider, Uri, workspace } from 'vscode';
import { convoVirtualDocumentScheme } from './link-provider';


export class ConvoStdDocumentContentProvider implements TextDocumentContentProvider
{
    private readonly changeEmitter=new EventEmitter<Uri>();

    public get onDidChange():Event<Uri>
    {
        return this.changeEmitter.event;
    }

    private loadedContent='';

    public provideTextDocumentContent(uri:Uri,_token:CancellationToken):string
    {
        const importUri=decodeURIComponent(uri.path.startsWith('/')?uri.path.substring(1):uri.path);
        return this.loadedContent||`// Loading ${importUri}`;
    }

    public async loadContentAsync(uri:Uri)
    {
        const mod=await getStdConvoImportAsync(removeUriProtocol(uri.fsPath));
        this.loadedContent=mod?.convo??`// empty ${uri.fsPath}`;
        this.changeEmitter.fire(uri);
    }
}

export const registerConvoStdDocumentProvider=(context:ExtensionContext)=>{
    const provider=new ConvoStdDocumentContentProvider();

    context.subscriptions.push(
        workspace.registerTextDocumentContentProvider(convoVirtualDocumentScheme,provider),
        workspace.onDidOpenTextDocument((document)=>{
            if(document.uri.scheme!==convoVirtualDocumentScheme){
                return;
            }
            provider.loadContentAsync(document.uri).catch((ex)=>{
                console.error('Failed to provided content for convo std import',ex);
            });
        }),
    );
};
