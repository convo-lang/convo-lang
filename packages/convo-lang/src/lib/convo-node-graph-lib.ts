import { convoRoles, convoTags, convoVars, defaultConvoNodeId } from "./convo-lib.js";
import { ConvoMessage, ConvoNodeRoute, ConvoTag, FlatConvoMessage } from "./convo-types.js";
import { ConvoExecutionContext } from "./ConvoExecutionContext.js";

export interface ApplyConvoGotoMessagesResult
{
    inlineMessages:Record<string,ConvoMessage[]>;
    functionMessages:Record<string,ConvoMessage[]>;
    allMessages:Record<string,ConvoMessage[]>;
}
export const applyConvoGotoMessages=(messages:ConvoMessage[]):ApplyConvoGotoMessagesResult=>{

    const inlineMessages:Record<string,ConvoMessage[]>={};
    const functionMessages:Record<string,ConvoMessage[]>={};
    const allMessages:Record<string,ConvoMessage[]>={};

    let currentNodeId:string|undefined;

    for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(!msg){
            continue;
        }

        switch(msg.role){

            case convoRoles.node:
                currentNodeId=msg.nodeId;
                if(currentNodeId===defaultConvoNodeId){
                    currentNodeId=undefined;
                }
                break;

            case convoRoles.to:
            case convoRoles.from:
            case convoRoles.exit:
                // do nothing. Messages should not be added
                break;

            case convoRoles.goto:
            case convoRoles.gotoEnd:
            case convoRoles.nodeEnd:
            case convoRoles.exitGraph:
                currentNodeId=undefined;
                break;

            default:
                if(currentNodeId){
                    if(msg.fn && !msg.fn.topLevel && !msg.fn.call){
                        (functionMessages[currentNodeId]??(functionMessages[currentNodeId]=[])).push(msg);
                    }else{
                        messages.splice(i,1);
                        i--;
                        (inlineMessages[currentNodeId]??(inlineMessages[currentNodeId]=[])).push(msg);

                    }
                    (allMessages[currentNodeId]??(allMessages[currentNodeId]=[])).push(msg);
                }
                break;

        }


    }

    for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(msg?.role!==convoRoles.goto){
            continue;
        }

        const insert=inlineMessages[msg.gotoNodeId??''];
        if(!insert){
            continue;
        }
        messages.splice(i+1,0,...insert.map(m=>({...m})));
        i+=insert.length;
    }

    return {inlineMessages,functionMessages,allMessages};
}

export const getConvoNodeOutput=(messages:FlatConvoMessage[],exe:ConvoExecutionContext):any=>{
    for(let i=messages.length;i>=0;i--){
        const msg=messages[i];
        if(!msg){
            continue;
        }
        if((msg.isUser || msg.isAssistant) && msg.content){
            return msg.content;
        }
        if(msg.role===convoRoles.result){
            return exe.getVar(convoVars.__return)
        }
    }
    return undefined;
}

export const convoTagToNodeRoute=(tag:ConvoTag):ConvoNodeRoute=>{
    const route:ConvoNodeRoute={
        toNodeId:tag.label||defaultConvoNodeId,
        nlCondition:tag.statement?undefined:tag.value,
        condition:tag.statement,
    }
    if(route.nlCondition==='else'){
        delete route.nlCondition;
    }
    if(tag.name===convoTags.exit){
        route.exit=true;
    }
    if(route.toNodeId==='auto'){
        if(route.nlCondition){
            route.auto=route.nlCondition.split(/\s+/).filter(n=>n);
            delete route.nlCondition;
        }else{
            route.auto=true;
        }
    }
    return route;
}
