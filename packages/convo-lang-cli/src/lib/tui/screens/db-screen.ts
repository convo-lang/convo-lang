import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { mainLayout } from "../components/main-layout.js";

const buttonPadding={left:1,right:1};

export const dbScreen=():ScreenDef=>{
    return mainLayout({
        id:'db',
        layout:'row',
        gap:1,
        padding:1,
        bg:'background',
        children:[
            {
                id:'db-toolbar',
                layout:'column',
                width:30,
                padding:1,
                gap:1,
                border:'border-soft',
                borderStyle:'rounded',
                bg:'sidebar',
                color:'sidebar-foreground',
                children:[
                    {
                        id:'db-toolbar-title',
                        text:'ConvoDb',
                        color:'sidebar-primary',
                    },
                    {
                        id:'db-connect-action',
                        text:'Connect to instance',
                        isButton:true,
                        padding:buttonPadding,
                        color:'accent-foreground',
                        bg:'convo-green-muted',
                        activeBg:'accent',
                        activeColor:'accent-foreground',
                    },
                    {
                        id:'db-disconnect-action',
                        text:'Disconnect',
                        isButton:true,
                        padding:buttonPadding,
                        color:'destructive-foreground',
                        bg:'destructive',
                        activeBg:'convo-orange',
                        activeColor:'accent-foreground',
                    },
                    {
                        id:'db-tree-title',
                        text:'Data',
                        color:'sidebar-primary',
                    },
                    {
                        id:'db-tree-placeholder',
                        layout:'column',
                        gap:1,
                        color:'foreground',
                        children:[
                            {
                                id:'db-tree-root',
                                text:'▾ instance',
                                color:'convo-gold',
                            },
                            {
                                id:'db-tree-collections',
                                text:'  ▸ collections',
                                color:'terminal-green',
                            },
                            {
                                id:'db-tree-documents',
                                text:'  ▸ documents',
                                color:'convo-cyan',
                            },
                            {
                                id:'db-tree-indexes',
                                text:'  ▸ indexes',
                                color:'convo-magenta',
                            },
                        ],
                    },
                ],
            },
            {
                id:'db-main',
                layout:'column',
                flex:1,
                padding:1,
                gap:1,
                border:'border-soft',
                borderStyle:'rounded',
                bg:'card',
                color:'card-foreground',
                children:[
                    {
                        id:'db-main-title',
                        text:'Query',
                        color:'accent',
                    },
                    {
                        id:'db-query-placeholder',
                        height:8,
                        border:'border-muted',
                        borderStyle:'rounded',
                        padding:1,
                        bg:'input',
                        text:'Write a ConvoDb query here.',
                        color:'card-foreground',
                    },
                    {
                        id:'db-results-placeholder',
                        flex:1,
                        border:'border-muted',
                        borderStyle:'rounded',
                        padding:1,
                        bg:'muted',
                        text:'Query results will appear here.',
                        color:'muted-foreground',
                    },
                ],
            },
        ],
    })
}
