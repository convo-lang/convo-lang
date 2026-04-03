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
        <div ref={setElem} className={className}/>
    )

}


const mdBlock=/[\s\n\r]*```\s*(md|markdown).*/
