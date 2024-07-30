import { ConvoGraphCtrl } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { escapeHtml, shortUuid, wAryPush, wSetProp } from "@iyio/common";
import { DragTarget, PanZoomCtrl, PanZoomView, SlimButton, View, useWatchDeep } from "@iyio/react-common";
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConvoGraphCanvas } from "./ConvoGraphCanvas";
import { convoGraphEntityStyle } from "./ConvoGraphEntityView";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
import { ConvoGraphReactCtx } from "./convo-graph-react-lib";

export interface ConvoGraphViewProps
{
    ctrl?:ConvoGraphCtrl;
    setViewCtrl?:(ctrl:ConvoGraphViewCtrl)=>void;
}

export function ConvoGraphView({
    ctrl:ctrlProp,
    setViewCtrl,
}:ConvoGraphViewProps){

    const [ctrl,setCtrl]=useState<ConvoGraphViewCtrl|null>(null);
    useEffect(()=>{
        if(ctrl && setViewCtrl){
            setViewCtrl(ctrl);
        }
    },[ctrl,setViewCtrl]);

    const [panZoom,setPanZoom]=useState<PanZoomCtrl|null>(null);

    const [rootElem,setRootElem]=useState<HTMLElement|null>(null);

    const [outputElem,setOutputElem]=useState<HTMLElement|null>(null);
    const refs=useRef({outptutElem: outputElem});
    refs.current.outptutElem=outputElem;

    const [outputSize,setOutputSize]=useState<'min'|'default'|'full'>('min');

    useEffect(()=>{

        const c=ctrlProp??new ConvoGraphCtrl({});

        const ctrl=new ConvoGraphViewCtrl({
            ctrl:c
        });

        const sub=ctrl.ctrl.onMonitorEvent.subscribe(e=>{
            if(!outputElem){
                return;
            }
            const line=`${e.type} / ${e.traverser?.exeState} - ${e.text} - \npayload:`+JSON.stringify(e.traverser?.payload??null)+'\n';
            outputElem.innerHTML+=escapeHtml(line);
            outputElem.scrollTo({
                top:outputElem.scrollHeight,
                behavior:'smooth'
            })
            //console.info(line);
        });

        setCtrl(ctrl);

        return ()=>{
            ctrl.dispose();
            if(!ctrlProp){
                c.dispose();
            }
            sub.unsubscribe();
        }
    },[ctrlProp,outputElem]);

    const dragTargets=useMemo<DragTarget[]>(()=>[{
        className:convoGraphEntityStyle.bar(),
        targetParentClass:convoGraphEntityStyle.root(),
        skipSetTransform:true,
        onMove:(pt,elem)=>{
            // const entity=ctrl?.getNodeByElem(elem);
            // if(entity){
            //     entity.moveTo(pt);
            // }

            const l=ctrl?.getLayoutForElem(elem);
            if(l){
                wSetProp(l.entity,'x',pt.x);
                wSetProp(l.entity,'y',pt.y);
            }

        },
        // onEnd:(pt,elem)=>{
        //     // const entity=ctrl?.getNodeByElem(elem);
        //     // if(entity){
        //     //     entity.updateCodeLayout(pt);
        //     // }
        // },
    }],[ctrl]);

    const onContextMenu=useCallback((e:MouseEvent)=>{


        if(!panZoom || !ctrl || !(e.target as Element).classList?.contains('PanZoomView')){
            return;
        }

        e.preventDefault();

        const pt=panZoom.transformClientPointToPlane({x:e.clientX,y:e.clientY});

        if(e.metaKey){

            wAryPush(ctrl.graph.sourceNodes,{
                id:shortUuid(),
                x:pt.x,
                y:pt.y,
                shared:true,
                source:'> define\n'
            });
        }else if(e.altKey){

            wAryPush(ctrl.graph.inputs,{
                id:shortUuid(),
                x:pt.x,
                y:pt.y,
                value:'{\n\n}'
            });
        }else if(e.shiftKey){
            wAryPush(ctrl.graph.edges,{
                id:shortUuid(),
                to:'_',
                from:'_',
                x:pt.x,
                y:pt.y,
            });
        }else{
            wAryPush(ctrl.graph.nodes,{
                id:shortUuid(),
                steps:[{convo:'> user\nEnter user prompt'}],
                x:pt.x,
                y:pt.y,

            });
        }


    },[panZoom,ctrl]);

    useWatchDeep(ctrl?.graph);

    useEffect(()=>{
        if(!ctrl){
            return;
        }
            ctrl.lineCtrl.updateLines();

        const iv=setInterval(()=>{
            ctrl.ctrl.store.saveChangesAsync();
            ctrl.lineCtrl.updateLines();
        },2000);

        return ()=>{
            clearInterval(iv);
        }

    },[ctrl]);

    useEffect(()=>{

        if(!ctrl || !panZoom){
            return;
        }

        const sub=panZoom.state.subscribe(v=>{
            ctrl.scale=v.scale;
            ctrl.offset={x:v.x,y:v.y}
        })

        return ()=>{
            sub.unsubscribe();
        }

    },[ctrl,panZoom]);

    useEffect(()=>{
        if(ctrl){
            ctrl.rootElem=rootElem;
        }
    },[ctrl,rootElem]);

    return (
        <ConvoGraphReactCtx.Provider value={ctrl}>
            <div className={style.root()} onContextMenu={onContextMenu} ref={setRootElem}>


                <PanZoomView
                    mode="editor"
                    getCtrl={setPanZoom}
                    ignoreClasses="NodeView"
                    dragTargets={dragTargets}
                >

                    {ctrl && <ConvoGraphCanvas ctrl={ctrl} />}
                </PanZoomView>

                <div className={style.outputContainer({
                    full:outputSize==='full',
                    min:outputSize==='min',
                })}>
                    <div className={style.output()} ref={setOutputElem}/>
                    <View row absTopRight p050 g050 opacity050>
                        <SlimButton onClick={()=>{if(outputElem)outputElem.innerHTML='';setOutputSize('min')}}>
                            clear
                        </SlimButton>

                        <SlimButton onClick={()=>setOutputSize(outputSize==='full'?'min':outputSize==='min'?'default':'full')}>
                            resize
                        </SlimButton>
                    </View>
                </div>

            </div>
        </ConvoGraphReactCtx.Provider>
    )

}

const style=atDotCss({name:'ConvoGraphView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        position:relative;
    }
    @.btn{
        margin-top:1rem;
        margin-left:1rem;
        background:#ffffff22;
        border-radius:4px;
        padding:0.5rem;
    }
    @.outputContainer{
        position:absolute;
        bottom:0;
        right:0;
        left:0;
        height:200px;
        background:#000000dd;
    }
    @.outputContainer.full{
        height:100%;
    }
    @.outputContainer.min{
        height:2rem;
    }
    @.output{
        position:absolute;
        bottom:0;
        right:0;
        left:0;
        top:0;
        overflow-y:auto;
        white-space:pre;
    }

    @.root input[type="text"]{
        border:none;
        padding:0.5rem;
        border-radius:4px;
        background:#ffffff22;
    }
`});
