import { Scene, valueIsZodType, zodTypeToJsonScheme } from "@iyio/common";

export const createConvoSceneDescription=(scene:Scene):string=>{
    return JSON.stringify(scene,replacer,4)
}

const replacer=(key:string,value:any):any=>{
    if(valueIsZodType(value)){
        return zodTypeToJsonScheme(value);
    }else{
        return value;
    }
}
