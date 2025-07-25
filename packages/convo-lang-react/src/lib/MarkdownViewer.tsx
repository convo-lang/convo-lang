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
    contentClassName?:string;
    disableImages?:boolean;
    disableLinks?:boolean;
}

export function MarkdownViewer({
    markdown,
    lazy,
    contentClassName,
    disableImages,
    disableLinks,
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
                let renderer=md;
                if(disableImages){
                    renderer=(renderer as any).disable('image');
                }
                if(disableLinks){
                    renderer=(renderer as any).disable('link');
                }
                const match=mdBlock.exec(markdown);
                if(match){
                    let m=markdown.substring(match[0].length).trim();
                    if(m.endsWith('```')){
                        m=m.substring(0,m.length-3);
                    }
                    elem.innerHTML=renderer.render(m);
                }else{
                    elem.innerHTML=renderer.render(markdown);
                }
            }
        })

        return ()=>{
            m=false;
        }

    },[markdown,elem,show,lazy,disableImages,disableLinks]);

    return (
        <div ref={setElem} className={cn(style.root(null,null,props),contentClassName??markdownStyle.root())}/>
    )

}

const style=atDotCss({name:'MarkdownViewer',css:`
    @.root{
        display:flex;
        flex-direction:column;
        white-space:pre-line;
    }

    @.root > *:last-child{
        margin-bottom:0 !important;
    }

    @.root > *:first-child{
        margin-top:0 !important;
    }
`});

export const markdownStyle=atDotCss({name:'MarkdownStyle',css:`
    @.root > *:first-child{
        margin-top:0;
    }

    @.root h1,@.root h2,@.root h3,@.root h4,@.root h5,@.root h6{
        margin-top:2rem;
        font-weight:500 !important;
        letter-spacing:0.02em;
    }

    @.root h1{
        font-size:2rem;
    }
    @.root h2{
        font-size:1.7rem;
    }
    @.root h3{
        font-size:1.5rem;
    }
    @.root h3{
        font-size:1.2rem;
    }
    @.root h4{
        font-size:1.1rem;
    }
    @.root h5{
        font-size:1rem;
    }
    @.root h6{
        font-size:0.9rem;
    }
    @.root strong{
        font-weight:600;
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
    @.root ul, @.root ol{
        list-style-type:auto;
        margin:revert;
        padding:revert;
        white-space:normal;
    }
    @.root pre{
        white-space:pre-wrap;
    }
    @.root code{
        border:1px solid #ffffff44;
        padding:1rem;
        border-radius:4px;
        display:block;
    }
    @.root table{
        width:100%;
    }
`});

const mdBlock=/[\s\n\r]*```\s*(md|markdown).*/
