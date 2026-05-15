import { ConvoTuiCtrl } from '@convo-lang/tui/ConvoTuiCtrl';
import type { SpriteDef, TuiConsole, TuiTheme } from '@convo-lang/tui/tui-types';

const theme:TuiTheme={
    foreground:'#d7d7d7',
    background:'#111111',
    panel:'#1c1c1c',
    accent:'#60a5fa',
    active:'#facc15',
    danger:'#ef4444',
};

const root:SpriteDef={
    id:'root',
    layout:'column',
    bg:'background',
    children:[
        {
            id:'title',
            text:' My TUI App ',
            color:'accent',
            bg:'panel',
            align:'center',
        },
        {
            id:'body',
            flex:1,
            align:'center',
            justify:'center',
            layout:'column',
            gap:1,
            children:[
                'Press Tab to focus the button, then Enter to quit.',
                {
                    text:' Count: 0 ',
                    border:'accent',
                    activeColor:'background',
                    activeBg:'accent',
                    ctrl:({sprite,update})=>{
                        let count=0;

                        sprite.onClick=()=>{
                            update({text:` Count: ${++count} `});
                        }

                        const iv=setInterval(()=>{
                            update({text:` Count: ${++count} `});
                        },2000);

                        return ()=>{
                            clearInterval(iv);
                        };
                    }
                }
            ]
        },
        {
            id:'quit',
            text:' Quit ',
            border:'danger',
            activeColor:'background',
            activeBg:'danger',
            onClick:evt=>evt.ctrl.dispose(),
        },
    ],
};

const tuiConsole:TuiConsole={
    stdout:process.stdout,
    stdin:process.stdin,
};

const ctrl=new ConvoTuiCtrl({
    console:tuiConsole,
    theme,
    defaultScreen:'home',
    screens:[
        {
            id:'home',
            defaultSprite:'quit',
            root,
        },
    ],
});

process.on('exit',()=>ctrl.dispose());
process.on('SIGTERM',()=>{
    ctrl.dispose();
    process.exit(0);
});

ctrl.init();