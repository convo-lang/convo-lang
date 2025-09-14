import { parseConvoCode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { wAryRemove, wSetProp, wSetPropOrDeleteFalsy } from "@iyio/common";
import { SlimButton, View, useWProp } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback } from "react";
import { ConvoSourceNode } from "../../convo-graph-types.js";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib.js";

export interface ConvoSourceNodeViewProps
{
    src:ConvoSourceNode;
}

/**
 * @acIgnore
 */
export function ConvoSourceNodeView({
    src
}:ConvoSourceNodeViewProps){

    const ctrl=useConvoGraphViewCtrl();

    const code=useWProp(src,'source');
    const shared=useWProp(src,'shared');
    const type=useWProp(src,'type');

    const setCode=useCallback((v:string)=>{
        wSetProp(src,'source',v);
    },[src]);

    return (
        <div className={style.root()}>

            <input type="text" value={type??''} onChange={e=>wSetProp(src,'type',e.target.value)} placeholder="Type"/>

            <View row>
                <label>Shared</label>
                <input type="checkbox" checked={shared??false} onChange={e=>wSetPropOrDeleteFalsy(src,'shared',e.target.checked)}/>
            </View>

            <LazyCodeInput
                mt050
                lineNumbers
                language={'convo'}
                value={code}
                onChange={setCode}
                logParsed
                parser={parseConvoCode}
                bottomPadding={10}
            />

            <View row justifyBetween>

                <SlimButton opacity050 onClick={()=>{
                    wAryRemove(ctrl.graph.sourceNodes,src);
                }}>remove</SlimButton>


            </View>

        </div>
    )

}

const style=atDotCss({name:'ConvoSourceNodeView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        gap:1rem;
    }
`});
