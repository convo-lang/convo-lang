import { ConvoDb, convoDbService, ConvoNode, ConvoNodeCondition, ConvoNodeKeySelection, ConvoNodeQuery, ConvoNodeQueryKeysToSelection, ConvoNodeQueryResult, StatusCode } from "@convo-lang/convo-lang";
import { CancelToken, createPromiseSource, deepClone, delayAsync, getErrorMessage, PromiseSource } from "@iyio/common";
import { useDeepCompareItem } from "@iyio/react-common";
import { useEffect, useRef, useState } from "react";

export interface UseConvoDbOptions
{
    /**
     * Disables / pauses the query
     */
    disabled?:boolean;

    /**
     * Will refresh the query when changed
     */
    refresh?:number;

    /**
     * A ConvoDb instance to communicate with. The configured database from the convoDbService will
     * be used if no db is provided
     */
    db?:ConvoDb;

    /**
     * If true result will be returned in chunks as they are received from the server. Streaming 
     * is automatically enabled if query.watch is true.
     */
    stream?:boolean;

    /**
     * Provided a default value for the `watch` value of the query the options are paired with.
     */
    watch?:boolean;

    /**
     * Sets the default condition of the first step in the query.
     * Useful when used with `useConvoNodesAtPath` to filter selected nodes by type.
     *
     * @example
     * useConvoNodesAtPath('/app/records/*',{type:'domain'})
     *
     * @note `type` and `condition` can be used tother
     */
    type?:string;

    /**
     * Sets the default condition of the first step in the query.
     * Useful when used with `useConvoNodesAtPath` to filter based on a condition without having to 
     * use the full syntax of `useConvoDbQuery`
     *
     * @example
     * useConvoNodesAtPath('/app/employees/*',{condition:{target:'data.salary',op:'>',value:100000}})
     *
     * @note `type` and `condition` can be used tother
     */
    condition?:ConvoNodeCondition;

    /**
     * Debouncing timeout in milliseconds. Useful for queries tied to user input such as a search bar.
     */
    debounceMs?:number;
}

/**
 * Executes a ConvoDb query and returns a state object with the results and a next function
 * that can be used for pagination. Realtime change streaming is also supported by setting the
 * `watch` property to true of the given query.
 */
export type UseConvoQueryState<TKeys extends ConvoNodeKeySelection='*'>=
{
    /**
     * All currently selected nodes
     */
    nodes:Pick<ConvoNode,ConvoNodeQueryKeysToSelection<TKeys>>[];

    /**
     * The first node in the `nodes` property or undefined
     */
    node:Pick<ConvoNode,ConvoNodeQueryKeysToSelection<TKeys>>|undefined;

    /**
     * The last node in the `nodes` property or undefined
     */
    lastNode:Pick<ConvoNode,ConvoNodeQueryKeysToSelection<TKeys>>|undefined;

    /**
     * The query used to select nodes
     */
    query:ConvoNodeQuery<TKeys>|null|undefined;

    /**
     * True if watching has been enabled
     */
    watch:boolean;

    
} & (
    {
        state:'loading'|'disabled';
        /**
        * The ConvoDb use to query
        */
        db?:ConvoDb;
    }|{
        state:'streaming';
        watchingChanges:boolean;
        next():void;
        /**
        * The ConvoDb use to query
        */
        db:ConvoDb;
    }|{
        state:'error';
        error:string;
        statusCode:StatusCode;
        /**
        * The ConvoDb use to query
        */
        db?:ConvoDb;
    }|{
        state:'loaded';
        result:ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<TKeys>>;
        next():void;
        /**
        * The ConvoDb use to query
        */
        db:ConvoDb;
    }
);

export type UseConvoQueryStateType=UseConvoQueryState['state'];

/**
 * Returns nodes based on a `ConvoNodeQuery` and can optionally watch for realtime updates to
 * nodes when either query.watch or options.watch are set to true. The query prop is automatically
 * memorized allowing you to directly pass a query object to the hook without using `useMemo` The
 * query will only be re-executed if the shape of the query changes.
 */
export const useConvoDbQuery=<TKeys extends ConvoNodeKeySelection='*'>(
    query:ConvoNodeQuery<TKeys>|null|undefined,
    {
        disabled=!query,
        refresh,
        db=convoDbService.get(),
        watch=query?.watch??false,
        stream=watch,
        debounceMs=1,
        type,
        condition,
    }:UseConvoDbOptions={}
):UseConvoQueryState<ConvoNodeQueryKeysToSelection<TKeys>>=>{

    query=useDeepCompareItem(disabled?undefined:query);
    condition=useDeepCompareItem(disabled?undefined:condition);

    const [result,setResult]=useState<UseConvoQueryState<ConvoNodeQueryKeysToSelection<TKeys>>>(
        {state:disabled?'disabled':'loading',nodes:[],node:undefined,lastNode:undefined,db,query:deepClone(query) as any,watch}
    );

    const refs=useRef({stream});
    refs.current.stream=stream;


    useEffect(()=>{
        if(!query || !db){
            return;
        }
        const cancel=new CancelToken();
        let nextPromise:PromiseSource<void>|undefined;
        (async ()=>{

            // debounce min of 1 for react strict mode 🫠
            await delayAsync(Math.max(1,debounceMs));
            if(cancel.isCanceled){return}
            const queryClone=deepClone(query);
            try{
                let nextToken=query.nextToken;
                let errorCount=0;
                const getQuery=()=>{
                    const q={...queryClone,watch,nextToken};
                    if(type || condition){
                        const first=q.steps[0];
                        if(first && !first.condition){
                            if(type && condition){
                                q.steps[0]={...first,condition:{
                                    groupOp:'and',
                                    conditions:[
                                        {
                                            target:'type',
                                            op:'=',
                                            value:type,
                                        },
                                        condition
                                    ]
                                }};
                            }else if(type){
                                q.steps[0]={...first,condition:{
                                    target:'type',
                                    op:'=',
                                    value:type,
                                }}
                            }else if(condition){
                                q.steps[0]={...first,condition}
                            }
                        }
                    }
                    return q;
                }
                const next=()=>{
                    nextPromise?.resolve();
                }
                while(!cancel.isCanceled){
                    nextPromise=createPromiseSource<void>();
                    if(stream){
                        const nodes:Partial<ConvoNode>[]=[];
                        let stateNodes=[...nodes];
                        let nodesChanged=false;
                        let watchingChanges=false;
                        const flush=()=>{
                            if(nodesChanged){
                                nodesChanged=false;
                                stateNodes=[...nodes];
                            }
                            setResult({
                                state:'streaming',
                                watch,
                                watchingChanges,
                                node:stateNodes[0] as any,
                                lastNode:stateNodes[stateNodes.length-1] as any,
                                nodes:stateNodes as any,
                                query:queryClone as any,
                                db,
                                next,
                            });
                        }

                        flush();

                        try{
                            for await(const item of db.streamNodesAsync<TKeys>(getQuery(),cancel)){
                                if(cancel.isCanceled){
                                    break;
                                }
                                switch(item.type){

                                    case 'node':
                                    case 'node-insert':
                                        if(!nodes.some(n=>n.path && n.path===(item.node as ConvoNode).path)){
                                            nodes.push(item.node);
                                            nodesChanged=true;
                                        }
                                        break;

                                    case 'node-update':{
                                        const index=nodes.findIndex(n=>n.path && n.path===(item.node as ConvoNode).path);
                                        if(index===-1){
                                            nodes.push(item.node);
                                        }else{
                                            nodes[index]=item.node;
                                        }
                                        nodesChanged=true;
                                        break;
                                    }

                                    case 'node-delete':{
                                        const index=nodes.findIndex(n=>n.path && n.path===(item.node as ConvoNode).path);
                                        if(index!==-1){
                                            nodes.splice(index,1);
                                            nodesChanged=true;
                                        }
                                        break;
                                    }

                                    case 'end':
                                    case 'flush':
                                        flush();
                                        errorCount=0;
                                        break;

                                    case 'watch-start':
                                        watchingChanges=true;
                                        errorCount=0;
                                        flush();
                                        break;


                                }
                            }

                            errorCount=0;

                        }catch(ex){
                            if(cancel.isCanceled){
                                return;
                            }
                            errorCount++;
                            setResult(v=>({
                                state:'error',
                                watch,
                                error:`ConvoDb stream interrupted - ${getErrorMessage(ex)}`,
                                statusCode:(ex as any).statusCode??500,
                                node:v.node,
                                lastNode:v.lastNode,
                                nodes:v.nodes,
                                query:queryClone as any,
                                db,
                            }))
                            if(!cancel.isCanceled){
                                await delayAsync(500+(errorCount-1)*1200);
                            }
                        }
                    }else{

                        setResult(v=>v.state==='loaded'?v:({
                            state:'loading',
                            watch,
                            node:v.node,
                            lastNode:v.lastNode,
                            nodes:v.nodes,
                            query:queryClone as any,
                            db,
                        }));
                        const r=await db.queryNodesAsync<TKeys>(getQuery());
                        if(cancel.isCanceled){return}

                        if(r.success){
                            nextToken=r.result.nextToken;
                            setResult({
                                state:'loaded',
                                watch,
                                result:r.result as any,
                                nodes:r.result.nodes as any,
                                node:r.result.nodes[0] as any,
                                lastNode:r.result.nodes[r.result.nodes.length-1] as any,
                                query:queryClone as any,
                                db,
                                next,
                            });
                        }else{
                            setResult(v=>({
                                state:'error',
                                error:r.error,
                                watch,
                                statusCode:r.statusCode,
                                node:v.node,
                                lastNode:v.lastNode,
                                nodes:v.nodes,
                                query:queryClone as any,
                                db,
                            }));
                        }
                    }
                    await nextPromise.promise;
                }

            }catch(ex){
                setResult(v=>({
                    state:'error',
                    error:`ConvoDb query failed - ${getErrorMessage(ex)}`,
                    watch,
                    statusCode:(ex as any).statusCode??500,
                    node:v.node,
                    lastNode:v.lastNode,
                    nodes:v.nodes,
                    db,
                    query:queryClone as any,
                }))
            }

        })();
        return ()=>{
            cancel.cancelNow();
            nextPromise?.resolve();
        }
    },[query,refresh,db,stream,watch,debounceMs,type,condition]);

    return result;
}


/**
 * Returns nodes by path. The path can contain an ending wildcard.
 * This hook is shorthand for `useConvoDbQuery({steps:[{path}]},options)`
 */
export const useConvoNodesAtPath=<TKeys extends ConvoNodeKeySelection='*'>(
    path:string|undefined|null,
    options?:UseConvoDbOptions
):UseConvoQueryState<ConvoNodeQueryKeysToSelection<TKeys>>=>{
    return useConvoDbQuery(path?{steps:[{path}]}:undefined,options);
}

/**
 * Returns a tuple containing a single node, query state and full query result.
 * @example
 * const [product,productLoadState,productResult]=useConvoNodeAtPath('/products/apple-sauce');
 */
export const useConvoNodeAtPath=<TKeys extends ConvoNodeKeySelection='*'>(
    path:string|null|undefined,
    options?:UseConvoDbOptions
):[
    Pick<ConvoNode,ConvoNodeQueryKeysToSelection<TKeys>>|undefined,
    UseConvoQueryStateType,
    UseConvoQueryState<ConvoNodeQueryKeysToSelection<TKeys>>
]=>{
    const r=useConvoDbQuery<TKeys>((path===null || path===undefined)?undefined:{steps:[{path}],limit:1},options);
    return [r?.node as any,r.state,r];
}