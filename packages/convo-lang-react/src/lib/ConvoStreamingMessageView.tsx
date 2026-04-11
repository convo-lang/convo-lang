import { FlatConvoMessage } from "@convo-lang/convo-lang";
import { ObjWatchListener, stopWatchingObj, watchObj } from "@iyio/common";
import { useEffect, useState } from "react";
import { ConvoMessageView, ConvoMessageViewProps } from "./ConvoMessageView.js";
import { renderMdToTarget } from "./convo-markdown-lib.js";
import { defaultConvoFunctionCallMaxArgsCharLength, formatConvoArgsString } from "./convo-theme-lib.js";


export function ConvoStreamingMessageView({
    message,
    ...props
}:ConvoMessageViewProps){

    const [elem,setElem]=useState<HTMLElement|null>(null);

    useEffect(()=>{
        if(!message.streamingActive || !elem){
            return;
        }
        const watcher=watchObj(message);
        const renderRef={id:1}
        const len=props.theme.functionCallMaxArgsCharLength??defaultConvoFunctionCallMaxArgsCharLength;
        const listener:ObjWatchListener<FlatConvoMessage>=(value,evt)=>{
            if(evt.type==='set' && evt.prop==='content'){
                renderRef.id++;
                const fnElem=elem.querySelector('.__convo-message-content-fn');
                const mdElem=fnElem?undefined:elem.querySelector('.__convo-message-content-md');
                const contentElem=(mdElem||fnElem)?undefined:elem.querySelector('.__convo-message-content');
                const content=value.content;
                if(content===undefined){
                    return;
                }
                if(mdElem instanceof HTMLElement){
                    renderMdToTarget(content,mdElem,renderRef);
                }else if(contentElem instanceof HTMLElement){
                    contentElem.innerText=content;
                }else if(fnElem instanceof HTMLElement){
                    fnElem.innerText=formatConvoArgsString(content,props.theme,true);
                }
                const tokenElem=elem.querySelector('.__convo-message-tokens');
                if(tokenElem instanceof HTMLElement){
                    tokenElem.innerText=`(~${Math.ceil(content.length/4)} tokens)`;
                }
            }
        }
        watcher.addListener(listener)

        return ()=>{
            watcher.removeListener(listener);
            stopWatchingObj(message);
        }
    },[message,elem]);

    return (
        <ConvoMessageView
            message={message}
            elemRef={message.streamingActive?setElem:undefined}
            {...props}
        />
    )

}
