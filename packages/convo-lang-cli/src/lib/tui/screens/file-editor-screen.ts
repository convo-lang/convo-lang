import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { fileBrowser } from "../components/folder-browser.js";
import { mainLayout } from "../components/main-layout.js";
import { navBar } from "../components/nav-bar.js";
import { windowView } from "../components/window-view.js";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types.js";


export const fileEditorScreen=(ctx:ConvoCliTuiCtx):ScreenDef=>{

    const {tui}=ctx;

    return mainLayout({
        id:'file-editor',
        layout:'row',
        gap:1,
        padding:{top:1,bottom:1,left:2,right:2},
        children:[
            {
                id:'file-editor-toolbar',
                layout:'column',
                width:30,
                padding:{left:0,right:2},
                color:'muted',
                borderStyle:'thick',
                bg:'',
                //border:{right:'border'},
                children:[
                    navBar('file-editor'),
                    fileBrowser(ctx),
                ],
            },
            windowView(ctx),
        ],
    })
}
