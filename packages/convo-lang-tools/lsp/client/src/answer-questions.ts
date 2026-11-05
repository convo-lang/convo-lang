import { convoRoles, parseConvoCode } from '@convo-lang/convo-lang';
import { ExtensionContext, Range, Selection, TextEditorRevealType, WorkspaceEdit, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';

const questionReg=/(^|\n)[ *~`_]*(\d+)[ *~`_]*\./g;

/**
 * Registers the `convo.answer-questions` command. The command searches the last assistant message
 * for numbered questions and adds numbered placeholder answers in a user message at the end of the
 * document. The cursor is placed after the first placeholder.
 */
export const registerAnswerQuestionsCommand=(context:ExtensionContext,ext:ConvoExt)=>{
    context.subscriptions.push(commands.registerCommand('convo.answer-questions',answerQuestionsAsync));
}

const answerQuestionsAsync=async ()=>{
    const editor=window.activeTextEditor;
    const document=editor?.document;
    if(!editor || document?.languageId!=='source.convo'){
        return;
    }

    const text=document.getText();
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
        return;
    }

    const numbers=getQuestionNumbers(assistant.content??'');
    const first=numbers[0];
    if(!first){
        void window.showInformationMessage('No numbered questions found in the last assistant message');
        return;
    }

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
