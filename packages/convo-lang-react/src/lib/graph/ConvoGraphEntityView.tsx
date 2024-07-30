import { atDotCss } from "@iyio/at-dot-css";
import { stopWatchingObj, wSetProp, watchObj } from "@iyio/common";
import { ConvoEdge, ConvoInputTemplate, ConvoNode, ConvoSourceNode, ConvoTraverser } from "@iyio/convo-lang";
import { Text, useSubject } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { BehaviorSubject } from "rxjs";
import { ConvoEdgeView } from "./ConvoEdgeView";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
import { ConvoInputView } from "./ConvoInputView";
import { ConvoNodeView } from "./ConvoNodeView";
import { ConvoSourceNodeView } from "./ConvoSourceNodeView";
import { ConvoTraverserView } from "./ConvoTraverserView";
import { ConvoEntityLayoutCtrl, ConvoUiTarget } from "./convo-graph-react-type";

export interface ConvoGraphEntityViewProps
{
    ctrl:ConvoGraphViewCtrl;
    node?:ConvoNode;
    edge?:ConvoEdge;
    traverser?:ConvoTraverser;
    sourceNode?:ConvoSourceNode;
    input?:ConvoInputTemplate;
}

export function ConvoGraphEntityView({
    node,
    edge,
    input,
    traverser,
    sourceNode,
    ctrl,
}:ConvoGraphEntityViewProps){

    const pos=node??edge??traverser??input??sourceNode;

    const [elem,setElem]=useState<HTMLElement|null>(null);

    const [layoutCtrl,setLayoutCtrl]=useState<ConvoEntityLayoutCtrl|null>(null);

    const allowDrag=useSubject(layoutCtrl?.allowDrag);

    useEffect(()=>{
        if(!elem || !pos || (!input && !node && !edge && !traverser && !sourceNode)){
            setLayoutCtrl(null);
            return;
        }

        const getElement=(target:ConvoUiTarget):HTMLElement|undefined=>{
            switch(target.type){
                case 'step':{
                    const e=elem.querySelector(`[data-convo-step="${target.index}"]`);
                    return (e instanceof HTMLElement)?e:undefined;
                }

                case 'shell':
                    return elem;
            }
            return undefined;
        }

        const layoutCtrl:ConvoEntityLayoutCtrl={
            elem,
            node,
            edge,
            sourceNode,
            input,
            traverser,
            entity:pos,
            allowDrag:new BehaviorSubject<boolean>(true),
            updateLayout(){
                elem.style.transform=`translate(${pos.x}px,${pos.y}px)`
            },
            getElement,
            getElementBounds(target:ConvoUiTarget){
                const t=getElement(target)?.getBoundingClientRect();
                if(!t){
                    return undefined;
                }
                if(target.type==='shell'){
                    return {
                        x:pos.x??0,
                        y:pos.y??0,
                        width:t.width/ctrl.scale,
                        height:t.height/ctrl.scale,
                    }

                }else{
                    const rootBound=elem.getBoundingClientRect();
                    return {
                        x:(t.x-rootBound.x)/ctrl.scale,
                        y:(t.y-rootBound.y)/ctrl.scale,
                        width:t.width/ctrl.scale,
                        height:t.height/ctrl.scale,
                    };
                }
            }
        }

        ctrl.entityCtrls[pos.id]=layoutCtrl;


        const watcher=watchObj(pos);

        watcher.addListener((_,evt)=>{
            if(evt.type==='set'){
                switch(evt.prop){
                    case 'x':
                    case 'y':
                        layoutCtrl.updateLayout();
                        ctrl.lineCtrl.updateLines(pos.id);
                        break;
                }
            }else if(evt.type==='change'){
                layoutCtrl.updateLayout();
            }
        })
        layoutCtrl.updateLayout();
        setLayoutCtrl(layoutCtrl);
        return ()=>{
            delete ctrl.entityCtrls[pos.id];
            stopWatchingObj(pos);
        }

    },[elem,pos,node,input,traverser,edge,sourceNode,ctrl]);

    return (
        <div className={convoGraphEntityStyle.root({edge,smooth:allowDrag===false})} ref={setElem}>

            <div className={convoGraphEntityStyle.bar({disabled:allowDrag===false})}>{node?
                'node'
            :edge?
                'edge'
            :traverser?
                'traverser'
            :input?
                'input'
            :sourceNode?
                'source'
            :
                null
            } ({Math.round(pos?.x??0)},{Math.round(pos?.y??0)})</div>

            {(node || input || sourceNode) && <input type="text" value={pos?.name??''} onChange={e=>wSetProp(pos,'name',e.target.value)} placeholder="Name"/>}

            {!!pos?.id && <Text opacity025 xs text={`ID: ${pos.id}`}/>}


            {node && <ConvoNodeView node={node}/>}

            {edge && <ConvoEdgeView edge={edge}/>}

            {input && <ConvoInputView input={input}/>}

            {sourceNode && <ConvoSourceNodeView src={sourceNode}/>}

            {traverser && <ConvoTraverserView traverser={traverser}/>}

        </div>
    )

}

export const convoGraphEntityStyle=atDotCss({name:'ConvoGraphEntityView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        position:absolute;
        min-width:400px;
        max-width:600px;
        min-height:80px;
        background:#2C2C2C;
        border-radius:4px;
        padding:0.5rem;
        gap:0.5rem;
        box-shadow:0 0 8px #000000;
    }
    @.root.edge{
        min-width:200px;
    }
    @.root.smooth{
        transition:transform 0.4s ease-in-out;
    }
    @.bar{
        height:1rem;
        background:#ffffff22;
        border-top-right-radius:4px;
        border-top-left-radius:4px;
        margin:-0.5rem -0.5rem 0 -0.5rem;
        cursor:move;
        font-size:0.6rem;
        color:#ffffff44;
        font-weight:100;
        display:flex;
        align-items:center;
        padding-left:0.2rem;
    }
    @.bar.disabled{
        background:transparent;
    }
    @.btn{
        margin-top:1rem;
        margin-left:1rem;
        background:#ffffff22;
        border-radius:4px;
        padding:0.5rem;
    }
`});
