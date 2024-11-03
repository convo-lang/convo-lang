import { readFileSync } from "fs";
import { Conversation } from "@convo-lang/convo-lang";
import { initOpenAiBackend } from '@convo-lang/convo-lang-openai';
import { startRepl } from "./repl.mjs";
import { startHttpServer } from "./http.mjs";
import { CancelToken, Lock } from "@iyio/common";
import { loadEnv } from "./env.mjs";

let filePath=undefined;
let convo=undefined;
let listenPort=undefined;
let interactive=false;
let options=undefined;
let envPaths=undefined;
const defaultPort=8091;

export const printHelp=()=>{
    console.log(`Usage:
-f | --file         [file path]    Loads and executes a convo file from the given path
-c | --convo        [raw convo]    Loads the given input and executes it
-l | --listen       [port]         Creates an HTTP server that will accept requests of. Default = 8091
                                   raw convo at http://0.0.0.0:{port}/convo
-o | --options      [options]      Conversation options in JSON format
-i | --interactive                 Starts an interact REPL session
-e | --env          [.env path]    Path to an .env file to load. Default = .env.development and .env
                                   --env can be passed multiple times
-h | --help                        Print this help menu
`)
}

// Read args
for(let i=2;i<process.argv.length;i++){
    const arg=process.argv[i];
    const next=process.argv[i+1]??'';

    switch(arg){

        case '-f':
        case '--file':
            filePath=next;
            i++;
            break;

        case '-c':
        case '--convo':
            convo=next;
            i++;
            break;

        case '-l':
        case '--listen':
            if(i<process.argv.length-1 && next[0]!=='-'){
                listenPort=Number(next);
                i++;
                if(!isFinite(listenPort)){
                    console.error('Invalid listen port number');
                    process.exit(1);
                }
            }else{
                listenPort=defaultPort;
            }
            break;

        case '-h':
        case '--help':
            printHelp();
            process.exit(0);

        case '-o':
        case '--options':
            try{
                options=JSON.parse(next);
                i++;
            }catch(ex){
                console.error('Invalid JSON options');
                process.exit(1);
            }
            break;

        case '-i':
        case '--interactive':
            interactive=true;
            break;

        case '-e':
        case '--env':
            if(!envPaths){
                envPaths=[];
            }
            envPaths.push(next);
            i++;
            break;

        default:
            console.error(`Unknown argument - ${arg}`);
            printHelp();
            process.exit(1);
    }
}

loadEnv(envPaths);


initOpenAiBackend();

const main=async ()=>{

    const conversation=new Conversation({
        ...options,
    });

    if(filePath && !convo){
        convo=readFileSync(filePath);
    }

    const lock=new Lock(1);
    const cancel=new CancelToken();

    process.on('SIGINT',()=>{
        console.log("Shuting down");
        cancel.cancelNow();
    });

    if(convo){
        try{
            conversation.append(convo);
        }catch(ex){
            console.error('Append conversation failed',ex);
            process.exit(1);
        }
        try{
            await conversation.completeAsync();
        }catch(ex){
            console.error('Conversation complete failed',ex);
            process.exit(1);
        }
        console.log(conversation.convo);
    }

    const promises=[];

    if(listenPort){
        promises.push(startHttpServer(listenPort,conversation,lock,cancel));
    }

    if(interactive){
        promises.push(startRepl(conversation,lock,cancel).then(()=>cancel.cancelNow()))
    }

    await Promise.all(promises);

    process.exit(0);

}

main();
