import { ConversationUiCtrl } from "@convo-lang/convo-lang";
import { ConvoView, ConvoViewProps } from "@convo-lang/convo-lang-react";
import { useDomSharedStyleSheets } from "@iyio/react-common";
import { useEffect, useState } from "react";

export interface ConvoViewSdkWrapperProps extends ConvoViewProps
{
    
}

export function ConvoViewSdkWrapper({
    ...props
}:ConvoViewSdkWrapperProps){

    useDomSharedStyleSheets();

    const [ctrl,setCtrl]=useState<ConversationUiCtrl|null>(null);
    useEffect(()=>{
        if(ctrl && globalThis.window){
            (globalThis.window as any).CONVO_VIEW_CTRL=ctrl;
        }
    },[ctrl]);

    return (
        <ConvoView getCtrl={setCtrl} {...props}/>
    )

}