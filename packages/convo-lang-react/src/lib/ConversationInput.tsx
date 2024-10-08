import { ConversationUiCtrl } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { Form } from "@iyio/react-common";
import { useEffect, useRef, useState } from "react";
import { useConversationTheme, useConversationUiCtrl } from "./convo-lang-react";

export interface ConversationInputProps
{
    ctrl?:ConversationUiCtrl;
    className?:string;
    inputName?:string;
    inputType?:string;
    inputClassName?:string;
    placeholder?:string;
    submitTrigger?:any;
    min?:boolean;
    children?:any;
}

export function ConversationInput({
    ctrl: _ctrl,
    inputName,
    inputType='text',
    className,
    inputClassName,
    placeholder='Enter message',
    submitTrigger,
    min,
    children,
}:ConversationInputProps){

    const ctrl=useConversationUiCtrl(_ctrl);
    const theme=useConversationTheme(_ctrl);
    const [value,setValue]=useState('');

    const submit=()=>{
        if(ctrl.currentTask){
            return;
        }
        setValue('');
        ctrl.appendUiMessageAsync(value);
    }

    const refs=useRef({submit});
    refs.current.submit=submit;

    useEffect(()=>{
        if(submitTrigger!==undefined){
            refs.current.submit();
        }
    },[submitTrigger]);

    return (
        <Form
            className={style.root(null,className)}
            style={style.vars(theme)}
            onSubmit={submit}
        >

            <input
                className={style.input({min},inputClassName)}
                placeholder={placeholder}
                name={inputName}
                type={inputType}
                value={value}
                onChange={e=>setValue(e.target.value)}
            />

            {children}

        </Form>
    )

}

const style=atDotCss({name:'ConversationInput',order:'framework',namespace:'iyio',css:`
    @.root{
        display:flex;
        flex-direction:row;
        position:relative;
        margin:@@inputMargin;
    }
    @.input{
        all:unset;
        cursor:text;
        flex:1;
        background:@@inputBackground;
        padding:@@inputPadding;
        border-radius:@@borderRadius;
        box-shadow:@@inputShadow;
        border:@@inputBorder;
        background-clip:padding-box;
    }
    @.input.min{
        margin:0;
    }
`});
