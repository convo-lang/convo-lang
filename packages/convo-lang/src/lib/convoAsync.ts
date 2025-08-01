import { getZodTypeName } from "@iyio/common";
import { ZodType, z } from "zod";
import { Conversation, ConversationOptions } from "./Conversation";
import { parseConvoJsonMessage } from "./convo-lib";
import { convoScript } from "./convo-template";
import { AwaitableConversation, AwaitableConversationCompletion } from "./convo-types";

const jsonEndReg=/@json[ \t]*$/;

/**
 * Converts a template literal string into an AwaitableConversation. The completion of the conversation
 * is start started until then, catch, finally, getValue or getCompletionAsync is called. After one
 * of the previously statemented functions are called the AwaitableConversation is considered
 * finalized and non of the setter function will be allowed to be called, if they are called
 * an error will be thrown.
 */
export const convo=<T>(
    strings:TemplateStringsArray,
    valueOrZodType?:T,
    ...values:any[]
):AwaitableConversation<T extends ZodType?z.infer<T>:any>=>{

    let options:ConversationOptions|undefined;
    let conversation:Conversation|undefined;
    const zodName=getZodTypeName(valueOrZodType as any);
    const dependencies:any[]=[
        ...strings,
        ...values
    ];

    const isFinalized=()=>conversation?true:false;

    let _input:string|undefined;
    const getInput=()=>{
        if(_input!==undefined){
            return _input;
        }
        let prefix='';

        if(zodName && jsonEndReg.test(strings[0]??'')){
            prefix=convoScript`> define\nInlineJsonType=${valueOrZodType}\n\n`;
            values.splice(0,0,' InlineJsonType')
        }else{
            values.splice(0,0,valueOrZodType);

        }

        _input=prefix+convoScript(strings,...values);
        return _input;
    }


    const getConversation=():Conversation=>{
        if(conversation){
            return conversation;
        }

        if(defaultVars){
            options={...options,defaultVars:{...options?.defaultVars,...defaultVars}}
        }

        conversation=new Conversation(options);
        return conversation;
    }

    const setConversation=(_conversation:Conversation)=>{
        if(isFinalized()){
            throw new Error('Unable set the conversation of a finalized convo');
        }
        dependencies.push(`instId:${_conversation.instanceId}`);
        conversation=_conversation;
        return _self;
    }

    const setOptions=(_options:ConversationOptions)=>{
        if(isFinalized()){
            throw new Error('Unable set the options of a finalized convo');
        }
        for(const e in _options){
            const v=(_options as any)[e];
            dependencies.push(e,v);
        }
        options=_options;
        return _self;
    }

    const getValueAsync=async ()=>{
        return (await getCompletionAsync()).value;
    }

    let valuePromise:Promise<AwaitableConversationCompletion<any>>|undefined;
    const getCompletionAsync=():Promise<AwaitableConversationCompletion<any>>=>{
        return valuePromise??(valuePromise=_getCompletionAsync())
    }
    const _getCompletionAsync=async ():Promise<AwaitableConversationCompletion<any>>=>{
        const cv=getConversation();
        cv.append(getInput());
        const completion=await cv.completeAsync({returnOnCalled:true});
        let value:any;
        if(completion.returnValues){
            value=completion.returnValues[completion.returnValues.length-1];
        }else if(completion.message?.format==='json'){
            value=parseConvoJsonMessage(completion.message.content??'',completion.message.formatIsArray);
        }else{
            value=completion.message?.content;
        }
        return {
            value,
            completion
        }

    }

    let defaultVars:Record<string,any>|undefined;
    const vars=(vars:Record<string,any>)=>{
        if(isFinalized()){
            throw new Error('Unable set vars of a finalized convo');
        }

        if(!defaultVars){
            defaultVars={}
        }
        for(const e in vars){
            const v=vars[e];
            defaultVars[e]=v;
            dependencies.push(e,v);
        }

        return _self;
    }



    const _self:AwaitableConversation<any>={
        getInput,
        dependencies,
        zodType:zodName?(valueOrZodType as any):undefined,
        isFinalized,
        getConversation,
        setConversation,
        getValueAsync,
        getCompletionAsync,
        setOptions,
        setVars: vars,
        then:(callback)=>{
            getValueAsync().then(callback);
            return _self;
        },
        catch:(callback)=>{
            getValueAsync().catch(callback);
            return _self;
        },
        finally:(callback)=>{
            getValueAsync().finally(callback);
            return _self;
        },
    };

    (_self as any)[awaitableConversationIdentifier]=true;

    return _self as any;
}

export const isAwaitableConversation=(value:any):value is AwaitableConversation<any>=>{
    return value?.[awaitableConversationIdentifier]===true;
}

const awaitableConversationIdentifier=Symbol('AwaitableConversation');

const x=async ()=>{
    const r=await convo`
        @json ${z.object({name:z.string()})}
        > user
        Scott
    `
}


