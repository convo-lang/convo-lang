import { getHighlighter, getHighlighterAsync } from "@convo-lang/highlighter/highlighter";
import { getHighlighterLang } from "@convo-lang/highlighter/highlighter-lib";
import { DocCtrl } from "@convo-lang/studio/DocCtrl";
import { SpriteDef, SpriteInputEvt } from "@convo-lang/tui/tui-types";
import type { ThemedToken } from "shiki";
import { ConvoTuiConvoCodeCtrl } from "../lib/ConvoTuiConvoCodeCtrl";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";

const nlCharPoint='\n'.charCodeAt(0);

export const codeInput=(ctx:ConvoCliTuiCtx,doc:DocCtrl):SpriteDef=>{

    const {tui,studio}=ctx;

    const lang=getHighlighterLang(doc.uri.path);
    const isConvo=lang==='convo';

    const codeCtrl=new ConvoTuiConvoCodeCtrl({doc,tui,studio});
    const id=codeCtrl.id;

    let prevTokens:ThemedToken[][]=[];
    let prevCode:string|undefined;

    const highlight=(code:string)=>{
        
        if(!lang){
            return;
        }
        const h=getHighlighter();
        if(!h){
            getHighlighterAsync().then(()=>tui.render());
        }
        if(prevCode===code || !h){
            return prevTokens;
        }
        const r=h.codeToTokensBase(code,{
            lang,
            theme:'dark-plus',
        });
        prevTokens=r;
        prevCode=code;
        return r;
    }

    const onInput=(evt:SpriteInputEvt)=>{
        codeCtrl.setCode(evt.sprite.state?.inputValue??'',false);
    }

    let busyRendered=false;
    let busyOverlayRendered=false;
    

    return {
        layout:'column',
        flex:1,
        //border:'border',
        borderStyle:'rounded',
        onUnmount:()=>{
            codeCtrl.dispose();
        },
        children:[
            {
                layout:'row',
                flex:1,
                gap:1,
                bg:'card',
                color:'card-foreground',
                children:[
                    {
                        width:7,
                        margin:{right:1},
                        padding:{right:1},
                        color:'muted',
                        border:{right:'border'},
                        inlineRenderer:{
                            render:ctx=>{
                                const input=tui.findSpriteById(id);
                                const scrollY=input?.state?.scrollY??0;
                                for(let y=0;y<ctx.height && y<codeCtrl.lineCount;y++){
                                    ctx.setChar(0,y,(y+1+scrollY).toString().padStart(5,' '));
                                }
                            },
                        }
                    },
                    {
                        id:codeCtrl.inputId,
                        isInput:true,
                        multiLineInput:true,
                        text:codeCtrl.code,
                        color:'plaintext',
                        flex:1,
                        scrollable:true,
                        onInput,
                        textWrap:'clip',
                        textClipStyle:'ellipses',
                        placeholder:isConvo?convoPlaceholder:'Write code where',
                        beforeRender:(sprite)=>codeCtrl.beforeRenderInput(sprite),
                        autoActivate:true,
                        onSubmit:()=>{
                            codeCtrl.completeAsync();
                        },
                        onDraw:(bounds,xOffset,yOffset,buffer,sprite)=>{
                            const r=highlight(codeCtrl.code);
                            if(!r){
                                return;
                            }
                            for(let y=0;y<r.length && y<bounds.height;y++){
                                const row=r[yOffset+y];
                                const bufferRow=buffer[bounds.y+y];
                                if(!row || !bufferRow){
                                    continue;
                                }
                                row: for(let ti=0,x=0;ti<row.length;ti++){
                                    const t=row[ti];
                                    if(!t){
                                        continue;
                                    }
                                    for(let s=xOffset;s<t.content.length;s++){
                                        const char=bufferRow[xOffset+bounds.x+x-xOffset];
                                        x++;
                                        if(x>=bounds.x+bounds.width){
                                            continue row;
                                        }
                                        if(!char){
                                            continue;
                                        }
                                        char.f=t.color;
                                        //char.b=t.bgColor;
                                        if(char.f && char.f.length>7){
                                            char.f=char.f.substring(0,7)
                                        }
                                        // if(char.b && char.b.length>7){
                                        //     char.b=char.b.substring(0,7)
                                        // }
                                    }
                                }
                            }
                        }
                    },
                ],
            },
            {
                id:codeCtrl.runOverlayBtnId,
                text:'\u25B6 run (ctrl+r)',
                color:'muted',
                tabIndex:-1,
                absolutePosition:{left:-20,top:10},
                width:50,
                height:1,
                isButton:true,
                onClick:()=>codeCtrl.completeAsync(),
                inlineRenderer:{
                    render:(ctx)=>{
                        if(!codeCtrl.isCompleting){
                            ctx.setChar(0,0,ctx.sprite.text??'');
                            const b=busyOverlayRendered;
                            busyOverlayRendered=false;
                            return b;
                        }
                        let msg=` running `;
                        for(let i=0;i<25;i++){
                            msg+=barChars[(ctx.count+i)%barChars.length]
                        }
                        ctx.setChar(0,0,msg);
                        busyOverlayRendered=true;
                        return true;
                    },
                    overlayContent:true,
                    intervalMs:100
                }

            },
            {
                id:codeCtrl.errorOverlayId,
                text:' ⚠ error',
                absolutePosition:{left:20,top:10},
                width:14,
                height:1,
                bg:'destructive',
                color:'destructive-foreground',
            }
        ]
    }
}

const barChars=['▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃'];

const convoPlaceholder=/*convo*/`
> system
Example system messages

Current Datetime: {{dateTime()}}

> user
What time is it?
`.trim();