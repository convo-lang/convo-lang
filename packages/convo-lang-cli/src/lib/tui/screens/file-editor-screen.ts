import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { fileBrowser } from "../components/folder-browser.js";
import { screenView } from "../components/screen-view.js";
import { windowView } from "../components/window-view.js";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types.js";


export const fileEditorScreen=(ctx:ConvoCliTuiCtx):ScreenDef=>{

    return screenView({
        ctx,
        id:'file-editor',
        main:windowView(ctx),
        toolBar:fileBrowser(ctx)
    });
}
