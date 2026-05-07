import type { StudioCtrl } from "@convo-lang/studio/StudioCtrl";
import { WindowCtrl } from "@convo-lang/studio/WindowCtrl";
import type { ConvoTuiCtrl } from "@convo-lang/tui/ConvoTuiCtrl";

export interface ConvoCliTuiCtx
{
    studio:StudioCtrl;
    tui:ConvoTuiCtrl;
    window:WindowCtrl;
}