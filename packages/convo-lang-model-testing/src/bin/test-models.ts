import { ConvoModelInfo, ConvoModelTestManager, convoAnthropicModule, convoOpenAiModule, knownConvoAnthropicModels, knownConvoOpenAiModels } from "@convo-lang/convo-lang";
import { bedrockModels, convoBedrockModule } from '@convo-lang/convo-lang-bedrock';
import { EnvParams, initRootScope, parseCliArgsT, rootScope } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";


interface Args
{
    all?:boolean;
    model?:string[];
    bedrock?:boolean;
    openai?:boolean;
    anthropic?:boolean;
    oneAtTime?:boolean;
    v?:boolean;
}
const args=parseCliArgsT<Args>({
    args:process.argv,
    startIndex:2,
    defaultKey:'model',
    converter:{
        all:args=>args.length?true:false,
        model:args=>args,
        bedrock:args=>args.length?true:false,
        openai:args=>args.length?true:false,
        anthropic:args=>args.length?true:false,
        oneAtTime:args=>args.length?true:false,
        v:args=>args.length?true:false,

    }
}).parsed as Args;

const allModels=[
    ...knownConvoOpenAiModels,
    ...knownConvoAnthropicModels,
    ...bedrockModels,
]

const main=async ({
    all,
    model,
    bedrock,
    openai,
    anthropic,
    oneAtTime,
    v:verbose,
}:Args)=>{

    if(verbose){
        console.log('Verbose output enabled')
    }

    initRootScope(reg=>{
        reg.addParams(new EnvParams());
        reg.addParams({awsProfile:'convo-lang-cli'})
        reg.use(nodeCommonModule);

        //reg.use(openaiConvoModule);

        reg.use(convoOpenAiModule);
        reg.use(convoAnthropicModule);
        reg.use(convoBedrockModule);
    });
    await rootScope.getInitPromise();

    const testModels:ConvoModelInfo[]=[];

    if(all){
        testModels.push(...allModels);
    }else{
        if(model){
            const matches=allModels.filter(m=>model.includes(m.name));
            if(!matches.length){
                throw new Error(`No model found by name - ${model.join(', ')}`)
            }
            testModels.push(...matches);
        }

        if(bedrock){
            testModels.push(...bedrockModels);
        }

        if(openai){
            testModels.push(...knownConvoOpenAiModels);
        }

        if(anthropic){
            testModels.push(...knownConvoAnthropicModels);
        }
    }

    const manager=new ConvoModelTestManager({
        models:testModels,
        parallel:!oneAtTime,
        printUpdates:true,
        verbose
    });

    await manager.runTestAsync();

    manager.printResults(!verbose);

    manager.printUpdate();

    console.log('Done');

}

main(args);

