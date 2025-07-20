
import { LazyCodeInput } from "@iyio/syn-taxi";

import { ConversationUiCtrl, ConvoEditorMode, flatConvoMessagesToTextView, getConvoDebugLabelComment, parseConvoCode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { createJsonRefReplacer } from "@iyio/common";
import { LoadingDots, ScrollView, SlimButton, useSubject } from "@iyio/react-common";
import { useCallback, useEffect, useState } from "react";
import { useConversation, useConversationTheme, useConversationUiCtrl } from "./convo-lang-react";

export interface MessagesSourceViewProps
{
    ctrl?:ConversationUiCtrl;
    mode?:ConvoEditorMode;
    autoScrollBehavior?:ScrollBehavior;
    autoHeight?:boolean;

}

/**
 * @acIgnore
 */
export function MessagesSourceView({
    ctrl:_ctrl,
    mode='code',
    autoScrollBehavior,
    autoHeight
}:MessagesSourceViewProps){

    const ctrl=useConversationUiCtrl(_ctrl);

    const convo=useConversation(_ctrl);

    const flatConvo=useSubject((mode==='vars' || mode==='flat' || mode==='text' || mode==='model')?convo?.flatSubject:undefined);

    const theme=useConversationTheme(_ctrl);

    const [code,setCode]=useState('');

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

    const codeInput=(
        <LazyCodeInput
            lineNumbers
            fillScrollHeight
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
        <div className={style.root({autoHeight})} style={style.vars(theme)}>
            {autoHeight?
                codeInput
            :
                    <ScrollView
                    flex1
                    autoScrollTrigger={lastMsg}
                    autoScrollBehavior={autoScrollBehavior}
                    autoScrollSelector=".language-convo"
                    autoScrollYOffset={100}
                    containerFill
                >
                    {codeInput}
                </ScrollView>
            }
            <div className={style.busy({show:currentTask})}>
                <LoadingDots disabled={!currentTask}/>
            </div>

            {mode==='code' && <div className={style.shortcut()}>
                <SlimButton onClick={()=>submit(code)}>Submit</SlimButton>
                <span>( ctrl + enter )</span>
            </div>}
        </div>
    )

}

const style=atDotCss({name:'MessagesSourceView',order:'framework',namespace:'iyio',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        color:#ffffff;
        position:relative;
    }
    @.root.autoHeight{
        flex:unset;
    }
    @.busy{
        position:absolute;
        right:1rem;
        bottom:1rem;
        pointer-events:none;
        opacity:0;
        visibility:hidden;
        transition:opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
    }
    @.busy.show{
        opacity:1;
        visibility:visible;
    }
    @.shortcut{
        position:absolute;
        left:50%;
        transform:translateX(-50%);
        bottom:0.5rem;
        display:flex;
        align-items:center;
    }
    @.shortcut button{
        padding:0.5rem 1rem;
        border-radius:@@borderRadius;
        background-color:@@buttonColor;
        font-size:0.8rem;
    }
    @.shortcut span{
        position:absolute;
        top:0;
        left:50%;
        transform:translate(-50%, calc(-100% - 0.5rem));
        white-space:pre;
        font-size:0.5rem;
        opacity:0.3;
        pointer-events:none;
    }

`});
