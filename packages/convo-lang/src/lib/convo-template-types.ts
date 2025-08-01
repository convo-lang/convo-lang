import { createJsonRefReplacer, getErrorMessage, valueIsZodType } from "@iyio/common";
import { escapeConvoMessageContent } from "./convo-lib";
import { zodSchemeToConvoTypeString } from "./convo-zod";

export interface RawConvoValue
{
    rawConvoValue:string;
}

export const isRawConvoValue=(value:any):value is RawConvoValue=>{
    return typeof (value as RawConvoValue)?.rawConvoValue === 'string';
}

export const getRawConvoValueAsString=(value:any,escape=false):string=>{
    switch(typeof value){

        case 'string':
            return escape?escapeConvoMessageContent(value):value;

        case 'object':
            if(!value){
                return '';
            }
            if(isRawConvoValue(value)){
                return value.rawConvoValue;
            }else if(valueIsZodType(value)){
                return zodSchemeToConvoTypeString(value);
            }else{
                try{
                    return escape?
                        escapeConvoMessageContent(JSON.stringify(value,null,4)):
                        JSON.stringify(value,null,4);
                }catch{
                    try{
                        return escape?
                            escapeConvoMessageContent(JSON.stringify(value,createJsonRefReplacer(),4)):
                            JSON.stringify(value,createJsonRefReplacer(),4);
                    }catch(ex){
                        const err={
                            stringifyError:getErrorMessage(ex)
                        }
                        return escape?
                            escapeConvoMessageContent(JSON.stringify(err,null,4)):
                            JSON.stringify(err,null,4);
                    }
                }
            }

        case 'undefined':
            return '';

        default:
            return escape?
                escapeConvoMessageContent(value?.toString()??'undefined'):
                (value?.toString()??'undefined');

    }
}

export const rawConvo=(value:any):RawConvoValue=>{
    return {
        rawConvoValue:getRawConvoValueAsString(value,false),
    }
}
