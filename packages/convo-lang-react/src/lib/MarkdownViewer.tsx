import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutProps, cn } from "@iyio/common";
import { useLazyRender } from "@iyio/react-common";
import { useEffect, useState } from "react";

let md:{
    render(markdown:string):string;
};
const getMdAsync=async ()=>{
    if(md){
        return md;
    }
    let markdownit:any=await import('markdown-it');
    if(typeof markdownit.default === 'function'){
        markdownit=markdownit.default;
    }
    md=markdownit();
    return md;
}

export interface MarkdownViewerProps
{
    markdown?:string|null;
    lazy?:boolean;
}

export function MarkdownViewer({
    markdown,
    lazy,
    ...props
}:MarkdownViewerProps & BaseLayoutProps){

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
                elem.innerHTML=md.render(markdown);
            }
        })

        return ()=>{
            m=false;
        }

    },[markdown,elem,show,lazy]);

    return (
        <div ref={setElem} className={cn(style.root(null,null,props),markdownStyle.root())}/>
    )

}

const style=atDotCss({name:'MarkdownViewer',css:`
    @.root{
        display:flex;
        flex-direction:column;
    }
`});

export const markdownStyle=atDotCss({name:'MarkdownStyle',css:`
    @.root h1{
        margin:0 0 1rem 0;
    }
    @.root h2{
        margin:0 0 0.7rem 0;
    }
    @.root h3,@.root h4,@.root h5,@.root h6{
        margin:0 0 0.5rem 0;
    }
    @.root p{
        margin:0 0 0.5rem 0;
    }
    @.root li{
        margin-bottom:1rem;
    }
    @.root hr{
        width:100%;
    }
`});
