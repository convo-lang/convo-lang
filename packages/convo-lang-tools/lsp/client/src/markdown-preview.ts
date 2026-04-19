import type MarkdownIt from 'markdown-it';
import { escapeHtml } from 'markdown-it/lib/common/utils.mjs';
import { createHighlighter, HighlighterGeneric } from 'shiki';
import { ColorThemeKind, commands, window } from 'vscode';
import { convoLangGrammar } from './convoGrammar';

let highlighter:HighlighterGeneric<any,any>|undefined;
let loading=false;

const loadHighlighter=async ()=>{
    if(loading){
        return;
    }
    loading=true;
    try{
        const h=await createHighlighter({
            themes:['dark-plus','github-light'],
            langs:[],
        });
        await h.loadLanguage(convoLangGrammar)
        highlighter=h;
        await commands.executeCommand('markdown.preview.refresh');
    }catch(ex){
        console.error('Unable to load shiki highlighter for Convo-Lang markdown preview highlighting');
        console.error('highlight loading error',ex);
    }
}
export const convoMarkdownPreviewPlugin=(md:MarkdownIt)=>{
    const fence=md.renderer.rules.fence;

    md.renderer.rules.fence=(tokens,idx,options,env,self)=>{
        const token=tokens[idx];
        if(!token){
            return '';
        }
        
        const info=(token.info || '').trim();
        const lang=info.split(/\s+/,1)[0]?.toLowerCase();

        if(lang==='convo'){

            const attrs=self.renderAttrs(token);
            let code:string;
            if(highlighter){

                code=highlighter.codeToHtml(token.content,{
                    lang:'convo',
                    'structure':'inline',
                    theme:window.activeColorTheme.kind===ColorThemeKind.Dark?'dark-plus':'github-light',
                });
            }else{
                loadHighlighter();
                code=escapeHtml(token.content);
            }
            return `<pre><code class="language-convo"${attrs}>${code}</code></pre>\n`;
        }

        return fence?
            fence(tokens,idx,options,env,self)
        :
            self.renderToken(tokens,idx,options);
    };
};

