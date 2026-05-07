import { CellCtrl } from "@convo-lang/studio/CellCtrl";
import { SpriteDef } from "@convo-lang/tui/tui-types";
import { cIcon } from "../lib/character-icons";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { docView } from "./doc-view";

export const cellView=(ctx:ConvoCliTuiCtx,cell:CellCtrl):SpriteDef=>{

    let activeDoc=cell.activeDoc;
    const activeTabId=`${cell.id}::active`;
    const tabsId=`${cell.id}::tabs`;

    const getChildren=()=>{
        return activeDoc?[docView(ctx,activeDoc)]:undefined
    }

    const getTabs=():SpriteDef[]=>{
        return cell.docs.map((d,i)=>({
            layout:'row',
            border:i?{left:'border'}:undefined,
            children:[
                {
                    color:d===cell.activeDoc?'foreground':'muted',
                    text:` ${d.obj.name} `,
                    onClick:()=>{
                        cell.activeDoc=d;
                    }
                },
                {
                    text:cIcon.close,
                    onClick:()=>{
                        ctx.studio.closeDoc(d);
                    }
                }
            ]
        }))
    }

    const updateTabs=()=>{
        ctx.tui.updateSprite({
            id:tabsId,
            children:getTabs(),
        })
    }
    
    const activeSub=cell.activeDocSubject.subscribe(v=>{
        activeDoc=v;
        ctx.tui.updateSprite({
            id:activeTabId,
            children:getChildren(),
        })
        updateTabs();
    });

    const docsSub=cell.docsSubject.subscribe(updateTabs);

    // const borderSub=cell.window.activeCellSubject.subscribe(()=>{
    //     ctx.tui.updateSprite({
    //         id:cell.id,
    //         border:cell===cell.window.activeCell?'borderActive':'border',
    //     })
    // });
    

    return {
        id:cell.id,
        flex:1,
        layout:'column',
        border:'border',
        borderStyle:'rounded',
        children:[
            {
                id:tabsId,
                layout:'row',
                color:'muted',
                justify:'center',
                gap:1,
                children:getTabs(),
            },
            {
                id:activeTabId,
                layout:'column',
                flex:1,
                onUnmount:()=>{
                    activeSub.unsubscribe();
                    docsSub.unsubscribe();
                    //borderSub.unsubscribe();
                },
            }
        ]

    }
}