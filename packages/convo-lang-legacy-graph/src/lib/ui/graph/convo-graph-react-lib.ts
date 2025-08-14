import { createContext, useContext } from "react";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
import { ConvoGraphStyle } from "./convo-graph-react-type";

export const ConvoGraphReactCtx=createContext<ConvoGraphViewCtrl|null>(null);

export const useConvoGraphViewCtrl=():ConvoGraphViewCtrl=>{

    const ctrl=useContext(ConvoGraphReactCtx);
    if(!ctrl){
        throw new Error('useConvoGraphViewCtrl used outside of COnvoGraphReactCtx provider');
    }

    return ctrl;

}
export const useOptionalConvoGraphViewCtrl=():ConvoGraphViewCtrl|undefined=>{

    const ctrl=useContext(ConvoGraphReactCtx);
    return ctrl??undefined;

}

export const nodeElemKey=Symbol('nodeElemKey');

export const convoGraphEntityDragClass='convo-entity-drag';
export const convoGraphEntityClass='convo-entity';

export const getDarkConvoGraphStyle=():ConvoGraphStyle=>({
    bgColor:'#191919',
    strokeColor:'#5F7477',
    strokeWidth:'2',
    hqLines:false,
})
