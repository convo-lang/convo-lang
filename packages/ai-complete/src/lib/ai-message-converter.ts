import { shortUuid } from "@iyio/common";
import { AiCompletionMessage, AiCompletionRole, isAiCompletionRole } from "./ai-complete-types";

const messageReg=/(^|\n|\r)>\s*(\w+)((.|\n|\r)*?)(?=(\n|\r)>)/mg;

const contentReg=/\{\{(\w+)\}\}/g;

export const parseAiCompletionMessages=(conversation:string,vars?:Record<string,string>):AiCompletionMessage[]=>{

    const matches=(conversation+'\n> NONE').matchAll(messageReg);

    const messages:AiCompletionMessage[]=[];

    for(const m of matches){

        const _role=m[2]??'';
        if(_role==='NONE'){
            continue;
        }
        const content=m[3];

        const role:AiCompletionRole=(isAiCompletionRole(_role) && _role!=='function')?_role:'user';

        const msg:AiCompletionMessage={
            id:shortUuid(),
            type:'text',
            content:content?.trim().replace(contentReg,(_,name:string)=>vars?.[name]??_).trim(),
            role,
        }

        messages.push(msg);
    }

    if(messages.length){
        return messages;
    }else{
        return [{
            id:shortUuid(),
            type:'text',
            content:conversation?.trim().replace(contentReg,(_,name:string)=>vars?.[name]??'').trim(),
            role:'user',
        }]
    }

}
