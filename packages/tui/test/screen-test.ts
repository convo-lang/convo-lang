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
let mouseEventCount=0;

const setMouseStatus=(evt:any, label:string)=>{
    evt.ctrl.updateSprite('mouse-status',s=>{
        const modifiers=[
            evt.modifiers?.shift?'shift':undefined,
            evt.modifiers?.alt?'alt':undefined,
            evt.modifiers?.ctrl?'ctrl':undefined,
        ].filter(Boolean).join('+') || 'none';
        s.text=`${++mouseEventCount}: ${label} @ ${evt.x},${evt.y} modifiers=${modifiers}`;
    })
};

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
                        {
                            id:'mouse-link',
                            text:' Mouse events ',
                            link:'mouse',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        {
                            id:'scroll-link',
                            text:' Scrolling ',
                            link:'scroll',
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
                            text:'Mouse clicks are enabled on interactive text. Use the mouse events screen to test release, drag, and wheel.',
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
                {text:'The mouse events screen demonstrates release, drag, and wheel event callbacks.'},
                {text:'The scrolling screen demonstrates vertical and horizontal scroll clipping.'},
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

const mouseRoot:SpriteDef={
    id:'mouse-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'mouse-title',
            text:' Mouse events ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'mouse-instructions',
            text:'Click to focus a panel. Release and drag inside the left pad. Wheel over the right panel to scroll. Wheel over empty right-panel space also fires onMouseWheel.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'mouse-status',
            text:'Mouse status: waiting for release, drag, or wheel.',
            color:'success',
            bg:'panelAlt',
        },
        {
            id:'mouse-body',
            layout:'row',
            flex:1,
            children:[
                {
                    id:'mouse-pad',
                    layout:'column',
                    flex:1,
                    isButton:true,
                    border:'success',
                    activeBorder:'active',
                    bg:'panelAlt',
                    onMouseRelease:evt=>setMouseStatus(evt, `release ${evt.button}`),
                    onMouseDrag:evt=>setMouseStatus(evt, `drag ${evt.button}`),
                    onMouseWheel:evt=>setMouseStatus(evt, `wheel ${evt.direction} deltaY=${evt.deltaY}`),
                    children:[
                        {
                            text:'Drag/release pad',
                            color:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Hold a mouse button and move over this panel to test drag events.',
                            border:'muted',
                        },
                        {
                            text:'Release over this panel to test release events.',
                            border:'muted',
                        },
                        {
                            text:'The status line shows terminal-relative coordinates and modifiers.',
                            border:'muted',
                        },
                    ],
                },
                {
                    id:'mouse-wheel-panel',
                    layout:'column',
                    flex:1,
                    scrollable:true,
                    isButton:true,
                    border:'accent',
                    activeBorder:'active',
                    bg:'panelAlt',
                    onMouseRelease:evt=>setMouseStatus(evt, `release ${evt.button}`),
                    onMouseDrag:evt=>setMouseStatus(evt, `drag ${evt.button}`),
                    onMouseWheel:evt=>setMouseStatus(evt, `wheel ${evt.direction} deltaY=${evt.deltaY}`),
                    children:[
                        {
                            text:'Wheel scroll panel',
                            color:'accent',
                            textAlign:'center',
                        },
                        {
                            text:'Wheel Row 01 - scrolling should move this content vertically.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 02 - scroll events also include terminal-relative coordinates.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 03 - wheel up uses deltaY=-1.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 04 - wheel down uses deltaY=1.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 05 - modifier keys are included when reported by the terminal.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 06 - the nearest scrollable sprite under the mouse path is scrolled.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 07 - child rows may receive the hit target while the parent still scrolls.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 08 - keep scrolling to verify clipping.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 09 - parent borders should remain visible.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 10 - release and drag handlers are also attached to this panel.',
                            border:'muted',
                        },
                        {
                            text:'Wheel Row 11 - final row.',
                            border:'muted',
                        },
                    ],
                },
            ],
        },
        {
            id:'mouse-back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
        },
    ],
};

const scrollRoot:SpriteDef={
    id:'scroll-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'scroll-title',
            text:' Scrolling and clipping ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'scroll-instructions',
            text:'Tab to focus a scrollable panel, then use arrow keys. Borders should remain visible and content should never draw outside them.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'scroll-body',
            layout:'column',
            flex:1,
            scrollable:true,
            isButton:true,
            border:'muted',
            activeBorder:'active',
            bg:'panelAlt',
            children:[
                {
                    text:'Outer vertical scroll panel',
                    color:'accent',
                    textAlign:'center',
                },
                {
                    text:'Rows above and below this panel should disappear cleanly at the content bounds while the border stays intact.',
                    border:'muted',
                },
                {
                    text:'Row 01 - This row is intentionally plain so clipping at the top edge is easy to see.',
                    border:'muted',
                },
                {
                    text:'Row 02 - Scroll down and this row should move behind the top border without overwriting it.',
                    border:'muted',
                },
                {
                    text:'Row 03 - The parent content rect is the only drawable area for scrolled children.',
                    border:'muted',
                },
                {
                    text:'Row 04 - Inline text clipping still applies inside each child sprite.',
                    textWrap:'clip',
                    textClipStyle:'ellipses',
                    border:'muted',
                },
                {
                    id:'scroll-horizontal',
                    layout:'row',
                    scrollable:true,
                    isButton:true,
                    border:'accent',
                    activeBorder:'active',
                    bg:'panel',
                    children:[
                        {
                            text:'Horizontal A: use left and right arrows when this nested panel is active.',
                            border:'success',
                            color:'success',
                        },
                        {
                            text:'Horizontal B: this child should clip at the right edge of the nested panel.',
                            border:'accent',
                            color:'accent',
                        },
                        {
                            text:'Horizontal C: scroll right far enough and earlier children should not overwrite the left border.',
                            border:'danger',
                            color:'danger',
                        },
                        {
                            text:'Horizontal D: nested clipping intersects with the outer scroll clipping.',
                            border:'muted',
                        },
                    ],
                },
                {
                    text:'Row 05 - The horizontal panel above is also inside the vertically scrollable parent.',
                    border:'muted',
                },
                {
                    text:'Row 06 - Nested scrollable containers should clip to the intersection of both content rects.',
                    border:'muted',
                },
                {
                    text:'Row 07 - Scroll this row partly above the viewport to check top clipping.',
                    border:'muted',
                },
                {
                    text:'Row 08 - Scroll this row partly below the viewport to check bottom clipping.',
                    border:'muted',
                },
                {
                    text:'Row 09 - Long clipped line: abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz',
                    textWrap:'clip',
                    textClipStyle:'ellipses',
                    border:'muted',
                },
                {
                    text:'Row 10 - Borders on this child should not leak outside the parent content rect.',
                    border:'muted',
                },
                {
                    text:'Row 11 - Keep scrolling down to verify the parent border remains visible.',
                    border:'muted',
                },
                {
                    text:'Row 12 - Bottom clipping should hide this row before it overwrites the footer link.',
                    border:'muted',
                },
                {
                    text:'Row 13 - Final row of the scroll clipping test.',
                    border:'muted',
                },
            ],
        },
        {
            id:'scroll-back-link',
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
        {
            id:'mouse',
            defaultSprite:'mouse-pad',
            root:mouseRoot,
        },
        {
            id:'scroll',
            defaultSprite:'scroll-body',
            root:scrollRoot,
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
