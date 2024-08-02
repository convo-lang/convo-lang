import { parseConvoComponent } from "./convo-lib";
import { ConvoComponent, FlatConvoMessage } from "./convo-types";

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
