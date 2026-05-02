#!/usr/bin/env bun
import { ConvoTuiCtrl } from '../src/ConvoTuiCtrl.js';
import type { SpriteDef, TuiConsole, TuiTheme } from '../src/tui-types.js';

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
    background:'#111111',
    muted:'#555555',
    panel:'#1c1c1c',
    panelAlt:'#242424',
    accent:'#60a5fa',
    success:'#22c55e',
    danger:'#ef4444',
};

const status={
    id:'status',
    text:'Status: ready',
    color:'success',
    flex:1,
} satisfies SpriteDef;

let clickCount=0;
const nameInput:SpriteDef={
    id:'name-input',
    text:'Type here...',
    border:'accent',
    bg:'panelAlt',
    isInput:true,
    onInput:evt=>{
        evt.ctrl.updateSprite(status.id,s=>{
            s.text=`input: ${evt.value}`
        })
    }
};

const quitButton:SpriteDef={
    id:'quit-button',
    text:' Quit ',
    color:'danger',
    border:'danger',
    onClick:evt=>evt.ctrl.dispose(),
};

const homeRoot:SpriteDef={
    id:'home-root',
    layout:'column',
    border:'muted',
    bg:'background',
    children:[
        {
            id:'header',
            text:' Convo TUI screen test ',
            color:'accent',
            bg:'panel',
        },
        {
            id:'main',
            layout:'row',
            flex:1,
            children:[
                {
                    id:'nav',
                    layout:'column',
                    border:'muted',
                    bg:'panel',
                    children:[
                        {
                            id:'nav-title',
                            text:'Navigation',
                            color:'accent',
                        },
                        {
                            id:'help-link',
                            text:' Help screen ',
                            link:'help',
                            border:'accent',
                        },
                        quitButton,
                    ],
                },
                {
                    id:'content',
                    layout:'column',
                    flex:1,
                    border:'muted',
                    bg:'panelAlt',
                    children:[
                        {
                            id:'intro',
                            text:'Use Tab / Shift+Tab to focus, Enter or Space to activate.',
                        },
                        {
                            id:'mouse-note',
                            text:'Mouse clicks are enabled on interactive text.',
                        },
                        nameInput,
                        {
                            id:'set-status',
                            text:' Set status ',
                            border:'success',
                            onClick:(evt)=>{
                                evt.ctrl.updateSprite({
                                    ...status,
                                    text:`click: ${++clickCount}`
                                });
                            },
                        },
                        status,
                        {
                            id:'timer',
                            text:'Count: 0'
                        }
                    ],
                }
            ],
        },
        {
            id:'footer',
            text:' Ctrl+C exits | Arrow keys scroll active scrollable sprites ',
            color:'muted',
            bg:'panel',
        },
    ],
};

const helpRoot:SpriteDef={
    id:'help-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'help-title',
            text:' Help ',
            color:'accent',
            bg:'panel',
        },
        {
            id:'help-body',
            layout:'column',
            flex:1,
            scrollable:true,
            border:'muted',
            bg:'panelAlt',
            children:[
                {text:'This screen verifies links, layout, borders, colors, input, and mouse clicks.'},
                {text:'Tab moves focus forward.'},
                {text:'Shift+Tab moves focus backward.'},
                {text:'Enter activates the active button/link.'},
                {text:'Space activates buttons/links or types a space into inputs.'},
                {text:'Backspace edits the active input.'},
                {text:'Arrow keys scroll the active scrollable sprite.'},
                {text:'Ctrl+C disposes the controller.'},
            ],
        },
        {
            id:'back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
        },
    ],
};

const tuiConsole:TuiConsole={
    stdout:proc.stdout as TuiConsole['stdout'],
    stdin:proc.stdin as TuiConsole['stdin'],
};

const ctrl=new ConvoTuiCtrl({
    console:tuiConsole,
    theme,
    defaultScreen:'home',
    screens:[
        {
            id:'home',
            defaultSprite:'name-input',
            root:homeRoot,
        },
        {
            id:'help',
            defaultSprite:'back-link',
            root:helpRoot,
        },
    ],
});

let timerCount=0;
const iv=setInterval(()=>{
    ctrl.updateSprite('timer',t=>{
        t.text=`Count: ${++timerCount}`;
    })
},1000);
ctrl.addDisposeCallback(()=>clearInterval(iv));

proc.on('exit', ()=>ctrl.dispose());
proc.on('SIGTERM', ()=>{
    ctrl.dispose();
    proc.exit(0);
});

ctrl.init();
