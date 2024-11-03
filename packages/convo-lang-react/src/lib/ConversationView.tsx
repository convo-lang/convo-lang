import { ConversationUiCtrl, ConversationUiCtrlOptions, ConvoEditorMode, ConvoRagRenderer, ConvoUiAppendTrigger, HttpConvoCompletionService, defaultConvoRenderTarget, removeDanglingConvoUserMessage } from '@convo-lang/convo-lang';
import { atDotCss } from "@iyio/at-dot-css";
import { useShallowCompareItem, useSubject } from "@iyio/react-common";
import { useContext, useEffect, useMemo } from "react";
import { ConversationInput, ConversationInputProps } from "./ConversationInput";
import { MessagesSourceView } from "./MessagesSourceView";
import { MessagesView } from "./MessagesView";
import { ConversationUiContext } from "./convo-lang-react";
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
    template?:string;
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
    showInputWithSource,
    ragRenderer,
    renderTarget=defaultConvoRenderTarget,
    redirectMessagesView,
    min,
    defaultVars,
    externFunctions,
    codeInputAutoScrollBehavior,
    messageBottomPadding,
    httpEndpoint,
    template,
    appendTrigger,
}:ConversationViewProps){

    const ctxCtrl=useContext(ConversationUiContext);
    const defaultCtrl=ctrlProp??ctxCtrl;
    const ctrl=useMemo(()=>defaultCtrl??new ConversationUiCtrl({
        ...ctrlOptions,
        template:template??ctrlOptions?.template,
        convoOptions:{
            ...ctrlOptions?.convoOptions,
            completionService:httpEndpoint?(
                new HttpConvoCompletionService({endpoint:httpEndpoint})
            ):ctrlOptions?.convoOptions?.completionService
        }
    }),[defaultCtrl,ctrlOptions,httpEndpoint,template]);

    useEffect(()=>{
        if(externFunctions){
            ctrl.externFunctions=externFunctions;
        }
    },[ctrl,externFunctions]);

    useEffect(()=>{
        if(defaultVars){
            ctrl.defaultVars=defaultVars;
        }
    },[ctrl,defaultVars]);

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
        />
    :
        <MessagesView
            ctrl={ctrl}
            messageBottomPadding={messageBottomPadding}
            renderTarget={renderTarget}
            ragRenderer={ragRenderer}
         />
    )

    useEffect(()=>{
        redirectMessagesView?.(messagesView);
    },[redirectMessagesView,messagesView]);

    return (

        <ConversationUiContext.Provider value={ctrl}>

            <div className={style.root(null,className)} style={style.vars(theme)}>

                {redirectMessagesView?null:messagesView}

                {
                    (!showSource || showInputWithSource) &&
                    !noInput &&
                    (renderInput?renderInput(ctrl):<ConversationInput ctrl={ctrl} min={min} {...inputProps} />)
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
`});
