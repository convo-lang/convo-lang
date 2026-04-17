import * as vscode from 'vscode';

export const revealDocumentEndAsync=async (editor:vscode.TextEditor):Promise<void>=>{
    const doc=editor.document;
    const end=doc.positionAt(doc.getText().length);
    editor.selection=new vscode.Selection(end,end);
    editor.revealRange(new vscode.Range(end,end),vscode.TextEditorRevealType.Default);
}