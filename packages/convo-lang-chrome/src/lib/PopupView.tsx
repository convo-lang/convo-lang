import { atDotCss } from "@iyio/at-dot-css";
import { BaseAppContainer, BaseAppContainerProps, useSubject } from '@iyio/react-common';
import { useEffect, useMemo } from "react";
import { PopupCtrl, popCtrl } from "./PopupCtrl";

export interface PopupViewProps extends BaseAppContainerProps
{
    initCtrl?:(ctrl:PopupCtrl)=>void;
}

export function PopupView({
    initCtrl,
    onScopeInited,
    ...props
}:PopupViewProps){

    const ctrl=useMemo(popCtrl,[]);

    useEffect(()=>{
        return ()=>{
            ctrl.dispose();
        }
    },[ctrl]);

    const route=useSubject(ctrl.routeSubject);
    const views=useSubject(ctrl.viewsSubject);
    const view=views.find(v=>v.route===route);

    return (
        <BaseAppContainer
            insertSharedStyleSheets
            enableRouteRedirectFallback={false}
            initBeforeRender
            loadingPlaceholder={<h3>Loading</h3>}
            onScopeInited={scope=>{
                initCtrl?.(ctrl);
                onScopeInited?.(scope);
            }}
            {...props}
        >
            <div className={style.root()}>

                {view?.render()}

            </div>
        </BaseAppContainer>
    )

}

const style=atDotCss({name:'PopupView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        min-width:300px;
        min-height:500px;

    }
`});
