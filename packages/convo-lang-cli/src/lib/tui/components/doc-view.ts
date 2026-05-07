import { DocCtrl } from "@convo-lang/studio/DocCtrl";
import { SpriteDef } from "@convo-lang/tui/tui-types";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { routeView } from "./_router";
import { codeInput } from "./code-input";

export const docView=(ctx:ConvoCliTuiCtx,doc:DocCtrl):SpriteDef=>{

    if(doc.task==='edit'){
        return codeInput(ctx,doc);
    }

    return routeView(doc,ctx);
}