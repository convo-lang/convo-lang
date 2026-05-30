import { ConvoTuiCtrl } from "@convo-lang/tui/ConvoTuiCtrl";
import type { SpriteDef } from "@convo-lang/tui/tui-types";

const theme = {
    background: "#1a1b26",
    foreground: "#d4d4d4",
    panel: "#24283b",
    accent: "#7aa2f7",
    muted: "#565f89",
};

const root: SpriteDef = {
    layout: "column",
    bg: "background",
    justify:'center',
    children: [
        {
            layout: "column",
            border: "accent",
            borderStyle: "rounded",
            bg: "panel",
            selfAlign: "center",
            children: [
                {
                    layout: "column",
                    children: [
                        { text: "\u{1F4E7} \u{1F50D} \u{1F440}" },
                        { text: "\u{1F4E7}\u{1F50D}\u{1F440}" },
                        { text: "\u{1F4E7}a\u{1F50D}b\u{1F440}" },
                        { text: "12a45678901" },
                        { text: "\u{1F4E7} a \u{1F50D} b \u{1F440}" },
                        { text: "12345678901" },
                        { text: "1 2 3 4 5 6" },
                    ],
                },
            ],
        },
    ],
};

const ctrl = new ConvoTuiCtrl({
    console: { stdout: process.stdout, stdin: process.stdin },
    theme,
    defaultScreen: "test",
    screens: [{ id: "test", root }],
});

ctrl.init();

process.on('exit',()=>ctrl.dispose());
process.on('SIGTERM',()=>{
    ctrl.dispose();
    process.exit(0);
});