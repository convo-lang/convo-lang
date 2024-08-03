import { atDotCss } from "@iyio/at-dot-css";
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
}

export function MarkdownViewer({
    markdown
}:MarkdownViewerProps){

    const [elem,setElem]=useState<HTMLElement|null>(null);

    useEffect(()=>{
        if(!elem){
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

    },[markdown,elem]);

    return (
        <div ref={setElem} className={style.root()}/>
    )

}

const style=atDotCss({name:'MarkdownViewer',css:`
    @.root{
        display:flex;
        flex-direction:column;
    }
    @.root h1{
        margin:1rem 0;
    }
    @.root h2{
        margin:0.7rem 0;
    }
    @.root h3{
        margin:0.5rem 0;
    }
`});
