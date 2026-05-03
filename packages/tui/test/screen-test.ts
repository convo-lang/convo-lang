#!/usr/bin/env bun
import { appendFile } from "node:fs/promises";
import { ConvoTuiCtrl } from '../src/ConvoTuiCtrl.js';
import type { SpriteDef, SpriteMouseEvtBase, TuiConsole, TuiTheme } from '../src/tui-types.js';
import { logoSrc } from "./logo.js";

const proc=(globalThis as any).process;
if(!proc){
    console.error('globalThis.process not defined');
    throw new Error('exit 1');
}

if(!proc.stdin.isTTY){
    console.error('screen-test requires an interactive terminal.');
    proc.exit(1);
}


const log=(...values:any[])=>{
    writeOutputAsync(values.map(v=>{
        try{
            if(typeof v === 'string'){
                return v;
            }
            return JSON.stringify(v);
        }catch{
            return v+'';
        }
    }).join(' '))
}

const queue:string[]=[];
let writing=false;
const writeOutputAsync=async (value:string)=>{
    if(writing){
        queue.push(value);
        return;
    }
    try{
        writing=true;
        if(queue.length){
            value=queue.splice(0,queue.length).join('\n')+'\n'+value;
        }
        await appendFile('./log',value+'\n');
    }catch(ex){
        process.stdout.write('Error writing to log');
    }finally{
        writing=false;
        if(queue.length){
            const value=queue.splice(0,queue.length).join('\n');
            writeOutputAsync(value);
        }
    }
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
} satisfies SpriteDef;


let clickCount=0;
let mouseEventCount=0;

const setMouseStatus=(evt:SpriteMouseEvtBase, label:string)=>{
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
                            id:'animations-link',
                            text:' Animations ',
                            link:'animations',
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
                        {
                            id:'grid-link',
                            text:' Grid layout ',
                            link:'grid',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        {
                            id:'flex-link',
                            text:' Flex layout ',
                            link:'flex',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        {
                            id:'absolute-link',
                            text:' Absolute positioning ',
                            link:'absolute',
                            border:'accent',
                            activeColor:'active',
                            activeBg:'activeBg',
                            activeBorder:'active',
                        },
                        quitButton
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
                            id:'logo-image',
                            image:logoSrc,
                            imageOptions:{width:75},
                            textAlign:'center',
                            vTextAlign:'center',
                            flex:1,
                        },
                        {
                            text:'#  #  #  #  # ',
                            inlineRenderer:{
                                render:(ctx)=>{
                                    ctx.setChar(0,0,spinChars[ctx.ivCount%spinChars.length]??' ','accent');
                                    ctx.setChar(3,0,starChars[ctx.ivCount%starChars.length]??' ','#ff00ff');
                                    ctx.setChar(6,0,clockChars[ctx.ivCount%clockChars.length]??' ','success');
                                    ctx.setChar(9,0,bChars[ctx.ivCount%bChars.length]??' ','danger');
                                    ctx.setChar(12,0,barChars[ctx.ivCount%barChars.length]??' ','#ffff00');
                                },
                                intervalMs:300,
                                overlayContent:true,
                            },
                            textAlign:'end',
                        },
                        {
                            text:'[             ]',
                            inlineRenderer:{
                                render:(ctx)=>{
                                    ctx.setChar(0,0,ctx.sprite.text??'','muted');
                                    ctx.setChar(1,0,'='.repeat((ctx.ivCount%(ctx.width-2))+1),'muted');
                                },
                                intervalMs:100,
                                overlayContent:true,
                            },
                            textAlign:'end',
                        },
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

const spinChars=['|','/','-','\\'];
const starChars=['·','✻','✽','✶','✳','✢'];
const bChars=['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
const clockChars=['◴','◷','◶','◵'];
const barChars=['▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃'];
const colors=['accent','#ff00ff','success','danger','#ffff00'];
const matrixChars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-/<>=';

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
                {text:'The animations screen demonstrates inline renderers with timed redraw intervals.'},
                {text:'The mouse events screen demonstrates release, drag, and wheel event callbacks.'},
                {text:'The scrolling screen demonstrates vertical and horizontal scroll clipping.'},
                {text:'The grid layout screen demonstrates fixed and flexible grid columns plus row height sizing.'},
                {text:'The flex layout screen demonstrates no-flex, all-flex, and mixed flex sizing.'},
                {text:'The absolute positioning screen demonstrates sprites removed from normal layout and placed by terminal coordinates.'},
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

const animationsRoot:SpriteDef={
    id:'animations-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'animations-title',
            text:' Animations ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'animations-instructions',
            text:'These examples use inlineRenderer.intervalMs. Animations only redraw while this screen is active.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'animations-body',
            layout:'column',
            flex:1,
            scrollable:true,
            isButton:true,
            border:'muted',
            activeBorder:'active',
            bg:'panelAlt',
            children:[
                {
                    text:'Spinner frames',
                    color:'accent',
                },
                {
                    id:'animation-spinners',
                    text:'|  ·  ◴  ⠋  ▃',
                    border:'muted',
                    inlineRenderer:{
                        render:(ctx)=>{
                            ctx.setChar(0,0,spinChars[ctx.ivCount%spinChars.length]??' ','accent');
                            ctx.setChar(3,0,starChars[ctx.ivCount%starChars.length]??' ','#ff00ff');
                            ctx.setChar(6,0,clockChars[ctx.ivCount%clockChars.length]??' ','success');
                            ctx.setChar(9,0,bChars[ctx.ivCount%bChars.length]??' ','danger');
                            ctx.setChar(12,0,barChars[ctx.ivCount%barChars.length]??' ','#ffff00');
                        },
                        intervalMs:120,
                        overlayContent:true,
                    },
                    textAlign:'center',
                },
                {
                    text:'Progress bar',
                    color:'accent',
                },
                {
                    id:'animation-progress',
                    text:'[                                        ]',
                    border:'muted',
                    inlineRenderer:{
                        render:(ctx)=>{
                            const width=Math.max(3,ctx.width);
                            const innerWidth=width-2;
                            const value=ctx.ivCount%(innerWidth+1);
                            ctx.setChar(0,0,'['+(' '.repeat(innerWidth))+']','muted');
                            ctx.setChar(1,0,'='.repeat(value),'success');
                            if(value<innerWidth){
                                ctx.setChar(value+1,0,'>','active');
                            }
                        },
                        intervalMs:80
                    },
                },
                {
                    text:'Bouncing dot',
                    color:'accent',
                },
                {
                    id:'animation-bounce',
                    text:'                                        ',
                    border:'muted',
                    inlineRenderer:{
                        render:(ctx)=>{
                            const width=Math.max(1,ctx.width);
                            const span=Math.max(1,(width-1)*2);
                            const pos=ctx.ivCount%span;
                            const x=pos<width?pos:span-pos;
                            ctx.setChar(0,0,' '.repeat(width));
                            ctx.setChar(x,0,'●',colors[ctx.ivCount%colors.length]);
                        },
                        intervalMs:70,
                        overlayContent:true,
                    },
                },
                {
                    text:'Color wave',
                    color:'accent',
                },
                {
                    id:'animation-wave',
                    text:'convo tui animation wave',
                    border:'muted',
                    inlineRenderer:{
                        render:(ctx)=>{
                            const text=ctx.sprite.text??'';
                            for(let i=0;i<Math.min(text.length,ctx.width);i++){
                                ctx.setChar(i,0,text[i]??' ',colors[(i+ctx.ivCount)%colors.length]);
                            }
                        },
                        intervalMs:140,
                        overlayContent:true
                    },
                    textAlign:'center',
                },
                {
                    text:'Multi-line rain',
                    color:'accent',
                },
                {
                    id:'animation-rain',
                    text:'###########################################\n#\n#\n#\n#\n#',
                    height:5,
                    border:'muted',
                    bg:'panel',
                    inlineRenderer:{
                        render:(ctx)=>{
                            const chars=['╵','╷','│','╽','╿'];
                            for(let y=0;y<ctx.height;y++){
                                ctx.setChar(0,y,' '.repeat(ctx.width));
                                for(let x=0;x<ctx.width;x+=4){
                                    const offset=(x+y+ctx.ivCount)%chars.length;
                                    ctx.setChar(x,y,chars[offset]??'│',colors[(x+y+ctx.ivCount)%colors.length]);
                                }
                            }
                        },
                        intervalMs:110
                    },
                },
                {
                    text:'Matrix digital rain',
                    color:'accent',
                },
                {
                    id:'animation-matrix-rain',
                    height:20,
                    border:'success',
                    bg:'#001100',
                    inlineRenderer:{
                        render:(ctx)=>{
                            for(let y=0;y<ctx.height;y++){
                                ctx.setChar(0,y,' '.repeat(ctx.width));
                            }
                            for(let x=0;x<ctx.width;x++){
                                const speed=(x%5)+1;
                                const head=Math.floor((ctx.ivCount*speed+x*7)%(ctx.height+12))-6;
                                const tail=6+(x%4);
                                for(let y=0;y<ctx.height;y++){
                                    const distance=y-head;
                                    if(distance>=0 && distance<tail){
                                        const charIndex=(x*13+y*17+ctx.ivCount)%matrixChars.length;
                                        const color=(
                                            distance===0?
                                                '#619561'
                                            :distance<2?
                                                '#8fff8f'
                                            :
                                                '#22c55e'
                                        );
                                        ctx.setChar(x,y,matrixChars[charIndex]??'0',color);
                                    }
                                }
                            }
                        },
                        intervalMs:140,
                    },
                },
            ],
        },
        {
            id:'animations-back-link',
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

const gridRoot:SpriteDef={
    id:'grid-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'grid-title',
            text:' Grid layout ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'grid-instructions',
            text:'Resize the terminal to test fixed cr columns, flexible fr columns, mixed columns, and row heights based on constrained child widths.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'grid-body',
            layout:'column',
            flex:1,
            scrollable:true,
            isButton:true,
            border:'muted',
            activeBorder:'active',
            bg:'panelAlt',
            children:[
                {
                    text:'Fixed cr + flexible fr columns',
                    color:'accent',
                },
                {
                    id:'grid-fixed-flex',
                    layout:'grid',
                    gridCols:['12cr','1fr','2fr'],
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'12cr',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'1fr column wraps this medium text based on the remaining width.',
                            border:'muted',
                        },
                        {
                            text:'2fr column receives twice the flexible space and should usually wrap less than the 1fr column.',
                            border:'muted',
                        },
                        {
                            text:'fixed',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Short cell',
                            border:'muted',
                        },
                        {
                            text:'A much longer cell in the wider flexible column makes this row taller only when constrained.',
                            border:'muted',
                        },
                    ],
                },
                {
                    text:'Equal fr columns',
                    color:'accent',
                },
                {
                    id:'grid-equal-fr',
                    layout:'grid',
                    gridCols:['1fr','1fr','1fr'],
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'One',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Two columns can wrap independently when the terminal narrows.',
                            border:'muted',
                        },
                        {
                            text:'Three',
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                        {
                            text:'A longer first cell demonstrates that grid row height should be the max height of all cells in the row after column widths are known.',
                            border:'muted',
                        },
                        {
                            text:'Middle cell',
                            border:'muted',
                        },
                        {
                            text:'Right cell',
                            border:'muted',
                        },
                    ],
                },
                {
                    text:'Mostly fixed columns with remaining fr space',
                    color:'accent',
                },
                {
                    id:'grid-mostly-fixed',
                    layout:'grid',
                    gridCols:['8cr','14cr','1fr'],
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'ID',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Name',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Description',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'001',
                            border:'muted',
                            textAlign:'center',
                        },
                        {
                            text:'Alpha',
                            border:'muted',
                        },
                        {
                            text:'The description column uses remaining fr space and wraps if the fixed columns leave little room.',
                            border:'muted',
                        },
                        {
                            text:'002',
                            border:'muted',
                            textAlign:'center',
                        },
                        {
                            text:'Beta item',
                            border:'muted',
                        },
                        {
                            text:'Another long description verifies row height calculation across multiple rows.',
                            border:'muted',
                        },
                    ],
                },
                {
                    text:'Narrow fixed columns and multiple rows',
                    color:'accent',
                },
                {
                    id:'grid-narrow',
                    layout:'grid',
                    gridCols:['6cr','1fr','6cr'],
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'A',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Long middle content wraps between two narrow fixed columns.',
                            border:'muted',
                        },
                        {
                            text:'Z',
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                        {
                            text:'B',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'A second row with even longer middle content should expand only this row without forcing other rows to use the same height.',
                            border:'muted',
                        },
                        {
                            text:'Y',
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                        {
                            text:'C',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'Short middle',
                            border:'muted',
                        },
                        {
                            text:'X',
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                    ],
                },
            ],
        },
        {
            id:'grid-back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
        },
    ],
};

const flexRoot:SpriteDef={
    id:'flex-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'flex-title',
            text:' Flex layout ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'flex-instructions',
            text:'Resize the terminal to test row and column flex distribution. The main panels intentionally mix no-flex, all-flex, and fixed-plus-flex children.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'flex-body',
            layout:'column',
            flex:1,
            border:'muted',
            bg:'panelAlt',
            children:[
                {
                    text:'Row: no flex children use natural widths',
                    color:'accent',
                    bg:'panel',
                },
                {
                    id:'flex-row-no-flex',
                    layout:'row',
                    flex:1,
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'Natural A',
                            color:'success',
                            border:'success',
                        },
                        {
                            text:'Natural child B is wider',
                            border:'muted',
                        },
                        {
                            text:'Natural C',
                            color:'danger',
                            border:'danger',
                        },
                        {
                            text:'Discreet size (30x4)',
                            color:'muted',
                            border:'muted',
                            width:30,
                            height:4
                        },
                    ],
                },
                {
                    text:'Row: all flex children share remaining width',
                    color:'accent',
                    bg:'panel',
                },
                {
                    id:'flex-row-all-flex',
                    layout:'row',
                    flex:1,
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'flex 1 padding 2',
                            flex:1,
                            color:'success',
                            border:'success',
                            textAlign:'center',
                            padding:2
                        },
                        {
                            text:'flex 2 receives about twice the width and margin of 2',
                            flex:2,
                            border:'muted',
                            textAlign:'center',
                            margin:2,
                        },
                        {
                            text:'flex 1 margin and padding right:4 top:1',
                            flex:1,
                            color:'danger',
                            border:'danger',
                            textAlign:'end',
                            padding:{right:4,top:1},
                            margin:{right:4,top:1},
                        },
                    ],
                },
                {
                    text:'Row: fixed natural children plus flex children',
                    color:'accent',
                    bg:'panel',
                },
                {
                    id:'flex-row-mixed',
                    layout:'row',
                    flex:1,
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'Fixed left',
                            color:'success',
                            border:'success',
                        },
                        {
                            text:'flex 1 middle grows after fixed siblings keep natural width',
                            flex:1,
                            border:'muted',
                            textAlign:'center',
                        },
                        {
                            text:'Fixed right',
                            color:'danger',
                            border:'danger',
                        },
                    ],
                },
                {
                    text:'Column: all flex children share remaining height with gap of 2',
                    color:'accent',
                    bg:'panel',
                },
                {
                    id:'flex-column-all-flex',
                    layout:'column',
                    flex:2,
                    border:'accent',
                    bg:'panel',
                    gap:2,
                    children:[
                        {
                            text:'flex 1 top',
                            flex:1,
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'flex 2 middle should receive more rows when space is available.',
                            flex:2,
                            border:'muted',
                            textAlign:'center',
                        },
                        {
                            text:'flex 1 bottom',
                            flex:1,
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                    ],
                },
                {
                    text:'Column: fixed header/footer plus flex center',
                    color:'accent',
                    bg:'panel',
                },
                {
                    id:'flex-column-mixed',
                    layout:'column',
                    flex:2,
                    border:'accent',
                    bg:'panel',
                    children:[
                        {
                            text:'Fixed header keeps natural height',
                            color:'success',
                            border:'success',
                            textAlign:'center',
                        },
                        {
                            text:'flex center fills remaining height between fixed rows',
                            flex:1,
                            border:'muted',
                            textAlign:'center',
                            vTextAlign:'center',
                        },
                        {
                            text:'Fixed footer keeps natural height',
                            color:'danger',
                            border:'danger',
                            textAlign:'center',
                        },
                    ],
                },
            ],
        },
        {
            id:'flex-back-link',
            text:' Back home ',
            link:'home',
            border:'accent',
            activeColor:'active',
            activeBg:'activeBg',
            activeBorder:'active',
        },
    ],
};

const absoluteRoot:SpriteDef={
    id:'absolute-root',
    layout:'column',
    border:'accent',
    bg:'background',
    children:[
        {
            id:'absolute-title',
            text:' Absolute positioning ',
            color:'accent',
            bg:'panel',
            textAlign:'center',
        },
        {
            id:'absolute-instructions',
            text:'Resize the terminal. Absolute sprites are removed from normal layout and placed using left, top, right, bottom, width, and height.',
            color:'muted',
            bg:'panel',
        },
        {
            id:'absolute-body',
            layout:'column',
            flex:1,
            border:'muted',
            bg:'panelAlt',
            children:[
                {
                    text:'Normal layout content',
                    color:'accent',
                    textAlign:'center',
                },
                {
                    text:'The bordered boxes on this screen are absolute children of the root and should overlay this normal layout area without changing its size.',
                    border:'muted',
                },
                {
                    text:'Top-left uses fixed left/top/width/height. The wide panel uses left/top/right/height. The bottom panel uses left/top/right/bottom.',
                    border:'muted',
                },
                {
                    text:'The back link remains in normal layout at the bottom.',
                    border:'muted',
                },
            ],
        },
        {
            id:'absolute-fixed',
            layout:'column',
            absolutePosition:{
                left:4,
                top:6,
                height:7,
            },
            width:30,
            border:'success',
            bg:'panel',
            children:[
                {
                    text:'Fixed box',
                    color:'success',
                    textAlign:'center',
                },
                {
                    text:'left:4 top:6 width:30 height:7',
                    textAlign:'center',
                },
            ],
        },
        {
            id:'absolute-wide',
            layout:'column',
            absolutePosition:{
                left:38,
                top:6,
                right:4,
                height:7,
            },
            border:'accent',
            bg:'panel',
            children:[
                {
                    text:'Stretched width',
                    color:'accent',
                    textAlign:'center',
                },
                {
                    text:'left:38 top:6 right:4 height:7',
                    textAlign:'center',
                },
            ],
        },
        {
            id:'absolute-fill',
            layout:'column',
            absolutePosition:{
                left:10,
                top:15,
                right:10,
                bottom:5,
            },
            border:'danger',
            bg:'panel',
            children:[
                {
                    text:'Stretched width and height',
                    color:'danger',
                    textAlign:'center',
                },
                {
                    text:'left:10 top:15 right:10 bottom:5',
                    textAlign:'center',
                },
                {
                    text:'This panel should resize with the terminal while keeping its offsets.',
                    textAlign:'center',
                    vTextAlign:'center',
                    flex:1,
                },
            ],
        },
        {
            id:'absolute-back-link',
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
    log,
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
            id:'animations',
            defaultSprite:'animations-body',
            root:animationsRoot,
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
        {
            id:'grid',
            defaultSprite:'grid-body',
            root:gridRoot,
        },
        {
            id:'flex',
            defaultSprite:'flex-back-link',
            root:flexRoot,
        },
        {
            id:'absolute',
            defaultSprite:'absolute-back-link',
            root:absoluteRoot,
        },
    ],
});


proc.on('exit', ()=>ctrl.dispose());
proc.on('SIGTERM', ()=>{
    ctrl.dispose();
    proc.exit(0);
});

ctrl.init();
