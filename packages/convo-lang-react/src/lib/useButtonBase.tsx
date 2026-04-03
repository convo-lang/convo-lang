import { baseLayoutCn, type UiActionItem, uiRouterService } from "@iyio/common";
import { getReactChildString } from "@iyio/react-common";
import { type CSSProperties, type DragEventHandler, type KeyboardEvent, type MouseEvent, type MouseEventHandler } from "react";


export interface ButtonBaseProps
{
    className?:string;
    draggable?:boolean;
    children?:any;
    disabled?:boolean;
    type?:'submit'|'reset'|'button';
    to?:string;
    href?:string;
    pop?:boolean;
    linkTarget?:string;
    openLinkInNewWindow?:boolean;
    actionItem?:UiActionItem<any>;
    elem?:string;
    elemRef?:(elem:HTMLElement|null)=>void;
    tabIndex?:number;
    vLinkDesc?:string;
    noVLink?:boolean;
    style?:CSSProperties;
    description?:string;
    title?:string;
    onClickEvt?:(e:MouseEvent)=>void;
    onClick?:()=>void;
    onKeyPress?:(e:KeyboardEvent)=>void;
    onDrag?:DragEventHandler<HTMLElement>;
    onDragCapture?:DragEventHandler<HTMLElement>;
    onDragEnd?:DragEventHandler<HTMLElement>;
    onDragEndCapture?:DragEventHandler<HTMLElement>;
    onDragEnter?:DragEventHandler<HTMLElement>;
    onDragEnterCapture?:DragEventHandler<HTMLElement>;
    onDragExit?:DragEventHandler<HTMLElement>;
    onDragExitCapture?:DragEventHandler<HTMLElement>;
    onDragLeave?:DragEventHandler<HTMLElement>;
    onDragLeaveCapture?:DragEventHandler<HTMLElement>;
    onDragOver?:DragEventHandler<HTMLElement>;
    onDragOverCapture?:DragEventHandler<HTMLElement>;
    onDragStart?:DragEventHandler<HTMLElement>;
    onDragStartCapture?:DragEventHandler<HTMLElement>;
    onDrop?:DragEventHandler<HTMLElement>;
    onDropCapture?:DragEventHandler<HTMLElement>;
    onContextMenu?:MouseEventHandler<HTMLElement>;
    [attributeName:string]:any;
}


export function useBaseButton({
    className,
    actionItem,
    disabled=actionItem?.disabled,
    onClick: onClickProp,
    onClickEvt,
    onKeyPress: onKeyPressProp,
    children,
    type='button',
    to:toProp,
    href,
    pop,
    linkTarget,
    openLinkInNewWindow=actionItem?.openLinkInNewWindow,
    elem,
    elemRef,
    tabIndex=0,
    vLinkDesc,
    noVLink,
    description,
    title,
    ...props
}:ButtonBaseProps){

    if((props as any).ref){
        onClickEvt=onClickProp;
        onClickProp=undefined
    }

    const to=toProp??href??actionItem?.to;
    if(elem){
        elem=elem.toLowerCase();
    }
    if(!elem){
        elem=to?'a':'button';
    }
    const isCustomElem=elem!=='a' && elem!=='button';

    if(actionItem?.linkTarget && linkTarget===undefined){
        linkTarget=actionItem.linkTarget;
    }

    const onClick=(e?:MouseEvent)=>{
        if(to){
            e?.preventDefault();
            if(openLinkInNewWindow || linkTarget || e?.metaKey || e?.ctrlKey){
                uiRouterService().open(to,{target:linkTarget??'_blank'});
            }else{
                uiRouterService().push(to);
            }
        }else if(pop){
            e?.preventDefault();
            uiRouterService().pop();
        }

        onClickProp?.();

        if(e){
            onClickEvt?.(e);
        }
        actionItem?.action?.(actionItem);
    }

    const onKeyPress=(e:KeyboardEvent)=>{
        if( (isCustomElem && (e.code==='Space' || e.code==='Enter')) ||
            (elem==='a' && e.code==='Space')
        ){
            e.preventDefault();
            onClick();
        }
        onKeyPressProp?.(e);
    }

    const isVirtualLink=(to && elem!=='a')?true:false;
    if(isVirtualLink && !noVLink){
        children=<>
            <a tabIndex={-1} className={baseLayoutCn({offScreen:true})} href={to}>{vLinkDesc??getReactChildString(children)??to}</a>
            {children}
        </>
    }

    return {
        ...props,
        elem,
        children,
        type,
        disabled,
        className,
        onClick,
        tabIndex,
        onKeyPress,
        ref:elemRef??(props as any)?.ref,
        href:elem==='a'?to:undefined,
        title,
        'aria-label':description??props['aria-label'],
        'data-href':elem==='a'?props['data-href']:to,
    };

}
