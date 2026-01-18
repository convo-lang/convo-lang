import { deepClone } from "@iyio/common";
import { Conversation } from "./Conversation.js";
import { convoFunctions, convoMessageToStringSafe, convoRoles, convoTags, convoVars, defaultConvoNodeId, getConvoMessagesVarReference } from "./convo-lib.js";
import { ConvoMessage, ConvoNodeRoute, ConvoStatement, ConvoTag, FlatConvoMessage } from "./convo-types.js";
import { ConvoExecutionContext } from "./ConvoExecutionContext.js";

export interface ConvoNodeOrderingResult
{
    inlineMessages:Record<string,ConvoMessage[]>;
    functionMessages:Record<string,ConvoMessage[]>;
    systemMessages:Record<string,ConvoMessage[]>;
    scriptMessages:Record<string,ConvoMessage[]>;
    allMessages:Record<string,ConvoMessage[]>;
}
export const applyConvoNodeOrdering=(
    messages:ConvoMessage[],
    conversation:Conversation,
    appendTail=messages[messages.length-1]?.role===convoRoles.goto
):ConvoNodeOrderingResult=>{

    const inlineMessages:Record<string,ConvoMessage[]>={};
    const functionMessages:Record<string,ConvoMessage[]>={};
    const systemMessages:Record<string,ConvoMessage[]>={};
    const scriptMessages:Record<string,ConvoMessage[]>={};
    const allMessages:Record<string,ConvoMessage[]>={};

    let currentNodeId:string|undefined;

    for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(!msg){
            continue;
        }

        switch(msg.role){

            case convoRoles.node:{
                currentNodeId=msg.nodeId;
                if(currentNodeId===defaultConvoNodeId){
                    currentNodeId=undefined;
                }
                break;
            }

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
                    if(conversation.isSystemMessage(msg)){
                        (systemMessages[currentNodeId]??(systemMessages[currentNodeId]=[])).push(msg);
                    }else if(msg.fn && !msg.fn.topLevel && !msg.fn.call){
                        (functionMessages[currentNodeId]??(functionMessages[currentNodeId]=[])).push(msg);
                    }else if(conversation.isUserMessage(msg) || conversation.isAssistantMessage(msg)){
                        messages.splice(i,1);
                        i--;
                        (inlineMessages[currentNodeId]??(inlineMessages[currentNodeId]=[])).push(msg);

                    }else if(msg.role===convoRoles.define || msg.role===convoRoles.do){
                        messages.splice(i,1);
                        i--;
                        (scriptMessages[currentNodeId]??(scriptMessages[currentNodeId]=[])).push(msg);
                        (inlineMessages[currentNodeId]??(inlineMessages[currentNodeId]=[])).push(msg,{
                            role:convoRoles._sourceRef,
                            content:convoMessageToStringSafe(msg)
                        });

                    }
                    (allMessages[currentNodeId]??(allMessages[currentNodeId]=[])).push(msg);
                }
                break;

        }
    }

    if(appendTail){
        for(let i=messages.length-1;i>=0;i--){
            const msg=messages[i];
            if(msg?.role!==convoRoles.goto){
                continue;
            }

            const insert=inlineMessages[msg.gotoNodeId??''];
            if(!insert){
                break;
            }
            const inputRef=getConvoMessagesVarReference(insert,['input',convoFunctions.getNodeInfo,convoFunctions.getNodeInput,convoVars.__nodeStack]);
            if(!inputRef){
                const statements:ConvoStatement[]=[
                    {value:"<INPUT>",s:0,e:0},
                    {s:0,e:0,ref:"input"},
                    {value:"</INPUT>",s:0,e:0}
                ]
                let last=insert[insert.length-1];
                if(!last || (!conversation.isUserMessage(last) && !conversation.isAssistantMessage(last))){
                    insert.push({
                        role:"user",
                        statement:{
                            fn:"md",s:0,e:0,c:0,
                            params:statements,
                        }
                    })
                }else{
                    last=deepClone(last);
                    insert[insert.length-1]=last;
                    if(!last.statement){
                        last.statement={
                            fn:"md",s:0,e:0,c:0,
                            params:[],
                        }
                    }
                    if(!last.statement.params){
                        last.statement.params=[];
                    }
                    if(last.content!==undefined){
                        last.statement.params.push({s:0,e:0,value:last.content});
                        delete last.content;
                    }
                    last.statement.params.push({value:"\n\n",s:0,e:0});
                    last.statement.params.push(...statements)

                }
            }
            messages.splice(i+1,0,...insert.map(m=>({...m})));
            i+=insert.length;
            break;
        }
    }

    return {inlineMessages,functionMessages,systemMessages,scriptMessages,allMessages};
}

export const getConvoNodeOutput=(messages:FlatConvoMessage[],exe:ConvoExecutionContext,startIndex?:number):any=>{
    for(let i=startIndex??(messages.length-1);i>=0;i--){
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
