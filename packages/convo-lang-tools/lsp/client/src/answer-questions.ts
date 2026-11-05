import { ConvoMessage, convoRoles, parseConvoCode } from '@convo-lang/convo-lang';
import { ExtensionContext, Range, Selection, TextEditorRevealType, ViewColumn, WorkspaceEdit, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';

const questionReg=/(^|\n)[ *~`_]*(\d+)[ *~`_]*\./g;

/**
 * URIs of documents word wrapping has been enabled for by the split command
 */
const wordWrapEnabledUris=new Set<string>();

interface AssistantQuestions
{
    messages:ConvoMessage[];
    assistantIndex:number;
    numbers:string[];
}

/**
 * Registers the `convo.answer-questions` and `convo.answer-questions-split` commands. The
 * `convo.answer-questions` command searches the last assistant message for numbered questions and
 * adds numbered placeholder answers in a user message at the end of the document. The cursor is
 * placed after the first placeholder. The `convo.answer-questions-split` command splits the editor,
 * collapses the side bar, sizes the left editor to 2/3 of the window, enables word wrapping and then
 * calls `convo.answer-questions` in the right editor.
 */
export const registerAnswerQuestionsCommand=(context:ExtensionContext,ext:ConvoExt)=>{
    context.subscriptions.push(commands.registerCommand('convo.answer-questions',answerQuestionsAsync));
    context.subscriptions.push(commands.registerCommand('convo.answer-questions-split',answerQuestionsSplitAsync));
}

const answerQuestionsAsync=async ()=>{
    const editor=window.activeTextEditor;
    const document=editor?.document;
    if(!editor || document?.languageId!=='source.convo'){
        return;
    }

    const text=document.getText();
    const questions=getLastAssistantQuestions(text);
    if(!questions){
        return;
    }
    const {messages,assistantIndex,numbers}=questions;
    const first=numbers[0];

    const lastMsg=messages[messages.length-1];
    const appendToUser=assistantIndex<messages.length-1 && lastMsg?.role===convoRoles.user;
    const trimmedLength=text.trimEnd().length;

    const header=(
        !appendToUser?
            `${trimmedLength?'\n\n':''}> user\n`
        :lastMsg?.content?.trim()?
            '\n\n'
        :
            '\n'
    );
    const insert=`${header}${numbers.map(n=>`${n}. `).join('\n')}\n`;

    const edit=new WorkspaceEdit();
    edit.replace(document.uri,new Range(document.positionAt(trimmedLength),document.positionAt(text.length)),insert);
    if(!await workspace.applyEdit(edit)){
        void window.showErrorMessage('Failed to add question placeholders');
        return;
    }

    const pos=document.positionAt(trimmedLength+header.length+`${first}. `.length);
    editor.selection=new Selection(pos,pos);
    editor.revealRange(new Range(pos,pos),TextEditorRevealType.InCenterIfOutsideViewport);
}

const answerQuestionsSplitAsync=async ()=>{
    const editor=window.activeTextEditor;
    const document=editor?.document;
    if(!editor || document?.languageId!=='source.convo'){
        return;
    }

    if(!getLastAssistantQuestions(document.getText())){
        return;
    }

    const uri=document.uri.toString();
    const existing=window.visibleTextEditors.filter(e=>e.document.uri.toString()===uri && e.viewColumn!==undefined);

    if(existing.length<2){
        await commands.executeCommand('workbench.action.splitEditorRight');
    }

    await commands.executeCommand('workbench.action.closeSidebar');
    await commands.executeCommand('vscode.setEditorLayout',{orientation:0,groups:[{size:2/3},{size:1/3}]});
    await commands.executeCommand('workbench.action.focusLastEditorGroup');
    await window.showTextDocument(document,{viewColumn:ViewColumn.Active,preview:false,preserveFocus:false});

    if(!wordWrapEnabledUris.has(uri) && workspace.getConfiguration('editor',document).get<string>('wordWrap')==='off'){
        await commands.executeCommand('editor.action.toggleWordWrap');
    }
    wordWrapEnabledUris.add(uri);

    await commands.executeCommand('convo.answer-questions');
}

/**
 * Returns the numbered questions of the last assistant message in the given convo source. If no
 * assistant message or questions are found an information message is displayed and undefined is
 * returned.
 */
const getLastAssistantQuestions=(text:string):AssistantQuestions|undefined=>{
    const messages=parseConvoCode(text).result??[];

    let assistantIndex=-1;
    for(let i=messages.length-1;i>=0;i--){
        if(messages[i]?.role===convoRoles.assistant){
            assistantIndex=i;
            break;
        }
    }

    const assistant=messages[assistantIndex];
    if(!assistant){
        void window.showInformationMessage('No assistant message found');
        return undefined;
    }

    const numbers=getQuestionNumbers(assistant.content??'');
    if(!numbers[0]){
        void window.showInformationMessage('No numbered questions found in the last assistant message');
        return undefined;
    }

    return {messages,assistantIndex,numbers};
}

/**
 * Returns the unique question numbers found in the given content in order of first appearance
 */
const getQuestionNumbers=(content:string):string[]=>{
    const numbers:string[]=[];
    for(const match of content.matchAll(questionReg)){
        const n=match[2];
        if(n && !numbers.includes(n)){
            numbers.push(n);
        }
    }
    return numbers;
}
