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
    active:'#facc15',
    activeBg:'#3f3f1f',
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
    activeColor:'active',
    activeBg:'activeBg',
    activeBorder:'active',
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
    activeColor:'background',
    activeBg:'danger',
    border:'danger',
    activeBorder:'active',
    onClick:evt=>evt.ctrl.dispose(),
};

const homeRoot:SpriteDef={
    id:'home-root',
    layout:'column',
    bg:'background',
    children:[
        {
            id:'header',
            text:' Convo TUI screen test ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
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
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        {
                            id:'wrap-link',
                            text:' Text wrapping ',
                            link:'wrap',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        {
                            id:'rich-link',
                            text:' Rich text ',
                            link:'rich',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
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
                            activeColor:'background',
                            activeBg:'success',
                            activeBorder:'active',
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
                            text:'Count: 0',
                            textAlign:'end',
                        }
                    ],
                }
            ],
        },
        {
            id:'footer',
            text:' Ctrl+C exits | Active sprites use activeColor, activeBg, and activeBorder ',
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
                {text:'The text wrapping screen demonstrates wrap, wrap-hard, clipping, ellipses, and explicit newlines.'},
                {text:'The rich text screen demonstrates inline spans with per-span foreground and background colors.'},
                {text:'Tab moves focus forward.'},
                {text:'Shift+Tab moves focus backward.'},
                {text:'Enter activates the active button/link.'},
                {text:'Space activates buttons/links or types a space into inputs.'},
                {text:'Backspace edits the active input.'},
                {text:'Arrow keys scroll the active scrollable sprite.'},
                {text:'Active sprites use activeColor, activeBg, and activeBorder.'},
                {text:'Ctrl+C disposes the controller.'},
            ],
        },
        {
            id:'back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
        },
    ],
};

const wrapRoot:SpriteDef={
    id:'wrap-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'wrap-title',
            text:' Text wrapping ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'wrap-body',
            layout:'column',
            flex:1,
            scrollable:true,
            border:'muted',
            bg:'panelAlt',
            children:[
                {
                    text:'Resize the terminal to see each inline sprite recompute its wrapped lines.',
                    color:'muted',
                },
                {
                    text:'Default wrap',
                    color:'accent',
                },
                {
                    id:'wrap-default',
                    text:'The default wrap mode breaks at whitespace when possible. If a word is too long, such as supercalifragilisticexpialidociouswhenneeded, it is hard wrapped so the text stays inside the available width.',
                    border:'muted',
                },
                {
                    text:'wrap-hard',
                    color:'accent',
                },
                {
                    id:'wrap-hard',
                    text:'wrap-hard ignores word boundaries and slices text exactly at the available content width, even in the middle of words.',
                    textWrap:'wrap-hard',
                    border:'muted',
                },
                {
                    text:'clip + ellipses',
                    color:'accent',
                },
                {
                    id:'clip-ellipses',
                    text:'This line is intentionally too long for the available width and should be clipped with an ellipses marker at the right edge.',
                    textWrap:'clip',
                    textClipStyle:'ellipses',
                    border:'muted',
                },
                {
                    text:'clip + none',
                    color:'accent',
                },
                {
                    id:'clip-none',
                    text:'This line is intentionally too long for the available width and should be clipped without adding a marker.',
                    textWrap:'clip',
                    textClipStyle:'none',
                    border:'muted',
                },
                {
                    text:'Explicit newlines with wrapping',
                    color:'accent',
                },
                {
                    id:'wrap-newlines',
                    text:'Line one stays separate.\nLine two is longer and wraps within its own paragraph when the content area is narrow enough to require wrapping.\nLine three stays separate.',
                    border:'muted',
                },
                {
                    text:'Explicit newlines with clip',
                    color:'accent',
                },
                {
                    id:'clip-newlines',
                    text:'First clipped line is intentionally long and should clip independently.\nSecond clipped line is also intentionally long and should clip independently.',
                    textWrap:'clip',
                    textClipStyle:'ellipses',
                    border:'muted',
                },
                {
                    text:'Centered wrapped text',
                    color:'accent',
                },
                {
                    id:'wrap-centered',
                    text:'Each wrapped line can still use inline text alignment. These lines are centered after wrapping.',
                    textAlign:'center',
                    border:'muted',
                },
            ],
        },
        {
            id:'wrap-back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
        },
    ],
};

const richRoot:SpriteDef={
    id:'rich-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'rich-title',
            richText:[
                {text:' Rich ',color:'background',bg:'accent'},
                {text:' text ',color:'accent',bg:'panel'},
                {text:' screen ',color:'success',bg:'panel'},
            ],
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'rich-body',
            layout:'column',
            flex:1,
            scrollable:true,
            border:'muted',
            bg:'panelAlt',
            children:[
                {
                    text:'Plain text still renders normally.',
                    border:'muted',
                },
                {
                    text:'Per-span foreground colors',
                    color:'accent',
                },
                {
                    id:'rich-colors',
                    richText:[
                        {text:'This line mixes '},
                        {text:'accent',color:'accent'},
                        {text:', '},
                        {text:'success',color:'success'},
                        {text:', '},
                        {text:'danger',color:'danger'},
                        {text:', and '},
                        {text:'hex purple',color:'#c084fc'},
                        {text:' foreground colors.'},
                    ],
                    border:'muted',
                },
                {
                    text:'Per-span backgrounds',
                    color:'accent',
                },
                {
                    id:'rich-backgrounds',
                    richText:[
                        {text:'Spans can also use '},
                        {text:' panel ',bg:'panel'},
                        {text:' '},
                        {text:' active ',color:'background',bg:'active'},
                        {text:' '},
                        {text:' danger ',color:'background',bg:'danger'},
                        {text:' backgrounds.'},
                    ],
                    border:'muted',
                },
                {
                    text:'Theme variables and hex colors',
                    color:'accent',
                },
                {
                    id:'rich-theme-hex',
                    richText:[
                        {text:'Theme variable ',color:'muted'},
                        {text:'success',color:'success'},
                        {text:' and direct hex ',color:'muted'},
                        {text:'#fb7185',color:'#fb7185'},
                        {text:' both resolve.'},
                    ],
                    border:'muted',
                },
                {
                    text:'Wrapping across spans',
                    color:'accent',
                },
                {
                    id:'rich-wrap',
                    richText:[
                        {text:'This rich text wraps using the same rules as plain text. ',color:'foreground'},
                        {text:'Styled spans can cross line boundaries ',color:'accent'},
                        {text:'and keep their foreground and background colors after wrapping.',color:'success'},
                    ],
                    border:'muted',
                },
                {
                    text:'Clipping with ellipses',
                    color:'accent',
                },
                {
                    id:'rich-clip',
                    richText:[
                        {text:'This clipped rich text is intentionally too long and the ellipses should use the style near the clipped edge.',color:'active'},
                    ],
                    textWrap:'clip',
                    textClipStyle:'ellipses',
                    border:'muted',
                },
                {
                    text:'Centered rich text',
                    color:'accent',
                },
                {
                    id:'rich-centered',
                    richText:[
                        {text:'Centered ',color:'accent'},
                        {text:'rich ',color:'success'},
                        {text:'text',color:'danger'},
                    ],
                    textAlign:'center',
                    border:'muted',
                },
            ],
        },
        {
            id:'rich-back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
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
        {
            id:'wrap',
            defaultSprite:'wrap-back-link',
            root:wrapRoot,
        },
        {
            id:'rich',
            defaultSprite:'rich-back-link',
            root:richRoot,
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
