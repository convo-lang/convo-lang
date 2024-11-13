import { ConversationOptions, ConvoDocQuery, ConvoDocQueryRunnerOptions, convoDoQueryOutputToMessageContent, escapeConvoMessageContent, mergeConvoOptions } from "@convo-lang/convo-lang";
import { asArray } from "@iyio/common";
import { useDeepCompareItem, useSubject } from "@iyio/react-common";
import { VfsItem } from "@iyio/vfs";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { ConversationStatusIndicator } from "../ConversationStatusIndicator";
import { MarkdownViewer } from "../MarkdownViewer";
import { GenNode } from "./GenNode";
import { GenNodeOptions, GenNodeOptionsReactContext, GenNodeReactContext, GenNodeSuccessState, useGenNode, useGenNodeOptions } from './gen-lib';

export interface GenProps
{
    convo?:string;
    /**
     * A single user message. Use `convo` for controlling the full conversation
     */
    prompt?:string;
    forEach?:(item:any,index:number,vars:Record<string,any>,value:any,state:GenNodeSuccessState,node:GenNode)=>any;
    wrapForEach?:(content:any,item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>any;
    render?:(item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>any;
    renderAfter?:(item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>any;
    conversationOptions?:ConversationOptions;
    cache?:boolean;
    loadingIndicator?:any;
    docQuery?:ConvoDocQuery;
    document?:string|VfsItem;
    docQueryOptions?:ConvoDocQueryRunnerOptions;
    vars?:Record<string,any>;
    onGen?:(item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>void;
    disabled?:boolean;
}

export function Gen({
    prompt,
    convo=prompt?`> user\n${escapeConvoMessageContent(prompt)}`:undefined,
    forEach,
    wrapForEach,
    render,
    renderAfter,
    conversationOptions,
    cache,
    loadingIndicator,
    document:_document,
    docQuery:_docQuery,
    docQueryOptions:_docQueryOptions,
    vars:_vars,
    onGen,
    disabled,
}:GenProps){

    if(disabled){
        convo=undefined;
    }

    const refs=useRef({onGen});
    refs.current.onGen=onGen;

    const contextOptions=useGenNodeOptions();
    const mergedOptions=mergeConvoOptions(
        conversationOptions,
        {cache},
        contextOptions?.conversationOptions
    );
    const _options:GenNodeOptions={conversationOptions:mergedOptions}
    const options=useDeepCompareItem(_options);
    const docQuery=useDeepCompareItem(_docQuery);
    const docQueryOptions=useDeepCompareItem(_docQueryOptions);
    const document=useDeepCompareItem(_document);
    const vars=useDeepCompareItem(_vars);


    const parentNode=useGenNode();
    const node=useMemo(()=>new GenNode(),[]);
    const conversation=useSubject(node.conversationSubject);

    useEffect(()=>{
        return ()=>{
            node.dispose();
        }
    },[node]);

    useEffect(()=>{
        node._setParent(parentNode);
    },[node,parentNode]);

    useEffect(()=>{
        node.convo=convo??'';
        node.options=options;
        node.docQuery=docQuery??(document?{src:document,visionPass:true}:null);
        node.docQueryOptions=docQueryOptions??null;
        node.vars=vars??null;
    },[node,convo,options,docQuery,docQueryOptions,document,vars]);

    const state=useSubject(node.stateSubject);
    const lastState=useSubject(node.lastGeneratedStateSubject);

    const genState=lastState.status==='generated'?lastState:undefined;
    const value=genState?.value;
    const useDocOutput=(genState && !genState?.value && genState.docQueryResult)?true:false;
    const valueAry=useDocOutput?(genState?.docQueryResult?.outputs??[]):asArray(value);

    const hasRenderer=(render || forEach || renderAfter)?true:false;

    useEffect(()=>{
        if(!genState){
            return;
        }
        refs.current.onGen?.(genState.value,genState.vars,genState,node);
    },[genState,node]);

    const forEachContent=genState?(
        forEach?valueAry?.map((item,i)=>(
            <Fragment key={i}>
                {forEach(item,i,genState.vars,value,genState,node)}
            </Fragment>
        )):null
    ):null;

    return (
        <GenNodeOptionsReactContext.Provider value={options}>
        <GenNodeReactContext.Provider value={node}>

            {genState && <>

                {render?.(value,genState.vars,genState,node)}

                {hasRenderer?
                    null
                :(useDocOutput && genState.docQueryResult)?
                    <MarkdownViewer markdown={convoDoQueryOutputToMessageContent(genState.docQueryResult)}/>
                :(!!value && (typeof value === 'string'))?
                    <MarkdownViewer markdown={value}/>
                :
                    null
                }

                {wrapForEach?wrapForEach(forEachContent,value,genState.vars,genState,node):forEachContent}

                {renderAfter?.(value,genState.vars,genState,node)}

            </>}

            <ConversationStatusIndicator
                conversation={conversation}
                busy={state.status==='generating'}
            />

        </GenNodeReactContext.Provider>
        </GenNodeOptionsReactContext.Provider>
    )

}
