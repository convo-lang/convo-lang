import { convoVars } from "@convo-lang/convo-lang";
import { ConvoMakeTarget } from "./convo-make-types";
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
];
convoMakeTargetHasProps.sort();


export const  getConvoMakeOptionsFromVars=(dir:string,vars:Record<string,any>):ConvoMakeCtrlOptions|undefined=>
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
