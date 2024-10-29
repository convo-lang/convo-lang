import { ConversationView } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";
import { NextJsBaseLayoutView } from "@iyio/nextjs-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useEffect, useRef, useState } from "react";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const exampleConvo=/*convo*/`

> define
agentName='Doc'

> system
Your name is {{agentName}} and you're an expert web designer working on retro website ideas.

Your design area size is {{getSize().width}}px x {{getSize().height}}px.

Only use HTML, SVGs and JavaScript. Use the style tag for inline styling of html and svg elements.

The canvas has a positioning of relative, so you can use absolute positioning in your layout.

> extern setHtml(
    # Should be a div containing all the html for the site
    html:string

    # Javascript for the site
    javascript:string
)

> assistant
Hi 👋, I'm {{agentName}}. We are going to make some throwback web pages today.

> assistant
Are you ready for a blast from the past.

@suggestion
> assistant
Original version of google

@suggestion
> assistant
Yahoo in its hey day

@suggestion
> assistant
Napster when it was awesome

@suggestion
> assistant
IGN

`


export function AgentView(){

    const canvas=useRef<HTMLDivElement|null>(null);

    const [tab,setTab]=useState<'rendered'|'html'|'js'>('rendered');

    const [html,setHtml]=useState('');
    const [js,setJs]=useState('');

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
        <NextJsBaseLayoutView className={style.root()}>

            <div className={style.contentArea()}>
                <div
                    className={style.container({active:tab==='rendered'})}
                    ref={canvas}
                    dangerouslySetInnerHTML={{__html:html}}
                />
                <div className={style.container({active:tab==='html'})}>
                    <LazyCodeInput
                        absFill
                        value={html}
                        language="html"
                        lineNumbers
                        onChange={setHtml}
                    />
                </div>
                <div className={style.container({active:tab==='js'})}>
                    <LazyCodeInput
                        absFill
                        value={js}
                        language="javascript"
                        lineNumbers
                        onChange={setJs}
                    />

                </div>
                <div className={style.buttons()}>
                    <button className={style.btn({active:tab==='rendered'})} onClick={()=>setTab('rendered')}>Rendered</button>
                    <button className={style.btn({active:tab==='html'})} onClick={()=>setTab('html')}>HTML</button>
                    <button className={style.btn({active:tab==='js'})} onClick={()=>setTab('js')}>JavaScript</button>
                </div>
            </div>

            <div className={style.chat()}>
                <ConversationView
                    theme="dark"
                    showInputWithSource
                    enabledSlashCommands
                    template={exampleConvo}
                    httpEndpoint="/api/convo-lang"
                    externFunctions={{
                        setHtml:async (html:string,javascript:string)=>{
                            const c=canvas.current;
                            if(!c){
                                return 'Canvas not ready';
                            }
                            setHtml(html);
                            setJs(javascript)
                            return 'Done'
                        },
                        getSize:()=>({
                            width:canvas.current?.clientWidth??0,
                            height:canvas.current?.clientHeight??0,
                        })
                    }}
                />
            </div>

        </NextJsBaseLayoutView>
    )

}


// For syntax highlighting of at-dot-css install the High-js VSCode extension.
// Search for "high-js" in the extensions window.
const style=atDotCss({name:'AgentView',css:`
    @.root{
        display:flex;
        height:100%;
        width:100%;
        border-radius:8px;
        padding:1rem;
        gap:1rem;
    }
    @.contentArea{
        flex:1;
        position:relative;
    }
    @.container{
        display:none;
        overflow:hidden;
        border-radius:8px;
        border:1px solid #444;
        position:absolute;
        left:0;
        top:0;
        right:0;
        bottom:0;
    }
    @.container.active{
        display:block;
    }
    @.chat{
        display:flex;
        flex-direction:column;
        width:500px;
        background-color:#222;
        border-radius:8px;
        border:1px solid #444;
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
`});
