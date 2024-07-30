import { ConvoNode, ConvoNodeStep, parseConvoCode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { wAryMove, wAryRemove, wSetProp, wSetPropOrDeleteFalsy } from "@iyio/common";
import { SlimButton, View, useWProp } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback } from "react";

export interface ConvoNodeStepViewProps
{
    node:ConvoNode;
    step?:ConvoNodeStep;
    index:number;
}

export function ConvoNodeStepView({
    node,
    step,
    index,
}:ConvoNodeStepViewProps){

    const code=useWProp(step,'convo');
    const shared=useWProp(node,'sharedConvo');

    const setCode=useCallback((v:string)=>{
        if(step){
            wSetProp(step,'convo',v);
        }else{
            wSetProp(node,'sharedConvo',v);
        }
    },[step,node])

    return (
        <div className={style.root()}>
            <View justifyBetween row>
                {step?
                    <input type="text" placeholder={`Step ${index}`} value={step.name??''} onChange={e=>wSetPropOrDeleteFalsy(step,'name',e.target.value)}/>
                :
                    'Shared'
                }

                {step && <View row opacity050 g050>
                    {index!==0 && <SlimButton onClick={()=>{
                        wAryMove(node.steps,index,index-1);
                    }}>up</SlimButton>}
                    {index!==node.steps.length-1 && <SlimButton onClick={()=>{
                        wAryMove(node.steps,index,index-1);
                    }}>down</SlimButton>}
                    <SlimButton ml1 onClick={()=>{
                        wAryRemove(node.steps,step);
                    }}>remove</SlimButton>
                </View>}
            </View>
            <div data-convo-step={index.toString()}>
                <LazyCodeInput
                    mt050
                    lineNumbers
                    language='convo'
                    value={code??shared??''}
                    onChange={setCode}
                    parser={parseConvoCode}
                    logParsed
                    bottomPadding={10}
                />
            </div>

        </div>
    )

}

const style=atDotCss({name:'ConvoNodeStepView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        margin-top:2rem;
    }
`});
