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
