import { ConvoComponentDef, convoDescriptionToComment } from "@convo-lang/convo-lang";
import { CancelToken, getDirectoryName, joinPaths, strHashBase64 } from "@iyio/common";
import { pathExistsAsync, triggerNodeBreakpoint } from "@iyio/node-common";
import { mkdir, realpath, watch, writeFile } from "fs/promises";
import { JSDocTagInfo, Node, Project, SourceFile, Symbol, Type } from "ts-morph";
import { ConvoCliOptions } from "./convo-cli-types";

interface ProjectCtx{
    fullPath:string;
    path:string;
    project:Project;
    out:string;
    outFullPath:string;
    options:ConvoCliOptions;
    zodOut:string[];
    tsOut:string[];
    convoOut:string[];
    convoHash:string;
    cancel:CancelToken;
    isScanning:boolean;
    scanRequested:boolean;
    refreshRequested:boolean;
    log:(...msgs:any[])=>void;
}

export const convertConvoInterfacesAsync=async (options:ConvoCliOptions,cancel:CancelToken)=>{
    const {
        syncTsConfig,
        syncWatch,
        syncOut,
    }=options;

    if(!syncTsConfig?.length){
        throw new Error('--sync-ts-config required')
    }
    if(!syncOut){
        throw new Error('--sync-out required');
    }

    if(!await pathExistsAsync(syncOut)){
        await mkdir(syncOut,{recursive:true});
    }

    const outFullPath=await realpath(syncOut);
    const projects=await Promise.all(syncTsConfig.map<Promise<ProjectCtx>>(async p=>({
        path:p,
        fullPath:await realpath(getDirectoryName(p),{encoding:'utf-8'}),
        project:new Project({
            tsConfigFilePath:p,
        }),
        out:syncOut,
        outFullPath,
        options,
        zodOut:[],
        tsOut:[],
        convoOut:[],
        cancel,
        isScanning:false,
        scanRequested:false,
        convoHash:'',
        refreshRequested:false,
        log:(...msgs:any[])=>console.log(...msgs),
    })));

    await Promise.all(projects.map(p=>scanProjectAsync(p,syncWatch??false)));

    if(syncWatch){
        await Promise.all(projects.map(p=>watchProjectAsync(p)))
    }
}

const scanProjectAsync=async (project:ProjectCtx,catchErrors:boolean)=>{
    project.log(`${project.refreshRequested?'Refresh':'Scan'} Project - ${project.path}`);
    if(project.isScanning){
        project.scanRequested=true;
        return;
    }

    project.isScanning=true;
    project.tsOut.splice(0,project.tsOut.length);
    project.zodOut.splice(0,project.zodOut.length);
    project.convoOut.splice(0,project.convoOut.length);

    if(project.refreshRequested){
        project.refreshRequested=false;
        project.project=new Project({tsConfigFilePath:project.path})
    }

    try{
        for(const file of project.project.getSourceFiles()){
            const path=file.getFilePath();
            if(path.startsWith(project.fullPath) && path!==project.outFullPath && !path.startsWith(project.outFullPath)){
                await scanFileAsync(file,project);
            }
        }

        const tsPath=joinPaths(project.out,'convo-binding-interfaces.ts');
        const zodPath=joinPaths(project.out,'convo-schemes.ts');
        const convoPath=joinPaths(project.out,'convo-types.convo');
        const convoTsPath=joinPaths(project.out,'convo-types.convo.ts');

        const convoSource='> define\n\n'+project.convoOut.join('');
        const convoHash=strHashBase64(convoSource);
        if(convoHash!==project.convoHash){
            project.convoHash=convoHash;
            await Promise.all([
                writeFile(tsPath,project.tsOut.join('')),
                writeFile(zodPath,`import { z } from "zod";\n\n${project.zodOut.join('')}`),
                writeFile(convoTsPath,`export const convoTypes=/*convo*/\`\n${convoSource.replace(tickReg,'\\`')}\`;\n`),
                writeFile(convoPath,convoSource),
            ]);
        }
    }catch(ex){
        if(!catchErrors){
            throw ex;
        }
    }finally{
        project.isScanning=false;
        if(project.scanRequested){
            project.scanRequested=false;
            scanProjectAsync(project,catchErrors);
        }
    }


}

const tickReg=/`/g;


const parseTags=(tags:JSDocTagInfo[]|undefined|null):Record<string,string>=>{
    const map:Record<string,string>={};
    if(!tags){
        return map;
    }
    let count=0;
    for(const tag of tags){
        count++;
        map[tag.getName()]=tag.getText().map(t=>t.text).join('\n');
    }
    return map;
}

const scanFileAsync=async (file:SourceFile,project:ProjectCtx)=>{
    const exportMap=file.getExportedDeclarations();
    Array.from(exportMap.values()).forEach((c)=>{c.forEach((c)=>{
        const tags=parseTags(c.getSymbol()?.getJsDocTags());
        if('convoComponent' in tags){
            const fn=file.getFunction(c.getSymbol()?.getName()??'');
            if(fn){
                const propsType=fn.getParameters()[0]?.getType();
                if(propsType){
                    convertType(propsType,fn,project);
                }
                const name=fn.getName()??'';
                const comp:ConvoComponentDef={
                    name,
                    propType:propsType?.getSymbol()?.getName(),
                }
                project.convoOut.push(`defineComp(${JSON.stringify(comp)})`)
            }
        }
        if('convoStruct' in tags){
            const type=c.getType();
            convertType(type,file,project);
        }
    })});
}


const convertType=(type:Type,locationNode:Node,project:ProjectCtx)=>{
    const sym=type.getSymbol();
    const description=getDescription(sym);
    writeTsConvoDescription(description,project,'');
    const typeName=sym?.getName();
    project.tsOut.push(`export interface ${typeName}ConvoBinding{\n`);
    project.zodOut.push(`export const ${typeName}ConvoBindingScheme=z.object({\n`);
    project.convoOut.push(`${typeName}=struct(\n`);

    triggerNodeBreakpoint({disable:true})
    _convertType(type,locationNode,project,true,0,0,false);

    project.tsOut.push('}\n\n');
    project.zodOut.push(`})${description?`.describe(${JSON.stringify(description)})`:''};\n\n`);
    project.convoOut.push(')\n\n');
}

const _convertType=(
    type:Type,
    locationNode:Node,
    project:ProjectCtx,
    isRoot:boolean,
    depth:number,
    indentLevel:number,
    allowOptional:boolean
):{optional:boolean,description?:string}=>{

    const {
        type:unwrappedType,
        optional,
        isAny,
        unionValues,
    }=unwrapType(type);

    type=unwrappedType;

    const tab='    '.repeat(indentLevel);

    let convoType:string|undefined;
    let tsType:string|undefined;
    let zType:string|undefined;

    if(isAny || (optional && !allowOptional)){
        convoType='any';
    }else if(type.isArray()){

        project.tsOut.push('(');
        project.convoOut.push('array(');

        const elemType=type.getArrayElementTypeOrThrow();
        _convertType(elemType,locationNode,project,false,depth+1,indentLevel,false);


        project.tsOut.push(')[]');
        project.convoOut.push(')');
        project.zodOut.push('.array()');

        return {optional};
    }else if(unionValues){
        convoType=`enum(${unionValues.map(v=>JSON.stringify(v)).join(' ')})`;
        tsType=unionValues.map(v=>JSON.stringify(v)).join('|');
        zType=unionValues.length===1?
            `z.literal(${JSON.stringify(unionValues[0])})`:
            `z.union([${unionValues.map(v=>`z.literal(${JSON.stringify(v)})`).join(',')}])`;
    }else if(type.isClass()){
        convoType='any';
    }else if(type.isString()){
        convoType='string';
    }else if(type.isNumber() || type.isBigInt()){
        convoType='number';
    }else if(type.isBoolean()){
        convoType='boolean';
    }else if(type.isNull()){
        convoType='null';
    }else if(type.isUndefined()){
        convoType='undefined';
    }else{

        if(!isRoot){
            project.tsOut.push(`{\n`);
            project.zodOut.push(`z.object({\n`);
            project.convoOut.push(`struct(\n`);
        }
        const props=type.getProperties();
        for(const propSym of props){
            let propType=propSym.getTypeAtLocation(locationNode);

            let description=getDescription(propSym);

            const name=propSym.getName();

            project.zodOut.push(`${tab}    ${name}:`);
            let tsI=project.tsOut.length;
            let convoI=project.convoOut.length;

            const {optional:propOpt,description:propDesc}=_convertType(propType,locationNode,project,false,depth+1,indentLevel+1,true);

            if(!description && propDesc){
                description=propDesc;
            }
            if(description){
                writeTsConvoDescription(description,project,tab+'    ',tsI,convoI);
                tsI++;
                convoI++;
            }

            project.tsOut.splice(tsI,0,`${tab}    ${name}${propOpt?'?':''}:`);
            project.convoOut.splice(convoI,0,`${tab}    ${name}${propOpt?'?':''}:`);

            project.tsOut.push(`;\n`);
            project.zodOut.push(`${propOpt?'.optional()':''}${description?`.describe(${JSON.stringify(description)})`:''},\n`);
            project.convoOut.push(`\n`);
        }

        if(!isRoot){
            project.tsOut.push(`${tab}}`);
            project.zodOut.push(`${tab}})`);
            project.convoOut.push(`${tab})`);
        }
        return {optional,description:getDescription(type.getSymbol())}
    }

    if(tsType===undefined){
        tsType=convoType;
    }
    if(zType===undefined){
        zType='z.'+convoType+'()';
    }

    project.tsOut.push(tsType);
    project.convoOut.push(convoType);
    project.zodOut.push(zType);


    return {optional};
}


const convoJsDocReg=/(^|\n)\s*@convo[^\r\n]*/g;
const newlineReg=/\n/g;
const commentReplace=/(^|\n|\r)\s*\/?\*+\/?[ \t]*/g;

const toJsDoc=(value:string,tab:string)=>{
    return `${tab}/**\n${tab} * ${value.replace(newlineReg,`\n${tab} * `)}\n${tab} */\n`;
}

const unwrapType=(type:Type):{type:Type,optional:boolean,unionValues?:any[],isAny?:boolean}=>{
    if(!type.isUnion()){
        return {type,optional:false};
    }
    type.getNonNullableType
    const unionTypes=type.getUnionTypes();
    let optional=false;
    let unwrappedType:Type|undefined;
    const unionValues:any[]=[];
    for(let i=0;i<unionTypes.length;i++){
        const t=unionTypes[i];
        if(!t){
            continue;
        }
        if(t.isUndefined()){
            optional=true;
        }else if(t.isBooleanLiteral()){
            unwrappedType=type.getNonNullableType();
        }else if(t.isLiteral()){
            const v=t.getLiteralValue();
            if((typeof v === 'string') || (typeof v === 'number')){
                unionValues.push(v);
            }
        }else{
            unwrappedType=t;
        }
    }
    return {
        type:unwrappedType??type,
        optional,
        unionValues:unionValues.length==0?undefined:unionValues,
        isAny:unwrappedType && unionValues.length>0?true:false,
    }
}


const getDescription=(sym:Symbol|undefined|null):string|undefined=>{
    if(!sym){
        return undefined;
    }
    let description='';
    sym.getDeclarations().forEach(d=>d.getLeadingCommentRanges().forEach(c=>{
        const txt=c.getText().replace(commentReplace,'\n').trim();
        description+=(description?'\n':'')+txt;
    }));
    description=description.replace(convoJsDocReg,(_,s:string)=>s).trim();
    return description||undefined;
}

const writeTsConvoDescription=(
    description:string|undefined,
    project:ProjectCtx,
    tab:string,
    tsIndex=project.tsOut.length,
    convoIndex=project.convoOut.length
)=>{

    if(!description){
        return;
    }
    project.convoOut.splice(convoIndex,0,convoDescriptionToComment(description,tab)+'\n');

    project.tsOut.splice(tsIndex,0,toJsDoc(description,tab));
}


const queueDelay=1000;
const startDelay=2000;
const queueIvs:Record<string,any>={};
const defaultIgnore:(string|RegExp)[]=['node_modules','__pycache__','venv',/^\..*/];
const watchProjectAsync=async (project:ProjectCtx)=>{

    console.log(`Watching ${project.fullPath} for changes`);
    const start=Date.now();

    const ac=new AbortController();
    const watcher=watch(project.fullPath,{signal:ac.signal,recursive:true});
    project.cancel.subscribe(()=>{
        ac.abort();
    })

    try{
        const queueProjectScan=()=>{
            clearTimeout(queueIvs[project.fullPath]);
            queueIvs[project.fullPath]=setTimeout(()=>{
                if(project.cancel.isCanceled){
                    return;
                }

                scanProjectAsync(project,true);

            },queueDelay);
        }
        for await (const evt of watcher){
            if(Date.now()-start<startDelay){
                continue;
            }

            const fullPath=joinPaths(project.fullPath,evt.filename);
            if(fullPath.startsWith(project.outFullPath)){
                continue;
            }
            let file=project.project.getSourceFile(fullPath);
            const exists=await pathExistsAsync(fullPath);
            const refresh=(exists && !file) || evt.eventType==='rename';
            if(!file && !refresh){
                continue;
            }
            clearTimeout(queueIvs[project.fullPath]);
            clearTimeout(queueIvs[fullPath]);
            queueIvs[fullPath]=setTimeout(()=>{
                if(project.cancel.isCanceled){
                    return;
                }
                if(refresh){
                    project.refreshRequested=true;
                    queueProjectScan();
                }else{
                    project.project.getSourceFile(fullPath)?.refreshFromFileSystem().then(()=>{
                        queueProjectScan();
                    })
                }
            },queueDelay);
            //
        }
    }catch(ex){
        if(!project.cancel.isCanceled){
            console.error(`watchProjectAsync error`,project.outFullPath,ex);
        }
    }
}
