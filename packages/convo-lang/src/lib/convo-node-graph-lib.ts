import { Conversation } from "./Conversation.js";
import { convoMessageToStringSafe, convoRoles, convoTags, convoVars, defaultConvoNodeId } from "./convo-lib.js";
import { ConvoNodeDescription, ConvoNodeExtendedDescription, ConvoNodeGraph, ConvoNodeGraphSource, ConvoNodeRoute } from "./convo-node-graph-types.js";
import { ConvoMessage, ConvoTag, FlatConvoMessage } from "./convo-types.js";
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

export const getConvoNodeMessages=(nodeId:string,messages:ConvoMessage[],includeRoutes=true):ConvoMessage[]=>{

    let inNode=false;

    const nodeMessages:ConvoMessage[]=[];

    for(const msg of messages){

        switch(msg.role){

            case convoRoles.node:
                if(msg.nodeId===nodeId){
                    inNode=true;
                    nodeMessages.push(msg);
                }else{
                    inNode=false;
                }
                break;

            case convoRoles.nodeEnd:
            case convoRoles.goto:
            case convoRoles.gotoEnd:
            case convoRoles.exitGraph:
                inNode=false;
                break;

            case convoRoles.to:
            case convoRoles.from:
            case convoRoles.exit:
                if(includeRoutes && inNode){
                    nodeMessages.push(msg);
                }
                break;

            default:
                if(inNode){
                    nodeMessages.push(msg);
                }
                break;
        }

    }


    return nodeMessages;

}

export const getExtendedConvoNodeDescription=(node:ConvoNodeDescription,source:ConvoNodeGraphSource,sourceMessages:ConvoMessage[]):ConvoNodeExtendedDescription=>{
    const messages=source.messages.filter(m=>m.nodeId===node.nodeId);
    const srcMsgs=getConvoNodeMessages(node.nodeId,sourceMessages);
    const extended:ConvoNodeExtendedDescription={
        ...node,
        messages,
        sourceMessages:srcMsgs,
        convo:srcMsgs.map(m=>convoMessageToStringSafe(m)??'').join('\n\n'),
    }
    return extended;
}

export const createConvoNodeGraph=(source:ConvoNodeGraphSource,sourceMessages:ConvoMessage[]):ConvoNodeGraph=>{

    const graph:ConvoNodeGraph={
        nodes:(source.nodeDescriptions??[]).map(n=>getExtendedConvoNodeDescription(n,source,sourceMessages)),
        entry:undefined,
    }

    let entryId:string|undefined;
    for(const msg of source.messages){
        if(msg.role===convoRoles.goto && msg.gotoNodeId){
            entryId=msg.gotoNodeId;
            break;
        }
    }

    if(entryId){
        graph.entry=graph.nodes.find(n=>n.nodeId=entryId);
    }

    return graph;
}

export const removeConvoNodeMessages=(messages:ConvoMessage[])=>{

    let currentNodeId:string|undefined;

    for(let i=0;i<messages.length;i++){

        const msg=messages[i];
        if(!msg){
            continue;
        }


        switch(msg.role){

            case convoRoles.node:
                currentNodeId=msg.nodeId;
                messages.splice(i,1);
                i--;
                break;

            case convoRoles.goto:
            case convoRoles.nodeEnd:
            case convoRoles.gotoEnd:
            case convoRoles.exitGraph:
                currentNodeId=undefined;
                messages.splice(i,1);
                i--;
                break;

            // always remove
            case convoRoles.to:
            case convoRoles.from:
            case convoRoles.exit:
                messages.splice(i,1);
                i--;
                break;

            default:
                console.log('hio 👋 👋 👋 default',currentNodeId,msg);
                if(currentNodeId){
                    messages.splice(i,1);
                    i--;
                }
                break;

        }



    }

}
