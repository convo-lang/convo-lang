import { ConvoComponent, ConvoComponentMessageState, ConvoComponentRenderCache } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { JsonView, LoadingDots, View, useSubject } from "@iyio/react-common";
import { useMemo } from "react";
import { MarkdownViewer } from "./MarkdownViewer";

export interface ConvoComponentRendererProps
{
    state?:ConvoComponentMessageState;
    renderComponent?:(comp:ConvoComponent,compProps:Record<string,any>,index:number)=>any;
}

export function ConvoComponentRenderer({
    state,
    renderComponent,
}:ConvoComponentRendererProps){

    const renderCache=useMemo(()=>new ConvoComponentRenderCache(),[]);
    const comps=state?.all.map(c=>c.componentActive?renderCache.getComponent(c):null).filter(c=>c) as ConvoComponent[];

    const next=(data?:Record<string,any>)=>{
        if(state?.last?.componentIndex===undefined){
            return;
        }
        state.convo.submitComponentData({
            componentIndex:state.last.componentIndex,
            data
        })
    }

    const flat=useSubject(state?.convo.flatSubject);
    let lastMsgContent:any|undefined;
    if(flat){
        for(let i=flat.messages.length-1;i>=0;i--){
            const m=flat.messages[i];
            if(m && !m.isUser && !m.fn && !m.component){
                if(m.called){
                    lastMsgContent=m.calledReturn===undefined?'(empty)':m.calledReturn;
                }else{
                    lastMsgContent=m.content??'(empty)';
                }
                break;
            }

        }
    }

    return (
        <div className={style.root()}>

            {comps?.map((comp,i)=>renderComponent?.(comp,{
                next,
                comp,
                ...state,
                ...state?.flat.vars,
                ...comp.atts
            },i)??null)}

            {!comps?.length && <View flex1 centerBoth>
                {lastMsgContent===undefined?
                    <LoadingDots/>
                :(typeof lastMsgContent === 'string')?
                    <MarkdownViewer markdown={lastMsgContent}/>
                :
                    <JsonView value={lastMsgContent} />
                }
            </View>}

        </div>
    )

}

const style=atDotCss({name:'ConvoComponentRenderer',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
    }
`});
