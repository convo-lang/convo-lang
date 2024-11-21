import { ConvoEdge, ConvoGraphEntityRef, ConvoInputTemplate, ConvoNode, ConvoSourceNode, ConvoTraverser } from "@convo-lang/convo-lang";
import { Point, Rect } from "@iyio/common";
import { BehaviorSubject } from "rxjs";

export interface ConvoEntityLayoutCtrl
{
    elem:HTMLElement;
    node?:ConvoNode;
    edge?:ConvoEdge;
    traverser?:ConvoTraverser;
    input?:ConvoInputTemplate;
    sourceNode?:ConvoSourceNode;
    entity:ConvoNode|ConvoEdge|ConvoTraverser|ConvoInputTemplate|ConvoSourceNode;
    updateLayout():void;
    getElement(target:ConvoUiTarget):HTMLElement|undefined;
    getElementBounds(target:ConvoUiTarget):Rect|undefined;
    allowDrag:BehaviorSubject<boolean>;
}


export interface ConvoUiTarget
{
    type:'step'|'shell';
    index?:number;
}

export interface ConvoUiLine{
    edge:ConvoEdge;
    fromAddress:string;
    toAddress:string;
    updateId:number;
    isTo:boolean;
    elem:SVGPathElement;
    elem2:SVGPathElement;
    hoverElem:SVGPathElement;
    centerElem:SVGGElement;
    centerBorderElem:SVGCircleElement;
    plusElem:SVGPathElement;
    p1:Point;
    p2:Point;
    color:string;
    center:Point;
    dir:number;
    dir1:1|-1;
    dir2:1|-1;
    ptIndex?:number;
    ptElem?:SVGGElement;
    ptBorderElem?:SVGCircleElement;
    ptPt?:Point;
    fromMid?:boolean;
    toMid?:boolean;
}

export interface ConvoInputSource
{
    id:string;
    title:string;
    value?:any;
    getValue?:(id:string)=>any|Promise<any>
}

export interface ConvoGraphEntityRenderResult
{
    view:any;

    /**
     * If null no drag bar will be rendered
     */
    bar?:any;

    rootClassName?:string;

    rootSelectedClassName?:string;
}

/**
 * Renders an a view of a convo graph entity.
 */
export type ConvoGraphEntityRenderer=(entity:ConvoGraphEntityRef)=>ConvoGraphEntityRenderResult|null;

export interface ConvoGraphStyle{
    bgColor:string;
    strokeColor:string;
    strokeWidth:string;
    hqLines:boolean;
}
