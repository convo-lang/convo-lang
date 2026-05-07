import { DocCtrl } from "@convo-lang/studio/DocCtrl";
import { SpriteDef } from "@convo-lang/tui/tui-types";
import { joinPaths } from "@iyio/common";
import { pathExistsAsync } from "@iyio/node-common";
import { writeFile } from "fs/promises";
import { cIcon } from "../lib/character-icons";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";

export const newFileViewUri='form://new-file';

export const newFileView=(ctx:ConvoCliTuiCtx,doc:DocCtrl):SpriteDef=>{

    const ext=doc?.uri.queryParams?.['ext'];

    const createFile=async (name:string)=>{
        if(ext){
            name+='.'+ext;
        }

        const path=joinPaths(ctx.studio.cwd,name);
        if(!await pathExistsAsync(path)){
            await writeFile(path,'');
        }

        ctx.studio.closeDoc(doc);
        ctx.studio.openDocAsync(path);

    }

    return {
        justify:'center',
        align:'center',
        flex:1,
        layout:'column',
        children:[
            {
                align:'center',
                layout:'row',
                gap:1,
                children:[
                    {
                        layout:'row',
                        border:'border',
                        borderStyle:'rounded',
                        padding:{left:1,right:1,top:0,bottom:0},
                        children:[
                            {
                                align:'start',
                                width:40,
                                isInput:true,
                                placeholder:`Enter new file name`,
                                autoActivate:true,
                                inputFilter:v=>{
                                    return v.replace(/\W/g,'-');
                                },
                                onSubmit:(evt)=>{
                                    if(evt.value.trim()){
                                        createFile(evt.value.trim());
                                    }
                                }
                            },
                            ext?{text:`.${ext}`,color:'muted'}:null
                        ]

                    },
                    {
                        isButton:true,
                        text:` ${cIcon.close} `,
                        borderStyle:'rounded',
                        align:'center',
                        color:'muted',
                        activeColor:'primary',
                        onClick:()=>{
                            ctx.studio.closeDoc(doc)
                        }
                    },
                    
                ]
            },
            
        ]
    }
}