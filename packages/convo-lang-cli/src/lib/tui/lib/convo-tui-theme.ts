import type { TuiTheme } from "@convo-lang/tui/tui-types";

//// Brown
const bg='#2C2a29';
const foreground='#f6dfb5'
const border='#413C3B';
const borderActive='#6F6655';
const muted='#6C676b';
const primary='#B96C54';
const destructive='#7d140d';
const plaintext='#dddddd';

//// Orange
// const bg='#1C1917';
// const border='#2D2520';
// const muted='#3F352E';
// const primary='#d94b22';
// const destructive='#7d140d';

//// Pale
// const bg='#292C34';
// const border='#525763';
// const muted='#525763';
// const primary='#EC724B';
// const destructive='#7d140d';

// const bg='#1A0A08';
// const border='#525763';
// const muted='#525763';
// const primary='#EC724B';
// const destructive='#7d140d';

export const convoTuiTheme:TuiTheme={
    background:bg,
    foreground,
    plaintext,
    borderActive,

    card:bg,
    'card-foreground':'#fff1cc',
    popover:'#070605',
    'popover-foreground':'#f4d6a0',
    primary,
    'primary-foreground':'#fff4d8',
    secondary:'#211207',
    'secondary-foreground':'#f6dfb5',
    muted,
    'muted-foreground':'#b2854c',
    accent:'#f6a51a',
    'accent-foreground':bg,
    destructive,
    'destructive-foreground':'#fff4d8',
    border:border,
    input:'#070605',
    ring:'#f6a51a',

    'chart-1':'#b91c1c',
    'chart-2':'#dc5f16',
    'chart-3':'#e0a11b',
    'chart-4':'#2f7d32',
    'chart-5':'#0e7490',

    sidebar:'#080503',
    'sidebar-foreground':'#f6dfb5',
    'sidebar-primary':'#f6a51a',
    'sidebar-primary-foreground':bg,
    'sidebar-accent':'#211207',
    'sidebar-accent-foreground':'#f6dfb5',
    'sidebar-border':'#6f421c',
    'sidebar-ring':'#f6a51a',

    'shadow-color':'#000000',

    'convo-gold':'#d9a657',
    'convo-faded':'#8f6a39',
    'convo-dim':'#745431',
    'convo-bright':'#8a5525',
    'convo-strong':'#7a4a1e',
    'convo-cyan':'#15c8c1',
    'convo-magenta':'#df6cd8',
    'convo-green':'#a7d86d',
    'convo-orange':'#ff8b45',
    'convo-amber':'#ef9f26',
    'convo-green-muted':'#16a085',
    'convo-purple':'#5b216c',

    'border-soft':'#3a2412',
    'border-muted':border,
    'terminal-green':'#7fbf5b',
    terminal:'#050302',
    'terminal-glow':'#f6a51a',
    'terminal-dim':'#8f6a39',
    'terminal-hot':'#ff8b45',
    'terminal-crt':'#15c8c1',
}
