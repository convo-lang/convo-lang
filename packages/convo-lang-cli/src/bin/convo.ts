import { CancelToken, getObjKeyCount, parseCliArgsT, safeParseNumberOrUndefined } from "@iyio/common";
import { spawnAsync, stopReadingStdIn } from "@iyio/node-common";
import { createConvoCliAsync } from "../lib/ConvoCli";
import { ConvoCliOptions } from "../lib/convo-cli-types";
import { convertConvoInterfacesAsync } from "../lib/convo-interface-converter";
import { createNextAppAsync } from "../lib/create-next-app";

type Args=ConvoCliOptions;
const args=parseCliArgsT<Args>({
    args:process.argv,
    startIndex:2,
    defaultKey:'source',
    restKey:'spawn',
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
