
import { ConversationUiCtrl, ConvoEditorMode, ConvoViewTheme, flatConvoMessagesToTextView, getConvoDebugLabelComment, parseConvoCode } from "@convo-lang/convo-lang";
import { createJsonRefReplacer } from "@iyio/common";
import { ScrollView, useSubject } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button.js";
import { ConversationInputChange, useConversation, useConversationUiCtrl } from "./convo-lang-react.js";
import { ConvoLoader } from "./ConvoLoader.js";
import { cn } from "./util.js";

export interface ConvoSourceViewProps
{
    ctrl?:ConversationUiCtrl;
    mode?:ConvoEditorMode;
    autoScrollBehavior?:ScrollBehavior;
    disableScroll?:boolean;
    onInputChange?:(change:ConversationInputChange)=>void;
    theme:ConvoViewTheme;
    darkMode?:boolean|'auto';
}


export function ConvoSourceView({
    ctrl:_ctrl,
    mode='code',
    autoScrollBehavior,
    disableScroll,
    onInputChange,
    theme,
    darkMode='auto',
}:ConvoSourceViewProps){

    const refs=useRef({onInputChange,lastChange:null as string|null});
    refs.current.onInputChange=onInputChange;

    const ctrl=useConversationUiCtrl(_ctrl);

    const convo=useConversation(_ctrl);

    const flatConvo=useSubject((mode==='vars' || mode==='flat' || mode==='text' || mode==='model')?convo?.flatSubject:undefined);

    const [code,_setCode]=useState('');
    const setCode=useCallback((code:string)=>{
        refs.current.lastChange=code;
        _setCode(code);
    },[]);

    const currentTask=useSubject(ctrl?.currentTaskSubject);

    const lastMsg=convo?.messages[convo.messages.length-1];

    useEffect(()=>{
        if(!convo){
            return;
        }

        const lastMsg=convo?.messages[convo.messages.length-1];
        setCode(convo?.convo?convo.convo+(lastMsg?.role!=='user'?'\n\n> user\n':''):'> user\n')

        const sub=convo.onAppend.subscribe(()=>{
            const lastMsg=convo.messages[convo.messages.length-1];
            setCode(convo.convo+(lastMsg?.role!=='user'?'\n\n> user\n':''));
        })
        return ()=>{
            sub.unsubscribe();
        }
    },[convo]);

    const submit=useCallback((code:string)=>{
        if(ctrl.currentTask){
            return;
        }
        ctrl.replaceAndCompleteAsync(code);
    },[ctrl]);

    const [asyncCodeValue,setAsyncCodeValue]=useState('');
    useEffect(()=>{
        let m=true;
        if(mode==='model' && flatConvo && convo){
            (async ()=>{
                try{
                    const value=await convo.toModelInputStringAsync(flatConvo);
                    if(m){
                        setAsyncCodeValue(value);
                    }
                }catch{}
            })();
        }else if(mode==='models' && convo){
            (async ()=>{
                try{
                    const value=JSON.stringify(await convo.getAllModelsAsync(),null,4);
                    if(m){
                        setAsyncCodeValue(value);
                    }
                }catch{}
            })();
        }else{
            setAsyncCodeValue('');
            return;
        }
        return ()=>{
            m=false;
        }
    },[mode,flatConvo,convo]);

    const changeCode=refs.current.onInputChange?code:undefined;
    useEffect(()=>{
        if(changeCode!==undefined && refs.current.onInputChange){
            refs.current.onInputChange({type:'source',value:changeCode});
        }
    },[changeCode]);

    useEffect(()=>{
        return ()=>{
            if(refs.current.lastChange!==null){
                ctrl.replace(refs.current.lastChange);
            }
        }
    },[ctrl]);

    const codeInput=(
        <LazyCodeInput
            theme={darkMode==='auto'?'auto':darkMode?'dark-plus':'github-light'}
            lineNumbers
            fillScrollHeight
            disableColors
            className={theme.sourceViewClassName}
            errorClassName={theme.sourceViewErrorClassName}
            errorMessageClassName={theme.sourceViewErrorMessageClassName}
            errorHighlightClassName={theme.sourceViewErrorHighlightMessageClassName}
            textareaClassName={theme.sourceViewTextareaClassName}
            lineNumberClassName={theme.sourceViewLineNumberClassName}

            language={mode==='code' || mode==='imports' || mode==='modules' || mode==='text'?'convo':'json'}
            value={
                mode==='vars'?
                    JSON.stringify(flatConvo?.exe.getUserSharedVars()??{},createJsonRefReplacer(),4)
                :mode==='flat'?
                    JSON.stringify(flatConvo?.messages??[],null,4)
                :mode==='tree'?
                    JSON.stringify(convo?.messages??[],null,4)
                :mode==='model'?
                    (flatConvo?(asyncCodeValue):'')
                :mode==='models'?
                    asyncCodeValue
                :mode==='text'?
                    flatConvoMessagesToTextView(flatConvo?.messages)
                :mode==='imports'?
                    `${convo?.getDebuggingImportCode()}\n\n> define\n${getConvoDebugLabelComment('source')}\n\n${code}`
                :mode==='modules'?
                    (convo?.getDebuggingModulesCode()??'')
                :
                    code
            }
            readOnly={!!currentTask || mode!=='code'}
            onChange={setCode}
            parser={mode==='code'?parseConvoCode:undefined}
            logParsed
            bottomPadding='100px'
            onSubmit={submit}
        />
    )

    return (
        <div className={cn(theme.sourceViewContainerClassName,disableScroll&&theme.sourceViewContainerScrollDisabledClassName)}>
            {disableScroll?
                codeInput
            :
                <ScrollView
                    className={theme.sourceViewScrollViewClassName}
                    autoScrollTrigger={lastMsg}
                    autoScrollBehavior={autoScrollBehavior}
                    autoScrollSelector=".language-convo"
                    autoScrollYOffset={100}
                    containerFill
                >
                    {codeInput}
                </ScrollView>
            }
            {currentTask && <div className={theme.sourceViewBusyContainer}>
                <ConvoLoader theme={theme}/>
            </div>}

            {mode==='code' &&
                <Button onClick={()=>submit(code)} className={theme.sourceViewSubmitButtonClassName}>
                    Submit
                    <span className={theme.sourceViewSubmitButtonShortcutClassName}>( ctrl + enter )</span>
                </Button>
            }
        </div>
    )

}
