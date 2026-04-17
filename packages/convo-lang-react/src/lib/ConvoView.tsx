import { BeforeCreateConversationExeCtx, ConversationUiCtrl, ConversationUiCtrlOptions, ConvoComponentRenderer, ConvoEditorMode, ConvoMarkdownEnableState, ConvoModule, ConvoRagRenderer, ConvoUiAppendTrigger, ConvoViewTheme, defaultConvoRenderTarget, getHttpConvoCompletionServiceForEndpoint } from '@convo-lang/convo-lang';
import { deepCompare } from '@iyio/common';
import { useDeepCompareItem, useSubject } from "@iyio/react-common";
import { useContext, useEffect, useMemo, useRef } from "react";
import { Subscription } from 'rxjs';
import { ConversationInputChange, ConversationUiContext } from "./convo-lang-react.js";
import { getConvoViewTheme } from './convo-view-themes.js';
import { ConvoInput, ConvoInputProps } from "./ConvoInput.js";
import { ConvoMessageListView } from './ConvoMessageListView.js';
import { ConvoMessageViewProps } from './ConvoMessageView.js';
import { ConvoModelSelector } from './ConvoModelSelector.js';
import { ConvoSourceView } from './ConvoSourceView.js';
import { ConvoSuggestionsView, ConvoSuggestionsViewProps } from './ConvoSuggestionsView.js';
import { cn } from './util.js';


export interface ConvoViewProps
{
    /**
     * Class name given to the outer most container of the component
     */
    className?:string;

    /**
     * An optional ConversationUiCtrl. If not provided one will be created.
     */
    ctrl?:ConversationUiCtrl;

    /**
     * Returns the ConversationUiCtrl that is created by the component or passed in using the `ctrl` prop
     */
    getCtrl?:(ctrl:ConversationUiCtrl)=>void;

    /**
     * Used to append messages to the conversation of the ConvoView
     */
    appendTrigger?:ConvoUiAppendTrigger;

    /**
     * Options to be passed to the auto created ConversationUiCtrl. If a ctrl is provided `ctrlOptions` is ignored
     */
    ctrlOptions?:ConversationUiCtrlOptions;

    /**
     * If true the user can issue command by sending messages that start with a forward slash (/)
     */
    enableSlashCommands?:boolean;

    /** @deprecated */
    enabledSlashCommands?:boolean;

    /**
     * When true the user will be allowed to select the target LLM.
     */
    enableModelSelector?:boolean;

    /**
     * If provided the models the user is allowed to select from is limited to the given list.
     */
    selectableModels?:string[];

    /**
     * If true media will be allowed to be attached. Commonly used to attach images. Attachments
     * are sent to the target LLM as a base64 string.
     */
    enableAttachment?:boolean;

    /**
     * Media types to accept passed to file input to limit what types of media can be attached.
     * @default "image/*"
     */
    acceptAttachmentTypes?:string;

    /**
     * Can be used to replace the default behavior of using a file input to browse for files to
     * attach. This can be used to integrated into custom media browser. If a string is returned
     * it should be a base64 url.
     */
    browseAttachmentRequested?:(accept:string)=>Promise<File|Blob|string|null|undefined>;

    /**
     * If provided renderInput will render an override for the input component of the ConvoView
     */
    renderInput?:(ctrl:ConversationUiCtrl)=>any;

    /**
     * Renders rag results
     */
    ragRenderer?:ConvoRagRenderer;

    /**
     * If true no user input component will be rendered. This can be useful when displaying a conversation
     * in readonly mode or when rending the user input component outside of ConvoView
     */
    noInput?:boolean;

    /**
     * Props to pass to the default input component
     */
    inputProps?:Partial<ConvoInputProps>;

    /**
     * If true the Convo-Lang source code of the conversation will be shown in-place of the
     * normal chat interface. the `/source` slash command can be used to show or hide the source
     */
    showSource?:boolean;

    /**
     * Determines the content displayed with showing the Convo-Lang source code of the conversation.
     * By default the raw source code is shown but other value such as the such as source code converted
     * to the native format of the target LLM can be shown.
     */
    sourceMode?:ConvoEditorMode;

    /**
     * If true the input component will be rendered when showing the source code of the conversation
     */
    showInputWithSource?:boolean;

    /**
     * If true functions / tools will be rendered as message bubbles.
     */
    showFunctions?:boolean;

    /**
     * If true variables definitions and function results will be rendered as message bubbles.
     */
    showResults?:boolean;

    /**
     * If true system messages will be rendered as message bubbles.
     */
    showSystem?:boolean;

    /**
     * Used by applications that render conversations across multiple display areas. For example
     * function / tool results can define a render target that causes them to be rendered in a
     * separate side panel similar to a Claude artifact. By default messages have a render target
     * of "default"
     * @default "default"
     */
    renderTarget?:string;

    /**
     * Use to render list of messages of the ConvoView outside of the ConvoView component. Often
     * used with the `renderTarget` prop
     */
    redirectMessagesView?:(view:any)=>void;

    /**
     * Default variable values to be passed into the conversation. These variables can be used inside
     * the conversation source code allowing you to define conversation templates that use variables
     * without the need for using string template literals and manually escaping values yourself.
     */
    defaultVars?:Record<string,any>;

    /**
     * The backing functions for `extern` functions defined in the source code of the conversation.
     */
    externFunctions?:Record<string,(...params:any[])=>any>;

    /**
     * Controls how scrolling is handled in source mode when new code is appended to the conversation.
     */
    codeInputAutoScrollBehavior?:ScrollBehavior;

    /**
     * Extra space added to the end of the rendered messages of the conversation to push up the last
     * messages to avoid being rendered behind the input component with the input component is rendered
     * as a floating input. By default the input component will float above the list of messages
     * at the bottom of the ConvoView and messages will scroll under the input.
     */
    messageBottomPadding?:string|null;

    /**
     * URI to a Convo-Lang compatible API endpoint.
     */
    httpEndpoint?:string;

    /**
     * Convo-Lang source code used to define the conversation.
     */
    template?:string;

    /**
     * Raw Convo-Lang source code prepended to the provided template.
     */
    templatePrefix?:string;

    /**
     * The default Convo-Lang source code of the conversation
     */
    defaultValue?:string;

    /**
     * A callback function called just before creating the execution context of a conversation. An
     * example of how this callback can be used would to be to add messages to a conversation
     * just before the conversation is sent to its target LLM.
     */
    beforeCreateExeCtx?:BeforeCreateConversationExeCtx|null|undefined;

    /**
     * If true the default function call renderer will be disabled. This includes the streaming
     * call renderer.
     */
    disableDefaultFunctionCallRender?:boolean;

    /**
     * Disable scrolling of the rendered message list
     */
    disableScroll?:boolean;

    /**
     * Controls where suggestion messages are displayed.
     * - inline: Suggestion messages are displayed inline in the list of messages
     * - before-input: Suggestion messages are displayed above the user input component
     * - after-input: Suggestion messages are displayed below the user input component
     * @default "inline"
     */
    suggestionsLocation?:'inline'|'before-input'|'after-input';

    /**
     * If true suggestions will always be displayed inline along with the location configured by the
     * `suggestionsLocation` prop allow suggestions to appear inline and near the user input component.
     */
    forceInlineSuggestionsLocation?:boolean;

    /**
     * Props passed to the ConvoMessageListView component that renders the messages of the conversation.
     */
    messageListProps?:ConvoMessageViewProps;

    /**
     * Props passed to the ConvoSuggestionsView component that is used to render suggestions near
     * the user input component.
     */
    suggestionProps?:Partial<ConvoSuggestionsViewProps>;

    /**
     * A map of component renderers. Component renders are used to render custom components for
     * function/tool results and embedded components in messages.
     */
    componentRenderers?:Record<string,ConvoComponentRenderer>;

    /**
     * If true conversation initialization messages are allowed to trigger conversation completions
     * causing the LLM to response immediately after the ConvoView is mounted.
     */
    enabledInitMessage?:boolean;

    /**
     * A callback that is called with the variables of the conversation change. This callback can
     * be used to hook into the internal state of the conversation.
     */
    onVarsChange?:(vars:Record<string,any>)=>void;

    /**
     * Enables markdown rendering for user or assistant messages or both.
     */
    enableMarkdown?:ConvoMarkdownEnableState;

    /**
     * Placeholder text displayed by the user input component.
     */
    inputPlaceholder?:string;

    /**
     * Modules to register with conversation. The value of modules is cached and must be refreshed
     * using the modulesRefreshKey for changes to be reflected
     */
    modules?:ConvoModule[];

    /**
     * Triggers a refresh of the modules passed to the ConvoView
     */
    modulesRefreshKey?:string|number;

    /**
     * Imports that are inserted into the conversation
     */
    imports?:string|string[];

    /**
     * Called when the value of the user input component changes. When in source view mode the value
     * is the value of the entire source code of the conversation.
     */
    onInputChange?:(change:ConversationInputChange)=>void;

    /**
     * Theme used to style the ConvoView
     */
    theme?:ConvoViewTheme;

    /**
     * Controls how dark mode is applied. A value of "auto" will enabled dark mode when the body
     * element of the page includes "dark" in its class list.
     */
    sourceDarkMode?:boolean|'auto';

    /**
     * If true streaming responses will be enabled.
     */
    enableStreaming?:boolean;

    /**
     * Max image width. Larger images will be resized. It is recommended to only provided max width
     * or max height.
     * @default 1024
     */
    maxImageWidth?:number;

    /**
     * Max image height. Larger images will be resize.
     */
    maxImageHeight?:number;

    /**
     * Content rendered before the input component at the start of the row above the input component.
     */
    beforeInputStart?:any;

    /**
     * Content rendered before the input component at the end of the row above the input component.
     */
    beforeInputEnd?:any;

    /**
     * Content rendered after the input component at the start of the row below the input component.
     */
    afterInputStart?:any;

    /**
     * Content rendered after the input component at the end of the row below the input component.
     */
    afterInputEnd?:any;

    /**
     * If true the user will be able to use their microphone to record audio
     */
    enableAudioRecorder?:boolean;

    /**
     * If true the user will be able to enter into live mode where they speak directly to the LLM
     * and the LLM speaks back.
     */
    enableLiveMode?:boolean;

    /**
     * If true assistant responses will be read using text-to-speech
     */
    readResponses?:boolean;
}

/**
 * A chat style interface for interacting with a Convo-Lang Conversation.
 */
export function ConvoView({
    className,
    ctrl:ctrlProp,
    getCtrl,
    ctrlOptions,
    enabledSlashCommands,
    enableSlashCommands=enabledSlashCommands,
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
    enableModelSelector,
    selectableModels,
    disableScroll,
    suggestionsLocation='inline',
    forceInlineSuggestionsLocation,
    messageListProps,
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
    enableAttachment,
    acceptAttachmentTypes,
    browseAttachmentRequested,
    maxImageHeight,
    maxImageWidth,
    beforeInputStart,
    beforeInputEnd,
    afterInputStart,
    afterInputEnd,
    enableAudioRecorder,
    enableLiveMode,
    readResponses,
    disableDefaultFunctionCallRender,
}:ConvoViewProps){

    theme=useMemo(()=>theme??getConvoViewTheme('default'),[theme]);

    const refs=useRef({modules,enableStreaming,theme});
    refs.current.modules=modules;
    refs.current.enableStreaming=enableStreaming;
    refs.current.theme=theme;
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
        theme:refs.current.theme,
        transcriptionService:httpEndpoint?getHttpConvoCompletionServiceForEndpoint(httpEndpoint):undefined,
        ttsService:httpEndpoint?getHttpConvoCompletionServiceForEndpoint(httpEndpoint):undefined,
        embeddingsService:httpEndpoint?getHttpConvoCompletionServiceForEndpoint(httpEndpoint):undefined,
        db:httpEndpoint?getHttpConvoCompletionServiceForEndpoint(httpEndpoint):undefined,
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
                getHttpConvoCompletionServiceForEndpoint(httpEndpoint)
            ):ctrlOptions?.convoOptions?.completionService
        }
    }),[defaultCtrl,ctrlOptions,httpEndpoint,template,compConvo,templatePrefix,modulesRefreshKey,importStr]);

    useEffect(()=>{
        if(defaultValue!==undefined){
            ctrl.replace(defaultValue);
        }
    },[defaultValue,ctrl]);

    useEffect(()=>{
        if(theme!==undefined){
            ctrl.theme=theme;
        }
    },[theme,ctrl]);

    useEffect(()=>{
        if(enableStreaming!==undefined){
            ctrl.enableStreaming=enableStreaming;
        }
    },[enableStreaming,ctrl]);

    useEffect(()=>{
        if(!readResponses){
            return;
        }
        return ctrl.requestResponseResponses();
    },[readResponses,ctrl]);

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
        if(enableSlashCommands!==undefined){
            ctrl.enableSlashCommands=enableSlashCommands;
        }
    },[ctrl,enableSlashCommands]);

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
            disableDefaultFunctionCallRender={disableDefaultFunctionCallRender}
            {...messageListProps}
         />
    )

    useEffect(()=>{
        redirectMessagesView?.(messagesView);
    },[redirectMessagesView,messagesView]);

    const suggestions=suggestionsLocation==='inline'?null:(
        <ConvoSuggestionsView {...suggestionProps}/>
    )

    return (

        <ConversationUiContext.Provider value={ctrl}>

            <div className={cn(theme.convoViewClassName,className)}>

                {redirectMessagesView?null:messagesView}

                {
                    (!showSource || showInputWithSource) &&
                    !noInput &&
                    <div className={theme.inputAreaClassName}>
                        <div className={theme.beforeInputContainerClassName}>
                            {beforeInputStart}
                            {suggestionsLocation==='before-input' && suggestions}
                            {enableModelSelector && <ConvoModelSelector selectableModels={selectableModels}/>}
                            {beforeInputEnd}
                        </div>
                        {renderInput?
                            renderInput(ctrl)
                        :
                            <ConvoInput
                                ctrl={ctrl}
                                onInputChange={onInputChange}
                                placeholder={inputPlaceholder}
                                enableAttachment={enableAttachment}
                                acceptAttachmentTypes={acceptAttachmentTypes}
                                browseAttachmentRequested={browseAttachmentRequested}
                                maxImageHeight={maxImageHeight}
                                maxImageWidth={maxImageWidth}
                                enableAudioRecorder={enableAudioRecorder}
                                enableLiveMode={enableLiveMode}
                                {...inputProps}
                            />
                        }
                        {!!(afterInputStart || afterInputEnd || (suggestionsLocation==='after-input' && suggestions)) &&
                            <div className={theme.afterInputContainerClassName}>
                                {afterInputStart}
                                {suggestionsLocation==='after-input' && suggestions}
                                {afterInputEnd}
                            </div>
                        }
                    </div>
                }

            </div>
        </ConversationUiContext.Provider>
    )

}
