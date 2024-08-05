import { defaultConvoVars } from "./convo-default-vars";
import { FlatConvoConversation, FlatConvoMessage } from "./convo-types";

export const evalConvoMessageAsCodeAsync=async (msg:FlatConvoMessage,flat:FlatConvoConversation):Promise<any>=>
{
    if(!msg.content){
        return undefined;
    }
    const codeBlockMatch=/^\s*```([^\n]*)(.*)```\s*$/s.exec(msg.content);
    if(!codeBlockMatch){
        return undefined;
    }

    const lang=codeBlockMatch[1]?.trim().split(' ')[0]
    if(!lang){
        return undefined;
    }

    const code=codeBlockMatch[2];
    if(!code){
        return undefined;
    }

    switch(lang.toLowerCase()){

        case 'js':
        case 'javascript':
            return await evalJsAsync(code,flat);

        default:
            return undefined;
    }
}


const evalJsAsync=async (js:string,flat:FlatConvoConversation)=>{

    const argNames:string[]=[];
    const args:any[]=[];
    const addVar=(name:string,value:any)=>{
        if(argNames.includes(name)){
            return;
        }
        argNames.push(name);
        args.push(value);
    }

    addVar('flat',flat);
    addVar('convo',flat.conversation);
    addVar('ctx',flat.exe);
    addVar('setVar',(name:string,value:any)=>{
        if(typeof name !== 'string'){
            throw new Error('name must be a string');
        }
        return flat.exe.setVar(true,value,name);
    });
    addVar('print',(...args:any[])=>flat.exe.print(...args));

    for(const e in flat.exe.sharedVars){
        if(e in defaultConvoVars){
            continue
        }
        addVar(e,flat.exe.sharedVars[e]);
    }

    const fn=eval(`async (${argNames.join(',')})=>{
        let result=undefined;
        ${js}
        return result;
    }`);

    return await fn(...args);
}
