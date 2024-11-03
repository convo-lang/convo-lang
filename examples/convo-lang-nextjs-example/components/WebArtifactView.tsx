import { atDotCss } from "@iyio/at-dot-css";
import { ScrollView } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { MutableRefObject, useEffect, useState } from "react";

export interface WebArtifactViewProps
{
    canvas:MutableRefObject<HTMLDivElement|null>;
    html:string;
    onHtmlChange:(html:string)=>void;
    js:string;
    onJsChange:(js:string)=>void;
}

export function WebArtifactView({
    canvas,
    html,
    onHtmlChange,
    js,
    onJsChange
}:WebArtifactViewProps){

    const [tab,setTab]=useState<'rendered'|'html'|'js'>('rendered');

    useEffect(()=>{
        const iv=setTimeout(()=>{
            try{
                eval(js);
            }catch(ex){
                console.warn('javascript editor error',ex);
            }
        },2000);
        return ()=>{
            clearTimeout(iv);
        }
    },[js]);

    return (
        <>
            <div
                className={style.container({active:tab==='rendered'},style.canvas())}
                ref={canvas}
                dangerouslySetInnerHTML={{__html:html}}
            />
            <div className={style.container({active:tab==='html'})}>
                <ScrollView absFill containerFill containerCol>
                    <LazyCodeInput
                        flex1
                        value={html}
                        language="html"
                        lineNumbers
                        onChange={onHtmlChange}
                    />
                </ScrollView>
            </div>
            <div className={style.container({active:tab==='js'})}>
                <ScrollView absFill containerFill containerCol>
                    <LazyCodeInput
                        flex1
                        value={js}
                        language="javascript"
                        lineNumbers
                        onChange={onJsChange}
                    />
                </ScrollView>

            </div>
            <div className={style.buttons()}>
                <button className={style.btn({active:tab==='rendered'})} onClick={()=>setTab('rendered')}>Rendered</button>
                <button className={style.btn({active:tab==='html'})} onClick={()=>setTab('html')}>HTML</button>
                <button className={style.btn({active:tab==='js'})} onClick={()=>setTab('js')}>JavaScript</button>
            </div>
        </>
    )

}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'WebArtifactView',css:`
    @.container{
        display:none;
        overflow:hidden;
        border-radius:8px;
        position:absolute;
        left:0;
        top:0;
        right:0;
        bottom:0;
    }
    @.container.active{
        display:block;
    }
    @.buttons{
        position:absolute;
        right:1rem;
        bottom:1rem;
        display:flex;
        gap:0.5rem;
    }
    @.btn{
        border-radius:8px;
        border:1px solid #444;
        background-color:#444;
        padding:0.5rem 1rem;
    }
    @.btn.active{
        background-color:#5C92F1;
    }
    @.canvas{
        --foreground:#333333;
        --background:#ffffff;
        color:#333333;
    }
    @.canvas *{
        all:revert;
        box-sizing:border-box;
    }
    @.canvas input{
        background:#ffffff;
    }
`});