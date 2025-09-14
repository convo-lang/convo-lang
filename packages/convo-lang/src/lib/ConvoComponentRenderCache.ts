import { parseConvoComponent } from "./convo-component-lib.js";
import { ConvoComponent } from "./convo-component-types.js";
import { FlatConvoMessage } from "./convo-types.js";


export class ConvoComponentRenderCache
{
    private readonly cache:Record<string,ConvoComponent>={};

    public getComponent(message:FlatConvoMessage|string):ConvoComponent|undefined
    {
        const content=(typeof message === 'string')?message:message.content;
        if(!content){
            return undefined;
        }
        const cached=this.cache[content];
        if(cached){
            return cached;
        }
        const r=parseConvoComponent(content);
        if(r){
            this.cache[content]=r;
        }
        return r;
    }
}
