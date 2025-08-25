import { ConvoMakeInput, ConvoMakeStage, ConvoMakeTarget, ConvoMakeTargetDeclaration, ConvoMakeTargetSharedProps, convoTypeToJsonScheme, convoVars, defaultConvoMakeStageName, schemeToConvoTypeString } from "@convo-lang/convo-lang";
import { asArray, getDirectoryName, getFileName, getObjKeyCount, normalizePath, valueIsZodType } from "@iyio/common";
import type { ConvoMakeCtrlOptions } from "./ConvoMakeCtrl";



const outReg=/(^|\n)\[out\]/
export const getConvoMakeTargetInHash=(value:string)=>{
    const match=outReg.exec(value);
    if(!match){
        return value.trim();
    }
    return value.substring(0,match.index).trim();

}



/**
 * Props that should effect the target's hash
 */
export const convoMakeTargetHasProps:(keyof ConvoMakeTarget)[]=[
    'review',
    'app',
    'appPath',
    'keepAppPathExt',
    'outType'
];
convoMakeTargetHasProps.sort();


export const getConvoMakeOptionsFromVars=(filePath:string,dir:string|undefined,vars:Record<string,any>):ConvoMakeCtrlOptions|undefined=>
{
    filePath=normalizePath(filePath);
    if(!dir){
        dir=getDirectoryName(filePath);
    }
    const targets=vars[convoVars.__makeTargets];
    if(!Array.isArray(targets) || !targets.length){
        return undefined;
    }
    const options:ConvoMakeCtrlOptions={name:getFileName(filePath),filePath,dir,targets};
    const apps=vars[convoVars.__makeApps];
    if(Array.isArray(apps)){
        options.apps=apps;
    }
    const stages=vars[convoVars.__makeStages];
    if(Array.isArray(stages)){
        options.stages=stages;
    }
    const defaults=vars[convoVars.__makeDefaults];
    if(defaults && (typeof defaults === 'object')){
        options.targetDefaults=defaults;
    }
    return options;
}

export const getConvoMakeTargetOutType=(dec:ConvoMakeTargetDeclaration):string|undefined=>{
    const isList=dec.outListType?true:false;
    let type=isList?dec.outListType:dec.outType;
    if(!type){
        return undefined;
    }
    if(typeof type !== 'string'){
        if(valueIsZodType(type)){
            type=schemeToConvoTypeString(type);
        }else{
            const json=convoTypeToJsonScheme(type);
            if(!json){
                throw new Error('Unable to convert type to JSON schema');
            }
            type=schemeToConvoTypeString(json);
        }
    }
    return isList?`array(${type})`:type;
}

export const convoMakeOutputTypeName='ConvoMakeOutputType';


/**
 * Applies stage defaults to targets. The targets will not be mutated. Defaults will be applied to copies of target objects.
 */
export const applyConvoMakeTargetSharedProps=(targets:ConvoMakeTargetDeclaration[],stages:ConvoMakeStage[],targetDefaults?:ConvoMakeTargetSharedProps):ConvoMakeTargetDeclaration[]=>{

    if(targetDefaults && !getObjKeyCount(targetDefaults)){
        targetDefaults=undefined;
    }

    if(!stages.length && !targetDefaults){
        return targets;
    }

    const updated:ConvoMakeTargetDeclaration[]=[];

    for(const t of targets){
        let target=t;
        if(targetDefaults){
            target=_applySharedProps(target,targetDefaults);
        }

        const sn=target.stage??defaultConvoMakeStageName;
        const stage=stages.find(s=>s.name===sn);
        if(!stage){
            updated.push(target);
            continue;
        }


        updated.push(_applySharedProps(target,stage));
    }

    return updated;
}
const _applySharedProps=(target:ConvoMakeTargetDeclaration,stage:ConvoMakeTargetSharedProps)=>{
    let copied=false;
    for(const prop of stageTargetDefaults){
        const v=stage[prop];
        if(v===undefined){
            continue;
        }
        if(target[prop]===undefined){
            if(!copied){
                target={...target}
                copied=true;
            }
            target[prop]=v as any;
        }else if(stageTargetArrays.includes(prop)){
            if(!copied){
                target={...target}
                copied=true;
            }
            target[prop]=[
                ...(asArray(target[prop]??[])),
                ...(asArray(v))
            ] as any;
        }
    }
    return target;
}
const stageTargetDefaults:(keyof ConvoMakeTargetSharedProps)[]=[
    'app',
    'appPath',
    'context',
    'contextTag',
    'contextTemplate',
    'inputTag',
    'inputTemplate',
    'instructions',
    'keepAppPathExt',
    'model',
    'review'
]
const stageTargetArrays:(keyof ConvoMakeTargetSharedProps)[]=[
    'context',
    'instructions',
]

export const getConvoMakeStageDeps=(checkStage:ConvoMakeStage,allStages:ConvoMakeStage[]):ConvoMakeStage[]=>{
    const deps:ConvoMakeStage[]=[];
    for(const stage of allStages){
        if(stage.name===checkStage.name){
            continue;
        }
        if( checkStage.deps?.some(d=>d===stage.name) ||
            stage.blocks?.some(b=>b===checkStage.name)
        ){
            deps.push(stage);
        }
    }
    return deps;
}

export const getConvoMakeInputSortKey=(input:ConvoMakeInput):string=>{
    if(input.listIndex===undefined){
        return input.path??'';
    }
    return `${input.path??''}///[${(input.listIndex??0).toString().padStart(7,'0')}]`
}
