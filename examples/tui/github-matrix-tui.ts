import { ConvoTuiCtrl } from '@convo-lang/tui/ConvoTuiCtrl';
import type { ScreenDef, SpriteDef, SpriteInlineRenderer, TuiConsole, TuiTheme } from '@convo-lang/tui/tui-types';
import process from 'node:process';
import { log } from './logger';

//const glyphs='アイウエオカキクケコサシスセソタチツテトナニヌネハヒフヘホマミムメモヤユヨラリルレロワン0123456789';
const glyphs='012  34567 89A BCDEFGHI JKLMNOPQRSTU  VWXYZ#$%&*+-/<>=';

const theme:TuiTheme={
    foreground:'#b7ffbf',
    background:'#020403',
    panel:'#041108',
    panel2:'#071a0d',
    border:'#0f3d1f',
    muted:'#2f7f45',
    dim:'#155c2b',
    accent:'#00ff66',
    active:'#d8ffe0',
    success:'#38ff7a',
    danger:'#ff3b3b',
    warning:'#c6ff00',
    purple:'#8cffb1',
};

const repos = [
    {
        name:'convo-lang',
        desc:'neural syntax relay / conversational compiler core',
        lang:'TypeScript',
        stars:'2.4k',
        forks:'184',
        color:'accent',
    },
    {
        name:'agent-runtime',
        desc:'operator mesh for autonomous tool chains',
        lang:'TypeScript',
        stars:'918',
        forks:'71',
        color:'success',
    },
    {
        name:'terminal-lab',
        desc:'green phosphor renderer experiments',
        lang:'Rust',
        stars:'407',
        forks:'32',
        color:'warning',
    },
    {
        name:'tensor-canvas',
        desc:'WebGL accelerated tensor operations',
        lang:'JavaScript',
        stars:'1.1k',
        forks:'104',
        color:'warning',
    },
    {
        name:'scene-compositor',
        desc:'reactive 2D/3D scene graph engine',
        lang:'TypeScript',
        stars:'866',
        forks:'53',
        color:'accent',
    },
    {
        name:'lingua-ui',
        desc:'universal multilingual interface toolkit',
        lang:'Svelte',
        stars:'732',
        forks:'42',
        color:'primary',
    },
    {
        name:'array-mosaic',
        desc:'fast multidimensional data tiling library',
        lang:'Python',
        stars:'591',
        forks:'37',
        color:'info',
    },
    {
        name:'datagram-weave',
        desc:'mesh networking for distributed agents',
        lang:'Go',
        stars:'474',
        forks:'51',
        color:'warning',
    },
    {
        name:'glyph-ts',
        desc:'dynamic font rendering toolkit',
        lang:'TypeScript',
        stars:'533',
        forks:'28',
        color:'success',
    },
    {
        name:'octarine',
        desc:'palette extraction and color harmonies from images',
        lang:'Rust',
        stars:'391',
        forks:'29',
        color:'warning',
    },
    {
        name:'railgun',
        desc:'zero-copy transport protocol implementation',
        lang:'C++',
        stars:'797',
        forks:'71',
        color:'danger',
    },
    {
        name:'sparkline',
        desc:'minimalistic SVG generator for sparklines',
        lang:'TypeScript',
        stars:'288',
        forks:'14',
        color:'info',
    },
    {
        name:'polywaffle',
        desc:'polymorphic wrapper for workflow runners',
        lang:'Python',
        stars:'328',
        forks:'36',
        color:'secondary',
    },
    {
        name:'saga',
        desc:'event-sourced microservice orchestrator',
        lang:'Go',
        stars:'1.2k',
        forks:'127',
        color:'warning',
    },
    {
        name:'cortex-py',
        desc:'parallel neural model execution runtime',
        lang:'Python',
        stars:'519',
        forks:'44',
        color:'info',
    },
    {
        name:'clade',
        desc:'typed structural editor for code documents',
        lang:'TypeScript',
        stars:'674',
        forks:'63',
        color:'primary',
    },
    {
        name:'atlas-db',
        desc:'lightweight peer-to-peer graph database',
        lang:'Rust',
        stars:'890',
        forks:'55',
        color:'success',
    },
    {
        name:'raymarcher',
        desc:'physically-based raymarching renderer',
        lang:'C++',
        stars:'448',
        forks:'39',
        color:'danger',
    },
    {
        name:'fluxpad',
        desc:'collaborative spatial canvas for diagrams',
        lang:'JavaScript',
        stars:'766',
        forks:'57',
        color:'accent',
    },
    {
        name:'vivid',
        desc:'interactive data visualization widgets',
        lang:'Svelte',
        stars:'547',
        forks:'45',
        color:'primary',
    },
    {
        name:'token-audit',
        desc:'static analysis for NFT smart contracts',
        lang:'Solidity',
        stars:'291',
        forks:'23',
        color:'warning',
    },
    {
        name:'eva-logger',
        desc:'semantic logging middleware for Node.js',
        lang:'TypeScript',
        stars:'309',
        forks:'19',
        color:'info',
    },
    {
        name:'chronicle',
        desc:'type-safe event time series storage',
        lang:'Rust',
        stars:'428',
        forks:'36',
        color:'primary',
    },
];

const issues=[
    {
        id:'#1842',
        title:'ghost focus jumps between split panes',
        tags:['enhancement','tui'],
        status:'open',
    },
    {
        id:'#1837',
        title:'operator cannot tab out of nested menus',
        tags:['accessibility'],
        status:'open',
    },
    {
        id:'#1819',
        title:'screen buffer deja-vu after terminal resize',
        tags:['bug','rendering'],
        status:'triage',
    },
    {
        id:'#1776',
        title:'load construct presets for bright terminals',
        tags:['good first issue'],
        status:'open',
    },
];

const pulls=[
    {
        id:'#1850',
        title:'rewrite sprite measurement oracle',
        checks:'8/8 simulations clean',
        author:'trinity',
        color:'success',
    },
    {
        id:'#1846',
        title:'install repository command construct',
        checks:'2 operator reviews',
        author:'neo',
        color:'warning',
    },
    {
        id:'#1831',
        title:'patch image decoder memories',
        checks:'1 sentinel alert',
        author:'morpheus',
        color:'danger',
    },
];

const workflows=[
    {
        name:'Nebuchadnezzar CI',
        branch:'main',
        status:'passing',
        color:'success',
    },
    {
        name:'Zion uplink',
        branch:'next',
        status:'running',
        color:'accent',
    },
    {
        name:'Oracle docs',
        branch:'main',
        status:'queued',
        color:'warning',
    },
];

const terminalLines=[
    'wake up, operator...',
    'the matrix has you...',
    'follow the white rabbit',
    'knock, knock, neo.',
    'loading github construct...',
    'establishing secure shell...',
    'decoding repository memory...',
    'injecting terminal interface...',
];

const pad=(text:string,width:number):string=>(
    text.length>=width?
        text.slice(0,width)
    :
        text+' '.repeat(width-text.length)
);

const matrixText=(width:number,offset:number):string=>{
    let text='';
    for(let i=0;i<width;i++){
        text+=glyphs[(i*7+offset)%glyphs.length]??'0';
    }
    return text;
};

const rainRenderer=(color='dim')=>({
    render:ctx=>{
        for(let y=0;y<ctx.height;y++){
            const row=matrixText(ctx.width,ctx.ivCount+y*3);
            ctx.setChar(0,y,row,color);
        }
    },
    intervalMs:90,
} satisfies SpriteInlineRenderer);

const stat=(label:string,value:string,color:string):SpriteDef=>({
    layout:'column',
    border:'border',
    bg:'panel',
    padding:{
        top:1,
        bottom:1,
        left:2,
        right:2,
    },
    flex:1,
    children:[
        {
            text:value,
            color,
            textAlign:'center',
        },
        {
            text:label,
            color:'muted',
            textAlign:'center',
        },
    ],
});

const navButton=(id:string,text:string,link:string):SpriteDef=>({
    id,
    text:` ${text} `,
    link,
    border:'border',
    activeBorder:'accent',
    activeColor:'background',
    activeBg:'accent',
});

const header=(active:string):SpriteDef=>({
    id:`matrix-header-${active}`,
    layout:'row',
    bg:'panel',
    padding:{
        left:1,
        right:1,
    },
    gap:1,
    children:[
        {
            text:'  MATRIX://GITHUB  ',
            color:'background',
            bg:'dim',
            vTextAlign:'center',
        },
        {
            id:`matrix-search-${active}`,
            text:'operator command: home repo issues pulls actions',
            isInput:true,
            border:'border',
            activeBorder:'accent',
            color:'active',
            bg:'panel2',
            flex:1,
            onInput:evt=>{
                const value=evt.value.trim().toLowerCase();
                const target=(
                    value.includes('issue')?
                        'issues'
                    :value.includes('pull') || value.includes('pr')?
                        'pulls'
                    :value.includes('action') || value.includes('ci')?
                        'actions'
                    :value.includes('repo') || value.includes('code')?
                        'repo'
                    :value.includes('home') || value.includes('dash')?
                        'dashboard'
                    :
                        ''
                );

                evt.ctrl.updateSprite('matrix-status',sprite=>{
                    sprite.text=target?
                        `trace locked: tab to ${target}, press enter to jack in.`
                    :
                        value?
                            `scanning github construct for "${value}"...`
                        :
                            'awaiting operator command.';
                    sprite.color=target?'accent':'muted';
                });
            },
        },
        navButton(`matrix-nav-home-${active}`,'home','dashboard'),
        navButton(`matrix-nav-repo-${active}`,'repo','repo'),
        navButton(`matrix-nav-issues-${active}`,'issues','issues'),
        navButton(`matrix-nav-pulls-${active}`,'pulls','pulls'),
        navButton(`matrix-nav-actions-${active}`,'actions','actions'),
    ],
});

const footer:SpriteDef={
    id:'matrix-footer',
    layout:'row',
    bg:'panel',
    padding:{
        left:1,
        right:1,
    },
    children:[
        {
            id:'matrix-status',
            text:'tab cycles focus. enter opens doors. ctrl+c exits the construct.',
            color:'muted',
            flex:1,
        },
        {
            text:'zion://github/convo-lang',
            color:'accent',
        },
    ],
};

const shell=(active:string,body:SpriteDef):SpriteDef=>({
    id:`matrix-${active}-root`,
    layout:'column',
    bg:'background',
    children:[
        header(active),
        {
            layout:'row',
            flex:1,
            children:[
                {
                    id:`rain-left-${active}`,
                    text:' '.repeat(12),
                    width:12,
                    color:'dim',
                },
                body,
                {
                    id:`rain-right-${active}`,
                    text:' '.repeat(12),
                    width:12,
                    color:'dim',
                },
            ],
        },
        footer,
    ],
});

const repoCard=(repo:typeof repos[number]):SpriteDef=>({
    layout:'column',
    border:'border',
    activeBorder:'accent',
    bg:'panel',
    padding:1,
    gap:1,
    isButton:true,
    onClick:evt=>{
        evt.ctrl.activateScreen?.('repo');
    },
    children:[
        {
            layout:'row',
            children:[
                {
                    text:`// ${repo.name}`,
                    color:'accent',
                    flex:1,
                },
                {
                    text:`★ ${repo.stars}`,
                    color:'muted',
                },
            ],
        },
        {
            text:repo.desc,
            color:'foreground',
        },
        {
            layout:'row',
            gap:2,
            children:[
                {
                    text:`● ${repo.lang}`,
                    color:repo.color,
                },
                {
                    text:`forks:${repo.forks}`,
                    color:'muted',
                },
            ],
        },
    ],
});

const traceItem=(title:string,body:string,color:string):SpriteDef=>({
    layout:'column',
    border:'border',
    bg:'panel',
    padding:{
        left:1,
        right:1,
    },
    children:[
        {
            text:`> ${title}`,
            color,
        },
        {
            text:body,
            color:'muted',
        },
    ],
});

const dashboardBody:SpriteDef={
    id:'matrix-dashboard-body',
    layout:'row',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            id:'operator-panel',
            layout:'column',
            width:30,
            gap:1,
            children:[
                {
                    height:7,
                    border:'border',
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                },
                {
                    layout:'column',
                    border:'border',
                    bg:'panel',
                    padding:1,
                    gap:1,
                    children:[
                        {
                            text:'OPERATOR',
                            color:'active',
                            textAlign:'center',
                        },
                        {
                            text:'handle: octocat',
                            color:'muted',
                        },
                        {
                            text:'access: root',
                            color:'accent',
                        },
                        {
                            text:'location: zion relay 07',
                            color:'muted',
                        },
                    ],
                },
                {
                    layout:'column',
                    border:'border',
                    bg:'panel',
                    padding:1,
                    gap:1,
                    children:[
                        {
                            text:'SHORTCUTS',
                            color:'muted',
                        },
                        navButton('matrix-shortcut-repo','source construct','repo'),
                        navButton('matrix-shortcut-issues','anomalies','issues'),
                        navButton('matrix-shortcut-pulls','patch queue','pulls'),
                        navButton('matrix-shortcut-actions','ship logs','actions'),
                    ],
                },
            ],
        },
        {
            layout:'column',
            flex:1,
            gap:1,
            scrollable:true,
            children:[
                {
                    layout:'row',
                    gap:1,
                    children:[
                        stat('stars','2.4k','warning'),
                        stat('forks','184','accent'),
                        stat('anomalies','37','danger'),
                        stat('patches','12','success'),
                    ],
                },
                {
                    text:'REPOSITORY CONSTRUCTS',
                    color:'active',
                    bg:'panel',
                    border:'border',
                    padding:{
                        left:1,
                        right:1,
                    },
                },
                {
                    layout:'column',
                    gap:1,
                    children:repos.map(repoCard),
                },
            ],
        },
        {
            layout:'column',
            width:36,
            gap:1,
            children:[
                {
                    text:'LIVE TRACE',
                    color:'active',
                    bg:'panel',
                    border:'border',
                    padding:{
                        left:1,
                        right:1,
                    },
                },
                traceItem('trinity pushed to main','optimized phosphor diff renderer','success'),
                traceItem('neo opened anomaly #1842','split panes bend focus rules','danger'),
                traceItem('oracle deployed docs','prophecy cache is warm','accent'),
                traceItem('sentinel sweep complete','no hostile packets detected','warning'),
                {
                    height:20,
                    border:'border',
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                },
            ],
        },
    ],
};

const codeRow=(line:number,text:string,color='foreground'):SpriteDef=>({
    layout:'row',
    children:[
        {
            text:pad(String(line),4),
            color:'muted',
            width:5,
        },
        {
            text,
            color,
            flex:1,
        },
    ],
});

const repoBody:SpriteDef={
    id:'matrix-repo-body',
    layout:'column',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            layout:'row',
            gap:1,
            children:[
                {
                    text:'convo-lang / convo-lang :: source construct',
                    color:'accent',
                    flex:1,
                    border:'border',
                    bg:'panel',
                    padding:{
                        left:1,
                        right:1,
                    },
                },
                navButton('matrix-repo-code','code','repo'),
                navButton('matrix-repo-issues','anomalies 37','issues'),
                navButton('matrix-repo-pulls','patches 12','pulls'),
                navButton('matrix-repo-actions','actions','actions'),
                {
                    width:8,
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                },
            ],
        },
        {
            layout:'row',
            gap:1,
            children:[
                {
                    text:'branch: main',
                    border:'border',
                    bg:'panel',
                    color:'active',
                    width:18,
                    textAlign:'center',
                },
                {
                    text:'latest memory 8f31c0a by trinity: tune sprite diff rendering',
                    border:'border',
                    bg:'panel',
                    color:'muted',
                    flex:1,
                },
            ],
        },
        {
            layout:'row',
            flex:1,
            gap:1,
            children:[
                {
                    layout:'column',
                    width:32,
                    border:'border',
                    bg:'panel',
                    padding:1,
                    children:[
                        {
                            text:'FILESYSTEM',
                            color:'active',
                        },
                        {
                            text:'drwxr-xr-x packages/',
                            color:'accent',
                        },
                        {
                            text:'drwxr-xr-x examples/',
                            color:'accent',
                        },
                        {
                            text:'drwxr-xr-x docs/',
                            color:'accent',
                        },
                        {
                            text:'-rw-r--r-- README.md',
                        },
                        {
                            text:'-rw-r--r-- package.json',
                        },
                        {
                            text:'-rw-r--r-- tsconfig.json',
                        },
                    ],
                },
                {
                    layout:'column',
                    flex:1,
                    border:'border',
                    bg:'panel',
                    padding:1,
                    children:[
                        codeRow(1,'import { ConvoTuiCtrl } from \'@convo-lang/tui/ConvoTuiCtrl\';','purple'),
                        codeRow(2,''),
                        codeRow(3,'const construct=new ConvoTuiCtrl({','foreground'),
                        codeRow(4,'    defaultScreen:\'dashboard\',','foreground'),
                        codeRow(5,'    screens,','foreground'),
                        codeRow(6,'    theme:matrix,','foreground'),
                        codeRow(7,'});','foreground'),
                        codeRow(8,''),
                        codeRow(9,'construct.init();','success'),
                    ],
                },
            ],
        },
    ],
};

const issueCard=(issue:typeof issues[number]):SpriteDef=>({
    layout:'column',
    border:'border',
    activeBorder:'accent',
    bg:'panel',
    isButton:true,
    padding:1,
    children:[
        {
            layout:'row',
            children:[
                {
                    text:`● ${issue.title}`,
                    color:issue.status==='triage'?'warning':'success',
                    flex:1,
                },
                {
                    text:issue.id,
                    color:'muted',
                },
            ],
        },
        {
            text:issue.tags.map(tag=>`[${tag}]`).join(' '),
            color:'accent',
        },
    ],
});

const issuesBody:SpriteDef={
    id:'matrix-issues-body',
    layout:'column',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            layout:'row',
            gap:1,
            children:[
                {
                    text:'37 OPEN ANOMALIES',
                    color:'success',
                    border:'border',
                    bg:'panel',
                    width:22,
                    textAlign:'center',
                },
                {
                    text:'128 RESOLVED',
                    color:'muted',
                    border:'border',
                    bg:'panel',
                    width:18,
                    textAlign:'center',
                },
                {
                    id:'matrix-new-issue',
                    text:' log anomaly ',
                    isButton:true,
                    border:'success',
                    activeColor:'background',
                    activeBg:'success',
                    onClick:evt=>{
                        evt.ctrl.updateSprite('matrix-status',sprite=>{
                            sprite.text='new anomaly buffer opened. describe the glitch.';
                            sprite.color='success';
                        });
                    },
                },
                {
                    flex:1,
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                },
            ],
        },
        {
            layout:'column',
            gap:1,
            scrollable:true,
            flex:1,
            children:issues.map(issueCard),
        },
    ],
};

const pullCard=(pull:typeof pulls[number]):SpriteDef=>({
    layout:'row',
    border:'border',
    activeBorder:'accent',
    bg:'panel',
    isButton:true,
    padding:1,
    gap:1,
    children:[
        {
            layout:'column',
            flex:1,
            children:[
                {
                    text:`⑂ ${pull.title}`,
                    color:'accent',
                },
                {
                    text:`${pull.id} opened by ${pull.author}`,
                    color:'muted',
                },
            ],
        },
        {
            text:pull.checks,
            color:pull.color,
            width:24,
            textAlign:'end',
        },
    ],
});

const pullsBody:SpriteDef={
    id:'matrix-pulls-body',
    layout:'column',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            text:'PATCH QUEUE',
            color:'active',
            bg:'panel',
            border:'border',
            padding:{
                left:1,
                right:1,
            },
        },
        {
            height:4,
            bg:'panel',
            color:'dim',
            inlineRenderer:rainRenderer(),
        },
        {
            layout:'column',
            gap:1,
            children:pulls.map(pullCard),
        },
        {
            height:4,
            bg:'panel',
            color:'dim',
            inlineRenderer:rainRenderer(),
        },
        {
            layout:'row',
            gap:1,
            children:[
                stat('clean simulations','21','success'),
                stat('operator review','6','warning'),
                stat('merge glitches','2','danger'),
            ],
        },
    ],
};

const workflowCard=(workflow:typeof workflows[number],index:number):SpriteDef=>({
    layout:'row',
    border:'border',
    activeBorder:'accent',
    bg:'panel',
    isButton:true,
    padding:1,
    gap:1,
    children:[
        {
            text:workflow.name,
            color:'active',
            flex:1,
        },
        {
            text:workflow.branch,
            color:'muted',
            width:12,
        },
        {
            id:`matrix-workflow-status-${index}`,
            text:workflow.status,
            color:workflow.color,
            width:18,
            inlineRenderer:workflow.status==='running'?{
                render:ctx=>{
                    const frames=['◐','◓','◑','◒'];
                    const frame=frames[ctx.ivCount%frames.length]??'◐';
                    ctx.setChar(0,0,`${frame} running`,workflow.color);
                },
                intervalMs:140,
                overlayContent:true,
            }:undefined,
        },
    ],
});

const actionsBody:SpriteDef={
    id:'matrix-actions-body',
    layout:'column',
    flex:1,
    padding:1,
    gap:1,
    scrollable:true,
    children:[
        {
            layout:'row',
            gap:1,
            children:[
                {
                    text:'SHIP LOGS / ACTIONS',
                    color:'active',
                    bg:'panel',
                    border:'border',
                    padding:{
                        left:1,
                        right:1,
                    },
                    flex:1,
                },
                {
                    id:'matrix-rerun-all',
                    text:' rerun simulations ',
                    isButton:true,
                    border:'accent',
                    activeColor:'background',
                    activeBg:'accent',
                    onClick:evt=>{
                        evt.ctrl.updateSprite('matrix-status',sprite=>{
                            sprite.text='queued rerun for CI, Zion uplink, and Oracle docs.';
                            sprite.color='accent';
                        });
                    },
                },
            ],
        },
        {
            layout:'column',
            gap:1,
            children:workflows.map(workflowCard),
        },
        {
            text:'workflow graph: jack-in → download memories → lint reality → test prophecy → broadcast',
            color:'muted',
            border:'border',
            bg:'panel',
            padding:1,
        },
        {
            id:'terminal-feed',
            layout:'column',
            border:'border',
            bg:'panel',
            padding:1,
            children:[
                {
                    height:4,
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                },
                ...terminalLines.map((line,index)=>({
                    id:`terminal-line-${index}`,
                    text:`[0${index}] ${line}`,
                    color:index%2?'muted':'accent',
                })),
                {
                    height:4,
                    bg:'panel',
                    color:'dim',
                    inlineRenderer:rainRenderer(),
                }
            ],
        },
    ],
};

const screens:ScreenDef[]=[
    {
        id:'dashboard',
        defaultSprite:'matrix-search-dashboard',
        root:shell('dashboard',dashboardBody),
    },
    {
        id:'repo',
        defaultSprite:'matrix-search-repo',
        root:shell('repo',repoBody),
    },
    {
        id:'issues',
        defaultSprite:'matrix-new-issue',
        root:shell('issues',issuesBody),
    },
    {
        id:'pulls',
        defaultSprite:'matrix-search-pulls',
        root:shell('pulls',pullsBody),
    },
    {
        id:'actions',
        defaultSprite:'matrix-rerun-all',
        root:shell('actions',actionsBody),
    },
];

const tuiConsole:TuiConsole={
    stdout:process.stdout,
    stdin:process.stdin,
};

const ctrl=new ConvoTuiCtrl({
    console:tuiConsole,
    theme,
    defaultScreen:'dashboard',
    screens,
    log,
});

const dispose=()=>{
    ctrl.dispose();
};

process.on('exit',dispose);
process.on('SIGINT',()=>{
    dispose();
    process.exit(0);
});
process.on('SIGTERM',()=>{
    dispose();
    process.exit(0);
});

ctrl.init();
