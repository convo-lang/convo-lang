import { SpriteDef } from "@convo-lang/tui/tui-types";
import { exec } from "node:child_process";
import { cIcon } from "../lib/character-icons";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { newFileViewUri } from "./new-file-view";

export const landingView=(ctx:ConvoCliTuiCtx):SpriteDef=>{
    return {
        flex:1,
        border:'border',
        borderStyle:'rounded',
        justify:'center',
        align:'center',
        layout:'column',
        gap:4,
        children:[
            {
                text:logo,
                align:'start',
                inlineRenderer:{
                    render:(ctx)=>{
                        for(let y=0;y<logoLines.length;y++){
                            const line=logoLines[y]!.join(chars[(logoLines.length+ctx.ivCount-y)%chars.length])
                            ctx.setChar(0,y,line);
                        }
                    },
                    intervalMs:130
                }
            },
            {
                layout:'column',
                gap:1,
                border:'border',
                borderStyle:'rounded',
                padding:{left:2,right:2,top:1,bottom:1},
                align:'start',
                children:[
                    {
                        isButton:true,
                        text:'  Start new conversation',
                        activeTextMask:cIcon.right,
                        activeColor:'primary',
                        onClick:()=>{
                            ctx.studio.openDocAsync(`${newFileViewUri}?ext=convo`);
                        },
                        autoActivate:true,
                    },
                    {
                        isButton:true,
                        text:'  Configure API keys',
                        activeTextMask:cIcon.right,
                        activeColor:'primary'
                    },
                    {
                        isButton:true,
                        text:'  What is Convo-Lang?',
                        activeTextMask:cIcon.right,
                        activeColor:'primary',
                        onClick:()=>{
                            const p=globalThis.process?.platform??'darwin';
                            const start=p=='darwin'?'open':p=='win32'?'start':'xdg-open';
                            exec(`${start} https://learn.convo-lang.ai`);
                        }
                    },
                    {
                        isButton:true,
                        text:'  Open examples',
                        activeTextMask:cIcon.right,
                        activeColor:'primary',
                        onClick:()=>{
                            // todo - add a script that contains a list of examples 
                            //        and when the user picks an example the example files are written to
                            //        a folder and the folder and main convo file is opened
                            ctx.studio.cwd='./examples/resume-processing';
                            ctx.studio.openDocAsync('./examples/resume-processing/process-resumes.convo');
                        }
                    },
                ]
            }
        ]
    }
}

const chars=[
'▒',
'▓',
'█',
'█',
'█',
'▓',
'▒',
]

const logo=
` ██████╗ ██████╗ ███╗   ██╗██╗   ██╗ ██████╗       ██╗      █████╗ ███╗   ██╗ ██████╗ 
██╔════╝██╔═══██╗████╗  ██║██║   ██║██╔═══██╗      ██║     ██╔══██╗████╗  ██║██╔════╝ 
██║     ██║   ██║██╔██╗ ██║██║   ██║██║   ██║█████╗██║     ███████║██╔██╗ ██║██║  ███╗
██║     ██║   ██║██║╚██╗██║╚██╗ ██╔╝██║   ██║╚════╝██║     ██╔══██║██║╚██╗██║██║   ██║
╚██████╗╚██████╔╝██║ ╚████║ ╚████╔╝ ╚██████╔╝      ███████╗██║  ██║██║ ╚████║╚██████╔╝
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝  ╚═══╝   ╚═════╝       ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
                                                                                      
                                                                                      
`.trimEnd();

const logoLines=logo.split('\n').map(l=>l.split('█'));
