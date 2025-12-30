import { convoLangReactIcons } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";
import { stopWatchingObj, wSetProp, wSetPropOrDeleteFalsy, watchObj } from "@iyio/common";
import { SlimButton, Text, View, useElementSize, useSubject, useWProp } from "@iyio/react-common";
import { useEffect, useMemo, useState } from "react";
import { BehaviorSubject } from "rxjs";
import { createConvoGraphEntity } from "../../convo-graph-lib.js";
import { ConvoEdge, ConvoInputTemplate, ConvoNode, ConvoSourceNode, ConvoTraverser } from "../../convo-graph-types.js";
import { ConvoEdgeView } from "./ConvoEdgeView.js";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl.js";
import { ConvoInputView } from "./ConvoInputView.js";
import { ConvoNodeView } from "./ConvoNodeView.js";
import { ConvoSourceNodeView } from "./ConvoSourceNodeView.js";
import { ConvoTraverserView } from "./ConvoTraverserView.js";
import { ConvoUserDataView } from "./ConvoUserDataView.js";
import { convoGraphEntityClass, convoGraphEntityDragClass } from "./convo-graph-react-lib.js";
import { ConvoEntityLayoutCtrl, ConvoUiTarget } from "./convo-graph-react-type.js";

export interface ConvoGraphEntityViewProps
{
    ctrl:ConvoGraphViewCtrl;
    node?:ConvoNode;
    edge?:ConvoEdge;
    traverser?:ConvoTraverser;
    sourceNode?:ConvoSourceNode;
    input?:ConvoInputTemplate;
    getNodeLink?:(node:ConvoNode)=>string|null|undefined;
}

/**
 * @acIgnore
 */
export function ConvoGraphEntityView({
    node,
    edge,
    input,
    traverser,
    sourceNode,
    getNodeLink,
    ctrl,
}:ConvoGraphEntityViewProps){

    const pos=node??edge??traverser??input??sourceNode;

    const [elem,setElem]=useState<HTMLElement|null>(null);

    const [layoutCtrl,setLayoutCtrl]=useState<ConvoEntityLayoutCtrl|null>(null);

    const allowDrag=useSubject(layoutCtrl?.allowDrag);

    const key=useWProp(node??input,'key');

    const [isSelected,setIsSelected]=useState(false);

    const [userDataOpen,setUserDataOpen]=useState(pos?.userData?true:false);

    useEffect(()=>{
        const sub=ctrl.selectedSubject.subscribe(()=>{
            setIsSelected(ctrl.isSelected(pos));
        })
        return ()=>{
            sub.unsubscribe();
        }
    },[ctrl,pos]);

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

    const link=node && getNodeLink?.(node);
    const idComp=(
        !!pos?.id && <Text opacity025 xs text={`ID: ${pos.id}`} className={link?style.link():undefined}/>
    )

    const renderers=useSubject(ctrl.entityRenderersSubject);
    const rendered=useMemo(()=>{
        return ctrl.renderEntity(createConvoGraphEntity({node,edge,input,traverser,source:sourceNode}));
    },[ctrl,node,edge,input,sourceNode,traverser,renderers]);

    const [size]=useElementSize(elem);

    useEffect(()=>{
        if(!pos){
            return;
        }
        ctrl.lineCtrl.updateLines(pos.id);
    },[size.width,size.height,ctrl,pos]);

    const dragFrom=useSubject(ctrl.dragNodeFromSubject);


    return (
        <div
            ref={setElem}
            className={style.root(
                {edge,smooth:allowDrag===false,default:!rendered?.rootClassName},
                [convoGraphEntityClass,rendered?.rootClassName,isSelected?rendered?.rootSelectedClassName:null]
            )}
            onMouseDown={()=>{
                if(!pos || pos.id!==ctrl.selected?.id){
                    ctrl.select({node,edge,input,traverser,source:sourceNode});
                }
            }}
        >

            {rendered?.bar===undefined?
                <div className={style.bar({disabled:allowDrag===false},convoGraphEntityDragClass)}>{node?
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
            :
                rendered.bar
            }

            {rendered?
                rendered.view
            :
                <div className={style.content()}>
                    <View row alignCenter g050>

                        {(node || input || sourceNode) && <input
                            className={style.nameInput()}
                            type="text"
                            value={pos?.name??''}
                            onChange={e=>wSetProp(pos,'name',e.target.value)} placeholder="Name"
                        />}

                        {(node || input) &&  <input
                            type="text"
                            value={key??''}
                            placeholder="key"
                            onChange={e=>wSetPropOrDeleteFalsy(node??input,'key',e.target.value)}
                        />}

                    </View>
                    <View row alignCenter justifyBetween>
                        {link?
                            <SlimButton to={link} openLinkInNewWindow>{idComp}</SlimButton>
                        :
                            idComp
                        }
                        <SlimButton onClick={()=>setUserDataOpen(!userDataOpen)}>
                            <Text opacity025 xs text="userData" className={style.link()}/>
                        </SlimButton>
                    </View>

                    {userDataOpen && <ConvoUserDataView hasUserData={pos}/>}

                    {node && <ConvoNodeView node={node}/>}

                    {edge && <ConvoEdgeView edge={edge}/>}

                    {input && <ConvoInputView input={input}/>}

                    {sourceNode && <ConvoSourceNodeView src={sourceNode}/>}

                    {traverser && <ConvoTraverserView traverser={traverser}/>}
                </div>
            }

            {node && <>
                <div className={style.handelRightContainer()}>
                    <button
                        className={style.handelRight()}
                        draggable
                        onDragStart={()=>ctrl.dragNodeFrom=node}
                        onDragEnd={()=>ctrl.dragNodeFrom=null}
                    >
                        {convoLangReactIcons["chevron-right"]({size:16,color:'#fff'})}
                    </button>
                </div>

                <div className={style.handelLeftContainer()}>
                    <button
                        className={style.handelLeft()}
                        draggable
                        onDragStart={()=>ctrl.dragNodeFrom=node}
                        onDragEnd={()=>ctrl.dragNodeFrom=null}
                    >
                        {convoLangReactIcons["chevron-left"]({size:16,color:'#fff'})}
                    </button>
                </div>
                {dragFrom && dragFrom!==node && <div
                    className={style.dropTarget()}
                    onDragOver={e=>{
                        e.preventDefault();
                    }}
                    onDrop={e=>{
                        e.preventDefault();
                        ctrl.connect(dragFrom,node);
                    }}
                />}
            </>}

        </div>
    )

}

const style=atDotCss({name:'ConvoGraphEntityView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        position:absolute;
        min-width:400px;
        max-width:600px;
        min-height:80px;
    }
    @.root.default{
        background:#2C2C2C;
        border-radius:4px;
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
    @.content{
        display:flex;
        flex-direction:column;
        padding:0.5rem;
    }
    @.nameInput{
        flex:1;
    }
    @.link{
        text-decoration:underline;
    }
    @.handelRightContainer{
        position:absolute;
        right:-1rem;
        width:1.5rem;
        top:0;
        bottom:0;
        background:transparent;

    }
    @.handelLeft, @.handelRight{
        position:absolute;
        width:25px;
        height:25px;
        border-radius:50%;
        border:solid 2px #637477;
        pointer-events:none;
        opacity:0;
        background:#2C2C2C;
        box-shadow:0 0 8px #000000;
        transition:opacity 0.2s ease-in-out;
        display:flex;
        align-items:center;
        justify-content:center;
    }
    @.handelRight{
        right:0;
        top:50%;
        transform:translate(0.4rem,-50%);
    }
    @.handelRightContainer:hover @.handelRight{
        opacity:1;
        pointer-events:initial;
    }

    @.handelLeftContainer{
        position:absolute;
        left:-1rem;
        width:1.5rem;
        top:0;
        bottom:0;
        background:transparent;

    }
    @.handelLeft{
        left:0;
        top:50%;
        transform:translate(-0.4rem,-50%);
    }
    @.handelLeftContainer:hover @.handelLeft{
        opacity:1;
        pointer-events:initial;
    }
    @.dropTarget{
        position:absolute;
        left:0;
        right:0;
        top:0;
        bottom:0;
        border-radius:4px;
        border:2px solid #457BEF99;
        background-color:#457BEF44;
    }
`});
