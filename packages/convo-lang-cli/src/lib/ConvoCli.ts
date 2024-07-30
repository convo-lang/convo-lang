import { aiCompleteConvoModule } from '@iyio/ai-complete';
import { openAiApiKeyParam, openAiAudioModelParam, openAiBaseUrlParam, openAiChatModelParam, openAiImageModelParam, openAiModule, openAiSecretsParam, openAiVisionModelParam } from '@iyio/ai-complete-openai';
import { EnvParams, createJsonRefReplacer, deleteUndefined, initRootScope, rootScope } from "@iyio/common";
import { Conversation, ConvoScope, convoCapabilitiesParams, convoVars, createConversationFromScope, parseConvoCode } from "@iyio/convo-lang";
import { nodeCommonModule, pathExistsAsync, readFileAsJsonAsync, readFileAsStringAsync, readStdInAsStringAsync, readStdInLineAsync, startReadingStdIn } from "@iyio/node-common";
import { writeFile } from "fs/promises";
import { parse as parseJson5 } from 'json5';
import { homedir } from 'node:os';
import { ConvoCliConfig, ConvoCliOptions, ConvoExecAllowMode, ConvoExecConfirmCallback } from "./convo-cli-types";
import { createConvoExec } from './convo-exec';

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

    let configPath=options.config??'~/.config/convo/convo.json';

    if(configPath.startsWith('~')){
        configPath=homedir()+configPath.substring(1);
    }

    const configExists=await pathExistsAsync(configPath);
    if(!configExists && options.config!==undefined){
        throw new Error(`Convo config file not found a path - ${configPath}`)
    }
    return await readFileAsJsonAsync(configPath);
}

let initPromise:Promise<ConvoCliOptions>|null=null;
export const initConvoCliAsync=(options:ConvoCliOptions):Promise<ConvoCliOptions>=>
{
    return initPromise??(initPromise=_initAsync(options));
}

const _initAsync=async (options:ConvoCliOptions):Promise<ConvoCliOptions>=>
{

    const config=await getConvoCliConfigAsync(options);

    initRootScope(reg=>{

        if(config.env && !config.overrideEnv){
            reg.addParams(config.env);
        }

        if(!options.config && !options.inlineConfig){
            reg.addParams(new EnvParams());
        }

        if(config.env && config.overrideEnv){
            reg.addParams(config.env);
        }

        reg.addParams(deleteUndefined({
            [openAiApiKeyParam.typeName]:config.apiKey,
            [openAiBaseUrlParam.typeName]:config.apiBaseUrl,
            [openAiChatModelParam.typeName]:config.chatModel,
            [openAiAudioModelParam.typeName]:config.audioModel,
            [openAiImageModelParam.typeName]:config.imageModel,
            [openAiVisionModelParam.typeName]:config.visionModel,
            [openAiSecretsParam.typeName]:config.secrets,
            [convoCapabilitiesParams.typeName]:config.capabilities,
        }) as Record<string,string>);

        reg.use(nodeCommonModule);
        reg.use(openAiModule);
        reg.use(aiCompleteConvoModule);
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
        if(options.cmdMode){
            this.convo.dynamicFunctionCallback=this.dynamicFunctionCallback;
            startReadingStdIn();
        }
        if(options.prepend){
            this.convo.append(options.prepend);
        }
        if(this.options.exeCwd){
            this.convo.unregisteredVars[convoVars.__cwd]=this.options.exeCwd;
        }
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
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



    public async executeAsync():Promise<void>
    {
        const config=await initConvoCliAsync(this.options);
        if(!this.allowExec){
            this.allowExec=config.allowExec??'ask';
        }

        if(this.options.inline){
            if(this.options.parse){
                await this.parseCodeAsync(this.options.inline);
            }else{
                await this.executeSourceCode(this.options.inline);
            }
            this.writeOutputAsync();
        }else if(this.options.source || this.options.stdin){
            const source=this.options.stdin?
                await readStdInAsStringAsync():
                await readFileAsStringAsync(this.options.source??'');
            if(this.options.parse){
                await this.parseCodeAsync(source);
            }else{
                await this.executeSourceCode(source);
            }
            this.writeOutputAsync();
        }
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

    private async executeSourceCode(code:string):Promise<void>{

        this.convo.defineFunction({
            name:'exec',
            registerOnly:true,
            scopeCallback:createConvoExec(typeof this.allowExec==='function'?
                this.allowExec:this.execConfirmAsync
            )
        })
        this.convo.append(code);
        const r=await this.convo.completeAsync();
        if(r.error){
            throw r.error;
        }
        await this.outAsync(this.convo.convo);
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
