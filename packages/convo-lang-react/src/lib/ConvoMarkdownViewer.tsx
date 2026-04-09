import { useLazyRender } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { getMdAsync, renderMd } from "./convo-markdown-lib.js";
import { cn } from "./util.js";




export interface ConvoMarkdownViewerProps
{
    className?:string;
    markdown?:string|null;
    lazy?:boolean;
    disableImages?:boolean;
    disableLinks?:boolean;
}

export function ConvoMarkdownViewer({
    className,
    markdown,
    lazy,
    disableImages,
    disableLinks,
}:ConvoMarkdownViewerProps){

    const [elem,setElem]=useState<HTMLElement|null>(null);

    const {show}=useLazyRender(lazy?elem:null);

    useEffect(()=>{
        if(!elem || (!show && lazy)){
            return;
        }
        if(!markdown){
            elem.innerHTML='';
            return;
        }

        let m=true;

        getMdAsync().then(md=>{
            if(m){
                let renderer=md;
                if(disableImages){
                    renderer=(renderer as any).disable('image');
                }
                if(disableLinks){
                    renderer=(renderer as any).disable('link');
                }
                elem.innerHTML=renderMd(markdown,md);
            }
        })

        return ()=>{
            m=false;
        }

    },[markdown,elem,show,lazy,disableImages,disableLinks]);

    return (
        <div ref={setElem} className={cn('__convo-message-content-md',className)}/>
    );
}

