import { CancelToken, Lock, delayAsync, escapeHtml, getErrorMessage, httpClient, strCaseInsensitiveCompare, uuid } from '@iyio/common';
import { ConvoTokenUsage, callConvoFunctionAsync, convoUsageTokensToString, createEmptyConvoTokenUsage, escapeConvoMessageContent, getConvoCompletionAsync, getConvoTextCompletionAsync, resetConvoUsageTokens } from '@iyio/convo-lang';
import { pathExistsAsync, readFileAsJsonAsync, readFileAsStringAsync } from '@iyio/node-common';
import { spawn } from 'child_process';
import { format } from 'date-fns';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import puppeteer, { Browser, HTTPResponse, Page } from 'puppeteer';
import { convoWebActionItemToMdLink, defaultConvoWebCrawlOptionsMaxConcurrent, defaultConvoWebCrawlOptionsMaxDepth, defaultConvoWebCrawlOptionsResultLimit, defaultConvoWebDataDir, defaultConvoWebOutDir, defaultConvoWebSearchOptionsMaxConcurrent, getConvoWebDataDirAsync } from './convo-web-crawler-lib';
import { getConvoWebCrawlerPdfViewer } from './convo-web-crawler-pdf-viewer';
import { getFramesActionItems, hideFramesFixedAsync, scrollDownAsync, showFramesFixedAsync } from './convo-web-crawler-pup-lib';
import { ConvoCrawlerMedia, ConvoPageCapture, ConvoPageCaptureOptions, ConvoPageConversion, ConvoPageConversionData, ConvoPageConversionOptions, ConvoPageConversionResult, ConvoPagePreset, ConvoResearchInfo, ConvoWebCrawl, ConvoWebCrawlOptions, ConvoWebCrawlerInput, ConvoWebCrawlerOptions, ConvoWebCrawlerOutput, ConvoWebExecuteInstructionsOptions, ConvoWebInstruction, ConvoWebInstructionResult, ConvoWebResearchOptions, ConvoWebResearchResult, ConvoWebResearchResultCallbackValue, ConvoWebSearchAndResearchOptions, ConvoWebSearchOptions, ConvoWebSearchResult, ConvoWebSubjectSummary } from './convo-web-crawler-types';
import { GoogleSearchResult } from './google-search-types';

export class ConvoWebCrawler
{

    public readonly options:Required<ConvoWebCrawlerOptions>;

    public readonly usage:ConvoTokenUsage;

    public readonly output:ConvoWebCrawlerOutput;

    public constructor({
        id=format(new Date(),'yyyy-MM-dd-HH-mm')+'-'+uuid(),
        frameHeight=1024,
        frameWidth=1024,
        overlap=100,
        outDir=defaultConvoWebOutDir,
        dataDir=defaultConvoWebDataDir,
        httpAccessPoint: httpAccessPointer='https://convo-crawler-out.ngrok.io',
        pagePresets=[],
        googleSearchApiKey='',
        googleSearchCx='',
        disableDefaultCss=false,
        headed=false,
        usage=createEmptyConvoTokenUsage(),
        debug=false,
        discardOutput=false,
        browserConnectWsUrl='',
        chromeDataDir='convo-crawler-browser-profile',
        chromeBinPath='',
        useChrome=false,
        launchArgs=[],
        chromeNoSandbox=false,
    }:ConvoWebCrawlerOptions){

        pagePresets=[...pagePresets];

        this.options={
            id,
            frameHeight,
            frameWidth,
            overlap,
            outDir,
            dataDir,
            httpAccessPoint: httpAccessPointer,
            pagePresets,
            googleSearchApiKey,
            googleSearchCx,
            disableDefaultCss,
            headed,
            usage,
            debug,
            discardOutput,
            browserConnectWsUrl,
            chromeDataDir,
            chromeBinPath,
            useChrome,
            launchArgs,
            chromeNoSandbox
        }

        this.usage={...usage};

        this.output={
            usage:this.usage,
            captures:[],
            conversions:[],
            research:[],
        }

        if(!disableDefaultCss){
            // pagePresets.push({
            //     css:/*css*/`
            //         #onetrust-consent-sdk, .onetrust-consent-sdk{
            //             display:none !important;
            //         }
            //         html,body{
            //             min-width:100%;
            //             min-height:100%;
            //         }
            //     `
            // })
        }

    }

    public async writeOutputAsync(path?:string){
        const outDir=await this.getOutDirAsync();
        if(!path){
            path=`${outDir}/_output.json`;
        }
        await writeFile(path,JSON.stringify(this.output,null,4));
        return path;
    }

    public async writePreviewer(){
        //const html=createWebCrawlerOutputPreviewer();
    }

    public resetUsage()
    {
        resetConvoUsageTokens(this.usage);
    }

    public getPagePreset(url:string):ConvoPagePreset|undefined{
        const presets=this.options.pagePresets.filter(p=>(
            (!p.url && !p.match) ||
            (p.url && strCaseInsensitiveCompare(p.url,url)) ||
            (p.match && p.match.test(url))
        ));
        if(presets.length===0){
            return undefined;
        }
        if(presets.length===1){
            return presets[0];
        }

        const preset={...presets[0]};
        for(let i=1;i<presets.length;i++){
            const p=presets[i];
            if(!p){continue}
            for(const e in p){
                const v=(p as any)[e];
                if(!v){
                    continue;
                }
                if(e==='css'){
                    if(preset.css){
                        preset.css+='\n'+v;
                    }else{
                        preset.css=v;
                    }
                }else{
                    (preset as any)[e]=v;
                }
            }
        }

        return preset;

    }

    private getHeadMsg(){
        return `> define
            __model='gpt-4o'
            __trackTokenUsage=true
        `
    }



    private async completeTextAsync(convo:string):Promise<string>
    {
        const value=await getConvoTextCompletionAsync({usage:this.usage,debug:this.options.debug,append:`
            ${this.getHeadMsg()}

            ${convo}
        `});

        return value??'';
    }

    private async callFunctionAsync<T>(convo:string):Promise<T|undefined>
    {
        const value=await callConvoFunctionAsync({usage:this.usage,debug:this.options.debug,append:`
            ${this.getHeadMsg()}

            ${convo}
        `});

        return value??undefined;
    }

    private async completeAsync<T=any>(convo:string):Promise<{text:string,fn?:string,args?:T}>
    {
        const r=await getConvoCompletionAsync({usage:this.usage,returnOnCall:true,debug:this.options.debug,append:`
            ${this.getHeadMsg()}

            ${convo}
        `});

        return {
            text:r.message?.content??'',
            fn:r.message?.callFn,
            args:r.message?.callParams,
        }


    }

    public setHttpAccessPoint(url:string){
        this.options.httpAccessPoint=url;
    }

    public async getOutDirAsync():Promise<string>
    {
        const path=`${this.options.outDir}/${this.options.id}`;
        if(!await pathExistsAsync(path)){
            await mkdir(path,{recursive:true});
        }
        return path;
    }

    public async getDataDirAsync():Promise<string>
    {
        return await getConvoWebDataDirAsync(this.options.dataDir);
    }

    public async getResearchDocumentsAsync(limit?:number):Promise<string[]>{
        const docs:string[]=[];
        if(limit!==undefined && limit<=0){
            return docs;
        }
        const dirs=await readdir(this.options.outDir,{withFileTypes:true});
        dirs.sort();
        for(let i=dirs.length-1;i>=0;i--){
            const dir=dirs[i];
            if(!dir?.isDirectory()){continue}

            const sub=await readdir(join(this.options.outDir,dir.name));
            for(const s of sub){
                if(s.startsWith('research') && s.endsWith('.md')){
                    const content=await readFileAsStringAsync(join(this.options.outDir,dir.name,s));
                    docs.push(content);
                    if(limit!==undefined && docs.length>=limit){
                        return docs;
                    }
                }
            }

        }
        return docs;
    }

    public async getResearchInfoListAsync(limit?:number):Promise<ConvoResearchInfo[]>{
        const docs:ConvoResearchInfo[]=[];
        if(limit!==undefined && limit<=0){
            return docs;
        }
        const dirs=await readdir(this.options.outDir,{withFileTypes:true});
        dirs.sort();
        for(let i=dirs.length-1;i>=0;i--){
            const dir=dirs[i];
            if(!dir?.isDirectory()){continue}

            const sub=await readdir(join(this.options.outDir,dir.name));
            for(const s of sub){
                if(s.startsWith('research') && s.endsWith('.json')){
                    const result=await readFileAsJsonAsync<ConvoWebResearchResult>(join(this.options.outDir,dir.name,s));
                    docs.push({
                        id:encodeURIComponent(dir.name+'/'+s.substring(0,s.length-5)),
                        name:result.title,
                    });
                    if(limit!==undefined && docs.length>=limit){
                        return docs;
                    }
                }
            }

        }
        return docs;
    }

    public async getResearchResultAsync(id:string):Promise<ConvoWebResearchResult|undefined>{
        id=decodeURIComponent(id);
        if(id.includes('..') || id.startsWith('/')){
            return undefined;
        }
        try{
            return await readFileAsJsonAsync(join(this.options.outDir,id+'.json'))
        }catch{
            return undefined;
        }
    }

    public async getResearchDocumentAsync(id:string):Promise<string|undefined>{
        id=decodeURIComponent(id);
        if(id.includes('..') || id.startsWith('/')){
            return undefined;
        }
        const dirPath=join(this.options.outDir,id.split('/')[0]??'');
        if(!pathExistsAsync(dirPath)){
            return undefined;
        }
        const items=await readdir(dirPath);
        for(const p of items){
            if(p.startsWith('research') && p.endsWith('.md')){
                return await readFileAsStringAsync(join(dirPath,p))
            }
        }
        return undefined;
    }

    public async writeInputAsync(input:ConvoWebCrawlerInput):Promise<void>
    {
        const outDir=await this.getOutDirAsync();
        await writeFile(join(outDir,'_input.json'),JSON.stringify(input,null,4))
    }

    public async searchAndRunResearchAsync({
        search,
        research,
        callbackUrl,
        callbackHeaders,
        callbackData,
    }:ConvoWebSearchAndResearchOptions,cancel?:CancelToken):Promise<ConvoWebResearchResult>{

        try{
            await this.writeInputAsync({
                name:research.title,
                research,
                search
            })

            research={...research}
            if(search){
                research.searchResults=await this.searchAsync(search,cancel);
            }
            const result=await this.runResearchAsync(research,cancel);
            if(callbackUrl){
                this.invokeResearchCallbackAsync(callbackUrl,callbackHeaders,callbackData,result);
            }
            return result;
        }catch(ex){
            if(callbackUrl){
                this.invokeResearchCallbackAsync(callbackUrl,callbackHeaders,callbackData,undefined,getErrorMessage(ex));
            }
            throw ex;
        }
    }

    private async invokeResearchCallbackAsync(
        url:string,
        headers:Record<string,string>|undefined,
        data?:any,
        result?:ConvoWebResearchResult,
        error?:string
    ){
        const value:ConvoWebResearchResultCallbackValue={
            result,
            error,
            data
        }
        await httpClient().postAsync(url,value,{
            headers:headers??{},
            noAuth:true,
        })
    }

    public async runResearchAsync(options:ConvoWebResearchOptions,cancel?:CancelToken):Promise<ConvoWebResearchResult>{

        if(!options.searchResults){
            if(!options.searchOptions){
                throw new Error('searchOptions or searchResults required')
            }
            options={...options}
            options.searchResults=await this.searchAsync(options.searchOptions as ConvoWebSearchOptions,cancel);
        }

        const {
            title,
            subjects,
            conclusion,
            searchResults,
            instructions,
            executeInstructionInParallel,
            maxInstructions,
        }=options;

        cancel?.throwIfCanceled();

        const resultsMd=searchResults.results.map(r=>`URL: ${r.conversion.url}\n\n${r.conversion.summary}`).join('\n\n\n\n');

        console.info('Generating subject summaries');

        const subjectSummaries=await Promise.all(subjects.map<Promise<ConvoWebSubjectSummary>>(async subject=>{

            const summary=await this.completeTextAsync(/*convo*/`

                > define
                multipleSubjects=${subjects.length>1}

                > system
                You are a research agent analyzing the summarization of a collection of articles.
                Summarize the collection of articles based on the following subject.

                Subject: ${escapeConvoMessageContent(subject)}

                @concat
                @condition multipleSubjects
                > system
                Keep in mind that multiple subject summaries will be generated based on the same collection of articles.
                For now focus on the subject of "${escapeConvoMessageContent(subject)}" but if there are any important relations between the subject you can include them.

                Other Subjects: ${escapeConvoMessageContent(subjects.filter(sub=>sub!==subject).join(', '))}

                @concat
                > system
                After generating all subject summaries a finally conclusion will be generated based on "${escapeConvoMessageContent(conclusion)}".
                Primarily focus on the subject of "${escapeConvoMessageContent(subject)}".

                Do not include a title or header as part of the summary.


                > user
                Articles:

                ${escapeConvoMessageContent(resultsMd)}

            `)

            return {
                subject,
                summary:summary??'',
            }
        }));

        console.info('Generating conclusion');

        const conclusionSummary=await this.completeTextAsync(/*convo*/`

            > define
            multipleSubjects=${subjects.length>1}

            > system
            You are a research agent writing your final conclusion about "${escapeConvoMessageContent(conclusion)}" based on a collection of articles and subject specific summaries.

            Do not include a title or header as part of the conclusion.


            > user
            Articles:

            ${escapeConvoMessageContent(resultsMd)}

            > user
            Subject Summaries:

            ${subjectSummaries.map(s=>`Subject: ${escapeConvoMessageContent(s.subject)}\nSummary:\n${escapeConvoMessageContent(s.summary)}`).join('\n\n\n')}

        `)


        const result:ConvoWebResearchResult={
            title,
            subjects,
            conclusion,
            subjectSummaries,
            conclusionSummary:conclusionSummary??'',
            usage:this.usage,
            document:'',
        }

        let research=`# ${
            escapeHtml(title)
        }\n*date - ${
            format(new Date(),'PPpp')
        }*\n\n${
            subjectSummaries.map(s=>`- [${escapeHtml(s.subject)}](#${escapeHtml(s.subject.replace(/\s/g,'-'))})`).join('\n')
        }\n- [Conclusion](#Conclusion)\n\n\n${
            subjectSummaries.map(s=>`## ${escapeHtml(s.subject)}\n${escapeHtml(s.summary)}`).join('\n\n\n')
        }\n\n\n## Conclusion\n${escapeHtml(conclusionSummary??'')}\n\n\n## Sources\n${
            searchResults.crawled.map(u=>`- ${escapeHtml(u)}`).join('\n')
        }`

        if(instructions){

            const r=await this.executeInstructionsAsync({
                researchDocument:research,
                instructions,
                executeInstructionInParallel,
                maxInstructions
            })

            if(r){
                research+='\n\n\n'+r;
            }

        }

        const outDir=await this.getOutDirAsync();

        result.document=research;

        await writeFile(`${outDir}/research-${Date.now()}.json`,JSON.stringify(result,null,4));
        await writeFile(`${outDir}/research-${Date.now()}.md`,research);

        if(!this.options.discardOutput){
            this.output.research.push(result);
        }

        return result;

    }

    public async executeInstructionsAsync({
        outPath,
        sourcePath,
        researchDocument,
        instructions,
        executeInstructionInParallel,
        maxInstructions=Math.max(10,instructions.length*4),
    }:ConvoWebExecuteInstructionsOptions):Promise<string>{

        if(sourcePath && !researchDocument){
            researchDocument=await readFileAsStringAsync(sourcePath);
        }

        if(!researchDocument){

        }

        let results:(ConvoWebInstructionResult&{instruction?:ConvoWebInstruction})[];

        if(executeInstructionInParallel){
            results=await Promise.all(instructions.map(i=>this.executeInstructionAsync(researchDocument??'',i)));
        }else{
            results=[];
            for(let i=0,total=0;i<instructions.length;i++){
                if(total>maxInstructions){
                    console.error('!!maxInstructions reached. Stopping instruction execution early');
                    break;
                }
                total++;
                const instruction=instructions[i];
                if(!instruction){continue}

                const r=await this.executeInstructionAsync(
                    researchDocument??'',
                    instruction,
                    instructions,
                    results
                )
                results.push({...r,instruction});
                if(r.stop){
                    break;
                }
                if(r.goto){
                    const index=instructions.findIndex(i=>i.id===r.goto);
                    if(index===-1){
                        console.error(`Invalid goto instruction id given by LLM. Will stop instruction execution now. id:${r.stop}`);
                        break;
                    }
                    i=index-1;
                }

            }
        }

        const contentResults=results.filter(r=>r.text);

        const output=(contentResults.length?
            '## Instructions\n\n\n'+contentResults.map(r=>(
                `### ${escapeHtml(r.instruction?.title??r.instruction?.instruction??r.instruction?.id??'')}\n${escapeHtml(r.text??'')}`
            )).join('\n\n\n')
        :
            ''
        )

        if(outPath){
            await writeFile(outPath,output);
        }

        return output;

    }

    private async executeInstructionAsync(
        researchDocument:string,
        instruction:ConvoWebInstruction,
        instructionList?:ConvoWebInstruction[],
        prevResults?:(ConvoWebInstructionResult&{instruction?:ConvoWebInstruction})[],
        perspective:string='research assistant',
    ):Promise<ConvoWebInstructionResult>{

        if(prevResults?.length){
            researchDocument+='\n\n# Previously Executed Instructions:\n\n\n'+prevResults.map((r,i)=>(
                `## ${
                    escapeConvoMessageContent(r.instruction?.title??r.instruction?.id??'')
                }\nid: ${
                    escapeConvoMessageContent(r.instruction?.id??'')
                }\ninstruction: ${
                    escapeConvoMessageContent(r.instruction?.instruction??'')
                }\nresult:${
                    r.goto?`gotoInstruction(${escapeConvoMessageContent(r.goto??'')})`:
                    r.stop?'stopExecution()':
                    r.skip?'skipInstruction()':
                    escapeConvoMessageContent(r.text??'')
                }`
            )).join('\n\n\n')
        }

        const result=await this.completeAsync(/*convo*/`

            > define
            hasList=${instructionList?.length?true:false}

            > system
            You are a ${perspective} executing instructions based on a research document.

            @concat
            @condition hasList
            > system
            Instruction List:
            | id | Currently executing | title |
            |----|---------------------|-------|
            ${instructionList?.map(i=>`| ${escapeConvoMessageContent(i.id)} | ${i.id===instruction.id} | ${escapeConvoMessageContent(i.title)} |`).join('\n')}

            # goes to the specified instruction based on the id of the instruction. Only call when explicity told to by the user.
            > gotoInstruction(
                # Id of instruction to goto
                id:string
            )

            # Skips the current instruction. Only call when explicity told to by the user.
            > skipInstruction()

            # Stops execution of all instructions. Only call when explicity told to by the user.
            > stopExecution()

            > user
            Execute the following instruction based on the following research document. If you are unable to executed the instruction call the skipInstruction function

            Instruction:
            - id: ${escapeConvoMessageContent(instruction.id)}
            - title: ${escapeConvoMessageContent(instruction.title)}
            - instruction: ${escapeConvoMessageContent(instruction.instruction)}

            Research Document:
            ${escapeConvoMessageContent(researchDocument)}
        `);

        if(result.fn){
            if(result.fn==='gotoInstruction'){
                if(typeof result.args.id!=='string'){
                    throw new Error('executeInstructionAsync - Goto id not a string');
                }
                return {goto:result.args.id}
            }else if(result.fn==='stopExecution'){
                return {stop:true}
            }else if(result.fn==='skipInstruction'){
                return {skip:true}
            }else{
                throw new Error(`executeInstructionAsync - Invalid function called - ${result.fn}`);
            }
        }else{
            return {text:result.text}
        }
    }

    public async searchAsync({
        term,
        maxConcurrent=defaultConvoWebSearchOptionsMaxConcurrent,
        crawlOptions,
    }:ConvoWebSearchOptions,cancel?:CancelToken):Promise<ConvoWebSearchResult>{

        const searchResult=await httpClient().getAsync<GoogleSearchResult>(
            `https://www.googleapis.com/customsearch/v1?key=${
                encodeURIComponent(this.options.googleSearchApiKey)
            }&cx=${
                encodeURIComponent(this.options.googleSearchCx)
            }&q=${
                encodeURIComponent(term)
            }`
        );

        cancel?.throwIfCanceled();

        if(!searchResult?.items){
            throw new Error('No search results returned');
        }

        const lock=new Lock(maxConcurrent);

        const result:ConvoWebSearchResult={
            term,
            results:[],
            crawled:[],
            usage:this.usage,
        }

        await Promise.all(searchResult.items.map(async link=>{
            if(!link.link){
                return;
            }
            const release=await lock.waitOrCancelAsync(cancel);
            if(!release){
                return;
            }

            try{
                await this._crawPageAsync(
                    {...crawlOptions,url:link.link},
                    result,
                    1,
                    new Lock(crawlOptions?.maxConcurrent??defaultConvoWebCrawlOptionsMaxConcurrent),
                    cancel
                );
            }finally{
                release();
            }
        }));

        const outDir=await this.getOutDirAsync();

        await writeFile(`${outDir}/search-${Date.now()}.json`,JSON.stringify(result,null,4));

        return result;
    }

    public async crawPageAsync(options:ConvoWebCrawlOptions,cancel?:CancelToken):Promise<ConvoWebCrawl>{
        const crawl:ConvoWebCrawl={
            crawled:[],
            results:[],
        }
        await this._crawPageAsync(
            options,
            crawl,
            1,
            new Lock(options.maxConcurrent??defaultConvoWebCrawlOptionsMaxConcurrent),
            cancel
        );
        return crawl;
    }

    private async _crawPageAsync(
        options:ConvoWebCrawlOptions,
        crawl:ConvoWebCrawl,
        depth:number,
        concurrentLock:Lock,
        cancel?:CancelToken
    ):Promise<void>{

        const {
            url,
            pageRequirementPrompt,
            maxDepth=defaultConvoWebCrawlOptionsMaxDepth,
            resultLimit=defaultConvoWebCrawlOptionsResultLimit,
        }=options;

        if(depth>maxDepth || crawl.crawled.includes(url.toLowerCase())){
            return;
        }

        crawl.crawled.push(url.toLowerCase());

        let isMainContent:boolean|'checking'|null=null;

        const checkForMainContent=async (images:ConvoCrawlerMedia[])=>{
            if(images.length===0){
                isMainContent=false;
                return false;
            }
            isMainContent='checking';
            const [typeParams,reqParams]=await Promise.all([
                this.callFunctionAsync<{type:string}>(/*convo*/`

                    > define
                    secondImage=${JSON.stringify(images[1]?.url)}

                    > classifyWebsite(
                        type:enum("landing-page" "main-content" "reference-list" "other")
                    )

                    > user
                    Classify the following images of a website based on their main purpose by calling the classifyWebsite function.
                    Pages that primarily link to other pages should be considered a reference-list.

                    > user
                    ![](${images[0]?.url})

                    @condition secondImage
                    > user
                    ![]({{secondImage}})

                `),
                !pageRequirementPrompt?null:this.callFunctionAsync<{requirementsMet:boolean}>(/*convo*/`
                    > define
                    secondImage=${JSON.stringify(images[1]?.url)}

                    > setRequirementsMet(
                        # True if the given requirements where met
                        requirementsMet:boolean
                    )

                    > user
                    Call setRequirementsMet based on the following requirements and the following image of screenshot of the top of a webpage.

                    Requirements:
                    ${escapeConvoMessageContent(pageRequirementPrompt)}

                    > user
                    ![](${images[0]?.url})

                    @condition secondImage
                    > user
                    ![]({{secondImage}})

                `)
            ]);

            isMainContent=(
                typeParams?.type==='main-content' &&
                (pageRequirementPrompt?reqParams?.requirementsMet===true:true)
            );
            return isMainContent;
        }

        const release=await concurrentLock.waitOrCancelAsync(cancel);
        if(!release){
            return;
        }
        let linkUrls:string[]|undefined;
        try{
            const browser=await this.getBrowserAsync();

            let page:Page|undefined;
            try{
                page=await browser.newPage();
                const conversion=await this.convertPageAsync({
                    summaryInstructions:options.summaryInstructions,
                    captureOptions:{
                        url,
                        browser,
                        page,
                    },
                    whileSummarizingCallback:async (data,img,page,index)=>{
                        if(crawl.results.length>=resultLimit){
                            return false;
                        }
                        if(index!==1){
                            return true;
                        }
                        return await checkForMainContent(data.images);
                    }
                },cancel);

                if(crawl.results.length>=resultLimit){
                    return;
                }

                if(isMainContent===null){// will be null if only one page was scanned
                    await checkForMainContent(conversion.capture.images??[]);
                }

                if(crawl.results.length>=resultLimit){
                    return;
                }

                if(isMainContent){
                    crawl.results.push(conversion);
                }else{
                    const links=(await getFramesActionItems(page.frames(),false)).filter(a=>a.href);
                    const images=conversion.capture.images;
                    const nav=await this.callFunctionAsync<{urls:string[]}>(/*convo*/`
                        > define
                        secondImage=${JSON.stringify(images[1]?.url)}
                        hasReq=${pageRequirementPrompt?'true':'false'}
                        hasCrawlLinks=${crawl.crawled.length?'true':'false'}

                        > navigateTo(
                            # URL of new page to navigate to
                            urls:array(string)
                        )

                        > user
                        Based on the following links and images select the top 5 URLs to navigate to by calling navigateTo. Do not use anchor links.

                        Links:
                        ${links.map(convoWebActionItemToMdLink).join('\n')}

                        @concat
                        @condition hasCrawlLinks
                        Do not include any of the following URLs, they have already be scanned.
                        ${crawl.crawled.map(u=>escapeConvoMessageContent(u)).join('\n')}

                        @concat
                        @condition hasReq
                        > user
                        The URLs passed to navigateTo should point to pages that meet the follow requirements based on your best knowledge:
                        ${escapeConvoMessageContent(pageRequirementPrompt??'')}

                        > user
                        ![](${images[0]?.url})

                        @condition secondImage
                        > user
                        ![]({{secondImage}})

                    `)

                    if(nav?.urls.length){
                        linkUrls=nav.urls as string[];
                        linkUrls=linkUrls.filter(u=>!crawl.crawled.includes(u.toLowerCase()))
                    }

                }
            }catch(ex){
                console.error(`Crawl page failed. Will continue crawling - ${url}`,ex);
            }finally{
                await page?.close();
            }
        }finally{
            release();
        }

        if(linkUrls?.length){
            await Promise.all(linkUrls.map((u)=>{
                return this._crawPageAsync(
                    {...options,url:u},
                    crawl,
                    depth+1,
                    concurrentLock,
                    cancel,
                )
            }));
        }

    }

    public async convertPageAsync({
        captureOptions,
        url,
        summaryInstructions='Include important financial numbers that would be important to a financial advisor.',
        beforeSummarizeCallback,
        afterSummarizeCallback,
        whileSummarizingCallback
    }:ConvoPageConversionOptions,cancel?:CancelToken):Promise<ConvoPageConversionResult>{

        console.info(`id ${this.options.id}`)

        const summaries:string[]=[];
        const images:ConvoCrawlerMedia[]=[];
        const data:ConvoPageConversionData={summaries,images};
        const ignorePopups:Record<number,boolean>={}

        const outDir=await this.getOutDirAsync();

        if(!captureOptions){
            if(!url){
                throw new Error('captureOptions or url must be supplied');
            }
            captureOptions={url}
        }
        if(!captureOptions.setId){
            captureOptions.setId=uuid();
        }

        const capture=await this.capturePageAsync({...captureOptions,imageCaptureCallback:async (img,page,index,buffer)=>{

            images.push(img);

            console.info(`converting page ${index}`);

            const beforeResult=await beforeSummarizeCallback?.(data,img,page,index,buffer);
            if(beforeResult===false){
                return false;
            }

            const whilePromise=whileSummarizingCallback?.(data,img,page,index,buffer);

            const links=img.actionItems?.filter(a=>a.href)??[];

            const {text,fn}=await this.completeAsync(/*convo*/`
                > define
                isFirst=${index?'false':'true'}
                hasLinks=${links.length?'true':'false'}
                ignorePopups=${ignorePopups[index]?true:false}

                # Only call if the popup is large and covers the the majority of the screenshot.
                @condition !ignorePopups
                > closePopup()

                > system
                You are a web scraping agent that is converting a series of screenshots of a web page into markdown.
                Convert tables, graphs and charts into markdown tables with a detailed description.
                If a graph or chart can not be converted into a markdown table convert it to [Mermaid](https://mermaid.js.org/) diagram in a code block.
                Convert images into markdown images with a detailed description in the alt text area and if you don't know the full URL to the image use an empty anchor link (a single hash tag).
                Ignore any site navigation UI elements.
                Ignore any ads.
                If a blank image is given respond with the text "BLANK" in all caps.
                Do not enclose your responses in a markdown code block.

                @condition !ignorePopups
                > system
                If the screenshot has a popup that covers the majority of the page and the popup has buttons to close or accept the terms of the popup call the closePopup function.

                > user
                Convert the following image into a detailed markdown document or call closePopup.

                @concat
                @condition hasLinks
                > user
                Below is a list of hyperlinks on the page. Each item in the list includes text as the link is display in the following image and its URL.
                When converting the following image into markdown you can use the following list of links to populate the generated markdown links.
                If you are unsure of which URL to use when converting a link use an empty anchor link (a single hashtag) as the URL.

                Page Hyperlinks:
                ${links.map(convoWebActionItemToMdLink).join('\n')}

                @condition !isFirst
                @concat
                > user
                The following image continues where the following markdown ends.
                The image and markdown overlap.
                Your response should start exactly where the overlap ends.

                Markdown from previous screenshot:
                ${escapeConvoMessageContent(summaries[index-1]||'Empty')}

                > user
                ![](${img.url})
            `);

            cancel?.throwIfCanceled();

            const whileResult=await whilePromise;
            if(whileResult===false){
                return false;
            }

            if(fn){
                console.info(`${url} as a popup. Will try to close the popup by calling ${fn}`);

                const closed=await this.tryClosePopupAsync(img,page,cancel);
                cancel?.throwIfCanceled();

                if(!closed){
                    console.info(`False popup identification. Ignoring popups for index ${index}`);
                    ignorePopups[index]=true;
                }

                return 'retry';
            }

            summaries.push(text);

            const afterResult=await afterSummarizeCallback?.(data,img,page,index,buffer);
            if(afterResult===false){
                return false;
            }

            if(text==='BLANK'){
                return 'retry-safe'
            }

            const conversionPath=`${outDir}/${captureOptions?.setId}-img-${index}.md`;
            await writeFile(conversionPath,text);

            console.info(`page ${index} converted. Total token usage: ${convoUsageTokensToString(this.usage)} `);
            console.info(`conversion written to - ${conversionPath}`);

            return true;

        }},cancel);
        const {setId}=capture;

        const markdown=summaries.join('\n\n');

        console.info('Generating summary');

        const summary=await this.completeTextAsync(/*convo*/`

            > user
            Summarize the following markdown document.

            ${summaryInstructions}

            Format the summary using markdown. Do not enclose your responses in a markdown code block.

            ${escapeConvoMessageContent(markdown)}

        `);

        cancel?.throwIfCanceled();



        await writeFile(`${outDir}/${setId}-document.md`,markdown);
        await writeFile(`${outDir}/${setId}-summary.md`,summary);

        const conversion:ConvoPageConversion={
            url:capture.url,
            markdown,
            summary:summary,
            setId
        }

        if(!this.options.discardOutput){
            this.output.conversions.push(conversion);
        }

        await writeFile(`${outDir}/${setId}-conversion.json`,JSON.stringify(conversion,null,4));

        console.info(`Page conversion token usage: ${convoUsageTokensToString(this.usage)}`)

        return {conversion,capture};

    }

    private async tryClosePopupAsync(img:ConvoCrawlerMedia,page:Page,cancel?:CancelToken):Promise<boolean>{

        const actionItems=(await getFramesActionItems(page.frames())).filter(a=>a.text);

        const buttons=actionItems.map(a=>({
            id:a.id,
            text:a.text,
            type:a.type,
            link:a.href?.startsWith('#')?undefined:a.href
        }))

        console.info('Clickable items',buttons);

        cancel?.throwIfCanceled();

        const {args,fn}=await this.completeAsync<{id?:string,text?:string}>(/*convo*/`
            > click(
                # The id of the button from the Clickable List
                id:string

                # The text content of the button to click
                text?:string
            )

            > notFound()

            > user
            If the following screenshot has a popup that covers the majority of the page call the click function to click to click the appropriate button to close the popup.
            If the screenshot does not appear to have a popup call the noFound function.
            Avoid clicking on buttons that link to other pages or result in viewing content other than the main content of the page.
            If a popup is found and it is a cookies banner accept all cookies.

            Below a list of buttons with corresponding IDs in the screenshot.

            Buttons:
            ${JSON.stringify(buttons,null,4)}

            > user
            ![](${img.url})
        `);

        console.info('tryClose',fn,args);

        if(!args?.id){
            return false;
        }

        const item=actionItems.find(a=>a.id===args.id);
        if(!item){
            return false;
        }
        await page.mouse.click(item.x+item.w/2,item.y+item.h/2)

        await delayAsync(2000);

        return true;
    }

    private _browser:Promise<Browser>|null=null;
    public async getBrowserAsync():Promise<Browser>{
        return await (this._browser??(this._browser=(async ()=>{
            if(!this.options.useChrome){
                return await puppeteer.launch({
                    headless:!this.options.headed,
                    args:[
                        `--window-size=${this.options.frameWidth},${this.options.frameHeight+74}`,
                        ...this.options.launchArgs
                    ]
                });
            }
            if(this.options.browserConnectWsUrl){
                return puppeteer.connect({
                    browserWSEndpoint:this.options.browserConnectWsUrl
                })
            }
            const dataDir=await this.getDataDirAsync();
            const urlPath=join(dataDir,'chrome-remote-debugger-url.txt');
            if(await pathExistsAsync(urlPath)){
                const url=await readFileAsStringAsync(urlPath);
                console.info(`Connecting to remote debugging session - ${url}`)
                try{
                    return await puppeteer.connect({
                        browserWSEndpoint:url
                    })
                }catch{
                    console.info('Saved chrome remote debugger URL no longer open');
                }
            }
            const binPath=this.options.chromeBinPath||await getChromePathAsync();
            if(!binPath){
                throw new Error('Unable to determine google chrome bin path');
            }

            const newUrl=await new Promise<string>((resolve,reject)=>{
                try{
                    const proc=spawn(
                        binPath,
                        [
                            '--remote-debugging-port=9321',
                            '--no-first-run',
                            '--no-default-browser-check',
                            `--user-data-dir=${this.options.chromeDataDir}`,
                            this.options.chromeNoSandbox?'--no-sandbox':'',
                            ...this.options.launchArgs
                        ].filter(a=>a),{detached:true});
                    let found=false;
                    const listener=(data:any)=>{
                        try{
                            if(typeof data !== 'string'){
                                data=data?.toString()??'';
                            }
                            const match=/ws:\/\/\S+/i.exec(data);
                            if(match){
                                found=true;
                                resolve(match[0]);
                            }
                        }catch(ex){
                            reject(getErrorMessage(ex,'Reading proc data failed'))
                            proc.kill();
                        }
                    }
                    proc.stderr?.on('data',listener);
                    proc.stdout?.on('data',listener);
                    setTimeout(()=>{
                        if(!found){
                            reject('Start remote debugging timed out');
                            proc.kill();
                        }
                    },5000);

                }catch(ex){
                    reject(ex);
                }
            })
            await writeFile(urlPath,newUrl);
            console.info(`Connecting to remote debugging session - ${newUrl}`)
            return await puppeteer.connect({
                browserWSEndpoint:newUrl
            })
        })()))
    }

    /**
     * Captures media and content resources of a page that can be used to generate conversions and
     * summaries
     */
    public async capturePageAsync({
        url,
        setId=uuid(),
        css,
        captureAllImagesBeforeCallback,
        imageCaptureCallback,
        browser,
        page,
        maxCaptureCount=100
    }:ConvoPageCaptureOptions,cancel?:CancelToken):Promise<ConvoPageCapture>{

        const {
            frameHeight,
            frameWidth,
            overlap
        }=this.options;


        let images:ConvoCrawlerMedia[]|undefined;
        let pdf:ConvoCrawlerMedia|undefined;

        const outDir=await this.getOutDirAsync();

        const keepBrowserOpen=browser?true:false;
        if(!browser){
            browser=await this.getBrowserAsync();
        }
        try{

            if(!page){
                page=await browser.newPage();
            }

            await page.setViewport({width:frameWidth,height:frameHeight});

            let response:HTTPResponse|null=null;
            for(let t=0;t<3;t++){
                try{
                    response=await page.goto(url,{timeout:30000,waitUntil:['load','domcontentloaded']});
                }catch(ex){
                    console.error('Navigation error',ex);
                }
            }
            if(!response){
                throw new Error(`Failed to navigate to ${url} after max attempts`);
            }

            let isPdf=false;
            try{
                isPdf=await page.evaluate(()=>{
                    const embed=document.body.children[0];
                    return document.body.children.length===0 || ((
                        embed &&
                        (embed instanceof HTMLEmbedElement) &&
                        embed.type==='application/pdf'
                    )?true:false)
                })
            }catch(ex){
                console.error('Unable to determine if content is a PDF. Assuming content is not a PDF',ex);
            }


            cancel?.throwIfCanceled();

            if(isPdf){
                await page.setContent(getConvoWebCrawlerPdfViewer({url,width:frameWidth,height:frameHeight}));
                await page.evaluate(`window.__convoWebLoadPdf(${JSON.stringify(url)})`);
                await page.evaluate('window.__convoWebNextPdfPage()');
            }else{
                const preset=this.getPagePreset(url);
                if(css || preset?.css){
                    try{
                        await page.evaluate((css)=>{
                            if(window.CSSStyleSheet){
                                const sheet=new CSSStyleSheet()
                                sheet.replaceSync(css);
                                document.adoptedStyleSheets.push(sheet);
                            }else{
                                document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);
                            }
                        },`${preset?.css??''}\n${css??''}`)
                        await delayAsync(100);
                    }catch(ex){
                        console.error('Failed to insert style sheet. Will continue without style sheet',ex);
                    }
                }
            }

            // if(!isPdf){
            //     try{
            //         const pdfBuffer=await page.pdf({
            //             timeout:60000
            //         });
            //         const pdfName=`${setId}-pdf.pdf`
            //         pdf={
            //             path:`${this.options.id}/${pdfName}`,
            //             url:`${this.options.httpAccessPoint}/${this.options.id}/${pdfName}`,
            //             contentType:'application/pdf'
            //         }
            //         await writeFile(`${outDir}/${pdfName}`,pdfBuffer);
            //         cancel?.throwIfCanceled();
            //     }catch(ex){
            //         console.error(`PDF conversion failed - ${url}`,ex);

            //     }
            // }



            let completed=false;


            images=[];
            let i=0;
            let tryIndex=0;
            let safeMode=false;
            while(i<maxCaptureCount){

                if(i && !safeMode && !isPdf){
                    await hideFramesFixedAsync(page.frames());
                }
                await delayAsync(safeMode?2000:500);

                const actionItems=await getFramesActionItems(page.frames());

                const img=await page.screenshot();

                if(i && !safeMode && !isPdf){
                    await showFramesFixedAsync(page.frames());
                }
                cancel?.throwIfCanceled();

                const name=`${setId}-img-${i}-${tryIndex}`

                const imageMedia:ConvoCrawlerMedia={
                    path:`${this.options.id}/${name}.png`,
                    url:`${this.options.httpAccessPoint}/${this.options.id}/${name}.png`,
                    contentType:'image/png',
                    actionItems
                }

                images.push(imageMedia)
                await writeFile(`${outDir}/${name}.png`,img);
                await writeFile(`${outDir}/${name}.json`,JSON.stringify(actionItems,null,4));
                cancel?.throwIfCanceled();

                tryIndex++;

                if(!captureAllImagesBeforeCallback && imageCaptureCallback){
                    const instruction=await imageCaptureCallback(imageMedia,page,i,img);
                    cancel?.throwIfCanceled();
                    if(instruction===false){
                        break;
                    }else if(instruction==='retry'){
                        continue;
                    }else if(instruction==='retry-safe'){
                        safeMode=true;
                        continue;
                    }
                }

                tryIndex=0;

                i++;

                if(!await (isPdf?page.evaluate('window.__convoWebNextPdfPage()'):scrollDownAsync(page,frameHeight-overlap))){
                    completed=true;
                    break;
                }
            }

            cancel?.throwIfCanceled();

            if(captureAllImagesBeforeCallback && imageCaptureCallback && images){
                for(let i=0;i<images.length;i++){
                    const imageMedia=images[i];
                    if(!imageMedia){continue}
                    const _continue=await imageCaptureCallback(imageMedia,page,i,null);
                    cancel?.throwIfCanceled();
                    if(_continue===false){
                        break;
                    }
                }
            }

            const pageCapture:ConvoPageCapture={
                url,
                images,
                pdf,
                setId,
                completed,
            };

            if(!this.options.discardOutput){
                this.output.captures.push(pageCapture);
            }

            return pageCapture;

        }finally{

            if(!keepBrowserOpen){
                await page?.close();
            }

        }
    }
}

const chromePaths=[
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
]
const getChromePathAsync=async ()=>{
    for(const p of chromePaths){
        if(await pathExistsAsync(p)){
            return p;
        }
    }
    return null;
}
