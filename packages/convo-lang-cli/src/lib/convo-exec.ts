import { convoVars, createConvoScopeFunction } from "@iyio/convo-lang";
import { execAsync } from "@iyio/node-common";
import { ConvoExecConfirmCallback } from "./convo-cli-types";


export const createConvoExec=(confirm:ConvoExecConfirmCallback)=>{
    return createConvoScopeFunction(async (scope,exe)=>{
        if(!scope.paramValues?.length){
            return '';
        }
        const out:string[]=[];
        for(let i=0;i<scope.paramValues.length;i++){
            const cmd=scope.paramValues[i];
            if(typeof cmd !== 'string'){
                continue;
            }

            const allow=await confirm(cmd,i);
            if(!allow){
                out.push('Access denied');
                break;
            }
            const cwd=exe.getVarEx(convoVars.__cwd,undefined,scope,false);
            const r=await execAsync({
                cmd,
                cwd:(typeof cwd === 'string')?cwd:undefined,
                silent:true,
                ignoreErrors:true,
            })
            out.push(r);
        }
        return out.join('\n');
    })
}
