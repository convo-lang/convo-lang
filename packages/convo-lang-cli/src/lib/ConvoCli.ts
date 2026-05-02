import { AppendConvoOptions, Conversation, ConvoNodeGraphCtrl, ConvoScope, ConvoWorker, ConvoWorkerCtx, convoVars, createConversationFromScope, escapeConvo, loadConvoProjectConfigFromVfsAsync, parseConvoCode } from '@convo-lang/convo-lang';
import { ConvoBrowserCtrl } from "@convo-lang/convo-lang-browser";
import { ConvoMakeCtrl, getConvoMakeOptionsFromVars } from "@convo-lang/convo-lang-make";
import { CancelToken, DisposeContainer, createJsonRefReplacer, dupDeleteUndefined, getErrorMessage, initRootScope, normalizePath, parseConfigBool, rootScope, setValueByPath } from "@iyio/common";
import { parseJson5 } from '@iyio/json5';
import { pathExistsAsync, readFileAsJsonAsync, readFileAsStringAsync, readStdInAsStringAsync, readStdInLineAsync, startReadingStdIn } from "@iyio/node-common";
import { VfsCtrl, vfsMntTypes } from '@iyio/vfs';
import { VfsDiskMntCtrl } from "@iyio/vfs-node";
import { realpath, writeFile } from "fs/promises";
import { homedir } from 'node:os';
import Path from 'node:path';
import { z } from 'zod';
import { defaultConvoCliConfigFile } from './convo-cli-lib.js';
import { convoCliModule } from './convo-cli-module.js';
import { ConvoCliConfig, ConvoCliOptions, ConvoExecAllowMode, ConvoExecConfirmCallback } from "./convo-cli-types.js";
import { createConvoExec } from './convo-exec.js';

let configPromise:Promise<ConvoCliConfig>|null=null;
export const getConvoCliConfigAsync=(options:ConvoCliOptions):Promise<ConvoCliConfig>=>
{
    return configPromise??(configPromise=_getConfigAsync(options));
}

const _getConfigAsync=async (options:ConvoCliOptions):Promise<ConvoCliConfig>=>
{
    if(options.inlineConfig){
        const inlineConfig:ConvoCliConfig=parseJson5(options.inlineConfig);
        if(inlineConfig.overrideEnv===undefined){
            inlineConfig.overrideEnv=true;
        }
        return inlineConfig;
    }

    let configPath=(typeof options.config === 'string'?options.config:null)??defaultConvoCliConfigFile;

    if(configPath.startsWith('~')){
        configPath=homedir()+configPath.substring(1);
    }

    const configExists=await pathExistsAsync(configPath);
    let c:ConvoCliConfig=configExists?await readFileAsJsonAsync(configPath):{};

    if(options.config && (typeof options.config === 'object')){
        c={
            ...c,
            ...dupDeleteUndefined(options.config),
            env:{
                ...c.env,
                ...dupDeleteUndefined(options.config.env)
            }
        }
    }

    if(options.varsPath){
        const defaultVars=c.defaultVars??(c.defaultVars={});
        for(const path of options.varsPath){
            const value=(await readFileAsStringAsync(path)).trim();
            if(value.startsWith('{')){
                const obj=parseJson5(value);
                if(obj && (typeof obj === 'object')){
                    for(const e in obj){
                        defaultVars[e]=obj[e];
                    }
                }
            }else{
                const lines=value.split('\n');
                for(const l of lines){
                    const line=l.trim();
                    if(!line || line.startsWith('#')){
                        continue;
                    }
                    parseCliValue(line,defaultVars);
                }
            }
        }
    }

    if(options.vars){
        const defaultVars=c.defaultVars??(c.defaultVars={});
        for(const v of options.vars){
            const obj=parseJson5(v);
            if(obj && (typeof obj === 'object')){
                for(const e in obj){
                    defaultVars[e]=obj[e];
                }
            }
        }
    }

    if(options.var){
        const defaultVars=c.defaultVars??(c.defaultVars={});
        for(const v of options.var){
            parseCliValue(v,defaultVars);
        }
    }

    if(options.uVars){
        const unregisteredVars=c.unregisteredVars??(c.unregisteredVars={});
        for(const v of options.uVars){
            const obj=parseJson5(v);
            if(obj && (typeof obj === 'object')){
                for(const e in obj){
                    unregisteredVars[e]=obj[e];
                }
            }
        }
    }

    return c;
}

const parseCliValue=(value:string,assignTo:Record<string,any>)=>{
    const i=value.indexOf('=');
    if(i==-1){
        setValueByPath(assignTo,value,true);
        return;
    }
    const [name='',type='string']=value.substring(0,i).split(':');
    let v:any=value.substring(i+1);

    switch(type){

        case 'number':
            setValueByPath(assignTo,name,Number(v)||0);
            break;

        case 'bigint':
            setValueByPath(assignTo,name,BigInt(v)||0);
            break;

        case 'boolean':
            setValueByPath(assignTo,name,parseConfigBool(v));
            break;

        case 'object':
            setValueByPath(assignTo,name,parseJson5(v));
            break;

        default:
            setValueByPath(assignTo,name,v);
            break;
    }


}

let initPromise:Promise<ConvoCliConfig>|null=null;
export const initConvoCliAsync=(options:ConvoCliOptions):Promise<ConvoCliConfig>=>
{
    return initPromise??(initPromise=_initAsync(options));
}

const _initAsync=async (options:ConvoCliOptions):Promise<ConvoCliConfig>=>
{

    const config=await getConvoCliConfigAsync(options);
    const vfsCtrl=new VfsCtrl({
        config:{
            mountPoints:[
                {
                    type:vfsMntTypes.file,
                    mountPath:'/',
                    sourceUrl:'/',
                }
            ],
        },
        mntProviderConfig:{
            ctrls:[new VfsDiskMntCtrl()]
        },
    });
    const projectConfig=await loadConvoProjectConfigFromVfsAsync({
        vfs:vfsCtrl,
        basePath:options.exeCwd??globalThis.process.cwd()
    });

    initRootScope(reg=>{
        convoCliModule(reg,vfsCtrl,config,options,projectConfig);
    })
    await rootScope.getInitPromise();
    return config;
}

/**
 * Initializes the ConvoCli environment the returns a new ConvoCli object
 */
export const createConvoCliAsync=async (options:ConvoCliOptions):Promise<ConvoCli>=>{
    await initConvoCliAsync(options);
    return new ConvoCli(options);
}

const appendOut=(prefix:string|null,value:any,out:string[])=>{
    if(typeof value !== 'string'){
        value=JSON.stringify(value,createJsonRefReplacer(),4);
    }
    if(!prefix){
        out.push(value+'\n');
    }else{
        const ary=value.split('\n');
        for(let i=0;i<ary.length;i++){
            out.push(prefix+ary[i]+'\n');

        }
    }
}

export class ConvoCli
{

    public readonly options:ConvoCliOptions;

    public readonly buffer:string[]=[];

    public readonly convo:Conversation;

    public allowExec?:ConvoExecAllowMode|ConvoExecConfirmCallback;

    public constructor(options:ConvoCliOptions){
        this.allowExec=options.allowExec;
        this.options=options;
        this.convo=createConversationFromScope(rootScope);
        if(options.config)
        if(options.cmdMode){
            this.convo.dynamicFunctionCallback=this.dynamicFunctionCallback;
            startReadingStdIn();
        }
        if(options.prepend){
            this.convo.append(options.prepend);
        }
        if(this.options.exeCwd){
            globalThis.process.chdir(this.options.exeCwd);
            this.convo.unregisteredVars[convoVars.__cwd]=normalizePath(globalThis.process.cwd());
        }
        if(this.options.source){
            this.convo.unregisteredVars[convoVars.__mainFile]=this.options.source;
        }
    }

    private readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
        this.convo.dispose();
    }

    private readonly dynamicFunctionCallback=(scope:ConvoScope)=>{
        return new Promise<any>((r,j)=>{
            readStdInLineAsync().then(v=>{
                if(v.startsWith('ERROR:')){
                    j(v.substring(6).trim())
                    return;
                }
                if(v.startsWith('RESULT:')){
                    v=v.substring(7)
                }
                v=v.trim();
                try{
                    r(JSON.parse(v))
                }catch(ex){
                    j(ex as any);
                }
            })

            const fn=scope.s.fn??'function';
            globalThis.process?.stdout.write(`CALL:${JSON.stringify({fn,args:scope.paramValues??[]})}\n`);

        });
    }

    public async runReplAsync(cancel?:CancelToken)
    {
        if(!this.allowExec){
            this.allowExec='ask';
        }

        this.registerExec(true);

        this.convo.append(/*convo*/`
> do
__cwd=_getCwd()

@edge
> system
The current working directory is: "{{__cwd}}"

The current date and time is: "{{dateTime()}}"

        `)

        startReadingStdIn();

        let len=this.convo.convo.length;

        console.log("Entering Convo-Lang REPL");

        while(!this._isDisposed && !cancel?.isCanceled){
            console.log('> user');
            const line=await readStdInLineAsync();
            if(this._isDisposed || cancel?.isCanceled){
                return;
            }
            if(!line.trim()){
                continue;
            }
            await this.convo.completeAsync('> user\n'+escapeConvo(line));
            if(this._isDisposed || cancel?.isCanceled){
                return;
            }
            const c=this.convo.convo;
            const append=c.substring(len);
            len=c.length;
            console.log(append);
        }
    }

    private async outAsync(...chunks:string[]){

        const {prefixOutput,cmdMode}=this.options;

        if(prefixOutput){
            const str=chunks.join('');
            chunks=[];
            appendOut(':',str,chunks);
        }

        if(this.options.printFlat || this.options.printState){
            await this.convo.flattenAsync();
        }

        if(this.options.printFlat){
            const messages=this.convo.flat?.messages??[];
            for(const m of messages){
                if(m.fn?.body){
                    delete m.fn.body;
                }
            }
            if(cmdMode){
                chunks.push('FLAT:\n');
            }
            appendOut(prefixOutput?'f:':null,messages,chunks);
        }

        if(this.options.printState){
            const vars=this.convo.flat?.exe.getUserSharedVars()??{}
            if(cmdMode){
                chunks.push('STATE:\n');
            }
            appendOut(prefixOutput?'s:':null,vars,chunks);
        }

        if(this.options.printMessages){
            const messages=this.convo.messages;
            if(cmdMode){
                chunks.push('MESSAGES:\n');
            }
            appendOut(prefixOutput?'m:':null,messages,chunks);
        }

        if(cmdMode){
            chunks.push('END:\n');
        }

        if(this.options.out || this.options.bufferOutput){
            if(typeof this.options.out==='function'){
                this.options.out(...chunks);
            }else{
                this.buffer.push(...chunks);
            }
        }else{
            if(globalThis?.process?.stdout){
                for(let i=0;i<chunks.length;i++){
                    globalThis.process.stdout.write(chunks[i]??'');
                }
            }else{
                console.log(chunks.join(''));
            }
        }
    }



    public async executeAsync(cancel?:CancelToken):Promise<void>
    {
        const config=await initConvoCliAsync(this.options);
        if(config.defaultVars){
            for(const e in config.defaultVars){
                this.convo.defaultVars[e]=config.defaultVars[e];
            }
        }
        if(config.unregisteredVars){
            for(const e in config.unregisteredVars){
                this.convo.unregisteredVars[e]=config.unregisteredVars[e];
            }
            const pr=this.convo.unregisteredVars['__projectRoot'];
            const cwd=this.convo.unregisteredVars['__cwd'];
            if(pr && cwd){
                const relative=Path.relative(cwd,pr);
                if(relative){
                    this.convo.unregisteredVars['__projectRoot']=relative;
                }
            }
        }
        if(!this.allowExec){
            this.allowExec=config.allowExec??'ask';
        }

        let source:string|undefined;

        if(this.options.inline){
            source=this.options.inline;
        }else if(this.options.source || this.options.stdin){
            source=this.options.stdin?
                await readStdInAsStringAsync():
                await readFileAsStringAsync(this.options.source??'');
        }


        if(this.options.worker){
            await this.runWorkers();
        }else if(source!==undefined){
            let writeOut=true;
            if(this.options.make || this.options.makeTargets){
                writeOut=false;
                await this.makeAsync(source);
            }else if(this.options.graph){
                await this.executeGraph(source);
            }else if(this.options.convert){
                await this.convertCodeAsync(source);
            }else if(this.options.parse){
                await this.parseCodeAsync(source);
            }else{
                await this.executeSourceCode(source);
            }
            if(writeOut){
                this.writeOutputAsync();
            }
        }

        if(this.options.repl){
            await this.runReplAsync(cancel);
        }
    }

    private async runWorkers()
    {
        const ctx=new ConvoWorkerCtx({
            basePath:this.options.workerBasePath??process.cwd(),
            dryRun:this.options.dryRun,
            disableThreadLogging:this.options.disableThreadLogging,
        });
        this.disposables.add(ctx);

        await Promise.all((this.options.worker??[])?.map(async path=>{
            const worker=new ConvoWorker({ctx,path});
            this.disposables.add(worker);
            await worker.runAsync();
            return worker;
        }));
    }

    private readonly execConfirmAsync=async (command:string):Promise<boolean>=>{
        if(this.allowExec==='allow'){
            return true;
        }else if(this.allowExec==='ask'){
            process.stdout.write(`Exec command requested\n> ${command}\nAllow y/N?\n`);
            const line=(await readStdInLineAsync()).toLowerCase();
            return line==='yes' || line==='y';
        }else{
            return false;
        }
    }

    private registerExec(fullEnv:boolean)
    {
        this.convo.defineFunction({
            name:'exec',
            registerOnly:!fullEnv,
            description:'Executes a shell command on the users computer',
            paramsType:z.object({cmd:z.string().describe('The shell command to execute')}),
            scopeCallback:createConvoExec(typeof this.allowExec==='function'?
                this.allowExec:this.execConfirmAsync
            )
        })
        if(fullEnv){
            this.convo.defineFunction({
                name:'changeDirectory',
                description:'Changes the current working directory',
                paramsType:z.object({dir:z.string().describe('The directory to change to')}),
                callback:async ({dir}:{dir:string})=>{
                    try{
                        globalThis.process?.chdir(dir);
                        return `Working directory change to ${globalThis.process.cwd()}`;
                    }catch(ex){
                        return `Unable to move to specified directory: ${getErrorMessage(ex)}`;
                    }
                }
            })
            this.convo.defineFunction({
                name:'_getCwd',
                local:true,
                callback:async (dir:string)=>{
                    return globalThis.process.cwd();

                }
            })
        }
    }

    private async appendCodeAsync(code:string,options?:AppendConvoOptions){
        let filePath=options?.filePath??this.options.sourcePath??this.options.source;
        if(filePath){
            filePath=await realpath(filePath);
        }
        this.convo.append(code,{...options,filePath})

    }
    private async executeSourceCode(code:string):Promise<void>{

        this.registerExec(false);
        await this.appendCodeAsync(code);
        const r=await this.convo.completeAsync();
        if(r.error){
            throw r.error;
        }
        await this.outAsync(this.convo.convo);
    }
    private async executeGraph(code:string):Promise<void>{

        this.registerExec(false);
        await this.appendCodeAsync(code);
        const ctrl=new ConvoNodeGraphCtrl({
            convo:this.convo,
        });
        let writeIndex=0;
        const removeListener=ctrl.addStepCompletionListener(async ()=>{
            if(!this.options.disableWriteGraphOnCompletion){
                const src=this.convo.convo;
                const i=writeIndex;
                writeIndex=src.length;
                await this.outAsync(this.convo.convo.substring(i));
            }
        });
        try{
            await ctrl.runAsync();
        }finally{
            removeListener();
        }
        await this.outAsync(this.convo.convo.substring(writeIndex));
    }

    private async makeAsync(code:string){
        if(!this.options.exeCwd || !this.options.source){
            return;
        }

        await this.appendCodeAsync(code);
        const flat=await this.convo.flattenAsync();
        const options=getConvoMakeOptionsFromVars(
            this.options.source,
            this.options.exeCwd,
            flat.exe.sharedVars
        );
        if(!options){
            return;
        }
        const ctrl=new ConvoMakeCtrl({
            browserInf:new ConvoBrowserCtrl(),
            ...options,
        });
        try{
            if(this.options.makeTargets){
                const debugOutput=await ctrl.getDebugOutputAsync();
                await this.outAsync(JSON.stringify(debugOutput,null,4));
            }else{
                await ctrl.buildAsync();
            }
        }finally{
            ctrl.dispose();
        }
    }

    private async convertCodeAsync(code:string){
        await this.appendCodeAsync(code);
        const r=await this.convo.toModelInputStringAsync();
        await this.outAsync(r);
    }

    private async parseCodeAsync(code:string){
        const r=parseConvoCode(code);
        if(r.error){
            throw r.error;
        }
        await this.outAsync(JSON.stringify(r.result,null,this.options.parseFormat));
    }

    private async writeOutputAsync()
    {
        let out=this.options.out;
        if(out==='.'){
            out=this.options.source;
        }
        if(typeof out !== 'string'){
            return;
        }
        await writeFile(out,this.buffer.join(''));
    }
}
