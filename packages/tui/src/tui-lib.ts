import { TuiColorMode } from "./tui-types.js";

const getEnvValue=(env:Record<string,string|undefined>, name:string):string=>{
    return env[name]??env[name.toLowerCase()]??'';
}

const hasEnvValue=(env:Record<string,string|undefined>, name:string, pattern:RegExp):boolean=>{
    return pattern.test(getEnvValue(env, name));
}

export const detectColorMode=(env:Record<string,string|undefined>|undefined=globalThis.process?.env):TuiColorMode=>{
    
    if(!env){
        return '256';
    }

    const term=getEnvValue(env, 'TERM').toLowerCase();
    const termProgram=getEnvValue(env, 'TERM_PROGRAM').toLowerCase();

    if(termProgram==='apple_terminal'){
        return '256';
    }

    if(hasEnvValue(env, 'COLORTERM', /^(truecolor|24bit)$/i)){
        return 'truecolor';
    }

    if(/^(iterm\.app|wezterm|kitty|ghostty|hyper|vscode|rio)$/i.test(termProgram)){
        return 'truecolor';
    }

    if(/(truecolor|24bit|direct)/i.test(term)){
        return 'truecolor';
    }

    if(/256color/i.test(term)){
        return '256';
    }

    return '256';
}

const wideCharRegex=/[\u{1100}-\u{115F}\u{2329}-\u{232A}\u{2E80}-\u{303E}\u{3040}-\u{A4CF}\u{AC00}-\u{D7A3}\u{F900}-\u{FAFF}\u{FE10}-\u{FE19}\u{FE30}-\u{FE6F}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{20000}-\u{2FFFD}\u{30000}-\u{3FFFD}]/u;

export const isWideChar=(c:string):boolean=>{
    return wideCharRegex.test(c);
}