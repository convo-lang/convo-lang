import { Conversation, ConvoConversationCache, ConvoDocOutput, ConvoDocPageResult, ConvoDocQuery, ConvoDocQueryResult, ConvoDocReader, ConvoDocReaderFactory, ConvoDocSelectStatement, ConvoLocalStorageCache, convoDocResultFormatVersion, convoScript, escapeConvoMessageContent, getConvoDocReaderAsync, getConvoSelectContentType, isConvoDocSelectMatch, isConvoDocSelectPerPage } from "@convo-lang/convo-lang";
import { CancelToken, InternalOptions, Lock, ReadonlySubject, getSortedObjectHash, joinPaths, readBlobAsDataUrlAsync } from '@iyio/common';
import { getVfsItemUrl, vfs } from '@iyio/vfs';
import { parse as parseJson5 } from 'json5';
import { BehaviorSubject } from 'rxjs';

export interface ConvoDocQueryRunnerOptions
{
    query:ConvoDocQuery;
    llmLock?:number;
    createConversation?:()=>Conversation;
    cacheQueryResults?:boolean;
    cacheConversations?:boolean;
    conversationCache?:ConvoConversationCache;
    cacheVisionPass?:boolean;
    cacheDir?:string;
    outDir?:string;
    readerFactory?:ConvoDocReaderFactory|ConvoDocReaderFactory[];
}

export class ConvoDocQueryRunner
{
    private readonly options:InternalOptions<ConvoDocQueryRunnerOptions,'conversationCache'|'createConversation'|'outDir'|'readerFactory'>;

    private readonly _result:BehaviorSubject<ConvoDocQueryResult|null>=new BehaviorSubject<ConvoDocQueryResult|null>(null);
    public get resultSubject():ReadonlySubject<ConvoDocQueryResult|null>{return this._result}
    public get result(){return this._result.value}

    private readonly outputs:ConvoDocOutput[]=[];

    private nextOutputId=1;

    private readonly llmLock:Lock;

    private readonly disposeToken:CancelToken=new CancelToken();

    public constructor({
        query,
        llmLock=5,
        createConversation,
        cacheQueryResults=false,
        cacheVisionPass=cacheQueryResults,
        cacheConversations=false,
        conversationCache,
        cacheDir='/cache/document-queries',
        outDir,
        readerFactory,
    }:ConvoDocQueryRunnerOptions)
    {
        this.options={
            query,
            llmLock,
            createConversation,
            cacheQueryResults,
            cacheConversations,
            conversationCache,
            cacheVisionPass,
            cacheDir,
            outDir,
            readerFactory
        }
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
        });
    }


    private runPromise:Promise<ConvoDocQueryResult>|undefined;
    public runQueryAsync():Promise<ConvoDocQueryResult>{
        return this.runPromise??(this.runPromise=this._runQueryAsync());
    }

    private pageLock=new Lock(1);
    private pdfReader?:ConvoDocReader;
    private readOpenCount=0;
    private async getPageImageAsync(index:number):Promise<Blob|undefined>{
        if(!this.pdfReader?.pageToImageAsync){
            return undefined;
        }
        const release=await this.pageLock.waitOrCancelAsync(this.disposeToken);
        if(!release){
            return undefined;
        }
        this.readOpenCount++;
        try{
            if(!this.pdfReader){
                return undefined;
            }
            return await this.pdfReader.pageToImageAsync?.(index);
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
            if(outputs){
                console.info(`doc query pass ${pass} loaded from cache - ${cachePath}`);
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
            console.info(`doc query pass ${pass} written to cache - ${cachePath}`);
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


    private async _runQueryAsync():Promise<ConvoDocQueryResult>{

        // for now assume the document is a pdf

        const query=this.options.query;

        const url=getVfsItemUrl(query.src);
        if(!url){
            throw new Error("Unable to get url for src");
        }

        const outDir=this.options.outDir;

        const hashKey=this.options.cacheQueryResults?getSortedObjectHash({_:convoDocResultFormatVersion,url,query}):'';
        const cachePathBase=joinPaths(this.options.cacheDir,hashKey);
        const cachePath=cachePathBase+'.json';
        if(this.options.cacheQueryResults){
            const cached=await vfs().readObjectAsync(cachePath);
            if(cached){
                console.info(`doc query pass load from cache - ${cachePath}`);
                return cached;
            }
        }

        const reader=await getConvoDocReaderAsync(query.src,this.options.readerFactory);
        if(!reader){
            throw new Error(`Unable to get doc reader for query source. url - ${url}`);
        }
        this.pdfReader=reader;

        try{
            const pageCount=await reader.getPageCountAsync();

            const pages:ConvoDocPageResult[]=[];
            for(let i=0;i<pageCount;i++){
                const page:ConvoDocPageResult={
                    index:i,
                }
                pages.push(page);
            }

            if(query.visionPass){
                let loadedFromCached=false;
                let passCacheKey:string|undefined;
                if(this.options.cacheQueryResults || this.options.cacheVisionPass){
                    const cached=await this.getCachedPassAsync(-1,query);
                    passCacheKey=cached.key;
                    if(cached.outputs){
                        this.loadCached(cached.outputs);
                        loadedFromCached=true;
                    }
                }
                if(!loadedFromCached){
                    await Promise.all(pages.map(async page=>{
                        const img=await this.getPageImageAsync(page.index);
                        if(!img){
                            return;
                        }

                        await this.convertPageImageAsync(page,img);

                    }));
                    if(passCacheKey){
                        await this.writeCachedPassAsync(passCacheKey,-1);
                    }
                }
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

            if(this.options.cacheQueryResults){
                try{
                    await vfs().writeObjectAsync(cachePath,result);
                    console.info(`doc query pass written to cache - ${cachePath}`);
                }catch(ex){
                    console.error('Failed to write document query result to cache',ex);
                }
            }

            return result;

        }finally{
            reader.dispose?.();
            this.pdfReader=undefined;
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

            > user
            Convert the following page

            ![](${b64})
        `);

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
