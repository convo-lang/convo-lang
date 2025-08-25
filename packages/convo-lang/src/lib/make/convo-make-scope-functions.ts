import { aryUnique, getDirectoryName, joinPaths, normalizePath } from "@iyio/common";
import { convoVars, createConvoScopeFunction } from "../convo-lib";
import { defaultConvoMakeAppName, defaultConvoMakeStageName } from "./convo-make-common-lib";
import { ConvoMakeApp, ConvoMakeStage, ConvoMakeTargetDeclaration, ConvoMakeTargetSharedProps } from "./convo-make-common-types";


export const convoMakeScopeFunction=createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{

    const defaults=scope.paramValues?.[0] as ConvoMakeTargetSharedProps|undefined;
    if(!defaults){
        return;
    }

    let currentDefaults=ctx.getVar(convoVars.__makeDefaults) as ConvoMakeTargetSharedProps|undefined;
    if(!currentDefaults || (typeof currentDefaults !== 'object')){
        currentDefaults={};
        ctx.setVar(true,currentDefaults,convoVars.__makeDefaults);
    }

    for(const e in defaults){
        (currentDefaults as any)[e]=(defaults as any)[e];
    }

    return currentDefaults;

});

export const convoMakeTargetScopeFunction=createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{

    const target=scope.paramValues?.[0] as ConvoMakeTargetDeclaration|undefined;
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

    const app=scope.paramValues?.[0] as ConvoMakeApp|undefined;
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

export const convoDefineMakeStageScopeFunction=createConvoScopeFunction({usesLabels:true},(scope,ctx)=>{

    const stage=scope.paramValues?.[0] as ConvoMakeStage|undefined;
    if(!stage){
        return;
    }
    if(!stage.name){
        stage.name=defaultConvoMakeStageName;
    }

    let list=ctx.getVar(convoVars.__makeStages) as ConvoMakeStage[]|undefined;
    if(!Array.isArray(list)){
        list=[];
        ctx.setVar(true,list,convoVars.__makeStages);
    }

    const match=list.find(s=>s.name===stage.name);

    if(match){
        match.deps=aryUnique([...(match.deps??[]),...(stage.deps??[])]);
        match.blocks=aryUnique([...(match.blocks??[]),...(stage.blocks??[])]);
        if(!match.deps.length){
            delete match.deps;
        }
        if(!match.blocks.length){
            delete match.blocks;
        }
    }else{
        const prev=list[list.length-1];
        if(prev && !stage.deps && !stage.blocks){
            stage.deps=[prev.name];
        }
        list.push(stage);
    }

    if(scope.paramValues){
        const targets:ConvoMakeTargetDeclaration[]=ctx.getVar(convoVars.__makeTargets)??[];
        for(const target of scope.paramValues as ConvoMakeTargetDeclaration[]){
            if(targets.includes(target) && !target.stage){
                target.stage=stage.name;
            }
        }
    }


    return stage;

});
