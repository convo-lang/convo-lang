import { asArray } from "@iyio/common";

export const convoWebResultFlag=Symbol('convoWebResultFlag');

export interface ConvoWebHandlerResult
{
    [convoWebResultFlag]:true;
    html?:string;
    markdown?:string;
    text?:string;
    filePath?:string;
    json?:any;
}

export interface ConvoWebRequestContext
{
    path:string;
    query:Record<string,string>;
    filePath:string;
    body?:any;
    method:string;
}

export interface ConvoWebRoute
{
    path?:string|string[];
    match?:RegExp|RegExp[];
    method?:string|string[];
    handler:(ctx:ConvoWebRequestContext)=>any|Promise<any>;
}

export const isConvoWebHandlerResult=(value:any):value is ConvoWebHandlerResult=>{
    return value?.[convoWebResultFlag]===true;
}

export const createConvoWebHandlerResult=(result:Omit<ConvoWebHandlerResult,typeof convoWebResultFlag>):ConvoWebHandlerResult=>{
    return {
        [convoWebResultFlag]:true,
        ...result
    }
}


export const getConvoWebRoute=(path:string,method:string,routes:ConvoWebRoute[]):ConvoWebRoute|undefined=>{
    for(const route of routes){
        if(route.method!==undefined){
            if(Array.isArray(route.method)){
                if(!route.method.includes(method)){
                    continue;
                }
            }else if(route.method!==method){
                continue;
            }
        }
        if(route.path){
            const lp=path.toLowerCase();
            const ary=asArray(route.path);
            for(const p of ary){
                if(p===lp){
                    return route;
                }
            }
        }
        if(route.match){
            const ary=asArray(route.match);
            for(const m of ary){
                if(m.test(path)){
                    return route;
                }
            }
        }
    }
    return undefined;
}


