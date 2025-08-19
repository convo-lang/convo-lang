import { Conversation, convoFunctions, convoLabeledScopeParamsToObj, convoVars, createConvoScopeFunction } from "@convo-lang/convo-lang";
import { getDirectoryName, joinPaths, normalizePath } from "@iyio/common";
import { defaultConvoMakeAppName } from "./convo-make-lib";
import { ConvoMakeApp, ConvoMakeTargetDeclaration } from "./convo-make-types";


export const convoMakeScopeFunction=createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{

    const target=convoLabeledScopeParamsToObj(scope) as ConvoMakeTargetDeclaration|undefined;
    if(!target){
        return;
    }

    let list=ctx.getVar(convoVars.__makeTargets) as ConvoMakeTargetDeclaration[]|undefined;
    if(!Array.isArray(list)){
        list=[];
        ctx.setVar(true,list,convoVars.__makeTargets);
    }

    const file=ctx.getVar(convoVars.__file,scope);
    if(file){
        target.dir=getDirectoryName(file);
    }

    list.push(target);

    return target;

});

export const convoDefineMakeAppScopeFunction=createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{

    const app=convoLabeledScopeParamsToObj(scope) as ConvoMakeApp|undefined;
    if(!app){
        return;
    }
    if(!app.name){
        app.name=defaultConvoMakeAppName;
    }

    let list=ctx.getVar(convoVars.__makeApps) as ConvoMakeApp[]|undefined;
    if(!Array.isArray(list)){
        list=[];
        ctx.setVar(true,list,convoVars.__makeApps);
    }

    const file=ctx.getVar(convoVars.__file,scope);
    if(file){
        app.dir=app.dir?normalizePath(joinPaths(getDirectoryName(file),app.dir)):getDirectoryName(file);
    }

    if(app.dir){
        if(app.httpRoot){
            app.httpRoot=normalizePath(joinPaths(app.dir,app.httpRoot));
            if(!app.httpRoot.endsWith('/')){
                app.httpRoot+='/';
            }
        }
        if(!app.dir.endsWith('/')){
            app.dir+='/';
        }
    }

    list.push(app);

    return app;

});

export const initConvoMakeConversation=(conversation:Conversation)=>{
    conversation.externFunctions[convoFunctions.make]=convoMakeScopeFunction;
    conversation.externFunctions[convoFunctions.defineApp]=convoDefineMakeAppScopeFunction;
}
