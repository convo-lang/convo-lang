
import { aiCompleteConvoModule } from "@iyio/ai-complete";
//import { aiCompleteLambdaModule } from "@iyio/ai-complete-lambda";
import { openAiModule } from "@iyio/ai-complete-openai";
import { EnvParams, ScopeRegistration, delayAsync, getErrorMessage, initRootScope, parseCliArgsT, rootScope, safeParseNumberOrUndefined } from "@iyio/common";
import { realpath, writeFile } from "fs/promises";
import { join } from "path";
import { ConvoWebCrawler } from "../lib/ConvoWebCrawler";
import { parseConvoWebInstruction } from "../lib/convo-web-crawler-lib";
import { writeConvoCrawlerPreviewAsync } from "../lib/convo-web-crawler-output-previewer-writer";
import { ConvoWebResearchOptions, ConvoWebSearchOptions, ConvoWebSearchResult, ConvoWebTunnelUrls } from "../lib/convo-web-crawler-types";
import { defaultConvoCrawlerWebServerPort, runConvoCrawlerWebServer } from "../lib/convo-web-crawler-webserver";
import { doConvoCrawlerDevStuffAsync } from "../tmp/tmp-dev";
import { loadTmpEnv } from "../tmp/tmp-env";
import { startTmpTunnelAsync, stopTmpTunnelAsync } from "../tmp/tmp-ngrok";



interface Args
{
    /**
     * Scrapes a url
     */
    url?:string;

    /**
     * Captures a url
     */
    capture?:string;

    /**
     * Preforms a google search and scrapes top search result
     */
    search?:string;

    pageRequirement?:string;

    researchTitle?:string;

    researchSubject?:string[];

    researchConclusion?:string;

    autoTunnel:boolean;

    dev?:boolean;

    debug?:boolean;

    writePreviewer?:string;

    serve?:boolean|number;

    browserConnectWsUrl?:string;

    chromeBinPath?:string;

    chromeDataDir?:string;

    useChrome?:boolean;

    openChrome?:boolean;

    chromeNoSandbox?:boolean;

    launchArgs?:string[];

    openTunnel?:string;

    httpAccessPoint?:string;

    maxSearchConcurrent?:number;

    maxCrawlConcurrent?:number;

    instruction?:string[];

    instructionSourcePath?:string;

    instructionOutputPath?:string;

    executeInstructionInParallel?:boolean;

    maxInstructions?:number;

    pageSummaryInstructions?:string;
}

const args=parseCliArgsT<Args>({
    args:process.argv,
    startIndex:2,
    restKey:'launchArgs',
    converter:{
        url:args=>args[0],
        capture:args=>args[0],
        search:args=>args[0],
        writePreviewer:args=>args[0],
        pageRequirement:args=>args[0],
        researchTitle:args=>args[0],
        researchSubject:args=>args,
        researchConclusion:args=>args[0],
        chromeNoSandbox:args=>args.length?true:false,
        launchArgs:args=>args,
        autoTunnel:args=>args.length?true:false,
        openChrome:args=>args.length?true:false,
        useChrome:args=>args.length?true:false,
        dev:args=>args.length?true:false,
        debug:args=>args.length?true:false,
        serve:args=>{
            const p=Number(args[0]);
            return isFinite(p)?p:true;
        },
        browserConnectWsUrl:args=>args[0],
        chromeBinPath:args=>args[0],
        chromeDataDir:args=>args[0],
        openTunnel:args=>args[0],
        httpAccessPoint:args=>args[0],
        maxCrawlConcurrent:args=>safeParseNumberOrUndefined(args[0]),
        maxSearchConcurrent:args=>safeParseNumberOrUndefined(args[0]),
        instruction:args=>args,
        instructionSourcePath:args=>args[0],
        instructionOutputPath:args=>args[0],
        executeInstructionInParallel:args=>args.length?true:false,
        maxInstructions:args=>safeParseNumberOrUndefined(args[0]),
        pageSummaryInstructions:args=>args[0],
    }
}).parsed as Args

loadTmpEnv();

const main=async ()=>{

    let exitCode=0;

    initRootScope((reg:ScopeRegistration)=>{
        reg.addParams(new EnvParams())
        //reg.use(aiCompleteLambdaModule);
        reg.use(openAiModule);
        reg.use(aiCompleteConvoModule);
    });

    await rootScope.getInitPromise();

    console.info('convo-web args',args);

    const crawler=new ConvoWebCrawler({
        googleSearchApiKey:process.env['NX_GOOGLE_SEARCH_API_KEY'],
        googleSearchCx:process.env['NX_GOOGLE_SEARCH_CX'],
        headed:true,
        debug:args.debug,
        browserConnectWsUrl:args.browserConnectWsUrl,
        chromeBinPath:args.chromeBinPath,
        chromeDataDir:args.chromeDataDir,
        useChrome:args.useChrome||args.openChrome,
        launchArgs:args.launchArgs,
        chromeNoSandbox:args.chromeNoSandbox,
        httpAccessPoint:args.httpAccessPoint
    });

    let httpAccessPoint:string|undefined;
    if(args.autoTunnel && !args.openChrome){

        // Call before starting tunnel
        await crawler.getOutDirAsync();

        httpAccessPoint=await startTmpTunnelAsync(
            args.serve===true?defaultConvoCrawlerWebServerPort:
            args.serve===false?undefined:args.serve);
        if(httpAccessPoint.endsWith('/')){
            httpAccessPoint=httpAccessPoint.substring(0,httpAccessPoint.length-1);
        }
        console.info(`Tunnel URL ${httpAccessPoint}`)
    }

    if(args.openTunnel){

        // Call before starting tunnel
        await crawler.getOutDirAsync();

        const dataDir=await crawler.getDataDirAsync();
        const urls:ConvoWebTunnelUrls={
            http:await startTmpTunnelAsync(8099,`convo-api-${args.openTunnel}`),
            vnc:await startTmpTunnelAsync(5910,`convo-display-${args.openTunnel}`)
        }
        await writeFile(join(dataDir,'tunnel-urls.json'),JSON.stringify(urls))
        console.info('api and display tunnels open',urls);
        while(true){
            await delayAsync(60000);
        }
        return;
    }

    if(httpAccessPoint){
        crawler.setHttpAccessPoint(httpAccessPoint);
    }

    if(args.openChrome){
        const browser=await crawler.getBrowserAsync();
        await browser.newPage();
        process.exit(0);
        return;
    }

    try{

        let done=false;

        if(args.dev){
            done=true;
            await doConvoCrawlerDevStuffAsync(crawler);
        }

        if(args.serve){

            runConvoCrawlerWebServer({
                port:(typeof args.serve==='number')?args.serve:undefined,
                displayUrl:httpAccessPoint
            });

            while(true){
                await delayAsync(60000);
            }
            return;
        }

        if(args.writePreviewer){
            const html=await writeConvoCrawlerPreviewAsync(args.writePreviewer);
            const outPath=join(args.writePreviewer,'index.html');
            await writeFile(outPath,html);
            console.info(`index written to ${outPath}`);
            return;
        }

        if(args.capture){
            await crawler.capturePageAsync({url:args.capture});
            done=true;
        }

        if(args.url){
            await crawler.convertPageAsync({url:args.url});
            done=true;
        }

        let searchResults:ConvoWebSearchResult|undefined;

        if(args.search){

            const options:ConvoWebSearchOptions={
                term:args.search,
                crawlOptions:{
                    pageRequirementPrompt:args.pageRequirement,
                    maxConcurrent:args.maxCrawlConcurrent,
                    summaryInstructions:args.pageSummaryInstructions,
                },
                maxConcurrent:args.maxSearchConcurrent
            }

            await crawler.writeInputAsync({
                name:args.researchTitle||args.search,
                search:options
            })

            searchResults=await crawler.searchAsync(options);

            done=true;
        }

        if(args.researchTitle || args.researchConclusion || args.researchSubject){
            if(!searchResults){
                console.error('--search required');
                exitCode=1;
                return;
            }

            if(!args.researchTitle){
                console.error('--researchTitle required');
                exitCode=1;
                return;
            }

            if(!args.researchConclusion){
                console.error('--researchConclusion required');
                exitCode=1;
                return;
            }

            if(!args.researchSubject){
                console.error('--researchSubject required');
                exitCode=1;
                return;
            }

            const options:ConvoWebResearchOptions={
                title:args.researchTitle,
                subjects:args.researchSubject,
                conclusion:args.researchConclusion,
                searchResults,
                instructions:args.instruction?.map(parseConvoWebInstruction),
                maxInstructions:args.maxInstructions,
                executeInstructionInParallel:args.executeInstructionInParallel,
            }

            await crawler.writeInputAsync({
                name:args.researchTitle,
                research:options,
            })

            await crawler.runResearchAsync(options);
            done=true;
        }else if(args.instruction){

            if(!args.instructionSourcePath){
                console.error('--instructionSourcePath required');
                exitCode=1;
                return;
            }

            await crawler.executeInstructionsAsync({
                sourcePath:args.instructionSourcePath,
                outPath:args.instructionOutputPath||join(await crawler.getOutDirAsync(),`instructions-${Date.now()}.md`),
                instructions:args.instruction?.map(parseConvoWebInstruction),
                maxInstructions:args.maxInstructions,
                executeInstructionInParallel:args.executeInstructionInParallel,
            })

            done=true;
        }

        if(done){
            const outPath=await crawler.writeOutputAsync();
            console.info(`Output written to ${await realpath(outPath)}`);
        }else{
            console.info(`Usage:
--url                              url             scrapes and converts a URL into a markdown document with a summarization
--capture                          url             Captures a URL as a set of images and a PDF
--search                           term            Preforms a search and scrapes the top results
--pageRequirement                  prompt          A prompt that is used to check if a page should be scraped
--researchTitle                    title           Title for research document
--researchSubject                  subject         A subject that should be searched. Multiple subjects can be researched by supplying multiple --researchSubject arguments
--researchConclusion               conclusion      The conclusion that should be derived from research
--instruction                      instruction     An instruction that will be executed after research or based on a source markdown document. See instruction format for more details
--instructionSourcePath            path            Path to a markdown document to base instruction on. Ignored when running research, the result research document will be used.
--instructionOutputPath            path            Path to write instruction results to. Ignored when running research, results will be appended to research output.
--executeInstructionInParallel                     Causes instructions to be executed in parallel. When instructions are executed in parallel the instructions are not aware of each other
--maxInstructions                  number          The max number of instructions to execute. Since instructions can form loops maxInstructions prevent infinite instruction looping.
--pageSummaryInstructions          instruction     An instruction given to the page summary instructions
--autoTunnel                                       Opens a temporary Ngrok tunnel for relaying images to external LLMs
--serve                            [ port = 8899 ] Starts a webserver that allows you to browse outputs
--browserConnectWsUrl              url             A Chrome remote debugger URL
--chromeBinPath                    path            Custom path to a chrome binary
--chromeDataDir                    path            Path to a directory to start chrome user profile data
--useChrome                                        Auto launches and uses a standard chrome instance with a stable user profile
--openChrome                                       Opens an instance of Chrome that can be used to sign-in or do other browser related tasks before scraping
--chromeNoSandbox                                  Causes Chrome and Chromium to be launched in no sandbox mode by passing the --no-sandbox args
--debug                                            Print debug information
--                                 ... rest        All arguments passed after -- are passed to Chrome or Chromium

Scrape a single URL:
convo-web --url https://example.com


Search for a web pages about going fast:
convo-web --search 'go fast turn left' --pageRequirement 'The page should be related to driving fast'


Research Nuclear fusion reactors
convo-web \\
    --search 'Nuclear fusion reactors' \\
    --pageRequirement 'The page should contain information about Nuclear fusion reactor that are currently under development or operating' \\
    --researchTitle 'The power of a star' \\
    --researchSubject 'Operating reactors' \\
    --researchSubject 'Reactors under development' \\
    --researchSubject 'Net gain' \\
    --researchConclusion 'How long will it take until we have net energy gains'

Start a web server with a tunnel that allows you to browse outputs
convo web --serve --autoTunnel


## Instructions
When running research or by supplying the path to a research document you can supply a list of instructions
to be executed to product custom output based on the research. By default instructions are executed
in series and can reference the output of previous instructions. if --executeInstructionInParallel is
supplied all instruction are executed in parallel and are unaware of each other. Instructions can
also specify other instruction to goto based on the other instruction's id or title, This allows you to
implement conditional logic within the instructions.


### Instruction Format:
Each instruction has an id, title and body which are separated by double colons (::), id and title
are optional and will default to a value based on the index of the instruction. Instruction indexes
are 1 based.

examples:

greenCompany::Green Energy Companies::List all companies involved in green energy.
id = greenCompany
title = Green Energy Companies
body = List all companies involved in green energy

High Risk Stocks::List all high risk stocks and rate them 1 to 5, 5 being the most risky
id = 1
title = High Risk Stocks
body = List all high risk stocks and rate them 1 to 5, 5 being the most risky

Give a summary of the company that is best positioned to have the hight growth rate this year
id = 1
title = Instruction 1
body = Give a summary of the company that is best positioned to have the hight growth rate this year


### Instruction control functions:
Instructions can call a set of functions to call the instruction execution path. Using these control
functions complex conditional logic can be implemented

functions:
\`\`\` convo
# goes to the specified instruction based on the id of the instruction. Only call when explicity told to by the user.
> gotoInstruction(
    # Id of instruction to goto
    id:string
)

# Skips the current instruction. Only call when explicity told to by the user.
> skipInstruction()

# Stops execution of all instructions. Only call when explicity told to by the user.
> stopExecution()
\`\`\`

### Instruction usage examples


convo-web \\
    --search 'Nuclear fusion reactors' \\
    --pageRequirement 'The page should contain information about Nuclear fusion reactor that are currently under development or operating' \\
    --researchTitle 'The power of a star' \\
    --researchSubject 'Operating reactors' \\
    --researchSubject 'Reactors under development' \\
    --researchSubject 'Net gain' \\
    --researchConclusion 'How long will it take until we have net energy gains' \\
    --instruction 'The Big Guys::List the 3 most powerful reactors' \\
    --instruction 'If net energy could be possible in the next 10 years goto the "near" instruction, otherwise goto the "far" instruction' \\
    --instruction 'near::Net Gains in the Near Future::Describe the final steps to net gain' \\
    --instruction 'stop execution' \\
    --instruction 'far::Net Gains, another 30 years?::Talk about how fusion always seems to be 30 years away'


convo-web \\
    --instructionSourcePath 'convo-crawler-out/2024-06-07-00-27-432ee246-9aa2-470a-b692-f0a0afa329fc/research-1717734630603.md' \\
    --instructionOutputPath 'convo-crawler-out/2024-06-07-00-27-432ee246-9aa2-470a-b692-f0a0afa329fc/instructions-1.md' \\
    --instruction 'Hobbies::List all the hobbies of the astronauts' \\
    --instruction 'Not Made for Space::Give an example of why being in space is hard on the human body'
`)
        }

    }catch(ex){
        console.error('Crawler failed')
        console.error(getErrorMessage(ex));
        console.error('stack',(ex as any)?.stack);
        throw ex;
    }finally{
        if(args.autoTunnel){
            await stopTmpTunnelAsync();
        }
        process.exit(exitCode);
    }


}

main();

