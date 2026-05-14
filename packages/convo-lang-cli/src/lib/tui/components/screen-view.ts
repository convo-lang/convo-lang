import { ScreenDef, SpriteDef } from "@convo-lang/tui/tui-types";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { mainLayout } from "./main-layout";
import { navBar } from "./nav-bar";

export interface ScreenViewProps
{
    ctx:ConvoCliTuiCtx;
    id:string;
    main:SpriteDef;
    toolBar?:SpriteDef;

}

export const screenView=({
    ctx,
    id,
    main,
    toolBar
}:ScreenViewProps):ScreenDef=>{
    return mainLayout({
        id:id,
        layout:'row',
        gap:1,
        padding:{top:1,bottom:1,left:2,right:2},
        children:[
            {
                id:`${id}-toolbar`,
                layout:'column',
                width:30,
                padding:{left:0,right:2},
                color:'muted',
                borderStyle:'thick',
                children:[
                    navBar(id),
                    toolBar,
                ],
            },
            main,
        ],
    })
}