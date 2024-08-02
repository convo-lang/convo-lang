import { ConvoNode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { wAryRemove } from "@iyio/common";
import { SlimButton, View, useWProp, useWatchDeep } from "@iyio/react-common";
import { useState } from "react";
import { ConvoNodeStepView } from "./ConvoNodeStepView";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib";

export interface ConvoNodeViewProps
{
    node:ConvoNode;
}

export function ConvoNodeView({
    node
}:ConvoNodeViewProps){
    const ctrl=useConvoGraphViewCtrl();

    const steps=useWProp(node,'steps');
    useWatchDeep(steps);

    const key=useWProp(node,'key');

    const [,render]=useState(0);

    return (
        <div className={style.root()}>

            <ConvoNodeStepView
                node={node}
                index={-1}
            />

            {steps?.map((s,i)=>(
                <ConvoNodeStepView
                    key={i}
                    step={s}
                    node={node}
                    index={i}
                />
            ))}

            <View row justifyEnd g1 mt1>

                <SlimButton opacity050 onClick={()=>{
                    node.steps.push({
                        convo:''
                    })
                    render(v=>v+1);
                }}>add step</SlimButton>

                <SlimButton opacity050 onClick={()=>{
                    wAryRemove(ctrl.graph.nodes,node);
                    render(v=>v+1);
                }}>remove</SlimButton>

            </View>

        </div>
    )

}

const style=atDotCss({name:'ConvoNodeView',css:`
    @.root{
        display:flex;
        flex-direction:column;
    }
`});
