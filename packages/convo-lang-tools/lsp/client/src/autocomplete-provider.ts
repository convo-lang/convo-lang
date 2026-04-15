import * as path from 'path';
import { CompletionItem, CompletionItemKind, CompletionItemTag, Range, RelativePattern, TextDocument, workspace } from 'vscode';

interface ConvoPathCompletionContext
{
    range:Range;
    query:string;
    wrapMode:'import'|'embed';
}

export const createConvoPathCompletionProvider=()=>{
    return {
        provideCompletionItems:async (
            document:TextDocument,
            position:any
        ):Promise<CompletionItem[]>=>{
            if(document.languageId!=='source.convo' || document.uri.scheme!=='file'){
                return [];
            }

            const line=document.lineAt(position.line).text;
            const linePrefix=line.substring(0,position.character);
            const ctx=getConvoPathCompletionContext(document,position.line,linePrefix);
            if(!ctx){
                return [];
            }

            const convoDir=path.dirname(document.uri.fsPath);
            const workspaceFolder=workspace.getWorkspaceFolder(document.uri);
            const root=workspaceFolder?.uri.fsPath;
            if(!root){
                return [];
            }

            const files=await workspace.findFiles(
                new RelativePattern(root,'**/*'),
                '**/{.git,node_modules,dist,out,build}/**'
            );

            const items:CompletionItem[]=[];
            for(const file of files){
                if(file.scheme!=='file'){
                    continue;
                }
                const filePath=file.fsPath;
                const relToConvo=normalizeRelativePath(path.relative(convoDir,filePath));
                if(!relToConvo){
                    continue;
                }
                if(isHiddenByPath(relToConvo) || isHiddenByPath(path.relative(root,filePath))){
                    continue;
                }

                const searchable=getSearchablePath(relToConvo);
                const score=getFuzzyScore(searchable,ctx.query);
                if(score===Number.NEGATIVE_INFINITY){
                    continue;
                }

                const insertText=ctx.wrapMode==='embed'?
                    relToConvo:
                    `${relToConvo} !file`;

                const item=new CompletionItem(relToConvo,CompletionItemKind.File);
                item.range=ctx.range;
                item.insertText=insertText;
                item.detail=path.relative(root,filePath);
                item.sortText=getSortText(score,relToConvo);
                if(isLikelyGeneratedPath(filePath)){
                    item.tags=[CompletionItemTag.Deprecated];
                }
                items.push(item);
            }

            return items.sort((a,b)=>{
                const av=a.sortText??a.label.toString();
                const bv=b.sortText??b.label.toString();
                return av.localeCompare(bv);
            });
        }
    };
}

const getConvoPathCompletionContext=(
    document:TextDocument,
    line:number,
    linePrefix:string
):ConvoPathCompletionContext|undefined=>{
    const importMatch=/(^|\s)@import\s+([^\s]*)$/.exec(linePrefix);
    if(importMatch){
        const value=importMatch[2]??'';
        if(!value.startsWith('.')){
            return undefined;
        }
        const start=value.length?
            linePrefix.length-value.length:
            linePrefix.length;
        return {
            query:value,
            wrapMode:'import',
            range:new Range(line,start,line,linePrefix.length)
        };
    }

    const embedMatch=/(^|\s)\{\{@([^\s]*)$/.exec(linePrefix);
    if(embedMatch){
        const value=embedMatch[2]??'';
        if(!value.startsWith('.')){
            return undefined;
        }
        const start=value.length?
            linePrefix.length-value.length:
            linePrefix.length;
        return {
            query:value,
            wrapMode:'embed',
            range:new Range(line,start,line,linePrefix.length)
        };
    }

    return undefined;
}

const normalizeRelativePath=(relPath:string)=>{
    if(!relPath){
        return './';
    }
    const normalized=relPath.split(path.sep).join('/');
    if(normalized.startsWith('.')){
        return normalized;
    }
    return './'+normalized;
}

const isHiddenByPath=(value:string)=>{
    const parts=value.split(/[\\/]+/g);
    for(const part of parts){
        if(!part || part==='.' || part==='..'){
            continue;
        }
        if(part.startsWith('.')){
            return true;
        }
    }
    return false;
}

const getSearchablePath=(relPath:string)=>{
    return relPath
        .replace(/^\.\//,'')
        .replace(/\//g,' ')
        .toLowerCase();
}

const getFuzzyScore=(candidate:string,query:string)=>{
    const q=query.trim().toLowerCase();
    if(!q || q==='.' || q==='./'){
        return 0;
    }

    const normalizedQuery=q
        .replace(/^\.\//,'')
        .replace(/\\/g,'/')
        .toLowerCase();

    const compactCandidate=candidate.replace(/\s+/g,'/');
    if(compactCandidate.includes(normalizedQuery)){
        return 10000-normalizedQuery.length;
    }

    let score=0;
    let lastIndex=-1;
    for(const ch of normalizedQuery){
        if(ch==='/' || ch===' '){
            continue;
        }
        const index=compactCandidate.indexOf(ch,lastIndex+1);
        if(index<0){
            return Number.NEGATIVE_INFINITY;
        }
        score+=lastIndex<0?
            10
        :index===lastIndex+1?
            8
        :
            Math.max(1,4-(index-lastIndex));
        lastIndex=index;
    }

    const baseName=path.posix.basename(compactCandidate);
    if(baseName===normalizedQuery){
        score+=5000;
    }else if(baseName.includes(normalizedQuery)){
        score+=2000;
    }

    return score;
}

const getSortText=(score:number,relPath:string)=>{
    const normalizedScore=Math.max(0,999999-score).toString().padStart(6,'0');
    return `${normalizedScore}_${relPath.toLowerCase()}`;
}

const isLikelyGeneratedPath=(filePath:string)=>{
    return /[\\/](dist|out|build)[\\/]/i.test(filePath);
}