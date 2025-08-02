import { AnyFunction, getZodTypeName } from "@iyio/common";
import { ZodType, z } from "zod";
import { Conversation, ConversationOptions } from "./Conversation";
import { getAssumedConvoCompletionValue } from "./convo-lib";
import { convoScript } from "./convo-template";
import { ConvoObject, ConvoObjectCompletion, ConvoObjectOutputOptions, ConvoScopeFunction, convoScopeFnDefKey } from "./convo-types";

const jsonEndReg=/@json[ \t]*$/;

let fnIndex=0;

/**
 * Converts a template literal string into a ConvoObject. The completion of the conversation
 * is not started until then, catch, finally, getValue or getCompletionAsync is called. After one
 * of the previously stated functions or getInput, getValueAsync or getCompletionAsync are called
 * the ConvoObject is considered finalized and non of the setter function will be allowed
 * to be called, if they are called an error will be thrown.
 */
export const convo=<T>(
    strings:TemplateStringsArray,
    valueOrZodType?:T,
    ...values:any[]
):ConvoObject<T extends ZodType?z.infer<T>:any>=>{

    const cloneSrc={
        valueOrZodType,
        values:[...values]
    }

    let options:ConversationOptions|undefined;
    let conversation:Conversation|undefined;
    const zodName=getZodTypeName(valueOrZodType as any);
    const dependencies:any[]=[
        valueOrZodType,
        ...values,
        ...strings,
    ];

    const isFinalized=()=>(conversation || _input!==undefined)?true:false;

    let _input:string|undefined;
    const getInput=():string=>{
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

        for(let i=0;i<values.length;i++){
            const fn=values[i];
            if(typeof fn !== 'function'){
                continue;
            }

            const index=fnIndex++;
            const name=`_inline_extern_function_${index}_`;
            const next=strings[i+1];
            if(next?.startsWith('_')){// call function
                values[i]=name.substring(0,name.length-1);
                if(!internalExternFunctions){
                    internalExternFunctions={}
                }
                internalExternFunctions[name]=fn;
            }else{// define as function body
                values[i]=`(${name}(__args))`
                if(!externScopeFunctions){
                    externScopeFunctions={}
                }
                const externFn=fn;
                externScopeFunctions[name]=(scope)=>{
                    const argsObj=scope.paramValues?.[0];
                    if(!argsObj || !(typeof argsObj === 'object')){
                        throw new Error(`__args object should be passed to ${name}`);
                    }
                    const scopeFn=scope[convoScopeFnDefKey];
                    if(!scopeFn){
                        throw new Error(`convoScopeFnDefKey not defined in scope when calling ${name}`);
                    }
                    const args:any[]=[];
                    for(const p of scopeFn.params){
                        if(p.label){
                            args.push(argsObj[p.label]);
                        }
                    }
                    return externFn(...args);
                };
            }
        }

        _input=prefix+convoScript(strings,...values);
        return _input;
    }

    const getOutputOptions=():ConvoObjectOutputOptions=>{
        // must call get input since it can register extern functions
        getInput();
        return {
            defaultVars:(options?.defaultVars || defaultVars)?{...options?.defaultVars,...defaultVars}:undefined,
            externFunctions:(options?.externFunctions || externFunctions || internalExternFunctions)?{...options?.externFunctions,...internalExternFunctions,...externFunctions}:undefined,
            externScopeFunctions:(options?.externScopeFunctions || externScopeFunctions)?{...options?.externScopeFunctions,...externScopeFunctions}:undefined,
        }
    }

    const getConversation=():Conversation=>{
        if(conversation){
            return conversation;
        }

        conversation=new Conversation({
            ...options,
            ...getOutputOptions(),
        });
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

    let valuePromise:Promise<ConvoObjectCompletion<any>>|undefined;
    const getCompletionAsync=():Promise<ConvoObjectCompletion<any>>=>{
        return valuePromise??(valuePromise=_getCompletionAsync())
    }
    const _getCompletionAsync=async ():Promise<ConvoObjectCompletion<any>>=>{
        const cv=getConversation();
        cv.append(getInput());
        const completion=await cv.completeAsync({returnOnCalled:true});
        return {
            value:getAssumedConvoCompletionValue(completion),
            completion
        }

    }

    let defaultVars:Record<string,any>|undefined;
    const setVars=(vars:Record<string,any>)=>{
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

    let externScopeFunctions:Record<string,ConvoScopeFunction>|undefined;
    let externFunctions:Record<string,AnyFunction>|undefined;
    let internalExternFunctions:Record<string,AnyFunction>|undefined;
    const setExternFunctions=(functions:Record<string,AnyFunction>)=>{
        if(isFinalized()){
            throw new Error('Unable set extern functions of a finalized convo');
        }
        if(!externFunctions){
            externFunctions={}
        }
        for(const e in functions){
            const fn=functions[e];
            dependencies.push(e,fn);
            if(fn){
                externFunctions[e]=fn;
            }
        }
        return _self;
    }



    const _self:ConvoObject<any>={
        getInput,
        dependencies,
        zodType:zodName?(valueOrZodType as any):undefined,
        isFinalized,
        getConversation,
        setConversation,
        getValueAsync,
        getCompletionAsync,
        setOptions,
        addVars: setVars,
        setExternFunctions,
        getOutputOptions,
        debug:(verbose?:boolean)=>{
            const f=isFinalized();
            console.log('ConvoObject',{
                isFinalized:f,
                input:f?getInput():null,
                vars:defaultVars,
                dependencies,
                options,
                externFunctions,
                externScopeFunctions,
                internalExternFunctions,
                conversation:verbose?getConversation():undefined,
            });
            return _self;
        },
        convertAsync:()=>{
            const c=getConversation().clone();
            c.append(getInput());
            return c.toModelInputAsync();
        },
        flattenAsync:()=>{
            const c=getConversation().clone();
            c.append(getInput());
            return c.flattenAsync();
        },
        clone:()=>{
            const clone=convo(strings,cloneSrc.valueOrZodType,...cloneSrc.values);
            if(defaultVars){
                clone.addVars(defaultVars);
            }
            if(externFunctions){
                clone.setExternFunctions(externFunctions);
            }
            if(options){
                clone.setOptions(options);
            }
            return clone;
        },
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
        proxyFunctions:(proxy:(index:number,sourceFn:AnyFunction)=>AnyFunction|null|undefined)=>{
            if(isFinalized()){
                throw new Error('Unable set function proxies of a finalized convo');
            }
            if(typeof valueOrZodType === 'function'){
                const proxied=proxy(0,valueOrZodType as any);
                if(proxied){
                    valueOrZodType=proxied as any;
                    dependencies[0]=proxied;
                }
            }
            for(let i=0;i<values.length;i++){
                const fn=values[i];
                if(typeof fn !== 'function'){
                    continue;
                }
                const proxied=proxy(i+1,fn);
                if(proxied){
                    values[i]=proxied;
                    dependencies[i+1]=proxied;
                }
            }
        }
    };

    (_self as any)[ConvoObjectIdentifier]=true;

    return _self as any;
}

export const isConvoObject=(value:any):value is ConvoObject<any>=>{
    return value?.[ConvoObjectIdentifier]===true;
}

const ConvoObjectIdentifier=Symbol('ConvoObject');

const x=async ()=>{
    const r=await convo`
        @json ${z.object({name:z.string()})}
        > user
        Scott
    `
}


