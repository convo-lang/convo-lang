import { AwaitableConversation, AwaitableConversationCompletion, Conversation, ConversationOptions, ConversationUiCtrl, ConvoTask, FlatConvoMessage } from "@convo-lang/convo-lang";
import { delayAsync, getErrorMessage, zodTypeToJsonScheme } from "@iyio/common";
import { useSubject } from '@iyio/react-common';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ZodType, z } from "zod";
import { ConvoLangTheme } from "./convo-lang-theme";

export type ConversationInputChangeType='chat'|'source'
export interface ConversationInputChange
{
    type:ConversationInputChangeType;
    value:string;
}

export const ConversationUiContext=createContext<ConversationUiCtrl|null>(null);

export const useConversationUiCtrl=(ctrlOverride?:ConversationUiCtrl):ConversationUiCtrl=>{
    const ctx=useContext(ConversationUiContext);
    if(ctrlOverride){
        return ctrlOverride;
    }
    if(!ctx){
        throw new Error('useConversationUiCtrl used outside of a ConversationUiContext');
    }
    return ctx;
}

export const useConversation=(ctrlOverride?:ConversationUiCtrl):Conversation|null=>{
    const ctrl=useConversationUiCtrl(ctrlOverride);

    return useSubject(ctrl.convoSubject);
}

export const useConversationMessages=(ctrlOverride?:ConversationUiCtrl):FlatConvoMessage[]=>{

    const ctrl=useConversationUiCtrl(ctrlOverride);

    const convo=useSubject(ctrl.convoSubject);

    const messages=useSubject(convo?.flatSubject)?.messages;

    return messages??[];
}

export const useConversationTheme=(ctrlOverride?:ConversationUiCtrl):Partial<ConvoLangTheme>=>{
    const ctrl=useConversationUiCtrl(ctrlOverride);
    return useSubject(ctrl.themeSubject);
}

export interface UseConvoOptions
{
    initDelayMs?:number;
    updateDelayMs?:number;
    conversationOptions?:ConversationOptions;
    vars?:Record<string,any>;
    conversation?:Conversation;
}

export interface UseConvoValue<T>
{
    value?:T;
    completion?:AwaitableConversationCompletion<T>;
    error?:any;
    errorMessage?:string;
    complete:boolean;
    input:AwaitableConversation<T>|null|undefined;
    busy:boolean;
    tasks:ConvoTask[];
}

/**
 * Uses the value of a convo scripts. Use the convo function to create the value to pass to the hook.
 *
 * @note !!!! - `(@)json` should be `@json` but due to JSDoc tag escaping in examples `@json` can not be used.
 *
 * @example
 * const llmValue=useConvoValue(convo`
 *     (@)json ${z.object({name:z.string,favoriteFood:z.string()})}
 *     > user
 *     My name is Bob and my favorite food is cheese
 * `))
 * // llmValue === {busy:true,complete:false} | {busy:false,complete:true,value:{name:"Bob",favoriteFood:"cheese"}}
 *
 */
export const useConvo=<T,C extends AwaitableConversation<T>,R extends Awaited<ReturnType<C['getValueAsync']>>>(
    convo:C|null|undefined,
    options?:UseConvoOptions,
):UseConvoValue<R>=>{

    if(convo && options){
        if(options.conversation){
            convo.setConversation(options.conversation);
        }
        if(options.conversationOptions){
            convo.setOptions(options.conversationOptions);
        }
        if(options.vars){
            convo.setVars(options.vars);
        }
    }

    const [value,setValue]=useState<UseConvoValue<T extends ZodType?z.infer<T>:any>>({complete:false,input:convo as any,busy:false,tasks:[]});

    let deps=convo?.dependencies??[];
    const zodType=convo?.zodType;
    const zodString=useMemo(()=>zodType?JSON.stringify(zodTypeToJsonScheme(zodType)):undefined,[zodType]);
    if(zodString){
        deps=[...deps,zodString];
    }

    const refs=useRef({first:true,initDelayMs:options?.initDelayMs??16,updateDelayMs:options?.updateDelayMs??1000});
    refs.current.initDelayMs=options?.initDelayMs??16;
    refs.current.updateDelayMs=options?.updateDelayMs??1000;
    useEffect(()=>{

        if(!convo){
            setValue({
                input:convo,
                complete:false,
                busy:false,
                tasks:[],
            })
            return;
        }

        let m=true;

        (async ()=>{

            try{
                const delay=refs.current.first?refs.current.initDelayMs:refs.current.updateDelayMs;
                refs.current.first=false;
                await delayAsync(delay??16);
                if(!m){return}

                let tasks:ConvoTask[]=[];
                const update=(completion?:AwaitableConversationCompletion<any>)=>{
                    if(m){
                        setValue({
                            complete:completion?true:false,
                            value:completion?.value,
                            completion,
                            input:convo as any,
                            busy:completion?false:true,
                            tasks,
                        })
                    }
                }

                const conversation=convo.getConversation();
                let ready=false;
                const sub=conversation.openTasksSubject.subscribe(c=>{
                    if(!m || !ready){
                        return;
                    }
                    tasks=[...c];
                });
                try{
                    ready=true;
                    update();
                    const completion:AwaitableConversationCompletion<any>=await convo.getCompletionAsync();
                    if(!m){return;}
                    update(completion);
                    m=false;
                }finally{
                    sub.unsubscribe();
                }

            }catch(ex){
                console.error('useConvo completion failed',ex);
                if(m){
                    setValue({
                        complete:false,
                        input:convo as any,
                        error:ex,
                        errorMessage:getErrorMessage(ex),
                        busy:false,
                        tasks:[],
                    });
                }
            }

        })();

        return ()=>{
            m=false;
        }

    },deps);

    return value;
}


/**
 * Uses the value of a convo scripts. Use the convo function to create the value to pass to the hook.
 *
 * @note !!!! - `(@)json` should be `@json` but due to JSDoc tag escaping in examples `@json` can not be used.
 *
 * @example
 * const llmValue=useConvoValue(convo`
 *     (@)json ${z.object({name:z.string,favoriteFood:z.string()})}
 *     > user
 *     My name is Bob and my favorite food is cheese
 * `))
 * // llmValue === {name:"Bob",favoriteFood:"cheese"} | undefined
 *
 */
export const useConvoValue=<T,C extends AwaitableConversation<T>,R extends Awaited<ReturnType<C['getValueAsync']>>>(
    convo:C|null|undefined,
    options?:UseConvoOptions,
):R|undefined=>{
    const c=useConvo<T,C,R>(convo,options);
    return c?.value;
}
