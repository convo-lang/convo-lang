import { getErrorMessage } from "@iyio/common";
import { PromiseResultType } from "../result-type.js";
import { ConvoDb, ConvoDbFactory } from "./convo-db-types.js";

export const loadDynamicConvoDbFactoryAsync=async (imp:string,options:any):PromiseResultType<ConvoDbFactory>=>{

    const e=imp.indexOf('!');
    let className:string|undefined;
    if(e===-1){
        const s=imp.lastIndexOf('/');
        if(s!==-1){
            className=imp.substring(s+1);
        }
    }else{
        className=imp.substring(e+1);
        imp=imp.substring(0,e);
    }

    let dbClass:new (options:any)=>ConvoDb;

    if(className){
        try{
            const mod=await import(imp);
            dbClass=mod[className];
            if(typeof dbClass !== 'function'){
                throw new Error(`db class not exported by name`);
            }
        }catch(ex){
            return {
                success:false,
                error:`Failed to import db module: import {${className}} from "${imp}": ${getErrorMessage(ex)}`,
                statusCode:500,
            }
        }
    }else{
        return {
            success:false,
            error:`Invalid module class name: import {${className}} from "${imp}"`,
            statusCode:400,
        }
    }

    return {
        success:true,
        result:(name:string)=>new dbClass({name,...options}),
    }
    
}