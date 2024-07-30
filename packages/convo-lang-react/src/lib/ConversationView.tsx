import { atDotCss } from "@iyio/at-dot-css";
import { ConversationUiCtrl, ConversationUiCtrlOptions, ConvoEditorMode, ConvoRagRenderer, defaultConvoRenderTarget, removeDanglingConvoUserMessage } from '@iyio/convo-lang';
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
}:ConversationViewProps){

    const ctxCtrl=useContext(ConversationUiContext);
    const defaultCtrl=ctrlProp??ctxCtrl;
    const ctrl=useMemo(()=>defaultCtrl??new ConversationUiCtrl(ctrlOptions),[defaultCtrl,ctrlOptions]);

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

    return (

        <ConversationUiContext.Provider value={ctrl}>

            <div className={style.root(null,className)} style={style.vars(theme)}>

                {showSource?
                    <MessagesSourceView mode={sourceMode} ctrl={ctrl} />
                :
                    <MessagesView renderTarget={renderTarget} ctrl={ctrl} ragRenderer={ragRenderer} />
                }

                {
                    (!showSource || showInputWithSource) &&
                    !noInput &&
                    (renderInput?renderInput(ctrl):<ConversationInput ctrl={ctrl} {...inputProps} />)
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
