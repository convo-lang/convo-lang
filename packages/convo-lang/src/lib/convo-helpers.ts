import { getErrorMessage } from "@iyio/common";
import { ZodType, ZodTypeAny, z } from "zod";
import { Conversation, ConversationOptions } from "./Conversation.js";
import { escapeConvoMessageContent } from "./convo-lib.js";
import { createConvoNodeGraphResult } from "./convo-node-graph-lib.js";
import { ConvoNodeGraphResult } from "./convo-node-graph-types.js";
import { ConvoCompletion, ConvoCompletionOptions, ConvoParsingResult, FlatConvoConversation, FlatConvoMessage } from "./convo-types.js";
import { ConvoNodeGraphCtrl, ConvoNodeGraphCtrlOptions } from "./ConvoNodeGraphCtrl.js";

export const getConvoCompletionAsync=(
    messagesOrOptions:string|ConvoCompletionOptions,
    conversationOptions?:ConversationOptions
):Promise<ConvoCompletion>=>{
    const conversation=new Conversation(conversationOptions);
    return conversation.completeAsync(messagesOrOptions);
}


export const getConvoTextCompletionAsync=async (
    messagesOrOptions:string|ConvoCompletionOptions,
    conversationOptions?:ConversationOptions
):Promise<string|undefined>=>{
    const r=await getConvoCompletionAsync(messagesOrOptions,conversationOptions);
    return r.message?.content;
}

export const getConvoUserMessageCompletionAsync=async (
    userMessage:string,
    conversationOptions?:ConversationOptions
):Promise<string|undefined>=>{
    const r=await getConvoCompletionAsync(`> user\n${escapeConvoMessageContent(userMessage)}`,conversationOptions);
    return r.message?.content;
}

export const getConvoJsonCompletionAsync=async <T=any>(
    messagesOrOptions:string|ConvoCompletionOptions,
    conversationOptions?:ConversationOptions
):Promise<T|undefined>=>{
    const c=await getConvoCompletionAsync(messagesOrOptions,conversationOptions);

    if(c.message?.content===undefined){
        return undefined;
    }

    try{
        return JSON.parse(c.message.content);
    }catch{
        return undefined;
    }
}

export const callConvoFunctionAsync=async <T=any>(
    messagesOrOptions:string|ConvoCompletionOptions,
    conversationOptions?:ConversationOptions
):Promise<T>=>{

    if(messagesOrOptions === undefined){
        messagesOrOptions={};
    }else if(typeof messagesOrOptions === 'string'){
        messagesOrOptions={append:messagesOrOptions};
    }
    messagesOrOptions.returnOnCall=true;

    const c=await getConvoCompletionAsync(messagesOrOptions,conversationOptions);

    return c.message?.callParams;
}

export const callConvoFunctionWithSchemeAsync=async <Z extends ZodTypeAny=ZodType<any>, T=z.infer<Z>>(
    functionName:string,
    functionDescription:string,
    params:Z,
    messagesOrOptions:string|ConvoCompletionOptions,
    conversationOptions?:ConversationOptions
):Promise<T|undefined>=>{
    const conversation=new Conversation(conversationOptions);
    conversation.defineFunction({
        name:functionName,
        paramsType:params,
        description:functionDescription,
    })
    return await conversation.callStubFunctionAsync(messagesOrOptions);
}

export interface FlattenedConvoResult
{
    success:boolean;
    flat?:FlatConvoConversation;
    vars:Record<string,any>
    messages:FlatConvoMessage[];
    parsingResult:ConvoParsingResult;
}
export const flattenConvoAsync=async (code:string,options?:ConversationOptions):Promise<FlattenedConvoResult>=>{
    try{
        const conversation=new Conversation({...options,disableAutoFlatten:true});
        const r=conversation.append(code);
        if(r.error || !r.result){
            return {success:false,parsingResult:r,vars:{},messages:[]}
        }
        const flat=await conversation.flattenAsync();
        return {
            success:true,
            flat,
            vars:flat.vars,
            messages:flat.messages,
            parsingResult:r,
        }

    }catch(ex){
        return {
            success:false,
            parsingResult:{
                error:{
                    message:getErrorMessage(ex),
                    index:0,
                    lineNumber:0,
                    col:0,
                    line:'',
                    near:'',
                },
                endIndex:0,
            },
            vars:{},
            messages:[]
        };
    }
}

/**
 * Executes Convo-Lang code as a node graph and returns the output of the last node.
 */
export const executeConvoGraphAsync=async (code:string,options?:ConvoNodeGraphCtrlOptions):Promise<ConvoNodeGraphResult>=>{
    let ctrl:ConvoNodeGraphCtrl|undefined;
    try{
        ctrl=new ConvoNodeGraphCtrl({convo:code});
    }catch(ex){
        return createConvoNodeGraphResult(null,ex,`Unable to create new ConvoNodeGraphCtrl instance: ${getErrorMessage(ex)}`);
    }
    const graphResult=await ctrl.runAsync();
    ctrl.dispose();
    return graphResult;
}
