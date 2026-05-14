import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { screenView } from "../components/screen-view.js";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types.js";

export const dbScreen=(ctx:ConvoCliTuiCtx):ScreenDef=>{

    return screenView({
        ctx,
        id:'db',
        main:{
            id:'db-main',
            layout:'column',
            flex:1,
            padding:1,
            gap:1,
            border:'border',
            borderStyle:'rounded',
            children:[
                {
                    id:'db-main-title',
                    text:'Query',
                    color:'accent',
                },
                {
                    id:'db-query-placeholder',
                    height:8,
                    border:'border',
                    borderStyle:'rounded',
                    padding:1,
                    text:'Write a ConvoDb query here.',
                },
                {
                    id:'db-results-placeholder',
                    flex:1,
                    border:'border',
                    borderStyle:'rounded',
                    padding:1,
                    text:'Query results will appear here.',
                },
            ],
        }
    });

}
