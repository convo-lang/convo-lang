import { isPromise } from "@iyio/common";
import { createConvoScopeFunction } from "./convo-lib";
import { isConvoPipeTarget } from "./convo-types";

const pipeValues=(values:any[]):any=>{
    if(values.length<2){
        return values[0];
    }
    let prev=values[0];
    for(let i=1;i<values.length;i++){
        const value=values[i];
        if(isConvoPipeTarget(value)){
            const result=value.convoPipeSink(prev);
            if(isPromise(result)){
                return continuePipeValuesAsync(result,i+1,values);
            }
            prev=result;
        }else if(value && (typeof prev === 'string') && (typeof value === 'object')){// replace map
            for(const e in value){
                prev=(prev as string).split(e).join(value[e]?.toString()??'');
            }
        }else{
            prev=value;
        }
    }
    return prev;
}

const continuePipeValuesAsync=async (firstPromise:Promise<any>,index:number,values:any[]):Promise<any>=>{
    let prev=await firstPromise;
    for(let i=index;i<values.length;i++){
        const value=values[i];
        if(isConvoPipeTarget(value)){
            prev=await value.convoPipeSink(prev);
        }else if(value && (typeof prev === 'string') && (typeof value === 'object')){// replace map
            for(const e in value){
                prev=(prev as string).split(e).join(value[e]?.toString()??'');
            }
        }else{
            prev=value;
        }
    }
    return prev;
}

const pipeValueAsync=async (values:any[]):Promise<any>=>{
    return pipeValues(await Promise.all(values));
}

export const convoPipeScopeFunction=createConvoScopeFunction(scope=>{
    if(!scope.paramValues){
        return undefined;
    }
    if(scope.paramValues.length<2){
        return scope.paramValues[0];
    }
    let hasPromises=false;
    for(let i=0;i<scope.paramValues?.length;i++){
        const value=scope.paramValues[i];
        if(isPromise(value)){
            hasPromises=true;
            break;
        }
    }

    if(hasPromises){
        return pipeValueAsync(scope.paramValues);
    }else{
        return pipeValues(scope.paramValues);
    }
})
