import { SpriteDef } from "@convo-lang/tui/tui-types";

const screens=[
    {id:'file-editor',label:'fs'},
    {id:'db',label:'db'},
    {id:'api',label:'api'},
    {id:'settings',label:'conf'},
] as const;

const buttonPadding={left:1,right:1};

const tab=(screenId:string,label:string,activeScreenId:string):SpriteDef=>{

    const active=screenId===activeScreenId;

    return {
        id:`${screenId}-tab`,
        text:label,
        link:screenId,
        isButton:true,
        padding:buttonPadding,
        color:active?'primary':'muted',
    }
}

export const navBar=(activeScreenId:string):SpriteDef=>({
    id:`${activeScreenId}-top-bar`,
    layout:'row',
    justify:'center',
    border:{bottom:'border'},
    children:[
        ...screens.map(screen=>tab(screen.id,screen.label,activeScreenId)),
    ],
});