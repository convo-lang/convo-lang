import readline from "node:readline";

const fullMsgChars=['>','@','#','\\']

export const startRepl=async (conversation,lock,cancel)=>{

    console.log('Entering REPL');
    console.log('Enter "/exit" to exit');
    console.log('Enter "/source" to view full conversation');
    console.log('');

    let msgLines=[];

    while(!cancel.isCanceled){

        let line=await readLineAsync(cancel);

        if(cancel.isCanceled || (!msgLines.length && line==='/exit')){
            break;
        }

        if((!msgLines.length && line==='/source')){
            console.log('---------------------------------');
            console.log(conversation.convo);
            console.log('---------------------------------');
            continue;
        }

        let fullMessage=false;

        if(!msgLines.length && fullMsgChars.includes(line[0])){
            if(line==='\\'){
                msgLines.push('');
            }else{
                msgLines.push(line);
            }
            continue;
        }else if(!line){
            if(msgLines.length){
                line=msgLines.join('\n');
                fullMessage=true;
                msgLines.splice(0,msgLines.length);
            }else{
                continue;
            }
        }else if(msgLines.length){
            if(line==='\\'){
                msgLines.push('');
            }else{
                msgLines.push(line);
            }
            continue;
        }

        if(!fullMessage){
            await new Promise(resolve=>{
                process.stdout.moveCursor(0,-1,resolve);
            })
            await new Promise(resolve=>{
                process.stdout.clearLine(0,resolve);
            })
            console.log(`> user\n${line}`);
        }

        const release=await lock.waitAsync(cancel);
        try{

            try{
                if(fullMessage){
                    conversation.append(line);
                }else{
                    conversation.appendUserMessage(line);
                }
            }catch(ex){
                console.error('Invalid convo',ex);
                continue;
            }

            const len=conversation.convo.length;
            const done={done:false};
            spin(done);
            await conversation.completeAsync();
            done.done=true;
            await new Promise(resolve=>{
                process.stdout.clearLine(0,resolve);
            })
            console.log(conversation.convo.substring(len));

        }catch(ex){
            console.error('Completion failed',ex);
        }finally{
            release();
        }

    }

    console.log('REPL exited');
}

const spin=(done)=>{
    console.log('');
    const iv=setInterval(()=>{
        if(done.done){
            clearInterval(iv);
            return;
        }
        process.stdout.write('.');
    },1000);
}

const readLineAsync=(cancel) => {
    const rl=readline.createInterface({input:process.stdin});
    return new Promise((resolve)=>{
        rl.prompt();
        rl.on('line',(line)=>{
            rl.close();
            resolve(line.trim());
        });
        cancel.subscribe(()=>{
            resolve('');
        })
    });
};
