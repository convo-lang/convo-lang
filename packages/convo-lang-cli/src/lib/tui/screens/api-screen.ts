import type { ScreenDef } from "@convo-lang/tui/tui-types.js";
import { mainLayout } from "../components/main-layout.js";

const buttonPadding={left:1,right:1};

export const apiScreen=():ScreenDef=>{
    return mainLayout({
        id:'api',
        layout:'row',
        gap:1,
        padding:1,
        bg:'background',
        children:[
            {
                id:'api-toolbar',
                layout:'column',
                width:30,
                padding:1,
                gap:1,
                border:'border-soft',
                borderStyle:'rounded',
                bg:'background',
                color:'sidebar-foreground',
                children:[
                    {
                        id:'api-toolbar-title',
                        text:'HTTP API',
                        color:'sidebar-primary',
                    },
                    {
                        id:'api-start-action',
                        text:'Start server',
                        isButton:true,
                        padding:buttonPadding,
                        color:'accent-foreground',
                        bg:'convo-green-muted',
                        activeBg:'accent',
                        activeColor:'accent-foreground',
                    },
                    {
                        id:'api-stop-action',
                        text:'Stop server',
                        isButton:true,
                        padding:buttonPadding,
                        color:'destructive-foreground',
                        bg:'destructive',
                        activeBg:'convo-orange',
                        activeColor:'accent-foreground',
                    },
                    {
                        id:'api-restart-action',
                        text:'Restart server',
                        isButton:true,
                        padding:buttonPadding,
                        color:'foreground',
                        bg:'sidebar-accent',
                        activeBg:'convo-bright',
                        activeColor:'primary-foreground',
                    },
                    {
                        id:'api-routes-title',
                        text:'Routes',
                        color:'sidebar-primary',
                    },
                    {
                        id:'api-routes-placeholder',
                        layout:'column',
                        gap:1,
                        color:'foreground',
                        children:[
                            {
                                id:'api-route-health',
                                text:'GET /health',
                                color:'terminal-green',
                            },
                            {
                                id:'api-route-convo',
                                text:'POST /convo',
                                color:'convo-cyan',
                            },
                            {
                                id:'api-route-db',
                                text:'POST /db/query',
                                color:'convo-magenta',
                            },
                        ],
                    },
                ],
            },
            {
                id:'api-main',
                layout:'column',
                flex:1,
                padding:{right:2,left:2,top:1,bottom:1},
                gap:1,
                borderStyle:'rounded',
                bg:'card',
                color:'card-foreground',
                children:[
                    {
                        id:'api-main-title',
                        text:'API Status',
                        color:'accent',
                    },
                    {
                        id:'api-status-placeholder',
                        height:7,
                        border:'border-muted',
                        borderStyle:'rounded',
                        padding:1,
                        bg:'background',
                        text:'Server status, port, host, and active model will appear here.',
                        color:'card-foreground',
                    },
                    {
                        id:'api-settings-placeholder',
                        flex:1,
                        border:'border-muted',
                        borderStyle:'rounded',
                        padding:1,
                        bg:'muted',
                        text:'API settings and request logs will appear here.',
                        color:'muted-foreground',
                    },
                ],
            },
        ],
    })
}
