import { ConversationOptions, ConvoDocQuery, ConvoDocQueryRunnerOptions, convoDoQueryOutputToMessageContent, escapeConvoMessageContent, mergeConvoOptions } from "@convo-lang/convo-lang";
import { asArray } from "@iyio/common";
import { useDeepCompareItem, useSubject } from "@iyio/react-common";
import { VfsItem } from "@iyio/vfs";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { ConversationStatusIndicator } from "../ConversationStatusIndicator";
import { MarkdownViewer } from "../MarkdownViewer";
import { GenNode } from "./GenNode";
import { GenItemRenderer, GenListRenderer, GenListWrapperRenderer, GenNodeOptions, GenNodeOptionsReactContext, GenNodeReactContext, GenNodeSuccessState, useGenNode, useGenNodeOptions } from './gen-lib';

export interface GenProps
{
    id?:string;
    convo?:string;
    /**
     * Shared convo that is passed down to decedent Gen components
     */
    sharedConvo?:string;
    /**
     * A single user message. Use `convo` for controlling the full conversation
     */
    prompt?:string;
    forEach?:GenListRenderer;
    wrapForEach?:GenListWrapperRenderer;
    render?:GenItemRenderer;
    renderAfter?:GenItemRenderer;
    conversationOptions?:ConversationOptions;
    cache?:boolean;
    loadingIndicator?:any;
    docQuery?:ConvoDocQuery;
    document?:string|VfsItem;
    docQueryOptions?:ConvoDocQueryRunnerOptions;
    vars?:Record<string,any>;
    onGen?:(item:any,vars:Record<string,any>,state:GenNodeSuccessState,node:GenNode)=>void;
    onNode?:(node:GenNode)=>void;
    disabled?:boolean;
    allowAppend?:boolean;
    passDownOptions?:boolean;
}

export function Gen({
    id,
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
    onNode,
    allowAppend,
    passDownOptions,
    sharedConvo,
}:GenProps){

    if(disabled){
        convo=undefined;
    }

    const refs=useRef({onGen,id});
    refs.current.onGen=onGen;

    const contextOptions=useGenNodeOptions();
    if(contextOptions?._cache!==undefined && cache===undefined){
        cache=contextOptions._cache;
    }
    if(contextOptions?._render!==undefined && render===undefined){
        render=contextOptions._render;
    }
    if(contextOptions?._allowAppend!==undefined && allowAppend===undefined){
        allowAppend=contextOptions._allowAppend;
    }
    if(contextOptions?._sharedConvo!==undefined && sharedConvo===undefined){
        sharedConvo=contextOptions._sharedConvo;
    }
    if(contextOptions?._passDownOptions!==undefined && passDownOptions===undefined){
        passDownOptions=contextOptions._passDownOptions;
    }
    const mergedOptions=mergeConvoOptions(
        conversationOptions,
        {cache},
        contextOptions?.conversationOptions
    );
    const _options:GenNodeOptions={conversationOptions:mergedOptions,allowAppend,_sharedConvo:sharedConvo}
    if(passDownOptions){
        _options._cache=cache;
        _options._render=render;
        _options._allowAppend=allowAppend;
        _options._passDownOptions=passDownOptions;
    }
    const options=useDeepCompareItem(_options);
    const docQuery=useDeepCompareItem(_docQuery);
    const docQueryOptions=useDeepCompareItem(_docQueryOptions);
    const document=useDeepCompareItem(_document);
    const vars=useDeepCompareItem(_vars);


    const parentNode=useGenNode();
    const node=useMemo(()=>{
        const node=new GenNode((parentNode?.id?parentNode.id+'+':'')+refs.current.id);
        if(parentNode){
            node._setParent(parentNode);
        }
        return node;
    },[parentNode]);
    const conversation=useSubject(node.conversationSubject);

    useEffect(()=>{
        return ()=>{
            node.dispose();
        }
    },[node]);

    useEffect(()=>{
        onNode?.(node);
    },[node,onNode]);

    useEffect(()=>{
        node.convo=(sharedConvo?sharedConvo+'\n\n':'')+(convo??'');
        node.options=options;
        node.docQuery=docQuery??(document?{src:document,visionPass:true}:null);
        node.docQueryOptions=docQueryOptions??null;
        node.vars=vars??null;
    },[node,convo,sharedConvo,options,docQuery,docQueryOptions,document,vars]);

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
