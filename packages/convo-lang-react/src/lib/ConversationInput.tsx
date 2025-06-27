import { ConversationUiCtrl } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { Form, Image, SlimButton } from "@iyio/react-common";
import { useEffect, useRef, useState } from "react";
import { useConversationTheme, useConversationUiCtrl } from "./convo-lang-react";
import { Icon } from "./icon/Icon";

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
    noSubmitButton?:boolean;
    unstyled?:boolean;
    beforeInput?:any;
    afterInput?:any;
    imageUrl?:string;
    imageAlt?:string;
    imageClassName?:string;
    imageSize?:string|number;
    imageAr?:string|number;
    autoFocus?:boolean|number;
    autoFocusDelayMs?:number;
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
    noSubmitButton,
    unstyled,
    beforeInput,
    afterInput,
    imageUrl,
    imageAlt='icon',
    imageClassName,
    imageSize='3rem',
    imageAr='1',
    autoFocus,
    autoFocusDelayMs=30
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

    const [input,setInput]=useState<HTMLInputElement|null>(null);
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
            <SlimButton className={style.submitBtn({show:!!value})} type="submit">
                <Icon icon="circle-up" size={20} color={theme.userBackground} />
            </SlimButton>
        )
    }

    return (
        <Form
            className={style.root(null,className)}
            style={style.vars(theme)}
            onSubmit={submit}
        >

            {!!imageUrl && <Image className={imageClassName} alt={imageAlt} src={imageUrl} style={{
                height:imageSize,
                aspectRatio:imageAr,
            }} />}
            {beforeInput}

            <input
                ref={setInput}
                className={unstyled?inputClassName:style.input({min},inputClassName)}
                placeholder={placeholder}
                name={inputName}
                type={inputType}
                value={value}
                onChange={e=>setValue(e.target.value)}
            />

            {afterInput}

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
        align-items:center;
        gap:0.5rem;
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
    @.submitBtn{
        position:absolute;
        right:0.5rem;
        top:50%;
        transform:translateY(-50%);
        opacity:0;
        visibility:hidden;
        transition:
            opacity 0.2s ease-in-out,
            visibility 0.2s ease-in-out;
    }
    @.submitBtn.show{
        opacity:1;
        visibility:visible;
    }
`});
