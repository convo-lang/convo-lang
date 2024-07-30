import { ActionItem, ConvoActionState } from "./convo-chrome-types";

const elementIsVisibleInViewport = (box:DOMRect, partiallyVisible = false) => {
  const { top, left, bottom, right } = box;
  const { innerHeight, innerWidth } = window;
  return partiallyVisible
    ? ((top > 0 && top < innerHeight) ||
        (bottom > 0 && bottom < innerHeight)) &&
        ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
    : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
};

export const getActionItems=(allFocusable=false):ActionItem[]=>{

    const list=document.querySelectorAll(
        'button:not([disabled]), '+
        '[href], '+
        'input:not([disabled]), '+
        'select:not([disabled]), '+
        'textarea:not([disabled]), '+
        '[contenteditable]:not([contenteditable="false"]):not([disabled]), '+
        `[tabindex]${allFocusable?'':':not([tabindex="-1"])'}:not([disabled]), `+
        'details:not([disabled]), '+
        'summary:not(:disabled)'
    )

    const items:ActionItem[]=[];

    let _id=1;
    for(let i=0;i<list.length;i++){
        const elem=list[i];
        if(!elem){continue}

        const bounds=elem.getBoundingClientRect();

        if( !elementIsVisibleInViewport(bounds,true) ||
            !bounds.width ||
            !bounds.height ||
            !elem.checkVisibility({
                contentVisibilityAuto:true,
                contentVisibilityCss:true,
                opacityProperty:true,
                visibilityProperty:true
            } as any)
        ){
            continue;
        }

        const id=_id.toString(16).toUpperCase()

        const text=(
            elem.getAttribute('aria-label')||
            elem.getAttribute('placeholder')||
            elem.getAttribute('data-tooltip')||
            elem.getAttribute('title')||
            (elem as any).innerText||
            '(no-text)'
        )


        items.push({
            id,
            elem,
            type:getElemType(elem),
            x:bounds.left,
            y:bounds.top,
            w:bounds.width,
            h:bounds.height,
            text:(text.length>20?text.substring(0,17)+'...':text).replace(/\s+/g,' ')
        })

        _id++;

    }

    return items;

}

const getElemType=(elem:Element)=>{
    if(elem.getAttribute('contenteditable') && elem.getAttribute('contenteditable')!=='false'){
        return 'RichTextEditor';
    }
    if(elem.tagName==='DIV'){
        return 'BUTTON'
    }else{
        return elem.tagName;
    }
}


export const actionStateToCsvMd=(actionState:ConvoActionState):string=>{
    return (
        '```csv\nid,type,text\n'+
        actionState.items.map(item=>`${item.id},${item.type},${item.text}`).join('\n')+
        '\n```'
    );
}
