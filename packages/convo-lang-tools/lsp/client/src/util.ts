import * as vscode from 'vscode';

export const revealDocumentEndAsync=async (editor:vscode.TextEditor):Promise<void>=>{
    const doc=editor.document;
    const end=doc.positionAt(doc.getText().length);
    editor.selection=new vscode.Selection(end,end);
    editor.revealRange(new vscode.Range(end,end),vscode.TextEditorRevealType.Default);
}

export const timeSince = (dateString: string,justNowMax?:number): string => {
    return timeSinceNext(dateString,justNowMax).label;
};

export const timeSinceNext = (dateString: string,justNowMax=60000): {label:string,nextInterval:number|undefined} => {
    if(!dateString){
        return {label:'never',nextInterval:undefined};
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return {label:dateString,nextInterval:undefined};
    const now = Date.now();
    let diff = now - d.getTime();
    if (diff < justNowMax) return {label:'just now',nextInterval:justNowMax};

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return {label:`${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`,nextInterval:1000}

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return {label:`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`,nextInterval:60000}

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return {label:`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`,nextInterval:60000*60}

    const days = Math.floor(hours / 24);
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    if (diff < monthMs) return {label:`${days} ${days === 1 ? 'day' : 'days'} ago`,nextInterval:60000*60*24}

    return {label:d.toLocaleDateString(),nextInterval:60000*60*24}
};