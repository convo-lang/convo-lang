import { convoDescriptionToComment, escapeConvo, escapeConvoTagValue } from "@convo-lang/convo-lang";
import { CancelToken, getDirectoryName, joinPaths, normalizePath, strHashBase64 } from "@iyio/common";
import { pathExistsAsync } from "@iyio/node-common";
import { mkdir, realpath, watch, writeFile } from "fs/promises";
import { relative } from "path";
import { FunctionDeclaration, JSDocTagInfo, Node, Project, SourceFile, Symbol, Type } from "ts-morph";
import { ConvoCliOptions } from "./convo-cli-types";

const ignoreTypes=['ConvoComponentRendererContext']

interface Comp
{
    description:string;
    name:string;
    propsType:string;
    instructions:string;
    importStatement:string;
}

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
    comps:Comp[];
    log:(...msgs:any[])=>void;
    reloadPaths:string[];
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
    const projects=await Promise.all(syncTsConfig.map(p=>normalizePath(p)).map<Promise<ProjectCtx>>(async p=>({
        path:p,
        fullPath:await realpath(getDirectoryName(p),{encoding:'utf-8'}),
        project:new Project({
            tsConfigFilePath:p,
        }),
        out:normalizePath(syncOut),
        outFullPath,
        options,
        zodOut:[],
        tsOut:[],
        convoOut:[],
        comps:[],
        cancel,
        isScanning:false,
        scanRequested:false,
        convoHash:'',
        refreshRequested:false,
        reloadPaths:[],
        log:(...msgs:any[])=>console.log(...msgs),
    })));

    await Promise.all(projects.map(p=>scanProjectAsync(p,syncWatch??false)));

    if(syncWatch){
        await Promise.all(projects.map(p=>watchProjectAsync(p)))
    }
}

const scanProjectAsync=async (project:ProjectCtx,catchErrors:boolean)=>{
    if(project.isScanning){
        project.scanRequested=true;
        return;
    }

    project.isScanning=true;

    const reloads=project.reloadPaths;
    project.reloadPaths=[];

    project.tsOut.splice(0,project.tsOut.length);
    project.zodOut.splice(0,project.zodOut.length);
    project.convoOut.splice(0,project.convoOut.length);
    project.comps.splice(0,project.comps.length);

    if(project.refreshRequested){
        project.refreshRequested=false;
        project.project=new Project({tsConfigFilePath:project.path})
    }else if(reloads.length){
        for(const p of reloads){
            await project.project.getSourceFile(p)?.refreshFromFileSystem();
        }
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
        const convoPath=joinPaths(project.out,'types.convo');
        const convoCompPath=joinPaths(project.out,'comps.convo');
        const convoTsPath=joinPaths(project.out,'convo.ts');
        const convoTsCompPath=joinPaths(project.out,'convo-comp-reg.tsx');

        project.comps.sort((a,b)=>a.name.localeCompare(b.name));
        const convoCompSource=project.comps.map(c=>`@transformComponent ${c.name} ${c.name} ${c.propsType
        }\n@convoDescription ${
            escapeConvoTagValue(c.description)
        }\n> system\n${
            escapeConvo(c.instructions)
        }`).join('\n\n');
        const convoSource='> define\n\n'+project.convoOut.join('');

        const convoTsSource=`export const convoTypes=/*convo*/\`\n${
            convoSource.replace(tickReg,'\\`')
        }\`;\n\nexport const convoComps=/*convo*/\`\n${
            convoCompSource.replace(tickReg,'\\`')
        }\`;\n`;

        const convoTsCompSource=`${
            project.comps.length?'import { ConvoComponentRendererContext, ConvoMessageComponent } from "@convo-lang/convo-lang";\n':'// no components found'
        }${
            project.comps.map(c=>c.importStatement).join('\n')
        }\n\n// Components are generated using the convo-lang CLI which looks for components marked with the @convoComponent JSDoc tag\n\nexport const convoCompReg={\n${
            project.comps.map(c=>`    ${c.name}:(comp:ConvoMessageComponent,ctx:ConvoComponentRendererContext)=><${c.name} {...({comp,ctx,ctrl:ctx.ctrl,convo:ctx.ctrl.convo,...comp.atts} as any)} />,`).join('\n')
        }\n} as const\n`;

        const convoHash=strHashBase64(convoSource+convoCompSource);

        if(!await pathExistsAsync(project.out)){
            await mkdir(project.out,{recursive:true});
        }
        if(convoHash!==project.convoHash){
            project.convoHash=convoHash;
            await Promise.all([
                writeFile(tsPath,project.tsOut.join('')),
                writeFile(zodPath,`import { z } from "zod";\n\n${project.zodOut.join('')}`),
                writeFile(convoTsPath,convoTsSource),
                writeFile(convoTsCompPath,convoTsCompSource),
                writeFile(convoPath,convoSource),
                writeFile(convoCompPath,convoCompSource||'> define\n// No components found'),
            ]);
            project.log(`convo> sync complete - ${project.path}`);
        }
    }catch(ex){
        project.log(`convo> sync failed - ${project.path}`,ex);
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
                const desc=getDescription(fn.getSymbol())??'';
                project.comps.push({
                    name,
                    propsType:getSymbol(propsType)?.getName()??'',
                    description:desc,
                    instructions:(
                        tags['convoComponent']||
                        `Generates props for a component based on the following description:\n<description>${desc}</description>`
                    ),
                    importStatement:getImportStatement(name,fn,file,project),
                })
            }
        }
        if('convoType' in tags){
            const type=c.getType();
            convertType(type,file,project);
        }
    })});
}

const getImportStatement=(name:string,fn:FunctionDeclaration,file:SourceFile,project:ProjectCtx):string=>{
    let relPath:string=file.getFilePath();
    relPath=relative(project.outFullPath,relPath);
    const i=relPath.lastIndexOf('.');
    if(i!==-1){
        relPath=relPath.substring(0,i);
    }
    return `import ${fn.isDefaultExport()?'':'{ '}${name}${fn.isDefaultExport()?'':' }'} from '${relPath}';`;
}

const getSymbol=(type:Type|undefined|null):Symbol|undefined=>{
    return type?.getSymbol()??type?.getAliasSymbol();
}

const convertType=(type:Type,locationNode:Node,project:ProjectCtx)=>{type.getAliasSymbol()
    const sym=getSymbol(type);
    const description=getDescription(sym);
    writeTsConvoDescription(description,project,'');
    const typeName=sym?.getName();
    const tsI=project.tsOut.length;
    const convoI=project.convoOut.length;
    const zodI=project.zodOut.length;

    const {noWrap}=_convertType(type,locationNode,project,true,0,0,false);

    if(noWrap){
        project.tsOut.splice(tsI,0,`export type ${typeName}ConvoBinding=`);
        project.zodOut.splice(zodI,0,`export const ${typeName}ConvoBindingScheme=`);
        project.convoOut.splice(convoI,0,`${typeName}=`);
    }else{
        project.tsOut.splice(tsI,0,`export interface ${typeName}ConvoBinding{\n`);
        project.zodOut.splice(zodI,0,`export const ${typeName}ConvoBindingScheme=z.object({\n`);
        project.convoOut.splice(convoI,0,`${typeName}=struct(\n`);
    }

    project.tsOut.push(`${noWrap?';':'}'}\n\n`);
    project.zodOut.push(`${noWrap?'':'})'}${description?`.describe(${JSON.stringify(description)})`:''};\n\n`);
    project.convoOut.push(`${noWrap?'':')'}\n\n`);
}
let maxDepth=10;

const _convertType=(
    type:Type,
    locationNode:Node,
    project:ProjectCtx,
    isRoot:boolean,
    depth:number,
    indentLevel:number,
    allowOptional:boolean
):{optional:boolean,ignored?:boolean,description?:string,noWrap?:boolean}=>{


    const {
        type:unwrappedType,
        optional,
        isAny,
        unionValues,
    }=unwrapType(type,depth>maxDepth);

    type=unwrappedType;
    const typeName=getSymbol(type)?.getName();
    if(typeName && ignoreTypes.includes(typeName)){
        return {optional:false,ignored:true}
    }

    const tab='    '.repeat(indentLevel);

    let convoType:string|undefined;
    let tsType:string|undefined;
    let zType:string|undefined;
    let noWrap=false;

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
        noWrap=true;
        convoType=`enum(${unionValues.map(v=>JSON.stringify(v)).join(' ')})`;
        tsType=unionValues.map(v=>JSON.stringify(v)).join('|');
        zType=unionValues.length===1?
            `z.literal(${JSON.stringify(unionValues[0])})`:
            `z.union([${unionValues.map(v=>`z.literal(${JSON.stringify(v)})`).join(',')}])`;
    }else if(type.isClass()){
        return {optional:false,ignored:true}
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

             const tags=parseTags(propSym.getJsDocTags());
             if('convoIgnore' in tags){
                continue
             }

            const propType=propSym.getTypeAtLocation(locationNode);

            let description=getDescription(propSym);

            const name=propSym.getName();

            project.zodOut.push(`${tab}    ${name}:`);
            let tsI=project.tsOut.length;
            let convoI=project.convoOut.length;

            const {optional:propOpt,description:propDesc,ignored}=_convertType(propType,locationNode,project,false,depth+1,indentLevel+1,true);

            if(ignored){
                project.zodOut.pop();
                continue;
            }

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
        return {optional,description:getDescription(getSymbol(type))}
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


    return {optional,noWrap};
}


const convoJsDocReg=/(^|\n)\s*@convo[^\r\n]*/g;
const newlineReg=/\n/g;
const commentReplace=/(^|\n|\r)\s*\/?\*+\/?[ \t]*/g;

const toJsDoc=(value:string,tab:string)=>{
    return `${tab}/**\n${tab} * ${value.replace(newlineReg,`\n${tab} * `)}\n${tab} */\n`;
}

const unwrapType=(type:Type,forceAny:boolean):{type:Type,optional:boolean,unionValues?:any[],isAny?:boolean}=>{
    if(!type.isUnion()){
        return {type,isAny:type.isAny() || forceAny,optional:false};
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
    const isAny=forceAny || (unwrappedType??type).isAny();
    return {
        type:unwrappedType??type,
        optional,
        unionValues:unionValues.length==0?undefined:unionValues,
        isAny:isAny || (unwrappedType && unionValues.length>0?true:false),
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


const queueDelay=300;
const startDelay=2000;
const queueIvs:Record<string,any>={};
const defaultIgnore:(string|RegExp)[]=['node_modules','__pycache__','venv',/^\./];
const extReg=/\.tsx?$/i
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
        watchLoop: for await (const evt of watcher){
            if(Date.now()-start<startDelay || !extReg.test(evt.filename)){
                continue;
            }

            const parts=evt.filename.split(/[/\\]/);
            for(const n of parts){
                for(const i of defaultIgnore){
                    if((typeof i === 'string')?i===n:i.test(n)){
                        continue watchLoop;
                    }
                }
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
            if(project.cancel.isCanceled){
                return;
            }
            if(refresh){
                project.refreshRequested=true;
            }else{
                if(!project.reloadPaths.includes(fullPath)){
                    project.reloadPaths.push(fullPath);
                }
            }
            queueProjectScan();
        }
    }catch(ex){
        if(!project.cancel.isCanceled){
            console.error(`watchProjectAsync error`,project.outFullPath,ex);
        }
    }
}
