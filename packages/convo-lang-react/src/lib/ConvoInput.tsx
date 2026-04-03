import { ConversationUiCtrl, ConvoViewTheme } from "@convo-lang/convo-lang";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "./Button.js";
import { ConversationInputChange, useConversationUiCtrl } from "./convo-lang-react.js";
import { cn } from "./util.js";

export interface ConvoInputProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
    inputName?:string;
    placeholder?:string;
    submitTrigger?:any;
    children?:any;
    noSubmitButton?:boolean;
    beforeInput?:any;
    afterInput?:any;
    imageUrl?:string;
    autoFocus?:boolean|number;
    autoFocusDelayMs?:number;
    onInputChange?:(change:ConversationInputChange)=>void;
    theme:ConvoViewTheme;
}

export function ConvoInput({
    className,
    ctrl: _ctrl,
    inputName='chat',
    placeholder='Enter message',
    submitTrigger,
    children,
    noSubmitButton,
    beforeInput,
    afterInput,
    imageUrl,
    autoFocus,
    autoFocusDelayMs=30,
    onInputChange,
    theme,
}:ConvoInputProps){

    const ctrl=useConversationUiCtrl(_ctrl);
    const [value,setValue]=useState('');
    const ready=!!value;

    const submit=(e?:FormEvent)=>{
        e?.preventDefault();
        if(ctrl.currentTask){
            return;
        }
        setValue('');
        ctrl.appendUiMessageAsync(value);
    }

    const refs=useRef({submit});
    refs.current.submit=submit;

    const [input,setInput]=useState<HTMLTextAreaElement|null>(null);
    useEffect(()=>{
        if(!input || !autoFocus){
            return;
        }
        const iv=setTimeout(()=>{
            input.focus();
        },autoFocusDelayMs);
        return ()=>{
            clearInterval(iv);
        }

    },[input,autoFocus,autoFocusDelayMs]);

    useEffect(()=>{
        if(submitTrigger!==undefined){
            refs.current.submit();
        }
    },[submitTrigger]);

    if(children===undefined && !noSubmitButton){
        children=(
            <Button className={cn(theme.inputSubmitButtonClassName,ready&&theme.inputSubmitReadyButtonClassName)} type="submit">
                {theme.inputSubmitButtonIcon?
                    <theme.inputSubmitButtonIcon className={cn(theme.iconClassName,theme.inputSubmitButtonIconClassName)}/>
                :
                    'submit'
                }
            </Button>
        )
    }

    return (
        <form
            className={cn(theme.inputContainerClassName,ready&&theme.inputContainerReadyClassName,className)}
            onSubmit={submit}
        >

            {!!imageUrl && <div className={theme.inputImageClassName} style={{backgroundImage:`url(${imageUrl})`}}/>}
            {beforeInput}

            <textarea
                ref={setInput}
                className={cn(theme.inputClassName,ready&&theme.inputReadyClassName)}
                placeholder={placeholder}
                name={inputName}
                value={value}
                onChange={e=>{
                    setValue(e.target.value);
                    if(onInputChange){
                        onInputChange({type:'chat',value:e.target.value});
                    }
                }}
                onKeyDown={e=>{
                    if(e.key==='Enter' && !e.shiftKey && !e.altKey && !e.metaKey){
                        e.preventDefault();
                        submit();
                    }
                }}
            />

            {afterInput}

            {children}

        </form>
    )

}
