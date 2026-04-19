'use strict';

import {Plugin} from 'obsidian';
import {registerConvoMode} from './convo-mode';

export default class ConvoLangPlugin extends Plugin
{
    async onload():Promise<void>
    {
        const registered=registerConvoMode();
        if(!registered){
            console.warn('Convo-Lang: failed to register CodeMirror mode');
        }

        this.registerExtensions(['convo'],'markdown');

        this.registerMarkdownCodeBlockProcessor('convo',()=>{});
    }
}
