import { Conversation, ConversationOptions, ConvoConversationCache, ConvoDocOutput, ConvoDocPageResult, ConvoDocQuery, ConvoDocQueryResult, ConvoDocReader, ConvoDocReaderFactory, ConvoDocSelectStatement, ConvoLocalStorageCache, convoDocResultFormatVersion, convoScript, escapeConvoMessageContent, getConvoDocReaderAsync, getConvoSelectContentType, isConvoDocSelectMatch, isConvoDocSelectPerPage } from "@convo-lang/convo-lang";
import { CancelToken, InternalOptions, Lock, Progress, ReadonlySubject, deepClone, dupDeleteUndefined, getFileName, getSortedObjectHash, joinPaths, minuteMs, readBlobAsDataUrlAsync } from '@iyio/common';
import { getVfsItemUrl, vfs } from '@iyio/vfs';
import { parse as parseJson5 } from 'json5';
import { BehaviorSubject } from 'rxjs';

const lsKey='enableConvoDocRunnerLogging';
let localStorageCheckedForLogging=false;
const checkLsForLogging=()=>{
    localStorageCheckedForLogging=true;
    if(globalThis.localStorage){
        if(globalThis.localStorage.getItem(lsKey)==='true'){
            enableLogging=true;
        }
    }
}

let enableLogging=false;
export const enableConvoDocRunnerLogging=(enable:boolean)=>{
    enableLogging=enable;
}

if(globalThis.window){
    try{
        (globalThis.window as any).__enableConvoDocRunnerLogging=enableConvoDocRunnerLogging;
    }catch{}
}

const removeFromCacheAfter=(key:string,ttl:number,log=enableLogging)=>{
    if(ttl<=0){
        return;
    }
    setTimeout(()=>{
        const cached=memoryCache[key];
        if(cached && cached.ttl<Date.now()){
            delete memoryCache[key];
            if(log){
                console.log('Remove item from ConvoDocQueryRunner mem cache ',key);
            }
        }
    },ttl+1000);
}

const memoryCache:Record<string,{r:ConvoDocQueryResult,ttl:number}>={};
const cacheInMem=(ttl:number,key:string,result:ConvoDocQueryResult)=>{
    memoryCache[key]={
        r:deepClone(result),
        ttl:Date.now()+ttl
    }
    removeFromCacheAfter(key,ttl);
}

const getFromMemCache=(key:string,ttl:number,log=enableLogging)=>{
    const mem=memoryCache[key];
    if(mem && mem.ttl>Date.now()){
        removeFromCacheAfter(key,ttl);
        if(log){
            console.log(`doc query loaded from memory - ${key}`);
        }
        return deepClone(mem.r);
    }else{
        return undefined;
    }
}

const runLock=new Lock(1);

export interface ConvoDocQueryRunnerOptions
{
    query:ConvoDocQuery;
    llmLock?:number;
    createConversation?:()=>Conversation;
    conversationOptions?:ConversationOptions;
    cacheQueryResults?:boolean;
    cacheConversations?:boolean;
    conversationCache?:ConvoConversationCache;
    memoryCacheTtlMs?:number;
    cacheVisionPass?:boolean;
    cacheTextPass?:boolean;
    cacheDir?:string;
    outDir?:string;
    readerFactory?:ConvoDocReaderFactory|ConvoDocReaderFactory[];
    log?:boolean;
    /**
     * If true the doc query runner will use the global doc runner lock that only allows one
     * doc query to execute at a time. In client applications the can be desired to prevent over
     * consumption of resources.
     */
    useRunLock?:boolean;
}

export class ConvoDocQueryRunner
{
    private readonly options:InternalOptions<ConvoDocQueryRunnerOptions,'conversationCache'|'createConversation'|'outDir'|'readerFactory'|'conversationOptions'>;

    private readonly _result:BehaviorSubject<ConvoDocQueryResult|null>=new BehaviorSubject<ConvoDocQueryResult|null>(null);
    public get resultSubject():ReadonlySubject<ConvoDocQueryResult|null>{return this._result}
    public get result(){return this._result.value}

    private readonly outputs:ConvoDocOutput[]=[];

    private nextOutputId=1;

    private readonly llmLock:Lock;

    private readonly disposeToken:CancelToken=new CancelToken();

    public readonly progress:Progress;

    public constructor({
        query,
        llmLock=5,
        createConversation,
        cacheQueryResults=false,
        cacheVisionPass=cacheQueryResults,
        cacheTextPass=cacheQueryResults,
        cacheConversations=false,
        conversationCache,
        cacheDir='/cache/document-queries',
        outDir,
        readerFactory,
        memoryCacheTtlMs=cacheQueryResults?minuteMs*2:0,
        log=false,
        conversationOptions,
        useRunLock=false,
    }:ConvoDocQueryRunnerOptions)
    {
        if(!localStorageCheckedForLogging && globalThis.localStorage){
            checkLsForLogging()
        }
        this.options={
            query,
            llmLock,
            createConversation,
            cacheQueryResults,
            cacheConversations,
            cacheTextPass,
            conversationCache,
            cacheVisionPass,
            cacheDir,
            outDir,
            readerFactory,
            memoryCacheTtlMs,
            log,
            conversationOptions,
            useRunLock
        }
        const url=getVfsItemUrl(query.src);
        this.progress=new Progress(`Document Query - ${getFileName(url)}`,'Starting');
        this.llmLock=new Lock(llmLock);
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposeToken.cancelNow();
    }



    private createConversation(){
        return this.options.createConversation?.()??new Conversation({
            cache:(
                this.options.conversationCache??
                (this.options.cacheConversations?new ConvoLocalStorageCache():undefined)
            ),
            ...dupDeleteUndefined(this.options.conversationOptions)
        });
    }

    private pageLock=new Lock(1);
    private reader?:ConvoDocReader;
    private readOpenCount=0;
    private async getPageImageAsync(index:number):Promise<Blob|undefined>{
        if(!this.reader?.pageToImageAsync){
            return undefined;
        }
        const release=await this.pageLock.waitOrCancelAsync(this.disposeToken);
        if(!release){
            return undefined;
        }
        this.readOpenCount++;
        try{
            if(!this.reader){
                return undefined;
            }
            return await this.reader.pageToImageAsync?.(index);
        }finally{
            this.readOpenCount--;
            release();
        }
    }
    private async getPageTextAsync(index:number):Promise<string|undefined>{
        if(!this.reader?.pageToTextAsync){
            return undefined;
        }
        const release=await this.pageLock.waitOrCancelAsync(this.disposeToken);
        if(!release){
            return undefined;
        }
        this.readOpenCount++;
        try{
            if(!this.reader){
                return undefined;
            }
            return await this.reader.pageToTextAsync?.(index);
        }finally{
            this.readOpenCount--;
            release();
        }
    }

    private async getCachedPassAsync(pass:number,query:ConvoDocQuery):Promise<{outputs:ConvoDocOutput[]|undefined,key:string}>{
        const queryPass={...query};
        queryPass.select=query.select?.filter(s=>(s.pass??0)<=pass);
        const hashKey=getSortedObjectHash({_:convoDocResultFormatVersion,q:queryPass});
        const cachePath=joinPaths(this.options.cacheDir,hashKey+`-pass-${pass}.json`);
        let outputs:ConvoDocOutput[]|undefined;
        try{
            outputs=await vfs().readObjectAsync(cachePath)??undefined;
            if(outputs && enableLogging){
                console.log(`doc query pass ${pass} loaded from cache - ${cachePath}`);
            }
        }catch(ex){
            console.error(`Failed to load doc query pass ${pass} from cached`,ex);
            return {
                outputs:undefined,
                key:hashKey,
            }
        }
        return {
            outputs,
            key:hashKey,
        }
    }

    private async writeCachedPassAsync(key:string,pass:number):Promise<void>{
        const outputs=this.outputs.filter(o=>o.pass===pass);
        const cachePath=joinPaths(this.options.cacheDir,key+`-pass-${pass}.json`);
        try{
            await vfs().writeObjectAsync(cachePath,outputs);
            if(enableLogging || this.options.log){
                console.info(`doc query pass ${pass} written to cache - ${cachePath}`);
            }
        }catch(ex){
            console.error(`Failed to write doc query pass to cache - ${pass}`,ex);
        }
    }

    private loadCached(outputs:ConvoDocOutput[]){
        for(const o of outputs){
            if(o.id>=this.nextOutputId){
                this.nextOutputId=o.id+1;
            }
            this.outputs.push(o);
        }
    }

    private progressTotal=0;
    private progressStep=0;
    private updateProgress(steps:number,status:string){
        this.progressStep+=steps;
        this.progress.set(this.progressStep/(this.progressTotal||1),status);
    }


    private runPromise:Promise<ConvoDocQueryResult>|undefined;
    public async runQueryAsync():Promise<ConvoDocQueryResult>{
        if(this.runPromise){
            return await this.runPromise;
        }
        if(this.options.useRunLock){
            const release=await runLock.waitOrCancelAsync(this.disposeToken);
            if(!release){
                return {outputs:[],pages:[]}
            }
            try{
                this.runPromise=this._runQueryAsync();
            }finally{
                release();
            }
        }else{
            this.runPromise=this._runQueryAsync();
        }
        return await this.runPromise;
    }


    private async _runQueryAsync():Promise<ConvoDocQueryResult>{

        // for now assume the document is a pdf

        const query=this.options.query;

        const url=getVfsItemUrl(query.src);
        if(!url){
            throw new Error("Unable to get url for src");
        }

        const hashKey=this.options.cacheQueryResults?getSortedObjectHash({_:convoDocResultFormatVersion,url,query}):'';
        const cachePathBase=joinPaths(this.options.cacheDir,hashKey);
        const cachePath=cachePathBase+'.json';
        if(this.options.cacheQueryResults){
            const mem=getFromMemCache(hashKey,this.options.memoryCacheTtlMs)
            if(mem){
                if(enableLogging || this.options.log){
                    console.log(`doc query loaded from memory - ${hashKey}`);
                }
                return mem;
            }
            const cached=memoryCache[hashKey]?.r??await vfs().readObjectAsync(cachePath);
            if(cached){
                if(this.options.memoryCacheTtlMs>0){
                    cacheInMem(this.options.memoryCacheTtlMs,hashKey,cached);
                }
                if(enableLogging || this.options.log){
                    console.log(`doc query loaded from cache - ${cachePath}`);
                }
                return cached;
            }
        }

        const reader=await getConvoDocReaderAsync(query.src,this.options.readerFactory);
        if(!reader){
            throw new Error(`Unable to get doc reader for query source. url - ${url}`);
        }
        this.reader=reader;

        try{
            this.updateProgress(0,'Loading document');
            const pageCount=await reader.getPageCountAsync();

            const pages:ConvoDocPageResult[]=[];
            for(let i=0;i<pageCount;i++){
                const page:ConvoDocPageResult={
                    index:i,
                }
                pages.push(page);
            }
            const useText=(query.textPass && reader.pageToTextAsync)?true:false;
            const useVision=(query.visionPass && reader.pageToImageAsync)?true:false;
            this.progressTotal=(useText?pageCount:0)+(useVision?pageCount:0)+(query.select?.length??0);
            this.progressStep=0;

            if(useText){
                this.updateProgress(0,'Reading text');
                let readCount=0;
                await this.runPassAsync(query,-2,pages,this.options.cacheTextPass,async page=>{
                    const text=await this.getPageTextAsync(page.index);
                    readCount++;
                    this.updateProgress(1,`Page ${readCount} of ${pageCount} read`);
                    if(!text){
                        return;
                    }
                    this.outputs.push({
                        id:this.nextOutputId++,
                        output:text,
                        contentType:'text/plain',
                        type:'content',
                        pass:-2,
                        pageIndexes:[page.index]
                    });
                })
            }


            if(useVision){
                this.updateProgress(0,'Scanning with vision');
                let readCount=0;
                await this.runPassAsync(query,-1,pages,this.options.cacheVisionPass,async page=>{
                    const img=await this.getPageImageAsync(page.index);
                    if(!img){
                        readCount++;
                        this.updateProgress(1,`Page ${readCount} of ${pageCount} skipped`);
                        return;
                    }
                    await this.convertPageImageAsync(page,img);
                    readCount++;
                    this.updateProgress(1,`Page ${readCount} of ${pageCount} scanned`);
                })
            }


            if(query.select){
                let lastPass=0;
                for(const select of query.select){
                    if(select.pass && select.pass>lastPass){
                        lastPass=select.pass;
                    }
                }

                for(let pass=0;pass<=lastPass;pass++){

                    let passCacheKey:string|undefined;
                    if(this.options.cacheQueryResults){
                        const cached=await this.getCachedPassAsync(pass,query);
                        passCacheKey=cached.key;
                        if(cached.outputs){
                            this.loadCached(cached.outputs);
                            continue;
                        }
                    }

                    const passSelects=query.select.filter(s=>(s.pass??0)===pass);
                    if(passSelects.length){
                        await Promise.all(passSelects.map(s=>this.selectAsync(
                            pages.filter(p=>isConvoDocSelectMatch(p.index,s)),
                            s,
                            pass,
                            false
                        )));
                        this.updateProgress(passSelects.length,`Pass ${pass} complete`);
                    }


                    if(passCacheKey){
                        await this.writeCachedPassAsync(passCacheKey,pass);
                    }
                }
            }

            const result:ConvoDocQueryResult={
                pages,
                outputs:this.outputs
            }

            if(this.options.memoryCacheTtlMs>0){
                cacheInMem(this.options.memoryCacheTtlMs,hashKey,result);
            }

            if(this.options.cacheQueryResults){
                try{
                    await vfs().writeObjectAsync(cachePath,result);
                    if(enableLogging || this.options.log){
                        console.log(`doc query pass written to cache - ${cachePath}`);
                    }
                }catch(ex){
                    console.error('Failed to write document query result to cache',ex);
                }
            }

            return result;

        }finally{
            reader.dispose?.();
            this.reader=undefined;
        }


    }

    private async runPassAsync(
        query:ConvoDocQuery,
        pass:number,
        pages:ConvoDocPageResult[],
        cache:boolean,
        pageCallback:(page:ConvoDocPageResult)=>Promise<void>
    ){
        let loadedFromCached=false;
        let passCacheKey:string|undefined;
        if(this.options.cacheQueryResults || cache){
            const cached=await this.getCachedPassAsync(pass,query);
            passCacheKey=cached.key;
            if(cached.outputs){
                this.loadCached(cached.outputs);
                loadedFromCached=true;
            }
        }
        if(!loadedFromCached){
            await Promise.all(pages.map(pageCallback));
            if(passCacheKey){
                await this.writeCachedPassAsync(passCacheKey,pass);
            }
        }
    }

    private async convertPageImageAsync(page:ConvoDocPageResult,img:Blob){
        const b64=await readBlobAsDataUrlAsync(img);

        const r=await this.callAsync(/*convo*/`
            > system
            You are helping a user convert pages of a document into markdown documents.
            You will be given each page as an image.
            Convert tables, graphs and charts into markdown tables with a detailed description.
            If a graph or chart can not be converted into a markdown table convert it to [Mermaid](https://mermaid.js.org/) diagram in a code block.
            Convert images into markdown images with a detailed description in the alt text area and if you don't know the full URL to the image use an empty anchor link (a single hash tag).
            Ignore any navigation UI elements.
            Ignore headers and footers that included information that would be repeated every page.
            Ignore page numbers at the top or bottom of the page.
            Ignore any ads.
            If a blank image is given respond with the text "BLANK" in all caps.
            Do not enclose your responses in a markdown code block.

            Respond with your conversation of the page verbatim. Do not give an explanation of how you converted the document or tell of any issues with the document.

            > user
            Convert the following page

            ![](${b64})
        `);

        if(!r?.content || (r.content.length<=10 && r.content.includes('BLANK'))){
            return;
        }

        this.outputs.push({
            id:this.nextOutputId++,
            output:r?.content??'',
            contentType:'text/markdown',
            type:'content',
            pass:-1,
            pageIndexes:[page.index]
        });
    }

    private async selectAsync(pages:ConvoDocPageResult[],select:ConvoDocSelectStatement,pass:number,perPage:boolean){

        if(!pages.length){
            return;
        }

        if(!perPage && isConvoDocSelectPerPage(select)){
            await Promise.all(pages.map(p=>this.selectAsync([p],select,pass,true)));
            return;
        }
        const generatePrompt=select.generateConvo??(select.generate?`> user\n${escapeConvoMessageContent(select.generate)}`:null);
        if(!generatePrompt){
            return;
        }

        const info:string[]=[];
        for(const page of pages){
            const outputs=this.outputs.filter(o=>o.pass<=pass && o.pageIndexes.includes(page.index));
            if(outputs.length){
                info.push(`Page ${page.index+1}:\n`);
                for(const out of outputs){
                    info.push((out.prefix??`<${out.type}>`)+'\n');
                    info.push(convoScript`${out.output}`);
                    info.push((out.suffix??`</${out.type}>`)+'\n');
                    info.push('\n')
                }
            }
        }

        const system=info.length?`> system\nUse the following page information for additional context:\n`+info.join('\n')+'\n\n':''


        const requirePrompt=select.requirementConvo??(select.requirement?imageRequirementPrompt(select.requirement):null);
        if(requirePrompt){
            const r=await this.callAsync(system+requirePrompt);
            if(!r?.returnValue?.accept){
                return;
            }
        }


        const result=await this.callAsync(system+generatePrompt);
        if(!result){
            return;
        }
        let output:any;
        let contentType='text/plain';
        let type=select.outputType??'content';
        if(result.result.message?.format==='json' && result.result.message.content){
            output=parseJson5(result.result.message.content);
            contentType=getConvoSelectContentType(select,'application/json');
        }else if(result.returnValue===undefined){
            output=result.content??'';
            contentType=getConvoSelectContentType(select,'text/plain');
        }else{
            const isObject=result.returnValue===undefined || (typeof result.returnValue === 'object');
            output=isObject?result.returnValue:(result.returnValue?.toString()??'');
            contentType=getConvoSelectContentType(select,isObject?'application/json':'text/plain');
        }
        const outputR:ConvoDocOutput={
            id:this.nextOutputId++,
            prefix:select.outputPrefix,
            suffix:select.outputSuffix,
            pageIndexes:(
                select.outputTarget==='firstPage'?
                    [(pages[0]?.index??0)]
                :select.outputTarget==='lastPage'?
                    [(pages[pages.length-1]?.index??0)]
                :
                    pages.map(p=>p.index)
            ),
            output,
            contentType,
            pass,
            type
        };

        this.outputs.push(outputR);

    }

    private async callAsync(prompt:string){

        const release=await this.llmLock.waitOrCancelAsync(this.disposeToken);
        if(!release){
            return undefined;
        }

        try{
            const convo=this.createConversation()

            const result=await convo.completeAsync({
                append:prompt,
                returnOnCalled:true,
            });

            return {
                returnValue:result.returnValues?.[0],
                content:result.message?.content,
                result
            }
        }finally{
            release();
        }
    }


}

const imageRequirementPrompt=(msg:string)=>/*convo*/`

@disableAutoComplete
> accept(accept:boolean)

@call
> user
Based on the following requirements call the accept function with a true value if the image meets the requirement

<requirement>
${escapeConvoMessageContent(msg)}
</requirement>
`
