import { ConvoModule, convoDescriptionToComment, convoJsDocTags, escapeConvo, escapeConvoTagValue } from "@convo-lang/convo-lang";
import { CancelToken, getDirectoryName, getObjKeyCount, joinPaths, normalizePath, strHashBase64 } from "@iyio/common";
import { pathExistsAsync, readDirAsync, readFileAsStringAsync } from "@iyio/node-common";
import { mkdir, realpath, watch, writeFile } from "fs/promises";
import { relative } from "path";
import { ExportGetableNode, JSDocTagInfo, Node, Project, SourceFile, Symbol, SyntaxKind, Type, VariableDeclaration } from "ts-morph";
import { ConvoCliOptions } from "./convo-cli-types.js";

const ignoreTypes=['ConvoComponentRendererContext'];
const arrayTypeMap:Record<string,string>={
    Int8Array:'number',
    Uint8Array:'number',
    Uint8ClampedArray:'number',
    Int16Array:'number',
    Uint16Array:'number',
    Int32Array:'number',
    Uint32Array:'number',
    Float32Array:'number',
    Float64Array:'number',
    BigInt64Array:'number',
    BigUint64Array:'number',
}

interface Comp
{
    description:string;
    name:string;
    propsType:string;
    propsScheme?:string;
    instructions:string;
    importStatement:string;
    keepSource:boolean;
}

interface FnArg
{
    name:string;
    type:string;
    description?:string;
    optional?:boolean;
    zodType:string;
}
interface Fn
{
    name:string;
    description?:string;
    args:FnArg[];
    importStatement:string;
    /**
     * If true the function is not exposed to the LLM
     */
    local:boolean;

}

interface Mod extends Omit<ConvoModule,'externScopeFunctions'|'type'|'typeSchemes'|'functionParamSchemes'|'externFunctions'|'components'>
{
    typeSchemes?:Record<string,string>;
    functionParamSchemes?:Record<string,string>;
    externFunctions?:Record<string,Fn>;
    components?:Record<string,Comp>;
    tsImports:string[];
    hashSrc:string;
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
    typeSchemes:Record<string,string>;
    fns:Fn[];
    mods:Mod[];
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
        fns:[],
        mods:[],
        cancel,
        isScanning:false,
        scanRequested:false,
        convoHash:'',
        refreshRequested:false,
        reloadPaths:[],
        typeSchemes:{},
        log:(...msgs:any[])=>console.log(...msgs),
    })));

    await Promise.all(projects.map(p=>scanProjectAsync(p,syncWatch??false)));

    if(syncWatch){
        await Promise.all(projects.map(p=>watchProjectAsync(p)))
    }
}

const modSortKey=(mod:Mod)=>`${mod.uri??''}::${mod.name}`;

const isProjectEmpty=(project:ProjectCtx)=>{
    return (
        project.tsOut.length===0 &&
        project.zodOut.length===0 &&
        project.convoOut.length===0 &&
        project.comps.length===0 &&
        project.fns.length===0
    )
}
const clearProject=(project:ProjectCtx)=>{
    project.tsOut.splice(0,project.tsOut.length);
    project.zodOut.splice(0,project.zodOut.length);
    project.convoOut.splice(0,project.convoOut.length);
    project.comps.splice(0,project.comps.length);
    project.fns.splice(0,project.fns.length);
    project.typeSchemes={};
}

const scanProjectAsync=async (project:ProjectCtx,catchErrors:boolean)=>{
    if(project.isScanning){
        project.scanRequested=true;
        return;
    }

    project.isScanning=true;

    const reloads=project.reloadPaths;
    project.reloadPaths=[];

    // project.tsOut.splice(0,project.tsOut.length);
    // project.zodOut.splice(0,project.zodOut.length);
    // project.convoOut.splice(0,project.convoOut.length);
    // project.comps.splice(0,project.comps.length);
    // project.fns.splice(0,project.fns.length);
    // project.mods.splice(0,project.mods.length);
    project.mods.splice(0,project.mods.length);
    clearProject(project);

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

        const convoFiles=await readDirAsync({
            path:project.fullPath,
            recursive:true,
            include:'file',
            filter:/\.convo$/
        });
        await Promise.all(convoFiles.map(file=>scanConvoFileAsync(file,project)));

        project.mods.sort((a,b)=>modSortKey(a).localeCompare(modSortKey(b)))
        const convoHash=strHashBase64(project.mods.map(m=>m.hashSrc).join('>'));


        if(!await pathExistsAsync(project.out)){
            await mkdir(project.out,{recursive:true});
        }
        if(convoHash!==project.convoHash){
            project.convoHash=convoHash;
            const prefix='@/';
            const info=(
                `export const convoPackagePaths=${JSON.stringify(project.mods.map(m=>prefix+m.name),null,4)} as const;${
                '\n'}export type ConvoPackagePath=(typeof convoPackagePaths[number])|(string & {});`
            )
            const infoPath=joinPaths(project.out,'convoPackage.ts');
            const tsPath=joinPaths(project.out,'convoPackageModules.ts');
            const tsxPath=joinPaths(project.out,'convoPackageComponentModules.tsx');
            await Promise.all([
                writeFile(infoPath,info),
                writeFile(tsPath,modsToString(project.mods.filter(m=>!m.components),'convoPackageModules','@/')),
                writeFile(tsxPath,modsToString(project.mods.filter(m=>m.components),'convoPackageComponentModules','@/')),
            ]);
            project.log(`convo> sync complete - ${project.path}`);
        }


        // const tsPath=joinPaths(project.out,'convo-binding-interfaces.ts');
        // const zodPath=joinPaths(project.out,'convo-schemes.ts');
        // const convoPath=joinPaths(project.out,'types.convo');
        // const convoTsPath=joinPaths(project.out,'convo.ts');
        // const convoTsCompPath=joinPaths(project.out,'convo-comp-reg.tsx');

        // project.comps.sort((a,b)=>a.name.localeCompare(b.name));
        // const convoSource='> define\n\n'+project.convoOut.join('');

        // const convoTsSource=`export const convoTypes=/*convo*/\`\n${
        //     convoSource.replace(tickReg,'\\`')
        // }\`;\n`;

        // const convoTsCompSource=`${
        //     project.comps.length?'import { ConvoComponentRendererContext, ConvoComponent } from "@convo-lang/convo-lang";\n':'// no components found'
        // }${
        //     project.comps.map(c=>c.importStatement).join('\n')
        // }\n\n// Components are generated using the convo-lang CLI which looks for components marked with the @${convoJsDocTags.convoComponent} JSDoc tag\n\nexport const convoCompReg={\n${
        //     project.comps.map(c=>(
        //         `    ${c.name}:{\n${
        //         '        '}render:(comp:ConvoComponent,ctx:ConvoComponentRendererContext)=><${c.name} {...({comp,ctx,ctrl:ctx.ctrl,convo:ctx.ctrl.convo,...comp.atts} as any)} />,\n${
        //         '        '}convo:/*convo*/\`\n@transformComponent ${c.name} ${c.propsType
        //         }\n@transformDescription ${
        //             escapeConvoTagValue(c.description)
        //         }\n@transformOptional\n${
        //             c.keepSource?'@transformKeepSource\n':''
        //         }> system\n${
        //             escapeConvo(c.instructions)
        //         }\n\`\n${
        //         '    }'},`
        //     )).join('\n')
        // }\n} as const\n`;

        // const convoHash=strHashBase64(convoSource+convoTsCompSource);

        // if(!await pathExistsAsync(project.out)){
        //     await mkdir(project.out,{recursive:true});
        // }
        // if(convoHash!==project.convoHash){
        //     project.convoHash=convoHash;
        //     await Promise.all([
        //         writeFile(tsPath,project.tsOut.join('')),
        //         writeFile(zodPath,`import { z } from "zod";\n\n${project.zodOut.join('')}`),
        //         writeFile(convoTsPath,convoTsSource),
        //         writeFile(convoTsCompPath,convoTsCompSource),
        //         writeFile(convoPath,convoSource),
        //     ]);
        //     project.log(`convo> sync complete - ${project.path}`);
        // }
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

const modsToString=(mods:Mod[],exportName:string,namePrefix:string):string=>{
    const out:string[]=[];
    let importZod=false;
    for(const mod of mods){
        for(const i of mod.tsImports){
            const s=i+'\n';
            if(!out.includes(s)){
                out.push(s);
            }
        }
    }
    const convoLangImports:Record<string,boolean>={ConvoModule:true}
    const importI=out.length;

    out.push(`\nexport const ${exportName}:ConvoModule[]=[\n`);
    for(const mod of mods){
        out.push(`    {\n`);
        out.push(`        name:${JSON.stringify(namePrefix+mod.name)},\n`);
        if(mod.components){
            convoLangImports['ConvoComponent']=true;
            convoLangImports['ConvoComponentRendererContext']=true;
            out.push('        components:{\n');
            for(const name in mod.components){
                const c=mod.components[name];
                if(!c){
                    continue;
                }
                out.push(`            ${name}:{\n`);
                out.push(`                name:${JSON.stringify(name)},\n`);
                if(c.propsScheme){
                    importZod=true;
                    out.push(`                propsScheme:z.object({\n`);
                    out.push(`                    ${c.propsScheme.trim().replace(/\n\s*/g,'\n                    ')}\n`);
                    out.push(`                }),\n`);
                }
                out.push(`                renderer:(comp:ConvoComponent,ctx:ConvoComponentRendererContext)=><${c.name} {...({comp,ctx,ctrl:ctx.ctrl,convo:ctx.ctrl.convo,...comp.atts} as any)} />,\n`);
                out.push(`            },\n`);
            }
            out.push('        },\n');
        }
        if(mod.externFunctions){
            out.push('        externFunctions:{\n');
            for(const name in mod.externFunctions){
                const fn=mod.externFunctions[name];
                if(!fn){
                    continue;
                }
                out.push(`            ${name},\n`);
            }
            out.push('        },\n');
            out.push('        functionParamSchemes:{\n');
            for(const name in mod.externFunctions){
                const fn=mod.externFunctions[name];
                if(!fn){
                    continue;
                }
                out.push(`            ${name}:[\n`);
                for(const a of fn.args){
                    importZod=true;
                    out.push(`                ${a.zodType},\n`);
                }
                out.push(`            ],\n`);
            }
            out.push('        },\n');
        }
        if(mod.typeSchemes){
            out.push('        typeSchemes:{\n');
            for(const name in mod.typeSchemes){
                const typeS=mod.typeSchemes[name];
                if(!typeS){
                    continue;
                }
                importZod=true;
                out.push(`            ${name}:z.object({\n${typeS}\n            }),\n`);
            }
            out.push('        },\n');
        }
        if(mod.convo){
            out.push(`        convo:/*convo*/\`\n\n\n${mod.convo.replace(tickReg,'\\`')}\n        \`,\n`);
        }
        out.push(`    },\n\n\n`);
    }
    out.push('];');

    if(importZod){
        out.splice(importI,0,'import { z } from "zod";\n')
    }

    const convoImportNames=Object.keys(convoLangImports);
    convoImportNames.sort();

    out.unshift(`import { ${convoImportNames.join(', ')} } from "@convo-lang/convo-lang";\n`)

    return out.join('');
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

const scanConvoFileAsync=async (fullPath:string,project:ProjectCtx)=>{

    clearProject(project);

    const content=await readFileAsStringAsync(fullPath);

    let relPath=relative(project.fullPath,fullPath);

    const mod:Mod={
        name:relPath,
        convo:content,
        hashSrc:strHashBase64(content??''),
        tsImports:[],
    }

    project.mods.push(mod);

}

const scanFileAsync=async (file:SourceFile,project:ProjectCtx)=>{

    clearProject(project);

    const exportMap=file.getExportedDeclarations();
    Array.from(exportMap.values()).forEach((c)=>{c.forEach((c)=>{
        const tags=parseTags(c.getSymbol()?.getJsDocTags());
        if(convoJsDocTags.convoComponent in tags){
            const fn=file.getFunction(c.getSymbol()?.getName()??'');
            if(fn){
                const propsType=fn.getParameters()[0]?.getType();
                let propScheme:string|undefined;
                if(propsType){
                    propScheme=convertType(propsType,fn,project,false,true);
                }
                const name=fn.getName()??'';
                const desc=getDescription(fn.getSymbol())??'';
                project.comps.push({
                    name,
                    propsType:getSymbol(propsType)?.getName()??'',
                    description:desc,
                    instructions:(
                        tags[convoJsDocTags.convoComponent]||
                        `Generates props for a component based on the following description:\n<description>${desc}</description>`
                    ),
                    propsScheme:propScheme,
                    importStatement:getImportStatement(name,fn,file,project),
                    keepSource:convoJsDocTags.convoKeepSource in tags
                })
            }
        }
        if(convoJsDocTags.convoType in tags){
            const type=c.getType();
            const typeScheme=convertType(type,file,project,false,true);
            const name=type.getSymbol()?.getName();
            if(name && typeScheme){
                project.typeSchemes[name]=typeScheme;
            }

        }
        if(convoJsDocTags.convoFn in tags){
            convertFunction(c.getType(),file,project,tags);
        }
    })});

    if(isProjectEmpty(project)){
        return;
    }

    const relPath=relative(project.fullPath,file.getFilePath());

    const mod:Mod={
        name:relPath,
        convo:'',
        hashSrc:relPath,
        tsImports:[],
    }
    if(getObjKeyCount(project.typeSchemes)){
        mod.typeSchemes={...project.typeSchemes};
    }
    if(project.convoOut){
        mod.convo='> define\n\n'+project.convoOut.join('');
    }
    if(project.comps.length){
        mod.components={};
        for(const c of project.comps){
            mod.components[c.name]=c;
            if(!mod.tsImports.includes(c.importStatement)){
                mod.tsImports.push(c.importStatement);
            }
        }
        mod.convo+='\n\n'+project.comps.map(c=>(
            `@transformComponent ${c.name} ${c.propsType
            }\n@transformDescription ${
                escapeConvoTagValue(c.description)
            }\n${
                c.keepSource?'@transformKeepSource\n':''
            }> system\n${
                escapeConvo(c.instructions)
            }`
        )).join('\n')
    }
    if(project.fns.length){
        mod.externFunctions={}
        for(const fn of project.fns){
            mod.externFunctions[fn.name]=fn;
            if(!mod.tsImports.includes(fn.importStatement)){
                mod.tsImports.push(fn.importStatement);
            }
        }
        mod.convo+='\n\n'+project.fns.map(c=>c.local?null:`${
                c.description?convoDescriptionToComment(c.description)+'\n':''
            }${
                `> extern ${c.name}(${c.args.length?c.args.map(arg=>`\n${
                    arg.description?convoDescriptionToComment(arg.description,'    '):''
                }\n    ${arg.name}${arg.optional?'?':''}:${arg.type}`
            ).join('')+'\n)':')'}`
        }`).filter(f=>f).join('\n\n')
    }
    project.mods.push(mod);
    mod.tsImports.sort();
    const fnKeys=Object.keys(mod.externFunctions??{});
    fnKeys.sort();
    const compKeys=Object.keys(mod.components??{});
    compKeys.sort();
    mod.hashSrc=strHashBase64(`${mod.hashSrc}\n${mod.convo}\ncomps\n${compKeys.join('\n')}\fns\n${fnKeys.join('\n')}\nimports\n${mod.tsImports.join('\n')}`)
}

const getImportStatement=(name:string,fn:ExportGetableNode,file:SourceFile,project:ProjectCtx):string=>{
    let relPath:string=file.getFilePath();
    relPath=relative(project.outFullPath,relPath);
    const i=relPath.lastIndexOf('.');
    if(i!==-1){
        relPath=relPath.substring(0,i);
    }
    return `import ${fn.isDefaultExport()?'':'{ '}${name}${fn.isDefaultExport()?'':' }'} from '${relPath}';`;
}

const getSymbol=(type:Type|undefined|null):Symbol|undefined=>{
    const n=type?.getSymbol();
    if(n && n.getName()!=='__type'){
        return n;
    }
    return type?.getAliasSymbol();
}

const convertFunction=(type:Type,file:SourceFile,project:ProjectCtx,tags:Record<string,string>)=>{
    const callSig=type.getCallSignatures()?.[0];
    if(!callSig){
        return;
    }
    let sym=getSymbol(type);
    if(!sym){
        return;
    }
    let name=sym.getName();
    let importStatement:string|undefined;
    if(name==='__function'){
        const dec=sym?.getDeclarations()?.[0];
        if(!dec){
            return;
        }
        const parent=dec.getParent() as VariableDeclaration;
        if(!parent || parent.getKind()!==SyntaxKind.VariableDeclaration){
            return;
        }
        name=parent.getName();
        importStatement=getImportStatement(name,parent,file,project);
        sym=parent.getSymbol();
    }
    if(!name || !sym){
        return;
    }
    const fnDec=file.getFunction(name);
    if(fnDec && !importStatement){
        importStatement=getImportStatement(name,fnDec,file,project);
    }
    if(!importStatement){
        return;
    }
    const params=callSig.getParameters();
    const description=getDescription(sym,params.map(p=>p.getName()));
    const fn:Fn={
        name,
        description,
        args:[],
        importStatement,
        local:convoJsDocTags.convoLocal in tags,
    }
    for(const param of params){
        const pTags=parseTags(param.getJsDocTags());
        if(convoJsDocTags.convoIgnore in pTags){
            continue;
        }
        const paramDec=param.getDeclarations()?.[0];
        const declaredType=paramDec?.getType();
        if(!declaredType || !paramDec){
            continue;
        }
        const pType=unwrapType(declaredType,false);
        const {convo,zod}=convertTypeToStrings(pType.type,file,project,true);
        const pName=param.getName();
        const pDescription=getDescription(paramDec.getSymbol());
        const pTag=tags[pName];
        const optional=param.isOptional()||pType.optional;
        fn.args.push({
            name:pName,
            description:pDescription||pTag,
            type:convo,
            optional,
            zodType:zod+(optional?'.optional()':''),
        })
    }
    project.fns.push(fn);
}

const convertTypeToStrings=(type:Type,locationNode:Node,project:ProjectCtx,noWrap?:boolean)=>{

    const tsI=project.tsOut.length;
    const convoI=project.convoOut.length;
    const zodI=project.zodOut.length;

    _convertType(type,locationNode,project,true,0,0,false)

    const ts=project.tsOut.splice(tsI,project.tsOut.length-tsI).join();
    const convo=project.convoOut.splice(convoI,project.convoOut.length-convoI).join();
    const zod=project.zodOut.splice(zodI,project.zodOut.length-zodI).join();

    return {ts,convo,zod}
}
const convertType=(type:Type,locationNode:Node,project:ProjectCtx,noWrap?:boolean,getZodType?:boolean)=>{
    const sym=getSymbol(type);
    const description=getDescription(sym);
    writeTsConvoDescription(description,project,'');
    const typeName=sym?.getName();
    const tsI=project.tsOut.length;
    const convoI=project.convoOut.length;
    const zodI=project.zodOut.length;

    const {noWrap:_noWrap}=_convertType(type,locationNode,project,true,0,0,false);
    if(_noWrap){
        noWrap=true;
    }

    const zod=getZodType?project.zodOut.slice(zodI,project.zodOut.length-zodI).join(''):'';


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

    return zod||undefined;
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
    let noWrap=true;

    if(isAny || (optional && !allowOptional)){
        convoType='any';
    }else if(typeName==='Record'){
        project.tsOut.push(`Record<string,any>`);
        project.convoOut.push(`object`);
        project.zodOut.push(`z.record(z.string(),z.any())`);
        return {optional};

    }else if(typeName && arrayTypeMap[typeName]){
        const t=arrayTypeMap[typeName]??'any';
        project.tsOut.push(`${t}[]`);
        project.convoOut.push(`array(${t})`);
        project.zodOut.push(`z.${t}().array()`);
        return {optional};
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
    }else if(type.isLiteral()){
        const v=type.getLiteralValue();
        convoType=`enum(${JSON.stringify(v)})`;
        tsType=JSON.stringify(v);
        zType=`z.literal(${JSON.stringify(v)})`;
    }else{
        noWrap=false;
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


const newlineReg=/\n/g;

const toJsDoc=(value:string,tab:string)=>{
    return `${tab}/**\n${tab} * ${value.replace(newlineReg,`\n${tab} * `)}\n${tab} */\n`;
}

const unwrapType=(type:Type,forceAny:boolean):{type:Type,optional:boolean,unionValues?:any[],isAny?:boolean}=>{
    if(!type.isUnion()){
        return {type,isAny:type.isAny() || forceAny,optional:false};
    }
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

const jsDocTagReg=/^\s*@(\w+)(.*)/
const commentReplace=/(^|\n|\r)\s*\/?\*+\/?[ \t]*/g;
const descriptionLines:string[]=[];

const getDescription=(sym:Symbol|undefined|null,ignoreTags?:string[]):string|undefined=>{
    if(!sym){
        return undefined;
    }
    descriptionLines.splice(0,descriptionLines.length);
    const decs=sym.getDeclarations();
    for(const d of decs){
        let comments=d.getLeadingCommentRanges();
        if(!comments.length && d.getKind()===SyntaxKind.VariableDeclaration){
            const statement=d.getParent()?.getParent();
            if(statement?.getKind()===SyntaxKind.VariableStatement){
                comments=statement.getLeadingCommentRanges();
            }
        }

        if(comments.length){
            for(const c of comments){
                const txt=c.getText().replace(commentReplace,'\n').trim();
                if(txt.includes('\n')){
                    const split=txt.split('\n');
                    for(const s of split){
                        descriptionLines.push(s);
                    }
                }else{
                    descriptionLines.push(txt);
                }
            }
        }
    };
    let ignoreLine=false;
    for(let i=0;i<descriptionLines.length;i++){
        const match=jsDocTagReg.exec(descriptionLines[i] as string);
        const tagName=match?.[1];
        const isConvoTag=tagName?.startsWith('convo')
        const shouldIgnore=tagName && (isConvoTag || ignoreTags?.includes(tagName));
        if(ignoreLine){
            if(!tagName || shouldIgnore){
                descriptionLines.splice(i,1);
                i--;
            }else if(tagName){
                ignoreLine=false;
            }
        }else{
            if(shouldIgnore){
                ignoreLine=true;
                descriptionLines.splice(i,1);
                i--;
            }
        }
        if(isConvoTag && !ignoreLine && match){
            descriptionLines[i]=match[2]??''
        }
    }
    return descriptionLines.join('\n').trim()||undefined;
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
const extReg=/\.(ts|tsx|convo)$/i
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
