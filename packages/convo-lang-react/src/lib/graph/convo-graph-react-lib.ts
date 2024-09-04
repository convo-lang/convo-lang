import { createContext, useContext } from "react";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";

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
