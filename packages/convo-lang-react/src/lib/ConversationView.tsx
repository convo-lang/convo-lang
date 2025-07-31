import { BeforeCreateConversationExeCtx, ConversationUiCtrl, ConversationUiCtrlOptions, ConvoComponentRenderer, ConvoEditorMode, ConvoMarkdownEnableState, ConvoModule, ConvoRagRenderer, ConvoUiAppendTrigger, HttpConvoCompletionService, defaultConvoRenderTarget, removeDanglingConvoUserMessage } from '@convo-lang/convo-lang';
import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutProps, deepCompare } from '@iyio/common';
import { useDeepCompareItem, useShallowCompareItem, useSubject } from "@iyio/react-common";
import { useContext, useEffect, useMemo, useRef } from "react";
import { Subscription } from 'rxjs';
import { ConversationInput, ConversationInputProps } from "./ConversationInput";
import { MessagesSourceView } from "./MessagesSourceView";
import { MessagesView, MessagesViewProps } from "./MessagesView";
import { SuggestionsView, SuggestionsViewProps } from './SuggestionsView';
import { ConversationInputChange, ConversationUiContext } from "./convo-lang-react";
import { ConvoLangTheme, defaultDarkConvoLangTheme, defaultLightConvoLangTheme } from "./convo-lang-theme";

export interface ConversationViewProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
    getCtrl?:(ctrl:ConversationUiCtrl)=>void;
    appendTrigger?:ConvoUiAppendTrigger;
    ctrlOptions?:ConversationUiCtrlOptions,
    content?:string;
    enabledSlashCommands?:boolean;
    renderInput?:(ctrl:ConversationUiCtrl)=>any;
    ragRenderer?:ConvoRagRenderer;
    noInput?:boolean;
    inputProps?:ConversationInputProps;
    theme?:ConvoLangTheme|'dark'|'light';
    showSource?:boolean;
    sourceMode?:ConvoEditorMode;
    showInputWithSource?:boolean;
    renderTarget?:string;
    redirectMessagesView?:(view:any)=>void;
    min?:boolean;
    defaultVars?:Record<string,any>;
    externFunctions?:Record<string,(...params:any[])=>any>;
    codeInputAutoScrollBehavior?:ScrollBehavior;
    messageBottomPadding?:string;
    httpEndpoint?:string;
    templatePrefix?:string;
    template?:string;
    beforeCreateExeCtx?:BeforeCreateConversationExeCtx|null|undefined;
    autoHeight?:boolean;
    suggestionsLocation?:'inline'|'before-input'|'after-input';
    messagesProps?:MessagesViewProps;
    suggestionProps?:SuggestionsViewProps & BaseLayoutProps;
    componentRenderers?:Record<string,ConvoComponentRenderer>;
    enabledInitMessage?:boolean;
    onVarsChange?:(vars:Record<string,any>)=>void;
    enableMarkdown?:ConvoMarkdownEnableState;
    enableUserMarkdown?:boolean;
    markdownClassName?:string;
    /**
     * Modules to register with conversation. The value of modules is cached and must be refreshed
     * using the modulesRefreshKey for changes to be reflected
     */
    modules?:ConvoModule[];
    modulesRefreshKey?:string|number;

    imports?:string|string[];

    onInputChange?:(change:ConversationInputChange)=>void;
}

export function ConversationView({
    className,
    ctrl:ctrlProp,
    getCtrl,
    ctrlOptions,
    content,
    enabledSlashCommands,
    renderInput,
    noInput,
    inputProps,
    theme:_theme='light',
    sourceMode:_sourceMode,
    showSource:_showSource,
    showInputWithSource=true,
    ragRenderer,
    renderTarget=defaultConvoRenderTarget,
    redirectMessagesView,
    min,
    defaultVars,
    externFunctions,
    codeInputAutoScrollBehavior,
    messageBottomPadding,
    httpEndpoint,
    templatePrefix,
    template,
    appendTrigger,
    beforeCreateExeCtx,
    autoHeight,
    suggestionsLocation='inline',
    messagesProps,
    suggestionProps,
    componentRenderers,
    enabledInitMessage,
    onVarsChange,
    enableMarkdown,
    markdownClassName,
    modules,
    modulesRefreshKey,
    imports,
    onInputChange,
}:ConversationViewProps){

    const refs=useRef({modules});
    refs.current.modules=modules;
    const importStr=Array.isArray(imports)?imports.join(';'):imports;

    const compConvoAry:string[]=[];
    if(componentRenderers){
        const names=Object.keys(componentRenderers);
        names.sort((a,b)=>a.localeCompare(b));
        for(const name of names){
            const r=componentRenderers[name];
            if(!r || (typeof r !== 'object')){
                continue;
            }
            if(r.convo){
                compConvoAry.push(r.convo);
            }
        }
    }
    const compConvo=compConvoAry.join('\n\n');

    const ctxCtrl=useContext(ConversationUiContext);
    const defaultCtrl=ctrlProp??ctxCtrl;
    const ctrl=useMemo(()=>defaultCtrl??new ConversationUiCtrl({
        ...ctrlOptions,
        template:(
            (templatePrefix?templatePrefix+'\n\n':'')+
            (importStr?importStr.split(';').map(i=>`@import ${i}`).join('\n')+'\n\n':'')+
            (compConvo?compConvo+'\n\n':'')+
            (template??ctrlOptions?.template)
        ),
        convoOptions:{
            ...ctrlOptions?.convoOptions,
            modules:[
                ...(ctrlOptions?.convoOptions?.modules??[]),
                ...(refs.current.modules??[]),
            ],
            completionService:httpEndpoint?(
                new HttpConvoCompletionService({endpoint:httpEndpoint})
            ):ctrlOptions?.convoOptions?.completionService
        }
    }),[defaultCtrl,ctrlOptions,httpEndpoint,template,compConvo,templatePrefix,modulesRefreshKey,importStr]);

    useEffect(()=>{
        if(!ctrl || !onVarsChange){
            return;
        }
        let m=true;
        let flatSub:Subscription|undefined;
        let prevVars:any=undefined;
        const sub=ctrl.convoSubject.subscribe(c=>{
            if(!m){
                return;
            }
            flatSub?.unsubscribe();
            flatSub=c?.flatSubject.subscribe(flat=>{
                if(!m || !flat || deepCompare(flat.vars,prevVars)){
                    return;
                }
                prevVars={...flat.vars};
                onVarsChange(prevVars)
            })
        })
        return ()=>{
            m=false;
            sub.unsubscribe();
            flatSub?.unsubscribe();
        }
    },[ctrl,onVarsChange]);

    useEffect(()=>{
        if(externFunctions){
            ctrl.externFunctions=externFunctions;
        }
    },[ctrl,externFunctions]);

    useEffect(()=>{
        ctrl.beforeCreateExeCtx=beforeCreateExeCtx;
    },[beforeCreateExeCtx,ctrl]);

    useEffect(()=>{
        if(defaultVars){
            ctrl.defaultVars=defaultVars;
        }
    },[ctrl,defaultVars]);

    const compRenderers=useDeepCompareItem(componentRenderers);
    useEffect(()=>{
        if(!compRenderers){
            return;
        }
        for(const e in compRenderers){
            const v=compRenderers[e];
            if(!v){
                continue;
            }
            ctrl.componentRenderers[e]=v;
        }
        return ()=>{
            for(const e in compRenderers){
                const v=compRenderers[e];
                if(!v || ctrl.componentRenderers[e]!==v){
                    continue;
                }
                delete ctrl.componentRenderers[e];
            }
        }
    },[ctrl,compRenderers]);

    useEffect(()=>{
        if(content &&
            removeDanglingConvoUserMessage(content).trim()!==
            removeDanglingConvoUserMessage(ctrl.convo?.convo??'').trim()
        ){
            ctrl.replace(content);
        }
    },[ctrl,content]);

    useEffect(()=>{
        if(enabledSlashCommands!==undefined){
            ctrl.enabledSlashCommands=enabledSlashCommands;
        }
    },[ctrl,enabledSlashCommands]);

    useEffect(()=>{
        if(!appendTrigger){
            return;
        }
        try{
            if(appendTrigger.append){
                if(appendTrigger.role){
                    ctrl.convo?.appendMessage(appendTrigger.role,appendTrigger.append,appendTrigger.options);
                }else{
                    ctrl.convo?.append(appendTrigger.append,appendTrigger.mergeWithPrev);
                }
            }

            if(appendTrigger.complete){
                (async ()=>{
                    try{
                        ctrl.convo?.completeAsync((typeof appendTrigger.complete === 'object')?appendTrigger.complete:undefined);
                    }catch(ex){
                        console.error('appendTrigger complete failed',appendTrigger,ex);
                        appendTrigger.errorCallback?.(ex);
                    }
                })();
            }
        }catch(ex){
            console.error('appendTrigger failed',appendTrigger,ex);
            appendTrigger.errorCallback?.(ex);
        }

    },[ctrl,appendTrigger]);

    useEffect(()=>{
        getCtrl?.(ctrl);
    },[ctrl,getCtrl]);

    const themeValue=useShallowCompareItem(_theme);
    useEffect(()=>{
        if(themeValue!==undefined){
            let t=themeValue;
            if(typeof t === 'string'){
                t=t==='dark'?defaultDarkConvoLangTheme:defaultLightConvoLangTheme;
            }
            ctrl.theme=t;
        }
    },[themeValue,ctrl]);

    useEffect(()=>{
        if(enabledInitMessage!==undefined){
            ctrl.enabledInitMessage=enabledInitMessage;
        }
    },[ctrl,enabledInitMessage]);

    const theme=useSubject(ctrl.themeSubject);

    const showSourceCtrl=useSubject(ctrl.showSourceSubject);
    const showSource=_showSource??showSourceCtrl;

    const sourceModeCtrl=useSubject(ctrl.editorModeSubject);
    const sourceMode=_sourceMode??sourceModeCtrl;

    const messagesView=(showSource?
        <MessagesSourceView
            ctrl={ctrl}
            autoScrollBehavior={codeInputAutoScrollBehavior}
            mode={sourceMode}
            autoHeight={autoHeight}
            onInputChange={onInputChange}
        />
    :
        <MessagesView
            ctrl={ctrl}
            messageBottomPadding={messageBottomPadding}
            renderTarget={renderTarget}
            ragRenderer={ragRenderer}
            autoHeight={autoHeight}
            hideSuggestions={suggestionsLocation!=='inline'}
            enableMarkdown={enableMarkdown}
            markdownClassName={markdownClassName}
            {...messagesProps}
         />
    )

    useEffect(()=>{
        redirectMessagesView?.(messagesView);
    },[redirectMessagesView,messagesView]);

    const suggestions=suggestionsLocation==='inline'?null:(
        <SuggestionsView {...suggestionProps}/>
    )

    return (

        <ConversationUiContext.Provider value={ctrl}>

            <div className={style.root({autoHeight},className)} style={style.vars(theme)}>

                {redirectMessagesView?null:messagesView}

                {
                    (!showSource || showInputWithSource) &&
                    !noInput &&
                    <>
                        {suggestionsLocation==='before-input' && suggestions}
                        {renderInput?renderInput(ctrl):<ConversationInput ctrl={ctrl} min={min} onInputChange={onInputChange} {...inputProps} />}
                        {suggestionsLocation==='after-input' && suggestions}
                    </>
                }

            </div>
        </ConversationUiContext.Provider>
    )

}

const style=atDotCss({name:'ConversationView',order:'framework',namespace:'iyio',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        position:relative;
    }
    @.root.autoHeight{
        flex:unset;
    }
`});
