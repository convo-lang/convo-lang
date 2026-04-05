import { BeforeCreateConversationExeCtx, ConversationUiCtrl, ConversationUiCtrlOptions, ConvoComponentRenderer, ConvoEditorMode, ConvoMarkdownEnableState, ConvoModule, ConvoRagRenderer, ConvoUiAppendTrigger, ConvoViewTheme, HttpConvoCompletionService, defaultConvoRenderTarget } from '@convo-lang/convo-lang';
import { deepCompare } from '@iyio/common';
import { useDeepCompareItem, useSubject } from "@iyio/react-common";
import { useContext, useEffect, useMemo, useRef } from "react";
import { Subscription } from 'rxjs';
import { ConversationInputChange, ConversationUiContext } from "./convo-lang-react.js";
import { getConvoViewTheme } from './convo-view-themes.js';
import { ConvoInput, ConvoInputProps } from "./ConvoInput.js";
import { ConvoMessageListView } from './ConvoMessageListView.js';
import { ConvoMessageViewProps } from './ConvoMessageView.js';
import { ConvoSourceView } from './ConvoSourceView.js';
import { ConvoSuggestionsView, ConvoSuggestionsViewProps } from './ConvoSuggestionsView.js';
import { cn } from './util.js';


export interface ConvoViewProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
    getCtrl?:(ctrl:ConversationUiCtrl)=>void;
    appendTrigger?:ConvoUiAppendTrigger;
    ctrlOptions?:ConversationUiCtrlOptions;
    enabledSlashCommands?:boolean;
    renderInput?:(ctrl:ConversationUiCtrl)=>any;
    ragRenderer?:ConvoRagRenderer;
    noInput?:boolean;
    inputProps?:Partial<ConvoInputProps>;
    showSource?:boolean;
    sourceMode?:ConvoEditorMode;
    showFunctions?:boolean;
    showResults?:boolean;
    showSystem?:boolean;
    showInputWithSource?:boolean;
    renderTarget?:string;
    redirectMessagesView?:(view:any)=>void;
    defaultVars?:Record<string,any>;
    externFunctions?:Record<string,(...params:any[])=>any>;
    codeInputAutoScrollBehavior?:ScrollBehavior;
    messageBottomPadding?:string|null;
    httpEndpoint?:string;
    templatePrefix?:string;
    template?:string;
    beforeCreateExeCtx?:BeforeCreateConversationExeCtx|null|undefined;
    disableScroll?:boolean;
    suggestionsLocation?:'inline'|'before-input'|'after-input';
    forceInlineSuggestionsLocation?:boolean;
    messagesProps?:ConvoMessageViewProps;
    suggestionProps?:Partial<ConvoSuggestionsViewProps>;
    componentRenderers?:Record<string,ConvoComponentRenderer>;
    enabledInitMessage?:boolean;
    onVarsChange?:(vars:Record<string,any>)=>void;
    enableMarkdown?:ConvoMarkdownEnableState;
    enableUserMarkdown?:boolean;
    inputPlaceholder?:string;
    /**
     * Modules to register with conversation. The value of modules is cached and must be refreshed
     * using the modulesRefreshKey for changes to be reflected
     */
    modules?:ConvoModule[];
    modulesRefreshKey?:string|number;

    imports?:string|string[];

    onInputChange?:(change:ConversationInputChange)=>void;

    theme?:ConvoViewTheme;
    sourceDarkMode?:boolean|'auto';
    defaultValue?:string;
    enableStreaming?:boolean;
}

export function ConvoView({
    className,
    ctrl:ctrlProp,
    getCtrl,
    ctrlOptions,
    enabledSlashCommands,
    renderInput,
    noInput,
    inputProps,
    sourceMode:_sourceMode,
    showSource:_showSource,
    showFunctions,
    showResults,
    showSystem,
    showInputWithSource=true,
    ragRenderer,
    renderTarget=defaultConvoRenderTarget,
    redirectMessagesView,
    defaultVars,
    externFunctions,
    codeInputAutoScrollBehavior,
    messageBottomPadding,
    httpEndpoint,
    templatePrefix,
    template,
    appendTrigger,
    beforeCreateExeCtx,
    disableScroll,
    suggestionsLocation='inline',
    forceInlineSuggestionsLocation,
    messagesProps,
    suggestionProps,
    componentRenderers={},
    enabledInitMessage,
    onVarsChange,
    enableMarkdown,
    modules,
    modulesRefreshKey,
    imports,
    onInputChange,
    theme,
    inputPlaceholder,
    sourceDarkMode,
    defaultValue,
    enableStreaming,
}:ConvoViewProps){

    theme=useMemo(()=>theme??getConvoViewTheme('default'),[theme]);

    const refs=useRef({modules,enableStreaming});
    refs.current.modules=modules;
    refs.current.enableStreaming=enableStreaming;
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
            enableStreaming:refs.current.enableStreaming,
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
        if(defaultValue!==undefined){
            ctrl.replace(defaultValue);
        }
    },[defaultValue]);

    useEffect(()=>{
        if(enableStreaming!==undefined){
            ctrl.enableStreaming=enableStreaming;
        }
    },[enableStreaming]);

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

    useEffect(()=>{
        if(showResults!==undefined && ctrl){
            ctrl.showResults=showResults;
        }
    },[showResults,ctrl]);

    useEffect(()=>{
        if(showSystem!==undefined && ctrl){
            ctrl.showSystemMessages=showSystem;
        }
    },[showSystem,ctrl]);

    useEffect(()=>{
        if(showFunctions!==undefined && ctrl){
            ctrl.showFunctions=showFunctions;
        }
    },[showFunctions,ctrl]);


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

    useEffect(()=>{
        if(enabledInitMessage!==undefined){
            ctrl.enabledInitMessage=enabledInitMessage;
        }
    },[ctrl,enabledInitMessage]);

    const showSourceCtrl=useSubject(ctrl.showSourceSubject);
    const showSource=_showSource??showSourceCtrl;

    const sourceModeCtrl=useSubject(ctrl.editorModeSubject);
    const sourceMode=_sourceMode??sourceModeCtrl;

    const messagesView=(showSource?
        <ConvoSourceView
            ctrl={ctrl}
            autoScrollBehavior={codeInputAutoScrollBehavior}
            mode={sourceMode}
            disableScroll={disableScroll}
            onInputChange={onInputChange}
            theme={theme}
            darkMode={sourceDarkMode}
        />
    :
        <ConvoMessageListView
            ctrl={ctrl}
            messageBottomPadding={messageBottomPadding}
            renderTarget={renderTarget}
            ragRenderer={ragRenderer}
            disableScroll={disableScroll}
            hideSuggestions={suggestionsLocation!=='inline' && !forceInlineSuggestionsLocation}
            enableMarkdown={enableMarkdown}
            theme={theme}
            {...messagesProps}
         />
    )

    useEffect(()=>{
        redirectMessagesView?.(messagesView);
    },[redirectMessagesView,messagesView]);

    const suggestions=suggestionsLocation==='inline'?null:(
        <ConvoSuggestionsView theme={theme} {...suggestionProps}/>
    )

    return (

        <ConversationUiContext.Provider value={ctrl}>

            <div className={cn(theme.convoViewClassName,className)}>

                {redirectMessagesView?null:messagesView}

                {
                    (!showSource || showInputWithSource) &&
                    !noInput &&
                    <div className={theme.inputAreaClassName}>
                        {suggestionsLocation==='before-input' && suggestions}
                        {renderInput?
                            renderInput(ctrl)
                        :
                            <ConvoInput
                                theme={theme}
                                ctrl={ctrl}
                                onInputChange={onInputChange}
                                placeholder={inputPlaceholder}
                                {...inputProps}
                            />
                        }
                        {suggestionsLocation==='after-input' && suggestions}
                    </div>
                }

            </div>
        </ConversationUiContext.Provider>
    )

}
