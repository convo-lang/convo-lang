import { getDirectoryName, getUriProtocol, isRooted, joinPaths, normalizePath } from '@iyio/common';
import { DocumentLink, DocumentLinkProvider, Range, TextDocument, Uri } from 'vscode';

export const convoVirtualDocumentScheme='convo-virtual-file';

export class ConvoDocumentLinkProvider implements DocumentLinkProvider
{
    provideDocumentLinks(document:TextDocument):DocumentLink[]
    {
        const links:DocumentLink[]=[];
        const regex=/(^[ \t]*@import[ \t]+)(.*)/g;
        for(let line=0;line<document.lineCount;line++){
            const text=document.lineAt(line).text;
            let match:RegExpExecArray|null;
            while((match=regex.exec(text))){
                let uri=/(^| |\t)(\S*)/.exec(match[2]??'')?.[2];
                if(!uri || uri.startsWith('!')){
                    continue;
                }
                const start=match.index+(match[1]?.length??0);
                const end=start+uri.length;
                const range=new Range(line,start,line,end);
                const protocol=getUriProtocol(uri);

                if(protocol==='std'){
                    links.push(new DocumentLink(range,Uri.parse(`${convoVirtualDocumentScheme}:${encodeURIComponent(uri)}`)));
                    continue;
                }

                if(!isRooted(uri) && !protocol && !document.isUntitled){
                    uri=normalizePath(joinPaths(getDirectoryName(document.fileName),uri));
                }

                links.push(new DocumentLink(range,Uri.parse(uri)));
            }
        }
        return links;
    }
}

