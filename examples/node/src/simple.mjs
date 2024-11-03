import { Conversation } from "@convo-lang/convo-lang";
import { initOpenAiBackend } from '@convo-lang/convo-lang-openai';


let convo='';

// Read args as lines of convo
for(let i=2;i<process.argv.length;i++){
    convo+=process.argv[i]+'\n\n';
}


initOpenAiBackend();

const main=async ()=>{

    const conversation=new Conversation();

    const done={done:false}
    spin(done);

    await conversation.completeAsync(convo);

    done.done=true;
    console.log('\n\n');
    console.log('-----------------------------------');
    console.log(conversation.convo);
    console.log('-----------------------------------');

    process.exit(0);

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

main();

