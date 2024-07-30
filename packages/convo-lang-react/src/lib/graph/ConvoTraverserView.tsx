import { atDotCss } from "@iyio/at-dot-css";
import { wAryRemove, wSetProp } from "@iyio/common";
import { ConvoTraverser } from "@iyio/convo-lang";
import { JsonView, SlimButton, Text, View } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib";

export interface ConvoTraverserViewProps
{
    traverser:ConvoTraverser
}

export function ConvoTraverserView({
    traverser
}:ConvoTraverserViewProps){

    const ctrl=useConvoGraphViewCtrl();

    const [payload,setPayload]=useState(traverser.payload);
    const [status,setStatus]=useState(traverser.exeState);
    const [error,setError]=useState(traverser.errorMessage);
    const [stepName,setStepName]=useState('');
    const [step,setStep]=useState(traverser.currentStepIndex);
    const [nodeId,setNodeId]=useState(traverser.currentNodeId);

    useEffect(()=>{
        const iv=setInterval(()=>{

            setPayload(traverser.payload);
            setStatus(traverser.exeState);
            setError(traverser.errorMessage);
            setNodeId(traverser.currentNodeId);
            setStep(traverser.currentStepIndex);

            const nodeId=traverser.currentNodeId;
            if(!nodeId){
                return;
            }

            const node=ctrl.graph.nodes.find(n=>n.id===nodeId);
            if(!node){
                return;
            }


            const step=node.steps[traverser.currentStepIndex];
            setStepName(traverser.currentStepIndex===-1?'auto transform':(step?.name??'(unnamed)'));

            const layout=ctrl.entityCtrls[node.id];
            const stepRect=layout?.getElementBounds({type:'step',index:traverser.currentStepIndex});

            const tl=ctrl.entityCtrls[traverser.id];
            if(tl && tl.allowDrag.value){
                tl.allowDrag.next(false);
            }

            if(stepRect){

                wSetProp(traverser,'x',(node.x??0)+stepRect.x+16);
                wSetProp(traverser,'y',(node.y??0)+stepRect.y+stepRect.height);
            }else{
                wSetProp(traverser,'x',node.x);
                wSetProp(traverser,'y',node.y);
            }


            if(traverser.exeState==='stopped' || traverser.exeState==='failed'){
                clearInterval(iv);
                tl?.allowDrag.next(true);
            }


        },30);
        return ()=>{
            clearInterval(iv);
        }
    },[traverser,ctrl]);

    const [,render]=useState(0);

    return (
        <div className={style.root()}>

            <Text text={`status: ${status}`}/>
            <Text text={`node: ${nodeId}`}/>
            <Text text={`step(${step}): ${stepName}`}/>

            {!!error && <Text text={`error: ${error}`}/>}

            Payload:
            <div className={style.code()}>
                <JsonView value={payload}/>
            </div>

            <View row justifyEnd g1 mt1>

                <SlimButton opacity050 onClick={()=>{
                    wAryRemove(ctrl.graph.traversers,traverser);
                    render(v=>v+1);
                }}>remove</SlimButton>

            </View>

        </div>
    )

}

const style=atDotCss({name:'ConvoTraverserView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        gap:0.5rem;
    }
    @.code{
        max-height:250px;
        overflow-y:auto;
    }
`});
