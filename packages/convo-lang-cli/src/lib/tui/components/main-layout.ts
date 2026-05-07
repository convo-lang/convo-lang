import type { ScreenDef, SpriteDef } from "@convo-lang/tui/tui-types";



const statusBar=(activeScreenId:string):SpriteDef=>({
    id:`${activeScreenId}-status-bar`,
    color:'background',
    bg:'muted',
    layout:'row',
    children:[
        {
            text:` workspace ${process.cwd()} | pid ${process.pid}`
        },
        {flex:1},
        {
            text:'Convo-Lang '
        }
    ]
});

export const mainLayout=(sprite:SpriteDef):ScreenDef=>{

    const screenId=sprite.id ?? 'main';

    return {
        id:screenId,
        defaultSprite:`${screenId}-tab`,
        root:{
            id:`${screenId}-root`,
            layout:'column',
            color:'foreground',
            bg:'background',
            children:[
                {
                    id:`${screenId}-body`,
                    layout:'row',
                    flex:1,
                    bg:'background',
                    children:[
                        {
                            ...sprite,
                            id:sprite.id ?? `${screenId}-content`,
                            flex:sprite.flex ?? 1,
                        },
                    ],
                },
                statusBar(screenId),
            ],
        },
    }
}
