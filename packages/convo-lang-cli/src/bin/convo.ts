import { CancelToken, getObjKeyCount, normalizePath, parseCliArgsT, safeParseNumberOrUndefined } from "@iyio/common";
import { spawnAsync, stopReadingStdIn } from "@iyio/node-common";
import { realpath } from "node:fs/promises";
import { createConvoCliAsync } from "../lib/ConvoCli.js";
import { ConvoCliOptions } from "../lib/convo-cli-types.js";
import { convertConvoInterfacesAsync } from "../lib/convo-interface-converter.js";
import { createNextAppAsync } from "../lib/create-next-app.js";















const flags=['make'] as const;

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
    }
}).parsed as Args;

const main=async()=>{

    const cancel=new CancelToken();
    let done=false;
    let shutdownIv:any;
    process.on('SIGINT',()=>{
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
        }))
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
