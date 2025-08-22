import { convoTypeToJsonScheme, convoVars, schemeToConvoTypeString } from "@convo-lang/convo-lang";
import { valueIsZodType } from "@iyio/common";
import { ConvoMakeTarget, ConvoMakeTargetDeclaration } from "./convo-make-types";
import type { ConvoMakeCtrlOptions } from "./ConvoMakeCtrl";

export const convoMakeStateDir='.convo-make'

const outReg=/(^|\n)\[out\]/
export const getConvoMakeTargetInHash=(value:string)=>{
    const match=outReg.exec(value);
    if(!match){
        return value.trim();
    }
    return value.substring(0,match.index).trim();

}

export const defaultConvoMakeAppName='default';

export const defaultConvoMakePreviewPort=55222;

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


export const getConvoMakeOptionsFromVars=(dir:string,vars:Record<string,any>):ConvoMakeCtrlOptions|undefined=>
{
    const targets=vars[convoVars.__makeTargets];
    if(!Array.isArray(targets) || !targets.length){
        return undefined;
    }
    const options:ConvoMakeCtrlOptions={targets,dir};
    const apps=vars[convoVars.__makeApps];
    if(Array.isArray(apps)){
        options.apps=apps;
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
