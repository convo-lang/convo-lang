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
            textAlign:'center',
        },
        {
            id:'body',
            text:'Press Tab to focus the button, then Enter to quit.',
            flex:1,
            textAlign:'center',
            vTextAlign:'center',
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