import { ConvoGraphCtrl, ConvoNode, getConvoGraphEventString } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { Point, asArray, escapeHtml, wAryPush, wSetProp } from "@iyio/common";
import { DragTarget, PanZoomCtrl, PanZoomState, PanZoomView, SlimButton, View, useDeepCompareItem, useElementSize, useWatchDeep } from "@iyio/react-common";
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convoGraphChatRenderer } from "../graph-chat/graph-chat-renderer";
import { ConvoGraphCanvas, convoGraphCanvasStyle } from "./ConvoGraphCanvas";
import { ConvoGraphViewCtrl, ConvoGraphViewCtrlOptions } from "./ConvoGraphViewCtrl";
import { convoElemLineRef, convoLineCtrlStyle } from "./ConvoLineCtrl";
import { ConvoGraphReactCtx, convoGraphEntityClass, convoGraphEntityDragClass } from "./convo-graph-react-lib";
import { ConvoGraphEntityRenderer, ConvoGraphStyle, ConvoUiLine } from "./convo-graph-react-type";

export interface ConvoGraphViewProps
{
    ctrl?:ConvoGraphCtrl;
    createViewCtrl?:(options:ConvoGraphViewCtrlOptions)=>ConvoGraphViewCtrl
    setViewCtrl?:(ctrl:ConvoGraphViewCtrl)=>void;
    getNodeLink?:(node:ConvoNode)=>string|null|undefined;
    hideOutput?:boolean;
    onDrop?:(pt:Point)=>void;
    ctrlScroll?:boolean;
    style?:ConvoGraphStyle;
    disablePanZoom?:boolean;
    initPanZoomState?:Partial<PanZoomState>;
    defaultInputValue?:string;
    enableChatView?:boolean;
    entityRenderer?:ConvoGraphEntityRenderer|ConvoGraphEntityRenderer[]|null;
    children?:any;
}

export function ConvoGraphView({
    ctrl:ctrlProp,
    setViewCtrl,
    getNodeLink,
    hideOutput,
    createViewCtrl,
    onDrop,
    ctrlScroll,
    style:_graphStyle,
    disablePanZoom,
    initPanZoomState,
    defaultInputValue='{\n\n}',
    enableChatView,
    entityRenderer,
    children,
}:ConvoGraphViewProps){

    const [ctrl,setCtrl]=useState<ConvoGraphViewCtrl|null>(null);
    useEffect(()=>{
        if(ctrl && setViewCtrl){
            setViewCtrl(ctrl);
        }
    },[ctrl,setViewCtrl]);

    const graphStyle=useDeepCompareItem(_graphStyle);
    useEffect(()=>{
        if(graphStyle!==undefined && ctrl){
            ctrl.style=graphStyle;
        }
    },[ctrl,graphStyle])

    const [panZoom,setPanZoom]=useState<PanZoomCtrl|null>(null);

    const [rootElem,setRootElem]=useState<HTMLElement|null>(null);
    const [rootSize]=useElementSize(rootElem);
    useEffect(()=>{
        if(ctrl){
            ctrl.canvasSize=rootSize;
        }
    },[ctrl,rootSize]);

    const [outputElem,setOutputElem]=useState<HTMLElement|null>(null);
    const refs=useRef({outputElem,rootElem,lastRemoveTime:0,createViewCtrl,onDrop});
    refs.current.outputElem=outputElem;
    refs.current.rootElem=rootElem;
    refs.current.createViewCtrl=createViewCtrl;
    refs.current.onDrop=onDrop;

    const [outputSize,setOutputSize]=useState<'min'|'default'|'full'>('min');

    useEffect(()=>{

        const c=ctrlProp??new ConvoGraphCtrl({logEventsToConsole:true});

        const options:ConvoGraphViewCtrlOptions={
            ctrl:c
        }

        const ctrl=refs.current.createViewCtrl?.(options)??new ConvoGraphViewCtrl(options);

        const sub=ctrl.ctrl.onMonitorEvent.subscribe(e=>{
            if(!outputElem){
                return;
            }
            const line=getConvoGraphEventString(e,c.tokenUsage);
            outputElem.innerHTML+=escapeHtml(line);
            outputElem.scrollTo({
                top:outputElem.scrollHeight,
                behavior:'smooth'
            })
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

    const dragTargets=useMemo<DragTarget[]>(()=>[
        {
            className:convoGraphEntityDragClass,
            targetParentClass:convoGraphEntityClass,
            skipSetTransform:true,
            onMove:(pt,elem)=>{
                const l=ctrl?.getLayoutForElem(elem);
                if(l){
                    wSetProp(l.entity,'x',pt.x);
                    wSetProp(l.entity,'y',pt.y);
                }

            },
        },
        {
            className:convoLineCtrlStyle.midPt(),
            skipSetTransform:true,
            onElementMove:(pt,elem)=>{
                const line:ConvoUiLine=(elem as any)[convoElemLineRef];
                const root=refs.current.rootElem;
                if(line?.ptIndex===undefined || !root || !ctrl){
                    return;
                }

                const edge=line.edge;
                const ept=(line.isTo?edge.toPoints:edge.fromPoints)?.[line.ptIndex];
                if(!ept){
                    return;
                }
                const bounds=root.getBoundingClientRect();

                wSetProp(ept,'x',pt.x-bounds.x/ctrl.scale-ctrl.offset.x/ctrl.scale);
                wSetProp(ept,'y',pt.y-bounds.y/ctrl.scale-ctrl.offset.y/ctrl.scale);
                ctrl?.lineCtrl.updateLines(line.edge.id);

            },
            getAnchorPt:()=>null,
        },
    ],[ctrl]);

    const onContextMenu=useCallback((e:MouseEvent)=>{

        if(!ctrl || !panZoom || !(e.target as Element).classList?.contains(convoGraphCanvasStyle.bg())){
            return;
        }

        e.preventDefault();

        const pt=panZoom.transformClientPointToPlane({x:e.clientX,y:e.clientY});

        if(e.metaKey){
            wAryPush(ctrl.graph.sourceNodes,{
                id:ctrl.ctrl.store.getNextSourceNodeId(),
                x:pt.x,
                y:pt.y,
                shared:true,
                source:'> define\n'
            });
        }else if(e.altKey){
            wAryPush(ctrl.graph.inputs,{
                id:ctrl.ctrl.store.getNextInputId(),
                x:pt.x,
                y:pt.y,
                value:defaultInputValue
            });
        }else if(e.shiftKey){
            wAryPush(ctrl.graph.edges,{
                id:ctrl.ctrl.store.getNextEdgeId(),
                to:'_',
                from:'_',
                x:pt.x,
                y:pt.y,
            });
        }else{
            wAryPush(ctrl.graph.nodes,{
                id:ctrl.ctrl.store.getNextNodeId(),
                steps:[{convo:'> user\nEnter user prompt'}],
                x:pt.x,
                y:pt.y,
            });
        }


    },[panZoom,ctrl,defaultInputValue]);

    useWatchDeep(ctrl?.graph);

    useEffect(()=>{
        if(!ctrl){
            return;
        }

        ctrl.lineCtrl.updateLines();

        const iv=setTimeout(()=>{
            ctrl.lineCtrl.updateLines();
        },15);

        const iv2=setTimeout(()=>{
            ctrl.lineCtrl.updateLines();
        },200);

        const iv3=setTimeout(()=>{
            ctrl.lineCtrl.updateLines();
        },2000);

        return ()=>{
            clearTimeout(iv);
            clearTimeout(iv2);
            clearTimeout(iv3);
        }

    },[ctrl]);

    useEffect(()=>{

        if(!ctrl || !panZoom){
            return;
        }

        const sub=panZoom.state.subscribe(v=>{
            ctrl.scale=v.scale;
            ctrl.offset={x:v.x,y:v.y}
        });

        ctrl.panZoom=panZoom;

        return ()=>{
            sub.unsubscribe();
            if(ctrl.panZoom===panZoom){
                ctrl.panZoom=null;
            }
        }

    },[ctrl,panZoom]);

    useEffect(()=>{
        if(ctrl){
            ctrl.rootElem=rootElem;
        }
    },[ctrl,rootElem]);

    useEffect(()=>{
        if(!ctrl){
            return;
        }
        const sub=ctrl.onDrop.subscribe(pt=>{
            refs.current.onDrop?.(pt);
        })

        return ()=>{
            sub.unsubscribe();
        }
    },[ctrl]);

    useEffect(()=>{
        if(!entityRenderer || !ctrl){
            return;
        }
        const ary=asArray(entityRenderer);
        if(!ary.length){
            return;
        }

        for(const r of ary){
            ctrl.addRenderer(r);
        }
        return ()=>{
            for(const r of ary){
                ctrl.removeRenderer(r);
            }
        }

    },[entityRenderer,ctrl]);

    useEffect(()=>{
        if(!ctrl || !enableChatView){
            return;
        }
        ctrl.addRenderer(convoGraphChatRenderer);
        return ()=>{
            ctrl.removeRenderer(convoGraphChatRenderer);
        }

    },[enableChatView,ctrl]);

    return (
        <ConvoGraphReactCtx.Provider value={ctrl}>
            <div className={style.root()} onContextMenu={onContextMenu} ref={setRootElem}>


                <PanZoomView
                    mode="editor"
                    getCtrl={setPanZoom}
                    ignoreClasses="NodeView"
                    dragTargets={dragTargets}
                    ctrlScroll={ctrlScroll}
                    disabled={disablePanZoom}
                    initState={initPanZoomState}
                >

                    {ctrl && <ConvoGraphCanvas ctrl={ctrl} getNodeLink={getNodeLink} />}
                </PanZoomView>

                {!hideOutput && <div className={style.outputContainer({
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
                </div>}

                {children}

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
        color:#fff;
    }
`});
