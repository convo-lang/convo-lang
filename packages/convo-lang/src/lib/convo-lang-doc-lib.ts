import { asArray, continueFunction, getContentType } from "@iyio/common";
import { VfsItem, getVfsItemUrl } from "@iyio/vfs";
import { ConvoDocOutput, ConvoDocPageResult, ConvoDocQueryResult, ConvoDocRangeOptions, ConvoDocReader, ConvoDocReaderFactory, ConvoDocSelectStatement } from "./convo-lang-doc-types";
import { convoDocReaderFactory } from "./convo-lang-doc.deps";
import { escapeConvo } from "./convo-lib";

export const convoDocOutputsToDocument=(outputs:ConvoDocOutput[]):ConvoDocQueryResult=>{

    let lastPage=0;
    for(const o of outputs){
        for(const i of o.pageIndexes){
            if(i>lastPage){
                lastPage=i;
            }
        }
    }
    const pages:ConvoDocPageResult[]=[];

    while(pages.length<lastPage){
        pages.push({
            index:pages.length
        })
    }


    return {
        outputs,
        pages,
    };
}

export const isConvoDocSelectMatch=(pageIndex:number,select:ConvoDocSelectStatement):boolean=>{

    return isConvoDocRangeMatch(pageIndex,select.range);
}

export const isConvoDocSelectPerPage=(select:ConvoDocSelectStatement):boolean=>{
    return (
        select.perPage ||
        (Array.isArray(select.range)?
            select.range.length==1
        :(select.range && (typeof select.range === 'object'))?
            select.range.to-select.range.from<=0
        :
            true
        )
    );
}

export const getConvoSelectContentType=(select:ConvoDocSelectStatement|null|undefined,fallback='text/plain'):string=>{
    if(!select?.outputContentType){
        return fallback;
    }
    const l=select.outputContentType.toLowerCase();
    if(l==='md' || l==='markdown'){
        return 'text/markdown';
    }
    if(l==='json'){
        return 'application/json'
    }
    return l;
}

export const isConvoDocRangeMatch=(pageIndex:number,range:ConvoDocRangeOptions):boolean=>{
    if(pageIndex===range || range==='all'){
        return true;
    }

    if(range===null || range===undefined){
        return false;
    }

    if(Array.isArray(range)){
        for(const r of range){
            if(isConvoDocRangeMatch(pageIndex,r)){
                return true;
            }
        }
        return false;
    }

    if(typeof range!=='object'){
        return false;
    }

    return pageIndex>=range.from && pageIndex<=range.to;
}


export const convoDoQueryOutputToMessageContent=(queryResult:ConvoDocQueryResult):string=>{
    const lines:string[]=[];

    for(const page of queryResult.pages){
        lines.push(`\n\nPage ${page.index+1}:\n`);
        for(const output of queryResult.outputs){
            if(!output.pageIndexes.includes(page.index)){
                continue;
            }
            lines.push(convoDocOutputToString(output));
        }
    }

    return lines.join('\n');
}

export const convoDocPageToString=(pageIndex:number,queryResult:ConvoDocQueryResult):string=>{
    const outputs=queryResult.outputs.filter(p=>p.pageIndexes.includes(pageIndex));
    return outputs.map(convoDocOutputToString).join('');
}

export const convoDocOutputToString=(output:ConvoDocOutput):string=>{
    const tag=output.contentType==='text/markdown'?'page-content':'page-data';
    return `<${tag}>\n${
        (typeof output.output==='string')?escapeConvo(output.output):JSON.stringify(output.output)
    }\n</${tag}>\n`;

}

export const getConvoDocReaderAsync=async (
    src:VfsItem|string,
    factory?:ConvoDocReaderFactory|ConvoDocReaderFactory[],
    disableDependencyInjection?:boolean
):Promise<ConvoDocReader|undefined>=>{
    const url=getVfsItemUrl(src);
    if(!url){
        return undefined;
    }
    const contentType=((typeof src === 'string')?null:(src.contentType))??getContentType(url);

    if(factory){
        const ary=asArray(factory);
        for(const f of ary){
            const reader=await f(contentType,url,src);
            if(reader){
                return reader;
            }
        }
        return undefined;
    }else if(!factory && !disableDependencyInjection){
        const reader=await convoDocReaderFactory.getFirstAsync(undefined,async f=>{
            const reader=await f(contentType,url,src);
            return reader??continueFunction;
        })
        return reader;
    }else{
        return undefined;
    }
}
