import { getDirectoryName, getFileNameNoExt, getTimestampString, joinPaths, normalizePath, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { Conversation } from "../Conversation.js";
import { convoRoles, convoTags, escapeConvo, parseBaseConvoImport } from "../convo-lib.js";
import { parseConvoCode } from "../convo-parser.js";
import { ConvoMessage, convoMessageSourcePathKey } from "../convo-types.js";
import { ConvoWorkerCtx } from "./ConvoWorkerCtx.js";

export interface ConvoWorkerOptions
{
    ctx:ConvoWorkerCtx;
    path:string;
}

export class ConvoWorker
{
    public readonly ctx:ConvoWorkerCtx;

    public readonly name:string;

    /**
     * Path to the agents convo file
     */
    public readonly path:string;

    public readonly dir:string;

    public readonly memoryPath:string;

    private readonly _error:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get errorSubject():ReadonlySubject<string|null>{return this._error}
    public get error(){return this._error.value}


    public constructor({
        ctx,
        path,
    }:ConvoWorkerOptions){
        this.name=getFileNameNoExt(path);
        if(!path.startsWith('/')){
            path=normalizePath(joinPaths(ctx.basePath,path));
        }
        this.ctx=ctx;
        this.path=path;
        this.dir=path.includes('.')?getDirectoryName(path):'.';
        this.memoryPath=`${path}.md`
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
    }

    public log(...args:any[]){
        this.ctx.log(`[${this.path}]`,...args);
    }

    public logError(...args:any[]){
        const msg=args.join(' ');
        this._error.next(msg);
        this.ctx.log(`[${this.path}]`,...args);
    }


    public runAsync()
    {
        return this.runPromise??(this.runPromise=this._runAsync());
    }

    private runPromise?:Promise<void>;
    private async _runAsync()
    {
        const loaded=await this.loadAsync();
        if(!loaded || this.isDisposed){
            console.log('hio 👋 👋 👋 WORKER',this);
            return;
        }

        const parsed=this.parse();
        if(!parsed || this.isDisposed){
            console.log('hio 👋 👋 👋 WORKER',this);
            return;
        }

        const ioChecked=await this.checkIoAsync();
        if(!ioChecked || !this.ioReady || this.isDisposed){
            console.log('hio 👋 👋 👋 WORKER',this);
            return;
        }

        const memoryLoaded=await this.loadMemoryAsync();
        if(!memoryLoaded || this.isDisposed){
            console.log('hio 👋 👋 👋 WORKER',this);
            return;
        }

        const threadCompleted=await this.runThreadAsync();
        if(!threadCompleted || this.isDisposed){
            console.log('hio 👋 👋 👋 WORKER',this);
            return;
        }



            console.log('hio 👋 👋 👋 WORKER',this);
    }


    private readonly _loaded:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get loadedSubject():ReadonlySubject<boolean>{return this._loaded}
    public get loaded(){return this._loaded.value}

    private readonly _source:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get sourceSubject():ReadonlySubject<string|null>{return this._source}
    public get source(){return this._source.value}

    private async loadAsync():Promise<boolean>
    {
        try{
            const source=await this.ctx.readAsync(this.path);
            this._source.next(source);
            this._loaded.next(true);
            return true;
        }catch(ex){
            this.logError(`Failed to load - ${this.path}`,ex);
            return false;
        }
    }


    private readonly _parsed:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get parsedSubject():ReadonlySubject<boolean>{return this._parsed}
    public get parsed(){return this._parsed.value}

    private readonly _messages:BehaviorSubject<ConvoMessage[]|null>=new BehaviorSubject<ConvoMessage[]|null>(null);
    public get messagesSubject():ReadonlySubject<ConvoMessage[]|null>{return this._messages}
    public get messages(){return this._messages.value}

    private readonly _inputs:BehaviorSubject<string[]|null>=new BehaviorSubject<string[]|null>(null);
    public get inputsSubject():ReadonlySubject<string[]|null>{return this._inputs}
    public get inputs(){return this._inputs.value}

    private readonly _outputs:BehaviorSubject<string[]|null>=new BehaviorSubject<string[]|null>(null);
    public get outputsSubject():ReadonlySubject<string[]|null>{return this._outputs}
    public get outputs(){return this._outputs.value}

    private readonly _autoManageMemory:BehaviorSubject<boolean|null>=new BehaviorSubject<boolean|null>(null);
    public get autoManageMemorySubject():ReadonlySubject<boolean|null>{return this._autoManageMemory}
    public get autoManageMemory(){return this._autoManageMemory.value}

    private readonly _runReady:BehaviorSubject<boolean|null>=new BehaviorSubject<boolean|null>(null);
    public get runReadySubject():ReadonlySubject<boolean|null>{return this._runReady}
    public get runReady(){return this._runReady.value}

    private parse():boolean
    {
        try{
            if(this.source===null){
                throw new Error('Source not loaded');
            }
            const r=parseConvoCode(this.source);
            if(r.error){
                throw r.error;
            }
            const messages=r.result??[];

            const inputs:string[]=[];
            const outputs:string[]=[];
            let runReady=false;
            let autoManageMemory=false;

            for(const msg of messages){
                msg[convoMessageSourcePathKey]=this.path;
                if(msg.role===convoRoles.run){
                    runReady=true;
                }
                if(!msg.tags){
                    continue;
                }
                for(const tag of msg.tags){
                    if(tag.name===convoTags.autoMemory){
                        autoManageMemory=true;
                    }
                    if(tag.name===convoTags.import || tag.name===convoTags.output){
                        const {name}=parseBaseConvoImport(tag.value??'');
                        if(name.startsWith('./') || name.startsWith('../')){
                            (tag.name===convoTags.import?inputs:outputs).push(normalizePath(joinPaths(this.dir,name)));
                        }
                    }
                }
            }


            this._messages.next(messages);
            this._inputs.next(inputs);
            this._outputs.next(outputs);
            this._runReady.next(runReady);
            this._autoManageMemory.next(autoManageMemory);
            this._parsed.next(true);
            return true;
        }catch(ex){
            this.logError('Parse failed',ex);
            return false;
        }
    }


    private readonly _ioChecked:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get ioCheckedSubject():ReadonlySubject<boolean>{return this._ioChecked}
    public get ioChecked(){return this._ioChecked.value}

    private readonly _existingInputs:BehaviorSubject<string[]|null>=new BehaviorSubject<string[]|null>(null);
    public get existingInputsSubject():ReadonlySubject<string[]|null>{return this._existingInputs}
    public get existingInputs(){return this._existingInputs.value}

    private readonly _existingOutputs:BehaviorSubject<string[]|null>=new BehaviorSubject<string[]|null>(null);
    public get existingOutputsSubject():ReadonlySubject<string[]|null>{return this._existingOutputs}
    public get existingOutputs(){return this._existingOutputs.value}

    private readonly _ioReady:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get ioReadySubject():ReadonlySubject<boolean>{return this._ioReady}
    public get ioReady(){return this._ioReady.value}

    private async checkIoAsync():Promise<boolean>{
        try{

            if(!this.inputs){
                throw new Error('Inputs not set');
            }

            if(!this.outputs){
                throw new Error('Outputs not set');
            }

            const existingInputs:string[]=[];
            const existingOutputs:string[]=[];

            await Promise.all([
                ...this.inputs.map(async p=>{
                    const item=await this.ctx.vfs.getItemAsync(p);
                    if(item){
                        existingInputs.push(p);
                    }
                }),
                ...this.outputs.map(async p=>{
                    const item=await this.ctx.vfs.getItemAsync(p);
                    if(item){
                        existingOutputs.push(p);
                    }
                }),
            ])


            this._ioReady.next(
                this.inputs.length===existingInputs.length &&
                this.outputs.length>existingOutputs.length
            );
            this._existingInputs.next(existingInputs);
            this._existingOutputs.next(existingOutputs);
            this._ioChecked.next(true);
            return true;
        }catch(ex){
            this.logError('IO check failed',ex);
            return false;
        }
    }


    private readonly _memoryLoaded:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get memoryLoadedSubject():ReadonlySubject<boolean>{return this._memoryLoaded}
    public get memoryLoaded(){return this._memoryLoaded.value}

    private readonly _memory:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get memorySubject():ReadonlySubject<string|null>{return this._memory}
    public get memory(){return this._memory.value}

    public async loadMemoryAsync():Promise<boolean>
    {
         try{
            let memory='';
            if(await this.ctx.existsAsync(this.memoryPath)){
                memory=await this.ctx.readAsync(this.memoryPath);
            }

            this._memory.next(memory);
            this._memoryLoaded.next(true);
            return true;
        }catch(ex){
            this.logError('Load memory failed',ex);
            return false;
        }
    }


    private readonly _threadCompleted:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get threadCompletedSubject():ReadonlySubject<boolean>{return this._threadCompleted}
    public get threadCompleted(){return this._threadCompleted.value}

    private readonly _threadName:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get threadNameSubject():ReadonlySubject<string|null>{return this._threadName}
    public get threadName(){return this._threadName.value}

    private readonly _threadPath:BehaviorSubject<string|null>=new BehaviorSubject<string|null>(null);
    public get threadPathSubject():ReadonlySubject<string|null>{return this._threadPath}
    public get threadPath(){return this._threadPath.value}

    private readonly _thread:BehaviorSubject<Conversation|null>=new BehaviorSubject<Conversation|null>(null);
    public get threadSubject():ReadonlySubject<Conversation|null>{return this._thread}
    public get thread(){return this._thread.value}

    private async runThreadAsync():Promise<boolean>{
        try{

            const messages=this.messages;
            if(!messages){
                throw new Error('messages not set');
            }
            if(!this.source){
                throw new Error('Source not set');
            }

            const threadName=getTimestampString();
            const threadPath=`${this.path}.thread.${threadName}.convo`;
            const conversation=this.ctx.createConversationFor(this);
            this._threadName.next(threadName);
            this._threadPath.next(threadPath);
            this._thread.next(conversation);

            let sourceI=0;

            const flushThreadLogAsync=async ()=>{
                if(this.ctx.disableThreadLogging){
                    return;
                }
                const source=conversation.convo;
                if(sourceI===source.length){
                    return;
                }
                await this.ctx.appendAsync(threadPath,source.substring(sourceI));
                sourceI=source.length;
            }

            messageLoop: for(const msg of messages){
                conversation.appendMessageObject(msg,{appendCode:true});

                if(msg.role===convoRoles.user){

                    if(msg.tags){
                        for(const tag of msg.tags){
                            if( tag.name===convoTags.output &&
                                tag.value &&
                                await this.ctx.vfs.getItemAsync(joinPaths(this.dir,tag.value))
                            ){
                                const content=await this.ctx.readAsync(joinPaths(this.dir,tag.value));
                                if(this.isDisposed){
                                    return false;
                                }
                                conversation.append(`> ${convoRoles.assistant}\n${escapeConvo(content)}`);
                                continue messageLoop;
                            }
                        }
                    }

                    await flushThreadLogAsync();
                    const response=await conversation.completeAsync();
                    await flushThreadLogAsync();
                    if(this.isDisposed){
                        return false;
                    }
                    if(msg.tags){
                        for(const tag of msg.tags){
                            if(tag.name===convoTags.output && tag.value){
                                await this.ctx.writeResponse(joinPaths(this.dir,tag.value),response);
                                if(this.isDisposed){
                                    return false;
                                }
                            }

                            if(tag.name===convoTags.saveMemory){
                                await this.ctx.writeResponse(this.memoryPath,response);
                                if(this.isDisposed){
                                    return false;
                                }
                            }

                        }
                    }
                }
            }

            await flushThreadLogAsync();


            this._threadCompleted.next(true);
            return true;
        }catch(ex){
            this.logError('thread failed',ex);
            return false;
        }
    }
}
