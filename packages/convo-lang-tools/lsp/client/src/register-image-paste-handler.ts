import { promises as fs } from 'fs';
import { extname } from 'path';
import { DocumentDropOrPasteEditKind, DocumentPasteEdit, DocumentPasteEditProvider, ExtensionContext, languages, Selection, TextEditorRevealType, Uri, window } from 'vscode';
import { ConvoExt } from './ConvoExt.js';

const imageMimeTypes=[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/heic',
    'image/heif',
    'image/avif',
];

const extToMime:Record<string,string>={
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.gif':'image/gif',
    '.webp':'image/webp',
    '.svg':'image/svg+xml',
    '.bmp':'image/bmp',
    '.tif':'image/tiff',
    '.tiff':'image/tiff',
    '.ico':'image/x-icon',
    '.heic':'image/heic',
    '.heif':'image/heif',
    '.avif':'image/avif',
};

const pastedAltText='image';

const tryCreateMarkdownImageAsync=async (dataTransfer:ReadonlyMap<string,any>):Promise<string|undefined>=>
{
    for(const mimeType of imageMimeTypes){
        const item=dataTransfer.get(mimeType);
        if(!item){
            continue;
        }

        const file=await item.asFile?.();
        const bytes=file?
            await file.data()
        :
            await item.asBytes?.();

        if(!bytes){
            continue;
        }

        const base64=Buffer.from(bytes).toString('base64');
        return `![${pastedAltText}](data:${mimeType};base64,${base64})`;
    }

    const uriListItem=dataTransfer.get('text/uri-list');
    const uriList=await uriListItem?.asString?.() as string|undefined;
    if(uriList){
        const uris=uriList
            .split(/\r?\n/g)
            .map(v=>v.trim())
            .filter(v=>v && !v.startsWith('#'));

        for(const value of uris){
            try{
                const uri=Uri.parse(value);
                if(uri.scheme!=='file'){
                    continue;
                }

                const mimeType=extToMime[extname(uri.fsPath).toLowerCase()];
                if(!mimeType){
                    continue;
                }

                const bytes=await fs.readFile(uri.fsPath);
                const base64=bytes.toString('base64');
                return `![${pastedAltText}](data:${mimeType};base64,${base64})`;
            }catch{
            }
        }
    }

    return;
}

export const registerImagePasteHandler=(context:ExtensionContext,ext:ConvoExt)=>
{
    void ext;

    const provider:DocumentPasteEditProvider={
        async provideDocumentPasteEdits(
            document,
            ranges,
            dataTransfer
        ){
            void document;
            void ranges;

            const map=new Map<string,any>();
            for(const [key,value] of dataTransfer){
                map.set(key,value);
            }

            const text=await tryCreateMarkdownImageAsync(map);
            if(!text){
                return;
            }
            const editor=window.activeTextEditor;
            if(editor && editor.document===document && editor.selections.length){
                const selections=editor.selections.map(selection=>{
                    const startOffset=document.offsetAt(selection.start);
                    return startOffset;
                });
                setTimeout(()=>{
                    if(editor.document===document){
                        editor.selections=selections.map(startOffset=>{
                            const altStart=document.positionAt(startOffset+2);
                            const altEnd=document.positionAt(startOffset+2+pastedAltText.length);
                            return new Selection(altStart,altEnd);
                        });
                        editor.revealRange(
                            new Selection(editor.selections[0]!.start,editor.selections[0]!.start),
                            TextEditorRevealType.InCenterIfOutsideViewport
                        );
                    }
                },50);
            }
            

            return [
                new DocumentPasteEdit(text,'Paste image as markdown data URL',DocumentDropOrPasteEditKind.Text)
            ];
        }
    };

    context.subscriptions.push(languages.registerDocumentPasteEditProvider(
        {language:'source.convo'},
        provider,
        {
            providedPasteEditKinds:[DocumentDropOrPasteEditKind.Text],
            pasteMimeTypes:[
                ...imageMimeTypes,
                'text/uri-list',
            ],
        }
    ));
}
