import { deleteUndefined, safeParseNumberOrUndefined } from '@iyio/common';
import { containsConvoTag, convoRoles, convoTags, convoVars, escapeConvo, escapeConvoTagValue, getConvoTag, parseBaseConvoImport } from './convo-lib.js';
import { ConvoMessageWrapperHandler, ConvoWebSearchResult } from './convo-types.js';

/**
 * Writes calls to file import functions as `startFileImport` and `endFileImport` messages. Imports
 * queued in the `__resultImports` variable are added to the `endFileImport` message.
 */
export const convoImportMessageWrapper:ConvoMessageWrapperHandler={
    callRole:convoRoles.startFileImport,
    resultRole:convoRoles.endFileImport,
    disableVar:convoVars.__disableImportWrappers,
    toConvo:({callTags,importTags})=>`${callTags}> ${convoRoles.startFileImport}\n${importTags}> ${convoRoles.endFileImport}\n`,
    fromMessages:(call,results,fn)=>{
        const paths=results.flatMap(r=>r.tags?.filter(t=>t.name===convoTags.import && t.value).map(t=>parseBaseConvoImport(t.value??'').name)??[]);
        return {params:{[fn.params[0]?.label??'paths']:paths},returnValue:paths};
    },
};

/**
 * Writes calls to web search functions as a `searchWeb` message followed by a `searchResult`
 * message for each result. If there are no results a single empty `searchResult` message tagged
 * with `@emptySearchResult` is written.
 */
export const convoWebSearchMessageWrapper:ConvoMessageWrapperHandler={
    callRole:convoRoles.searchWeb,
    resultRole:convoRoles.searchResult,
    disableVar:convoVars.__disableWebSearchWrapper,
    toConvo:({callTags,importTags,args,returnValue})=>{
        const results=(returnValue as ConvoWebSearchResult|undefined)?.results??[];
        const out:string[]=[`${
            callTags
        }${
            getValueTag(convoTags.limit,args['limit'])
        }${
            getValueTag(convoTags.offset,args['offset'])
        }${
            args['includeLinkTarget']?`@${convoTags.includeLinkTarget}\n`:''
        }> ${convoRoles.searchWeb}\n${escapeConvo(String(args['query']??''))}`];

        if(!results.length){
            out.push(`@${convoTags.emptySearchResult}\n${importTags}> ${convoRoles.searchResult}`);
        }
        out.push(...results.map((r,i)=>`${
            r.link?`@${convoTags.sourceLink} ${escapeConvoTagValue(r.link)}\n`:''
        }${
            i===results.length-1?importTags:''
        }> ${convoRoles.searchResult}\n${escapeConvo(r.result)}`));

        return `${out.join('\n\n')}\n`;
    },
    fromMessages:(call,results)=>({
        params:deleteUndefined({
            query:call.content??'',
            limit:safeParseNumberOrUndefined(getConvoTag(call.tags,convoTags.limit)?.value),
            offset:safeParseNumberOrUndefined(getConvoTag(call.tags,convoTags.offset)?.value),
            includeLinkTarget:containsConvoTag(call.tags,convoTags.includeLinkTarget)?true:undefined,
        }),
        returnValue:{
            results:results.filter(r=>!containsConvoTag(r.tags,convoTags.emptySearchResult)).map(r=>deleteUndefined({
                link:getConvoTag(r.tags,convoTags.sourceLink)?.value,
                result:r.content??'',
            })),
        } satisfies ConvoWebSearchResult,
    }),
};

const getValueTag=(name:string,value:any):string=>(value===undefined || value===null)?'':`@${name} ${value}\n`;
