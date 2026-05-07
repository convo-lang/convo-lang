import { DocCtrl } from "@convo-lang/studio/DocCtrl";
import { SpriteDef } from "@convo-lang/tui/tui-types";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { newFileView, newFileViewUri } from "./new-file-view";

export const routeView=(doc:DocCtrl,ctx:ConvoCliTuiCtx):SpriteDef=>{

    switch(doc.uri.uriBase){
        case newFileViewUri:
            return newFileView(ctx,doc);

        default:
            return {
                text:`404 not found - ${doc.uri.uri}`,
                color:'destructive',
                justify:'center',
                align:'center',
                flex:1,

            }
    }

}