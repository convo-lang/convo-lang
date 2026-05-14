import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { screenView } from "../components/screen-view.js";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types.js";

const buttonPadding={left:1,right:1};

export const settingsScreen=(ctx:ConvoCliTuiCtx):ScreenDef=>{
    return screenView({
        ctx,
        id:'settings',
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
                    id:'settings-main-title',
                    text:'General Settings',
                },
                {
                    id:'settings-default-model-placeholder',
                    height:5,
                    border:'border-muted',
                    borderStyle:'rounded',
                    padding:1,
                    text:'Default model configuration will appear here.',
                },
                {
                    id:'settings-api-keys-placeholder',
                    height:7,
                    border:'border-muted',
                    borderStyle:'rounded',
                    padding:1,
                    text:'API key management will appear here.',
                },
                {
                    id:'settings-other-placeholder',
                    flex:1,
                    border:'border-muted',
                    borderStyle:'rounded',
                    padding:1,
                    text:'Additional Convo-Lang settings will appear here.',
                },
            ],
        }
    });
}
