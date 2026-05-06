import type { HighlighterGeneric } from 'shiki';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { convoLangGrammar } from './convoGrammar.js';
import { convoGrammarInjections } from './convoGrammarInjections.js';

let highlighterPromise:Promise<HighlighterGeneric<any,any>>|undefined;
let highlighter:HighlighterGeneric<any,any>|undefined;

export const getHighlighter=():HighlighterGeneric<any,any>|undefined=>{
    if(highlighter){
        return highlighter;
    }
    getHighlighterAsync();
    return undefined;
}

export const getHighlighterAsync=async ():Promise<HighlighterGeneric<any,any>>=>{
    return highlighterPromise??(highlighterPromise=_getHighlighter());
}

const _getHighlighter=async ()=>{
    const h=await createHighlighterCore({
        themes:[import('@shikijs/themes/dark-plus')],
        langs:[
            import('@shikijs/langs/typescript'),
            import('@shikijs/langs/javascript'),
            import('@shikijs/langs/tsx'),
            import('@shikijs/langs/jsx'),
            import('@shikijs/langs/python'),
            import('@shikijs/langs/json'),
            import('@shikijs/langs/xml'),
            import('@shikijs/langs/shell'),
            import('@shikijs/langs/html'),
            import('@shikijs/langs/diff'),
            import('@shikijs/langs/yaml'),
            import('@shikijs/langs/toml'),
            import('@shikijs/langs/sql'),
            import('@shikijs/langs/markdown'),
            convoLangGrammar,
            convoGrammarInjections
        ],
        engine:createOnigurumaEngine(import('shiki/wasm'))
    });
    highlighter=h;
    return h;
}

