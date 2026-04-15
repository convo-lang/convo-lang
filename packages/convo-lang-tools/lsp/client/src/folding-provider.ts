import * as vscode from 'vscode';

export const createFoldingProviders=()=>{
    return [
        vscode.languages.registerFoldingRangeProvider('source.convo', {
            provideFoldingRanges(document, context, token) {
                return findConversationBlockRanges(document);
            }
        }),
        vscode.languages.registerFoldingRangeProvider('source.convo', {
            provideFoldingRanges(document, context, token) {
                return findXmlTagRanges(document);
            }
        }),
    ];
}

function findConversationBlockRanges(document:vscode.TextDocument):vscode.FoldingRange[] {
    const ranges:vscode.FoldingRange[]=[];

    let prev=-1;

    const openMessage=/^[ \t]*>/;

    for(let i=0;i<document.lineCount;i++){
        const lineText=document.lineAt(i).text;

        if(openMessage.test(lineText)){
            if(prev!==-1){
                ranges.push(new vscode.FoldingRange(prev,i-1));
            }
            prev=i;
        }
    }

    if(prev!==-1){
        ranges.push(new vscode.FoldingRange(prev,document.lineCount-1));
    }

    return ranges;
}

function findXmlTagRanges(document:vscode.TextDocument):vscode.FoldingRange[] {
    const ranges:vscode.FoldingRange[]=[];
    const stack:{name:string,line:number}[]=[];

    const tagRegex=/<(\/)?([\w-]+)[^>]*(\/?)>/g;

    for(let i=0;i<document.lineCount;i++){
        const lineText=document.lineAt(i).text;
        let match:RegExpExecArray|null;

        while((match=tagRegex.exec(lineText))!==null){
            const [,isClosing,tagName,isSelfClosing]=match;
            if(!tagName){
                continue;
            }

            if(isSelfClosing){
                continue;
            }

            if(isClosing){
                const index=stack.map(s=>s.name).lastIndexOf(tagName);
                if(index!==-1){
                    const openTag=stack.splice(index,1)[0];
                    if(openTag && openTag.line!==i){
                        ranges.push(new vscode.FoldingRange(openTag.line,i));
                    }
                }
            }else{
                stack.push({name:tagName,line:i});
            }
        }
    }

    return ranges;
}