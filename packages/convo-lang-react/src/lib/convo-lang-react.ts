import { Conversation, ConversationOptions, ConversationUiCtrl, ConvoObject, ConvoObjectCompletion, ConvoTask, FlatConvoMessage } from "@convo-lang/convo-lang";
import { AnyFunction, delayAsync, getErrorMessage, valueIsZodType, watchObjDeep, zodTypeToJsonScheme } from "@iyio/common";
import { useSubject } from '@iyio/react-common';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConvoLangTheme } from "./convo-lang-theme.js";

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
    disable?:boolean;
    updateTrigger?:number;
}

export interface UseConvoValue<T>
{
    value?:T;
    completion?:ConvoObjectCompletion<T>;
    error?:any;
    errorMessage?:string;
    complete:boolean;
    input:ConvoObject<T>|null|undefined;
    busy:boolean;
    tasks:ConvoTask[];
}

/**
 * Uses the value of a convo scripts. Use the convo function to create the value to pass to the hook.
 *
 * @example
 * const llmValue=useConvoValue(convo`
 *     > user
 *     What is the color of the sky
 * `))
 * // llmValue === {busy:true,complete:false} | {busy:false,complete:true,value:"The color of the sky is blue"}}
 *
 */
export const useConvo=<T,C extends ConvoObject<T>,R extends Awaited<ReturnType<C['getValueAsync']>>>(
    convo:C|null|undefined,
    options?:UseConvoOptions,
):UseConvoValue<R>=>{

    if(convo?.isFinalized()){
        console.error(
            'A finalized convo object has been passed to useConvo. '+
            'The convo will be cloned before being used, which impacts performance and may prompts '+
            'to be ran multiple times. Do not await or call functions on the '+
            'convo object that will finalize it.\n\nThe source of the convo is as follows:\n'+
            convo.getInput()
        )
        convo=convo.clone() as C;
    }

    const refs=useRef({
        first:true,
        initDelayMs:options?.initDelayMs??16,
        updateDelayMs:options?.updateDelayMs??1000,
        options,
        depIndex:0,
        targetFns:[] as AnyFunction[],
        proxyFns:[] as AnyFunction[],
    });
    refs.current.options=options;
    refs.current.initDelayMs=options?.initDelayMs??16;
    refs.current.updateDelayMs=options?.updateDelayMs??1000;

    convo?.proxyFunctions((index,src)=>{
        refs.current.targetFns[index]=src;
        return refs.current.proxyFns[index]??(refs.current.proxyFns[index]=(...args:any[])=>{
            return refs.current.targetFns[index]?.(...args);
        })
    })

    const deps=convo?.dependencies?[...convo.dependencies]:[];
    const depsRef=useRef(deps);

    const [value,setValue]=useState<UseConvoValue<R>>({complete:false,input:convo as any,busy:false,tasks:[]});

    const zodType=valueIsZodType(deps[0])?deps[0]:undefined;
    const zodString=useMemo(()=>zodType?JSON.stringify(zodTypeToJsonScheme(zodType)):undefined,[zodType]);
    if(zodString){
        deps[0]=zodString;
    }

    if(options){
        deps.push(depsDep);
        if(options.conversation){
            deps.push(options.conversation);
        }
        if(options.conversationOptions){
            const keys=Object.keys(options.conversationOptions);
            keys.sort();
            for(const e of keys){
                const v=(options.conversationOptions as any)[e];
                if(v!==undefined){
                    deps.push(e,v);
                }
            }
        }
        if(options.vars){
            const keys=Object.keys(options.vars);
            keys.sort();
            for(const e of keys){
                const v=options.vars[e];
                if(v!==undefined){
                    deps.push(e,options.vars[e]);
                }
            }
        }
    }


    const prevDeps=depsRef.current;
    if(prevDeps.length!==deps.length){
        refs.current.depIndex++;
    }else{
        for(let i=0;i<deps.length;i++){
            if(deps[i]!==prevDeps[i]){
                refs.current.depIndex++;
                break;
            }
        }
    }
    depsRef.current=deps;
    const disable=options?.disable??false;

    useEffect(()=>{

        if(!convo || disable){
            refs.current.first=true;
            setValue({
                input:convo as ConvoObject<any>|null|undefined,
                complete:false,
                busy:false,
                tasks:[],
            })
            return;
        }

        let m=true;

        (async ()=>{

            try{
                const options=refs.current.options;
                if(options){
                    if(options.conversation){
                        convo.setConversation(options.conversation);
                    }
                    if(options.conversationOptions){
                        convo.setOptions(options.conversationOptions);
                    }
                    if(options.vars){
                        convo.addVars(options.vars);
                    }
                }
                const delay=refs.current.first?refs.current.initDelayMs:refs.current.updateDelayMs;
                refs.current.first=false;
                await delayAsync(delay??16);
                if(!m){return}

                let tasks:ConvoTask[]=[];
                const update=(completion?:ConvoObjectCompletion<any>)=>{
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
                    const completion:ConvoObjectCompletion<any>=await convo.getCompletionAsync();
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

    },[refs.current.depIndex,disable,options?.updateTrigger]);

    return value;
}


const depsDep=Symbol();


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
export const useConvoValue=<T,C extends ConvoObject<T>,R extends Awaited<ReturnType<C['getValueAsync']>>>(
    convo:C|null|undefined,
    options?:UseConvoOptions,
):R|undefined=>{
    const c=useConvo<T,C,R>(convo,options);
    return c?.value;
}

/**
 * Watches changes to the given value and queues changes to the value to the given
 * conversation. Changes to the value must be made by the wSet functions to be seen by
 * the watcher.
 */
export const useQueueConvoVarChanges=(
    conversation:Conversation|null|undefined,
    varName:string|null|undefined,
    value:any
)=>{
    useEffect(()=>{
        if(!value || (typeof value !== 'object') || !conversation || !varName){
            return;
        }
        const w=watchObjDeep(value,()=>{
            conversation.queueVarChange(varName,value);
        },{deep:true,skipInitCall:true});
        return ()=>{
            w.dispose();
        }
    },[conversation,varName,value]);
}
