import { Lock, deleteUndefined, getFileName } from "@iyio/common";
import { ConvoDocQueryRunner } from "../ConvoDocQueryRunner";
import { ConvoError } from "../ConvoError";
import { convoDoQueryOutputToMessageContent } from "../convo-lang-doc-lib";
import { convoParamsToObj, createConvoScopeFunction } from "../convo-lib";

const lock=new Lock(1);

export const convoScopeFunctionReadDoc=createConvoScopeFunction({usesLabels:true},async (scope,ctx)=>{

    const args=convoParamsToObj(scope,['path','from','to']);

    let {
        path,
        from,
        to,
        useVision,
        count,
        cache,
        memoryCacheTtlMs,
        tagPages=true,
        query,
        salt,
        ...options
    }=args;

    if(!path){
        throw new ConvoError('invalid-args',{statement:scope.s},'Document path required')
    }

    if((typeof count === 'number') && to===undefined){
        to=(from??0)+count-1;
    }

    const release=await lock.waitOrCancelAsync(ctx.convo.conversation?.disposeToken);
    if(!release){
        return null;
    }

    try{
        const runner=new ConvoDocQueryRunner({
            query:{
                src:path,
                visionPass:useVision===true,
                textPass:useVision!==true,
                salt:(typeof salt=== 'string')?salt:undefined,
                ...deleteUndefined(query),
            },
            cacheConversations:cache!==false,
            cacheQueryResults:cache!==false,
            cacheTextPass:cache!==false,
            conversationOptions:{
                onTokenUsage:u=>ctx.convo.conversation?.addUsage(u)
            },
            useRunLock:true,
            ...deleteUndefined(options),
        });

        const removeTask=ctx.convo.conversation?.addTask({
            name:`Reading ${getFileName(path)}`,
            progress:runner.progress,
            documentUrl:path,
            delayMs:750
        });

        try{

            let r=await runner.runQueryAsync();

            if(from!==undefined || to!==undefined){
                r={...r}
                if(from===undefined){
                    from=0;
                }
                r.pages=r.pages.filter(p=>p.index>=from && (to===undefined?true:p.index<=to))
            }

            return convoDoQueryOutputToMessageContent(r,{escapeConvo:false,tagPages:Boolean(tagPages)});

        }finally{
            runner.dispose();
            removeTask?.();
        }
    }finally{
        release();
    }
})
