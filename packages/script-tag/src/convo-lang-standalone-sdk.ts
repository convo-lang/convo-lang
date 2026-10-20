import * as convoLang from "@convo-lang/convo-lang";
import * as react from "@convo-lang/convo-lang-react";
import { createElement } from "react";
import { createRoot } from 'react-dom/client';
import { ConvoViewSdkWrapper } from "./sdk-wrapper.js";

(()=>{
    const CONVO_LANG={
        convoLang,
        react
    }

    if(globalThis.window){
        (globalThis.window as any).CONVO_LANG=CONVO_LANG;
    }

    const createConvoView=(props:any)=>{
        const rootView=document.getElementById('convo-view');
        if(rootView){
            const root=createRoot(rootView);
            root.render(createElement(ConvoViewSdkWrapper,{
                httpEndpoint:'/api/convo-lang/',
                template:'> assistant\nhello',
                ...props
            }));
        }
    }

    const tryCreate=()=>{
        const props=(globalThis.window as any).CONVO_VIEW_PROPS
        if(props){
            createConvoView(props);
            return true;
        }else{
            return false;
        }
    }

    if(!tryCreate()){
        const iv=setInterval(()=>{
            if(tryCreate()){
                clearInterval(iv);
            }
        },100);
    }
})();