import { setChromeEnv } from "@iyio/chrome-common";
import { ScopeRegistration, initRootScope, rootScope } from "@iyio/common";
import { OffscreenCtrl, OffscreenCtrlOptions } from "./OffscreenCtrl";

export interface ConvoOffscreenOptions extends OffscreenCtrlOptions
{
    scopeInit?:(reg:ScopeRegistration)=>void;
}

export const initConvoChromeOffscreen=({
    scopeInit,
    ...ctrlOptions
}:ConvoOffscreenOptions)=>{
    console.log('hio 👋 👋 👋 Im offscreen',);

    setChromeEnv('offscreen');

    if(scopeInit){
        initRootScope(scopeInit);
        rootScope.getInitPromise().then(()=>{
            new OffscreenCtrl(ctrlOptions);
        })
    }else{
        new OffscreenCtrl(ctrlOptions);
    }
}
