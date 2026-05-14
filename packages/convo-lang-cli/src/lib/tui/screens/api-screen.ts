import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { screenView } from "../components/screen-view.js";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types.js";

export const apiScreen=(ctx:ConvoCliTuiCtx):ScreenDef=>{

    return screenView({
        ctx,
        id:'api',
        main:{
            id:'api-main',
            layout:'column',
            flex:1,
            padding:1,
            gap:1,
            border:'border',
            borderStyle:'rounded',
            children:[
                {
                    id:'api-main-title',
                    text:'API Status',
                    color:'accent',
                },
                {
                    id:'api-status-placeholder',
                    height:7,
                    border:'border',
                    borderStyle:'rounded',
                    padding:1,
                    text:'Server status, port, host, and active model will appear here.',
                },
                {
                    id:'api-settings-placeholder',
                    flex:1,
                    border:'border',
                    borderStyle:'rounded',
                    padding:1,
                    text:'API settings and request logs will appear here.',
                },
            ],
        }
    });
}
