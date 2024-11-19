import { ConvoNode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { useWatchPath } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { ConvoGraphEntityView } from "./ConvoGraphEntityView";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
const svgSpan=6000;

export interface ConvoGraphCanvasProps
{
    ctrl:ConvoGraphViewCtrl;
    getNodeLink?:(node:ConvoNode)=>string|null|undefined;
}

/**
 * @acIgnore
 */
export function ConvoGraphCanvas({
    ctrl,
    getNodeLink,
}:ConvoGraphCanvasProps){

    useWatchPath(ctrl.graph,'edges');
    useWatchPath(ctrl.graph,'nodes');

    const [lineGroup,setLineGroup]=useState<SVGGElement|null>(null);
    useEffect(()=>{
        if(lineGroup){
            ctrl.lineCtrl.lineGroup=lineGroup
        }
    },[lineGroup,ctrl]);

    return (
        <div className={convoGraphCanvasStyle.root()}>

            <svg
                className={convoGraphCanvasStyle.svg({hq:ctrl.style.hqLines})}
                viewBox={`-${svgSpan} -${svgSpan} ${svgSpan*2} ${svgSpan*2}`}
                width={svgSpan*2}
                height={svgSpan*2}
                onDragOver={e=>{
                    if(!ctrl.dragNodeFrom){
                        e.preventDefault()
                    }
                }}
                onDrop={e=>{
                    if(!ctrl.dragNodeFrom){
                        ctrl.triggerOnDrop(e);
                    }
                }}
            >
                <rect
                    className={convoGraphCanvasStyle.bg()}
                    fill="transparent"
                    x={-svgSpan}
                    y={-svgSpan}
                    width={svgSpan*2}
                    height={svgSpan*2}
                />
                <g ref={setLineGroup}/>
            </svg>

            {ctrl.graph.nodes.map((n)=>(
                <ConvoGraphEntityView key={n.id} node={n} ctrl={ctrl} getNodeLink={getNodeLink}/>
            ))}

            {ctrl.graph.edges.map((n)=>(
                <ConvoGraphEntityView key={n.id} edge={n} ctrl={ctrl}/>
            ))}

            {ctrl.graph.inputs.map((n)=>(
                <ConvoGraphEntityView key={n.id} input={n} ctrl={ctrl}/>
            ))}

            {ctrl.graph.sourceNodes.map((n)=>(
                <ConvoGraphEntityView key={n.id} sourceNode={n} ctrl={ctrl}/>
            ))}

            {ctrl.graph.traversers.map((n)=>(
                <ConvoGraphEntityView key={n.id} traverser={n} ctrl={ctrl}/>
            ))}

        </div>
    )

}

export const convoGraphCanvasStyle=atDotCss({name:'ConvoGraphCanvas',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        position:relative;
    }
    @.svg{
        position:absolute;
        left:-${svgSpan}px;
        top:-${svgSpan}px;
        height:${svgSpan*2}px;
        width:${svgSpan*2}px;
        overflow:visible;
        shape-rendering:optimizespeed;
    }
    @.svg.hq{
        shape-rendering:unset;
    }
    @.bg{

    }
`});
