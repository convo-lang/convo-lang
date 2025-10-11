import { ConvoMakeApp, ConvoMakeContentTemplate, ConvoMakeInput, ConvoMakeStage, ConvoMakeTarget, ConvoMakeTargetDeclaration, ConvoMakeTargetSharedProps, convoMakeTargetShellInputPlaceholder, convoTypeToJsonScheme, convoVars, defaultConvoMakeStageName, insertConvoContentIntoSlot, schemeToConvoTypeString } from "@convo-lang/convo-lang";
import { asArray, getContentType, getDirectoryName, getErrorMessage, getFileExt, getFileName, getObjKeyCount, getValueByPath, joinPaths, normalizePath, valueIsZodType } from "@iyio/common";
import { parseJson5 } from "@iyio/json5";
import type { ConvoMakeCtrlOptions } from "./ConvoMakeCtrl.js";



const outReg=/(^|\n)\[out\]/
export const getConvoMakeTargetInHash=(value:string)=>{
    const match=outReg.exec(value);
    if(!match){
        return value.trim();
    }
    return value.substring(0,match.index).trim();

}

export const getConvoMakeTargetOutHash=(value:string)=>{
    const match=outReg.exec(value);
    if(!match){
        return '';
    }
    return value.substring(match.index+match[0].length).replace(/^\r?\n/,'');
}

/**
 * Props that should effect the target's hash
 */
export const convoMakeTargetHasProps:(keyof ConvoMakeTarget)[]=[
    'review',
    'app',
    'appPath',
    'keepAppPathExt',
    'outType',
    'shell',
    'shellCwd',
    'pipeShell',
    'ignoreShellExitCode',
    'disableShellPipeTrimming',
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

const pathEscape=/[~\/\\.]/g;
export const getEscapeConvoMakePathName=(path:string)=>{
    return path.replace(pathEscape,(v)=>(
        v==='~'?
            '~~'
        :(v==='/' || v==='\\')?
            '~s'
        :
            '~d'
    ))
}

export const getConvoMakeContextTemplateType=(tmpl:ConvoMakeContentTemplate,content?:string):'json'|'markdown'=>{
    const contentType=tmpl.contentType||getContentType(tmpl.path);
    const ext=getFileExt(tmpl.path,false,true);
    if(contentType.includes('markdown') || ext==='mdx'){
        return 'markdown';
    }
    if(contentType.includes('json')){
        return 'json';
    }
    if(!content){
        return 'markdown';
    }
    content=content.trim();
    return (content.startsWith('{') || content.startsWith('['))?'json':'markdown';
}

const mdSectionReg=/(\n|^)[ \t]*(#+)(.*)/g;

const selectMarkdownSection=(section:string,content:string):string=>{
    section=section.trim().toLowerCase();
    mdSectionReg.lastIndex=0;
    let startIndex:number|undefined;
    let headerSize=0;
    while(true){
        const match=mdSectionReg.exec(content);
        if(!match){
            break;
        }
        if(startIndex===undefined){
            if(match[3]?.trim().toLowerCase()===section){
                startIndex=match.index;
                headerSize=match[2]?.length??0;
            }
        }else{
            if((match[2]?.length??0)>=headerSize){
                return content.substring(startIndex,match.index-1).trim();
            }
        }

    }
    return startIndex===undefined?'':content.substring(startIndex).trim();
}

const selectContextContent=(content:string,tmpl:ConvoMakeContentTemplate,select:string):string=>{
    const type=getConvoMakeContextTemplateType(tmpl,content);
    if(type==='json'){
        try{
            const value=parseJson5(content);
            return getValueByPath(value,select,undefined)+'';
        }catch(ex){
            return getErrorMessage(ex);
        }
    }else{
        return selectMarkdownSection(select,content);
    }
}
export interface ApplyConvoMakeContentTemplateOptions{
    name?:string;
    templateVars?:Record<string,string>;
}
export const applyConvoMakeContextTemplate=(content:string,tmpl:ConvoMakeContentTemplate,options?:ApplyConvoMakeContentTemplateOptions):string=>{

    if(tmpl.select){
        content=asArray(tmpl.select).map(s=>selectContextContent(content,tmpl,s)).join('\n\n');
    }

    if(tmpl.maxLength!==undefined){
        content=content.substring(0,tmpl.maxLength);
    }

    if(tmpl.tag){
        content=`<${tmpl.tag}>\n${content}\n</${tmpl.tag}>`;
    }
    if(options?.name && tmpl.tagWithName){
        content=`<${options.name}>\n${content}\n</${options.name}>`;
    }
    if(tmpl.template){
        content=insertConvoContentIntoSlot(content,tmpl.template);
        if(options?.name){
            content=insertConvoContentIntoSlot(options.name,content,'NAME');
        }
        if(options?.templateVars){
            for(const e in options.templateVars){
                content=insertConvoContentIntoSlot(options.templateVars[e]??'',content,e);
            }
        }
    }
    if(tmpl.prefix){
        content=tmpl.prefix+'\n\n'+content;
    }
    if(tmpl.suffix){
        content+='\n\n'+tmpl.suffix;
    }
    return content;
}

export const getConvoMakeAppProtocol=(app:ConvoMakeApp):string=>{
    if(app.protocol){
        return app.protocol;
    }
    const host=app.host??'localhost';
    return host==='localhost' || host.endsWith('.localhost') || host.startsWith('127.')?'http':'https';
}



export const getConvoMakeAppBaseUrl=(app:ConvoMakeApp):string=>{
    return `${
        getConvoMakeAppProtocol(app)
    }://${
        app.host??'localhost'
    }${
        app.port?`:${app.port}`:''
    }`;
}

export const getConvoMakeAppUrl=(app:ConvoMakeApp,path:string):string=>{
    return `${
        getConvoMakeAppBaseUrl(app)
    }${
        path.startsWith('/')?'':'/'}${path
    }`
}

export const insertConvoMakeTargetShellInputs=(shellCommand:string,target:ConvoMakeTarget,makeDir:string):string=>{
    const [start,end]=convoMakeTargetShellInputPlaceholder.split('_');
    if(!start || !end){
        return shellCommand;
    }

    let i=shellCommand.indexOf(start);
    while(i!==-1){
        i=shellCommand.indexOf(start);
        const e=shellCommand.indexOf(end);
        if(e===-1){
            break;
        }

        const objPath=shellCommand.substring(i+start.length,e);
        let path=getValueByPath(target,objPath);
        if(path && (typeof path === 'object')){
            path=path.path;
        }

        shellCommand=`${
            shellCommand.substring(0,i)
        }${
            (typeof path === 'string')?joinPaths(makeDir,path):''
        }${
            shellCommand.substring(e+end.length)
        }`;

    }

    return shellCommand;

}
