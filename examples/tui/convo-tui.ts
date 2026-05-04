import { ConvoTuiCtrl } from '@convo-lang/tui/ConvoTuiCtrl';
import type { SpriteDef, TuiConsole, TuiTheme } from '@convo-lang/tui/tui-types';
import { log } from './logger';

const proc=(globalThis as any).process;
if(!proc){
    console.error('globalThis.process not defined');
    throw new Error('exit 1');
}

if(!proc.stdin.isTTY){
    console.error('screen-test requires an interactive terminal.');
    proc.exit(1);
}

const theme:TuiTheme={
    foreground:'#d7d7d7',
    background:'#222222',
    muted:'#555555',
    panel:'#1c1c1c',
    panelAlt:'#242424',
    accent:'#60a5fa',
    active:'#facc15',
    activeBg:'#3f3f1f',
    success:'#22c55e',
    danger:'#ef4444',
};

const homeRoot:SpriteDef={
    bg:'background',
    border:'muted',
    layout:'column',
    children:[
        {
            isInput:true,
            multiLineInput:true,
            flex:1,
            text:'Lets play a game',
            getColor:()=>'#ff00ff'
        }
    ]
}


const tuiConsole:TuiConsole={
    stdout:proc.stdout as TuiConsole['stdout'],
    stdin:proc.stdin as TuiConsole['stdin'],
};

const ctrl=new ConvoTuiCtrl({
    console:tuiConsole,
    theme,
    defaultScreen:'home',
    log,
    screens:[
        {
            id:'home',
            defaultSprite:'name-input',
            root:homeRoot,
        },
        
    ],
});


proc.on('exit', ()=>ctrl.dispose());
proc.on('SIGTERM', ()=>{
    ctrl.dispose();
    proc.exit(0);
});

ctrl.init();
