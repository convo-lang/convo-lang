import { getConvoDbMapFromStrings } from "@convo-lang/db/db-map.js";
import { CancelToken, getObjKeyCount, normalizePath, parseCliArgsT, safeParseNumber, safeParseNumberOrUndefined } from "@iyio/common";
import { spawnAsync, stopReadingStdIn } from "@iyio/node-common";
import { realpath } from "node:fs/promises";
import { createConvoCliAsync, initConvoCliAsync } from "../lib/ConvoCli.js";
import { runConvoCliApiAsync } from "../lib/convo-cli-api-server.js";
import { generateEmbeddingAsync } from "../lib/convo-cli-embeddings.js";
import { defaultConvoCliApiPort, loadEnvFileAsync } from "../lib/convo-cli-lib.js";
import { ConvoCliOptions } from "../lib/convo-cli-types.js";
import { convertConvoInterfacesAsync } from "../lib/convo-interface-converter.js";
import { createNextAppAsync } from "../lib/create-next-app.js";


type Args=ConvoCliOptions;
const args=parseCliArgsT<Args>({
    args:process.argv,
    startIndex:2,
    defaultKey:'source',
    restKey:'spawn',
    flags:[
        'parse',
        'convert',
        'bufferOutput',
        'cmdMode',
        'repl',
        'stdin',
        'syncWatch',
        'printState',
        'printFlat',
        'printMessages',
        'prefixOutput',
        'createNextApp',
        'listModels',
        'make',
        'makeTargets',
    ],
    converter:{
        source:args=>args[0],
        inline:args=>args[0],
        config:args=>args[0],
        inlineConfig:args=>args[0],
        sourcePath:args=>args[0],
        out:args=>args[0],
        parse:args=>args.length?true:false,
        convert:args=>args.length?true:false,
        parseFormat:args=>safeParseNumberOrUndefined(args[0]),
        bufferOutput:args=>args.length?true:false,
        cmdMode:args=>args.length?true:false,
        repl:args=>args.length?true:false,
        stdin:args=>args.length?true:false,
        allowExec:args=>args[0] as any,
        prepend:args=>args[0],
        exeCwd:args=>args[0],
        syncTsConfig:args=>args,
        syncWatch:args=>args.length?true:false,
        syncOut:args=>args[0],
        spawn:args=>args.join(' '),
        spawnDir:args=>args[0],
        printState:args=>args.length?true:false,
        printFlat:args=>args.length?true:false,
        printMessages:args=>args.length?true:false,
        prefixOutput:args=>args.length?true:false,
        createAppDir:args=>args[0],
        createNextApp:args=>args.length?true:false,
        createAppWorkingDir:args=>args[0],
        listModels:args=>args.length?true:false,
        make:args=>args.length?true:false,
        makeTargets:args=>args.length?true:false,
        var:args=>args,
        vars:args=>args,
        varsPath:args=>args,
        graph:args=>args.length?true:false,
        disableWriteGraphOnCompletion:args=>args.length?true:false,
        worker:args=>args,
        workerBasePath:args=>args[0],
        watchWorkers:args=>args.length?true:false,
        dryRun:args=>args.length?true:false,
        disableThreadLogging:args=>args.length?true:false,
        api:args=>args.length?true:false,
        apiPort:args=>safeParseNumber(args[0],defaultConvoCliApiPort),
        apiReusePort:args=>args.length?true:false,
        apiCors:args=>args.length?true:false,
        apiCorsOrigins:args=>args,
        apiLogging:args=>args.length?true:false,
        env:args=>args,
        generateEmbedding:args=>args[0],
        embeddingModel:args=>args[0],
        embeddingFormat:args=>args[0],
        embeddingProvider:args=>args[0],
        embeddingDimensions:args=>safeParseNumberOrUndefined(args[0]),
        dbMap:args=>args,
    }
}).parsed as Args;

const main=async()=>{

    const cancel=new CancelToken();
    let done=false;
    let shutdownIv:any;
    let killCount=0;
    process.on('SIGINT',()=>{
        killCount++;
        if(killCount>1){
            console.log('Forcefully exiting process');
            process.exit();
        }
        stopReadingStdIn();
        console.log("Stopping Convo-Lang");
        cancel.cancelNow();
        shutdownIv=setTimeout(()=>{
            if(!done){
                console.warn('Killing server. Shutdown took too long');
                process.exit();
            }
        },3000);
    });
    process.on('unhandledRejection',(reason,promise)=>{
        console.error('Unhandled Rejection at:',promise,'reason:',reason);
        process.exit(1);
    });
    process.on('uncaughtException',(ex,origin)=>{
        console.error('Unhandled Exception',ex,'origin',origin);
        process.exit(1);
    });

    if(args.env){
        await loadEnvFileAsync(args.env);
    }

    args.exeCwd=normalizePath(args.exeCwd?await realpath(args.exeCwd):globalThis.process.cwd());

    let toolPromises:Promise<any>[]=[];

    if(!getObjKeyCount(args)){
        args.repl=true;
    }

    if(args.syncTsConfig?.length){
        toolPromises.push(convertConvoInterfacesAsync(args,cancel));
    }

    if(args.createNextApp){
        toolPromises.push(createNextAppAsync(args,cancel));
    }

    if(args.spawn){
        toolPromises.push(spawnAsync({
            cmd:args.spawn,
            cwd:args.spawnDir,
            cancel,
        }));
    }

    if(args.generateEmbedding){
        await initConvoCliAsync(args);
        toolPromises.push(generateEmbeddingAsync(args.generateEmbedding,args));
    }

    if(args.api){
        await initConvoCliAsync(args);
        const r=args.dbMap?getConvoDbMapFromStrings(args.dbMap):undefined;
        if(r?.success===false){
            console.error(r.error);
            process.exit(1);
        }
        toolPromises.push(runConvoCliApiAsync({
            port:args.apiPort,
            reusePort:args.apiReusePort,
            cors:args.apiCorsOrigins?.length?args.apiCorsOrigins:args.apiCors,
            enableLogging:args.apiLogging,
            dbMap:r?.success?r.result:undefined,
        },cancel));
    }

    await Promise.all(toolPromises);

    if(!toolPromises.length){
        const cli=await createConvoCliAsync(args);
        try{
            if(args.listModels){
                const models=await cli.convo.getAllModelsAsync();
                console.log(JSON.stringify(models,null,4));
            }else{
                await cli.executeAsync(cancel);
            }
        }catch(ex){
            console.error('convo execution failed',ex);
            process.exit(1);
        }finally{
            cli.dispose();
        }
    }
    stopReadingStdIn();
    clearTimeout(shutdownIv);
    done=true;
}

main();
