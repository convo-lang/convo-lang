#!/usr/bin/env node
import { ConvoTuiCtrl } from '@convo-lang/tui/ConvoTuiCtrl';
import type { ScreenDef, SpriteDef, TuiConsole, TuiTheme } from '@convo-lang/tui/tui-types';
import process from 'node:process';
import { log } from './logger';

const theme:TuiTheme={
    foreground:'#c9d1d9',
    background:'#0d1117',
    panel:'#161b22',
    panel2:'#21262d',
    border:'#30363d',
    muted:'#8b949e',
    accent:'#58a6ff',
    success:'#3fb950',
    danger:'#f85149',
    warning:'#d29922',
    purple:'#bc8cff',
    active:'#f0f6fc',
};

const repos=[
    {
        name:'convo-lang',
        desc:'Conversational programming language and TypeScript tooling',
        lang:'TypeScript',
        stars:'2.4k',
        forks:'184',
        color:'accent',
    },
    {
        name:'agent-runtime',
        desc:'Composable runtime for AI agents, tools, and workflows',
        lang:'TypeScript',
        stars:'918',
        forks:'71',
        color:'purple',
    },
    {
        name:'terminal-lab',
        desc:'Experiments for fast terminal rendering and interface design',
        lang:'Rust',
        stars:'407',
        forks:'32',
        color:'warning',
    },
];

const issues=[
    {
        id:'#1842',
        title:'Support split panes in the workspace view',
        tags:['enhancement','tui'],
        status:'open',
    },
    {
        id:'#1837',
        title:'Improve keyboard navigation for nested menus',
        tags:['accessibility'],
        status:'open',
    },
    {
        id:'#1819',
        title:'Renderer flickers after terminal resize',
        tags:['bug','rendering'],
        status:'triage',
    },
    {
        id:'#1776',
        title:'Add theme presets for light terminals',
        tags:['good first issue'],
        status:'open',
    },
];

const pulls=[
    {
        id:'#1850',
        title:'Refactor sprite layout measurement',
        checks:'8/8 checks passing',
        author:'mona',
        color:'success',
    },
    {
        id:'#1846',
        title:'Add repository command palette',
        checks:'2 review requests',
        author:'octocat',
        color:'warning',
    },
    {
        id:'#1831',
        title:'Update image decoder fixtures',
        checks:'1 failing check',
        author:'hubot',
        color:'danger',
    },
];

const workflows=[
    {
        name:'CI',
        branch:'main',
        status:'passing',
        color:'success',
    },
    {
        name:'Publish canary',
        branch:'next',
        status:'running',
        color:'accent',
    },
    {
        name:'Docs deploy',
        branch:'main',
        status:'queued',
        color:'warning',
    },
];

const pad=(text:string,width:number):string=>(
    text.length>=width?
        text.slice(0,width)
    :
        text+' '.repeat(width-text.length)
);

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
    id:`header-${active}`,
    layout:'row',
    bg:'panel',
    padding:{
        left:1,
        right:1,
    },
    gap:1,
    children:[
        {
            text:'  GitHub  ',
            color:'active',
            bg:'panel2',
            border:'border',
        },
        {
            id:`search-${active}`,
            text:'Type search, repo, issues, pulls, or actions',
            isInput:true,
            border:'border',
            activeBorder:'accent',
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

                evt.ctrl.updateSprite('search-status',sprite=>{
                    sprite.text=target?
                        `Press Enter after clearing focus, or use Tab to jump to ${target}.`
                    :
                        value?
                            `Searching GitHub for "${value}"...`
                        :
                            'Search GitHub or type a destination keyword.';
                    sprite.color=target?'accent':'muted';
                });
            },
        },
        navButton(`nav-home-${active}`,'Home','dashboard'),
        navButton(`nav-repo-${active}`,'Repo','repo'),
        navButton(`nav-issues-${active}`,'Issues','issues'),
        navButton(`nav-pulls-${active}`,'Pulls','pulls'),
        navButton(`nav-actions-${active}`,'Actions','actions'),
    ],
});

const footer:SpriteDef={
    id:'footer',
    layout:'row',
    bg:'panel',
    padding:{
        left:1,
        right:1,
    },
    children:[
        {
            id:'search-status',
            text:'Tab focuses controls. Enter activates links. Ctrl+C exits.',
            color:'muted',
            flex:1,
        },
        {
            text:'github.com/convo-lang/convo-lang',
            color:'accent',
        },
    ],
};

const shell=(active:string,body:SpriteDef):SpriteDef=>({
    id:`${active}-root`,
    layout:'column',
    bg:'background',
    children:[
        header(active),
        body,
        footer,
    ],
});

const repoCard=(repo:typeof repos[number]):SpriteDef=>({
    layout:'column',
    border:'border',
    activeBorder:'accent',
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
                    text:repo.name,
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
                    text:`⑂ ${repo.forks}`,
                    color:'muted',
                },
            ],
        },
    ],
});

const activityItem=(title:string,body:string,color:string):SpriteDef=>({
    layout:'column',
    border:'border',
    padding:{
        left:1,
        right:1,
    },
    children:[
        {
            text:title,
            color,
        },
        {
            text:body,
            color:'muted',
        },
    ],
});

const dashboardBody:SpriteDef={
    id:'dashboard-body',
    layout:'row',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            id:'left-sidebar',
            layout:'column',
            width:28,
            gap:1,
            children:[
                {
                    text:'Signed in as octocat',
                    border:'border',
                    bg:'panel',
                    padding:1,
                    color:'active',
                },
                {
                    layout:'column',
                    border:'border',
                    bg:'panel',
                    padding:1,
                    gap:1,
                    children:[
                        {
                            text:'Shortcuts',
                            color:'muted',
                        },
                        navButton('shortcut-repo','convo-lang','repo'),
                        navButton('shortcut-issues','Issues','issues'),
                        navButton('shortcut-pulls','Pull requests','pulls'),
                        navButton('shortcut-actions','Actions','actions'),
                    ],
                },
            ],
        },
        {
            layout:'column',
            flex:1,
            gap:1,
            children:[
                {
                    layout:'row',
                    gap:1,
                    children:[
                        stat('Stars','2.4k','warning'),
                        stat('Forks','184','accent'),
                        stat('Open issues','37','danger'),
                        stat('Pull requests','12','success'),
                    ],
                },
                {
                    text:'Repositories',
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
            width:34,
            gap:1,
            children:[
                {
                    text:'Activity',
                    color:'active',
                    bg:'panel',
                    border:'border',
                    padding:{
                        left:1,
                        right:1,
                    },
                },
                activityItem('mona pushed to main','Refined terminal renderer buffers','success'),
                activityItem('octocat opened issue #1842','Support split panes in workspace view','danger'),
                activityItem('hubot deployed docs','convo-lang.dev is live','accent'),
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
    id:'repo-body',
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
                    text:'convo-lang / convo-lang',
                    color:'accent',
                    flex:1,
                    border:'border',
                    bg:'panel',
                    padding:{
                        left:1,
                        right:1,
                    },
                },
                navButton('repo-code','Code','repo'),
                navButton('repo-issues','Issues 37','issues'),
                navButton('repo-pulls','Pull requests 12','pulls'),
                navButton('repo-actions','Actions','actions'),
            ],
        },
        {
            layout:'row',
            gap:1,
            children:[
                {
                    text:'main',
                    border:'border',
                    bg:'panel',
                    color:'active',
                    width:16,
                    textAlign:'center',
                },
                {
                    text:'Latest commit 8f31c0a by mona: tune sprite diff rendering',
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
                    width:30,
                    border:'border',
                    bg:'panel',
                    padding:1,
                    children:[
                        {
                            text:'Files',
                            color:'active',
                        },
                        {
                            text:'packages/',
                            color:'accent',
                        },
                        {
                            text:'examples/',
                            color:'accent',
                        },
                        {
                            text:'docs/',
                            color:'accent',
                        },
                        {
                            text:'README.md',
                        },
                        {
                            text:'package.json',
                        },
                        {
                            text:'tsconfig.json',
                        },
                    ],
                },
                {
                    layout:'column',
                    flex:1,
                    border:'border',
                    padding:1,
                    children:[
                        codeRow(1,'import { ConvoTuiCtrl } from \'@convo-lang/tui\';','purple'),
                        codeRow(2,''),
                        codeRow(3,'const app=new ConvoTuiCtrl({','foreground'),
                        codeRow(4,'    defaultScreen:\'dashboard\',','foreground'),
                        codeRow(5,'    screens,','foreground'),
                        codeRow(6,'});','foreground'),
                        codeRow(7,''),
                        codeRow(8,'app.init();','success'),
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
    id:'issues-body',
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
                    text:'37 Open',
                    color:'success',
                    border:'border',
                    bg:'panel',
                    width:16,
                    textAlign:'center',
                },
                {
                    text:'128 Closed',
                    color:'muted',
                    border:'border',
                    bg:'panel',
                    width:16,
                    textAlign:'center',
                },
                {
                    id:'new-issue',
                    text:' New issue ',
                    isButton:true,
                    border:'success',
                    activeColor:'background',
                    activeBg:'success',
                    onClick:evt=>{
                        evt.ctrl.updateSprite('search-status',sprite=>{
                            sprite.text='Drafting a new issue from the terminal...';
                            sprite.color='success';
                        });
                    },
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
                    color:'purple',
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
            width:22,
            textAlign:'end',
        },
    ],
});

const pullsBody:SpriteDef={
    id:'pulls-body',
    layout:'column',
    flex:1,
    padding:1,
    gap:1,
    children:[
        {
            text:'Pull requests',
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
            children:pulls.map(pullCard),
        },
        {
            layout:'row',
            gap:1,
            children:[
                stat('Passing checks','21','success'),
                stat('Needs review','6','warning'),
                stat('Merge conflicts','2','danger'),
            ],
        },
    ],
};

const workflowCard=(workflow:typeof workflows[number],index:number):SpriteDef=>({
    layout:'row',
    border:'border',
    activeBorder:'accent',
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
            id:`workflow-status-${index}`,
            text:workflow.status,
            color:workflow.color,
            width:12,
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
    id:'actions-body',
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
                    text:'Actions',
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
                    id:'rerun-all',
                    text:' Rerun jobs ',
                    isButton:true,
                    border:'accent',
                    activeColor:'background',
                    activeBg:'accent',
                    onClick:evt=>{
                        evt.ctrl.updateSprite('search-status',sprite=>{
                            sprite.text='Queued workflow rerun for CI, Publish canary, and Docs deploy.';
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
            text:'Workflow graph: checkout → install → lint → test → build → publish',
            color:'muted',
            border:'border',
            bg:'panel',
            padding:1,
        },
    ],
};

const screens:ScreenDef[]=[
    {
        id:'dashboard',
        defaultSprite:'search-dashboard',
        root:shell('dashboard',dashboardBody),
    },
    {
        id:'repo',
        defaultSprite:'search-repo',
        root:shell('repo',repoBody),
    },
    {
        id:'issues',
        defaultSprite:'new-issue',
        root:shell('issues',issuesBody),
    },
    {
        id:'pulls',
        defaultSprite:'search-pulls',
        root:shell('pulls',pullsBody),
    },
    {
        id:'actions',
        defaultSprite:'rerun-all',
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
    log
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
