import { ConversationUiCtrl, ConversationUiCtrlOptions, ConvoEditorMode, ConvoRagRenderer, HttpConvoCompletionService, defaultConvoRenderTarget, removeDanglingConvoUserMessage } from '@convo-lang/convo-lang';
import { atDotCss } from "@iyio/at-dot-css";
import { useShallowCompareItem, useSubject } from "@iyio/react-common";
import { useContext, useEffect, useMemo, useRef } from "react";
import { ConversationInput, ConversationInputProps } from "./ConversationInput";
import { MessagesSourceView } from "./MessagesSourceView";
import { MessagesView } from "./MessagesView";
import { ConversationUiContext } from "./convo-lang-react";
import { ConvoLangTheme, defaultDarkConvoLangTheme, defaultLightConvoLangTheme } from "./convo-lang-theme";

export interface ConversationViewProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
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
}:ConversationViewProps){

    const refs=useRef({defaultVars,externFunctions});
    refs.current.defaultVars=defaultVars;
    refs.current.externFunctions=externFunctions;
    const ctxCtrl=useContext(ConversationUiContext);
    const defaultCtrl=ctrlProp??ctxCtrl;
    const ctrl=useMemo(()=>defaultCtrl??new ConversationUiCtrl({
        defaultVars:refs.current.defaultVars,
        externFunctions:refs.current.externFunctions,
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
