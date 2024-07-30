import { zodTypeToJsonScheme } from "@iyio/common";
import { ZodType, ZodTypeAny, z } from "zod";
import { AiCompletionService } from "./AiCompletionService";
import { AiCompletionFunctionCallError, AiCompletionFunctionInterface, AiCompletionMessage } from "./ai-complete-types";

export const aiCompleteModelCliam='aiCompleteModel';

export const aiCompleteDefaultModel='default'

export const mergeAiCompletionMessages=(src:AiCompletionMessage[],dest:AiCompletionMessage[]):void=>{
    for(const pm of src){
        if(pm.replaceId===undefined){
            dest.push(pm);
            continue;
        }
        const i=dest.findIndex(m=>m.id===pm.replaceId);
        if(i===-1){
            dest.push(pm);
        }else{
            dest[i]=pm;
        }
    }
}

export const callAiCompletionFunctionInterface=async (
    fi:AiCompletionFunctionInterface,
    params:Record<string,any>,
    aiService:AiCompletionService
):Promise<any>=>{
    return await fi.callback?.(fi.params.parse(params),aiService);
}
export const renderAiCompletionFunctionInterface=async (
    fi:AiCompletionFunctionInterface,
    params:Record<string,any>,
    callbackResult:any,
    aiService:AiCompletionService
):Promise<any>=>{
    return await fi.render?.(fi.params.parse(params),callbackResult,aiService);
}

const messageViewKey=Symbol('messageViewKey');
export const getAiCompletionMessageView=(msg:AiCompletionMessage):any=>(msg as any)?.[messageViewKey];
export const setAiCompletionMessageView=(msg:AiCompletionMessage,view:any):void=>{
    if(msg){
        if(view===undefined){
            delete (msg as any)[messageViewKey];
        }else{
            (msg as any)[messageViewKey]=view;
        }
    }
}

export const createAiFunction=<Z=any,C=any,V=any>(
    name:string,
    description:string,
    params:ZodType<Z>,
    rest:Omit<AiCompletionFunctionInterface<ZodType<Z>,Z,C,V>,'name'|'description'|'params'>={}
):AiCompletionFunctionInterface<ZodType<Z>,Z,C,V>=>{
    return {
        name,
        description,
        params,
        ...rest
    }
}

export const aiFunctionInterfaceToFunction=(fn:AiCompletionFunctionInterface)=>({
    name:fn.name,
    description:fn.description,
    params:zodTypeToJsonScheme(fn.params,10),
})

export interface CallAiFunctionInterfaceResult<C=any,V=any>
{
    result?:C;
    view?:V;
    callError?:AiCompletionFunctionCallError;
}
export const callAiFunctionInterfaceAsync=async <Z extends ZodTypeAny=ZodType<any>,T=z.infer<Z>,C=any,V=any>(
    fi:AiCompletionFunctionInterface<Z,T,C,V>,
    render:boolean,
    params:T,
    aiService:AiCompletionService,
):Promise<CallAiFunctionInterfaceResult<C,V>>=>{

    let result:C|undefined=undefined;
    let view:V|undefined=undefined;
    if(fi.callback){
        try{
            result=await callAiCompletionFunctionInterface(fi,params as any,aiService);
        }catch(error){
            const msg=`AiCompletionFunction callback (${fi.name}) failed - ${(error as any)?.message}`
            console.warn(msg,error);
            return {
                callError:{
                    name:fi.name,
                    error:msg,
                }
            }
        }
    }
    if(fi.render && render){
        try{
            view=await renderAiCompletionFunctionInterface(fi,params as any,result,aiService);
        }catch(error){
            const msg=`AiCompletionFunction render (${fi.name}) failed - ${(error as any)?.message}`
            console.warn(msg,error);
            return {
                callError:{
                    name:fi.name,
                    error:msg,
                }
            }
        }
    }
    return {
        result,
        view
    }
}

export const applyResultToAiMessage=(message:AiCompletionMessage,result:CallAiFunctionInterfaceResult)=>{
    const {view,callError}=result;
    setAiCompletionMessageView(message,view);
    if(callError){
        message.callError=callError;
    }
}

export const getLastNonCallAiCompleteMessage=(messages:AiCompletionMessage[]):AiCompletionMessage|undefined=>{
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(msg && !msg.called && !msg.call){
            return msg;
        }
    }
    return undefined;
}
