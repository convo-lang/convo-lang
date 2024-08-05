import { ConvoError } from "../ConvoError";
import { createConvoScopeFunction } from "../convo-lib";

export const convoScopeFunctionEvalJavascript=createConvoScopeFunction(async (scope,ctx)=>{

    const js=scope.paramValues?.[0];
    if(js===undefined){
        return undefined;
    }

    if(typeof js !== 'string'){
        throw new ConvoError('invalid-args',{statement:scope.s},'The first arg must be string of javascript or undefined')
    }
    const argNames:string[]=[];
    const args:any[]=[];
    const addVar=(name:string,value:any)=>{
        if(argNames.includes(name)){
            return;
        }
        argNames.push(name);
        args.push(value);
    }

    addVar('scope',scope);
    addVar('ctx',ctx);
    addVar('convo',ctx.convo);
    addVar('setVar',(name:string,value:any)=>{
        if(typeof name !== 'string'){
            throw new Error('name must be a string');
        }
        return ctx.setVar(true,value,name);
    });
    addVar('print',(...args:any[])=>ctx.print(...args));

    for(const e in ctx.sharedVars){
        addVar(e,ctx.sharedVars[e]);
    }

    const fn=eval(`async (${argNames.join(',')})=>{
        let result=undefined;
        ${js}
        return result;
    }`);

    return await fn(...args);

});
