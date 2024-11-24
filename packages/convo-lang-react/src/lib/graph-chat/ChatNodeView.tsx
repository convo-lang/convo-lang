import { ConvoNode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { SlimButton, View, useSubject } from "@iyio/react-common";
import { useState } from "react";
import { ConversationView } from "../ConversationView";
import { convoGraphEntityDragClass, useConvoGraphViewCtrl } from "../graph/convo-graph-react-lib";

export interface ChatNodeViewProps
{
    node:ConvoNode
}

export function ChatNodeView({
    node
}:ChatNodeViewProps){

    const ctrl=useConvoGraphViewCtrl();
    const conversationStyle=useSubject(ctrl.styleSubject);

    const size=useSubject(ctrl.canvasSizeSubject);

    const [elem,setElem]=useState<HTMLElement|null>(null);

    return (
        <div className={style.root()} ref={setElem} style={{width:size.width+'px',height:size.height+'px'}}>

            <div className={style.bar(null,convoGraphEntityDragClass)}>
                <SlimButton onClick={()=>{
                    if(elem && ctrl.panZoom){
                        ctrl.panZoom.panTo({elem})
                    }
                }}>
                    Focus
                </SlimButton>
            </div>
            <div className={style.container(null)}>
                <View col flex2 className={style.panel()}>

                </View>
                <View col flex1 className={style.panel()}>
                    <ConversationView
                        enabledSlashCommands
                        template={node.steps.map(s=>s.convo).join('\n\n')}
                        showInputWithSource
                        theme={conversationStyle.conversationTheme}
                    />
                </View>
            </div>

        </div>
    )

}

const style=atDotCss({name:'ChatNodeView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        position:relative;
        padding:1rem;
        gap:1rem;
    }
    @.panel{
        border-radius:1rem;
        background:#ffffff;

    }
    @.container{
        flex:1;
        display:flex;
        gap:1rem;
    }
    @.bar{
        padding:1rem;
        border-radius:1rem;
        background:#ffffff;
        cursor:move;
        display:flex;
        justify-content:flex-end;
    }
`});
