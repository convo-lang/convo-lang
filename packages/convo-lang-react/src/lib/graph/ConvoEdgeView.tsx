import { ConvoEdge, parseConvoCode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { wAryRemove, wSetProp, wSetPropOrDeleteFalsy } from "@iyio/common";
import { SlimButton, View, useWProp } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback } from "react";
import { ConvoNodeSelector } from "./ConvoNodeSelector";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib";

export interface ConvoEdgeViewProps
{
    edge:ConvoEdge;
}

/**
 * @acIgnore
 */
export function ConvoEdgeView({
    edge
}:ConvoEdgeViewProps){

    const ctrl=useConvoGraphViewCtrl();
    const to=useWProp(edge,'to');
    const from=useWProp(edge,'from');
    const code=useWProp(edge,'conditionConvo');
    const loop=useWProp(edge,'loop')??false;
    const selectPath=useWProp(edge,'selectPath');
    const loopSelectPath=useWProp(edge,'loopSelectPath');

    const setCode=useCallback((v:string)=>{
        wSetPropOrDeleteFalsy(edge,'conditionConvo',v);
    },[edge]);

    return (
        <div className={style.root()}>

            <View gridLeftAuto2 g050 alignCenter>
                From
                <ConvoNodeSelector flex1 value={from} onChange={v=>{
                    wSetProp(edge,'from',v??'');
                    ctrl.lineCtrl.updateLines(edge.id);
                }} />

                To
                <ConvoNodeSelector flex1 value={to} onChange={v=>{
                    wSetProp(edge,'to',v??'');
                    ctrl.lineCtrl.updateLines(edge.id);
                }} />

                Select
                <input type="text" placeholder="Select path" value={selectPath??''} onChange={e=>wSetPropOrDeleteFalsy(edge,'selectPath',e.target.value)}/>

                Loop
                <View row>
                    <input type="checkbox" checked={loop} onChange={e=>wSetPropOrDeleteFalsy(edge,'loop',e.target.checked)}/>
                </View>

                {loop && <>
                    LPath
                    <input type="text" placeholder="Loop select path" value={loopSelectPath??''} onChange={e=>wSetPropOrDeleteFalsy(edge,'loopSelectPath',e.target.value)}/>
                </>}

            </View>

            <View col g050>
                Condition
                <LazyCodeInput
                    lineNumbers
                    language='convo'
                    value={code??''}
                    onChange={setCode}
                    parser={parseConvoCode}
                    logParsed
                    bottomPadding={10}
                    highlightPrefix={"> conditionFn() -> (\n"}
                    highlightSuffix={"\n)"}
                />
            </View>

            <View row justifyEnd>

                <SlimButton opacity050 onClick={()=>{
                    if(edge){
                        wAryRemove(ctrl.graph.edges,edge);
                    }
                }}>remove</SlimButton>


            </View>

        </div>
    )

}

const style=atDotCss({name:'ConvoEdgeView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        gap:1rem;
        max-width:400px;
    }
`});
