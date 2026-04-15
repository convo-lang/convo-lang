import { Disposable, ExtensionContext, Position, Range, Selection, TextDocument, TextEditor, commands, window } from 'vscode';

const defaultTypeCommand='default:type';
const defaultTabCommand='tab';

export const registerTypingHandler=(context:ExtensionContext)=>{
    let isHandlingType=false;
    let isHandlingTab=false;

    const typeDisposable=commands.registerCommand('type',async (args:{text:string})=>{
        if(isHandlingType){
            await commands.executeCommand(defaultTypeCommand,args);
            return;
        }

        isHandlingType=true;
        try{
            const editor=window.activeTextEditor;
            if(!editor){
                await commands.executeCommand(defaultTypeCommand,args);
                return;
            }

            const text=args?.text??'';
            await commands.executeCommand(defaultTypeCommand,args);

            if(text!=='>'){
                return;
            }

            if(!shouldHandleEditor(editor)){
                return;
            }

            await insertClosingXmlTagAsync(editor);
        }finally{
            isHandlingType=false;
        }
    });

    const tabDisposable=commands.registerCommand('tab',async ()=>{
        if(isHandlingTab){
            await commands.executeCommand(defaultTabCommand);
            return;
        }

        isHandlingTab=true;
        try{
            const editor=window.activeTextEditor;
            if(!editor || !shouldHandleEditor(editor)){
                await commands.executeCommand(defaultTabCommand);
                return;
            }

            if(editor.selections.length!==1){
                await commands.executeCommand(defaultTabCommand);
                return;
            }

            if(!await moveCursorAfterMarkdownImageAltTextAsync(editor)){
                await commands.executeCommand(defaultTabCommand);
            }
        }finally{
            isHandlingTab=false;
        }
    });

    context.subscriptions.push(
        typeDisposable,
        tabDisposable,
        new Disposable(()=>{
            typeDisposable.dispose();
            tabDisposable.dispose();
        })
    );
}

const shouldHandleEditor=(editor:TextEditor)=>{
    const document=editor.document;
    if(document.languageId==='source.convo'){
        return true;
    }
    return hasConvoRegionBeforeCursor(document,editor.selection.active);
}

const hasConvoRegionBeforeCursor=(document:TextDocument,position:Position)=>{
    const text=document.getText(new Range(new Position(0,0),position));

    const jsMatch=/\/\*convo\*\/\s*`[^`]*$/s.exec(text);
    if(jsMatch){
        return !/\$\{[^}]*$/s.test(jsMatch[0]);
    }

    const pythonMatches=[...text.matchAll(/"""\*convo\*[\s\S]*?"""/g)];
    const openPython=/"""\*convo\*[\s\S]*$/s.exec(text);
    if(openPython && (!pythonMatches.length || pythonMatches[pythonMatches.length-1]!.index!==openPython.index)){
        return true;
    }

    const mdOpen=/(^|\n)(\s*)(`{3,}|~{3,})\s*convo(?:\s+[^`~]*)?\n[\s\S]*$/i.exec(text);
    if(mdOpen){
        const afterOpen=text.slice(mdOpen.index!+mdOpen[0].length);
        const closeRe=new RegExp(`(^|\\n)${escapeRegExp(mdOpen[2]??'')}${escapeRegExp(mdOpen[3]??'')}\\s*$`,'m');
        if(!closeRe.test(afterOpen)){
            return true;
        }
    }

    return false;
}

const moveCursorAfterMarkdownImageAltTextAsync=async (editor:TextEditor)=>{
    const selection=editor.selection;
    if(!selection.isEmpty){
        return false;
    }

    const document=editor.document;
    const lineIndex=selection.active.line;
    const line=document.lineAt(lineIndex);
    const lineText=line.text;
    const cursorChar=selection.active.character;

    const image=getMarkdownImageAtPosition(lineText,cursorChar);
    if(!image){
        return false;
    }

    const insertPos=new Position(lineIndex,image.end);
    const changed=await editor.edit(builder=>{
        builder.insert(insertPos,'\n');
    });

    if(!changed){
        return false;
    }

    const newPos=new Position(lineIndex+1,0);
    editor.selection=new Selection(newPos,newPos);
    return true;
}

const getMarkdownImageAtPosition=(lineText:string,cursorChar:number):{end:number}|undefined=>{
    const re=/!\[[^\]\r\n]*\]\([^\)\r\n]*\)/g;
    let match:RegExpExecArray|null;
    while((match=re.exec(lineText))){
        const full=match[0];
        const start=match.index;
        const altStart=start+2;
        const altEnd=lineText.indexOf(']',altStart);
        if(altEnd===-1){
            continue;
        }
        if(cursorChar>=altStart && cursorChar<=altEnd){
            return {
                end:start+full.length
            };
        }
    }
    return;
}

const insertClosingXmlTagAsync=async (editor:TextEditor)=>{
    const selection=editor.selection;
    if(!selection.isEmpty){
        return;
    }

    const document=editor.document;
    const position=selection.active;
    const line=document.lineAt(position.line).text;
    const linePrefix=line.slice(0,position.character);

    const tag=getOpeningTagAtLineEnd(linePrefix);
    if(!tag){
        return;
    }

    const nextText=document.getText(new Range(position,new Position(position.line,line.length)));
    if(nextText.startsWith(`</${tag}>`)){
        return;
    }

    const insertText=`</${tag}>`;

    const changed=await editor.edit(builder=>{
        builder.insert(position,insertText);
    });

    if(!changed){
        return;
    }

    editor.selection=new Selection(position,position);
}

const getOpeningTagAtLineEnd=(text:string):string|undefined=>{
    const match=/<([A-Za-z_][\w.-]*)(?:\s+[^<>]*?)?>$/.exec(text);
    if(!match){
        return;
    }

    const full=match[0];
    if(full.startsWith('</')){
        return;
    }
    if(/\/\s*>$/.test(full)){
        return;
    }
    if(/^<(!|[?])/.test(full)){
        return;
    }

    return match[1];
}

const escapeRegExp=(value:string)=>{
    return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}
