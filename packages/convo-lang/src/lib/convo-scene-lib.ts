import { Scene, zodTypeToJsonScheme } from "@iyio/common";
import { ZodSchema } from "zod";

export const createConvoSceneDescription=(scene:Scene):string=>{
    return JSON.stringify(scene,replacer,4)
}

const replacer=(key:string,value:any):any=>{
    if(value instanceof ZodSchema){
        return zodTypeToJsonScheme(value);
    }else{
        return value;
    }
}
