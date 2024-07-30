import { Conversation } from '@convo-lang/convo-lang';
import { initRootScope, EnvParams } from '@iyio/common';
import { aiCompleteConvoModule } from '@iyio/ai-complete';
import { openAiModule } from '@iyio/ai-complete-openai';

// initRootScope is used to configure services and configuration variables
initRootScope(reg=>{

    // register OpenAI configuration variables. These variates could also be stored as environment
    // variables and loaded using reg.addParams(new EnvParams()).
    reg.addParams({
        "openAiApiKey":"YOUR_OPEN_AI_KEY",
        "openAiChatModel":"gpt-4-1106-preview",
        "openAiVisionModel":"gpt-4-vision-preview",
        "openAiAudioModel":"whisper-1",
        "openAiImageModel":"dall-e-3"
    })

    // EnvParams can optionally be used to load configuration variables from process.env
    reg.addParams(new EnvParams());

    // Registers the AiComplete module that is used to relay messages to LLMs
    reg.use(aiCompleteConvoModule);

    // Registers the OpenAI module that will relay messages to OpenAI
    reg.use(openAiModule);

    // aiCompleteLambdaModule can be used to relay messages to a lambda function for use in the browser
    //reg.use(aiCompleteLambdaModule);
})

const main=async ()=>{
    const convo=new Conversation();

    // adding /*convo*/ before a template literal will give you convo syntax highlighting when you have
    // the convo-lang vscode extension installed.

    convo.append(/*convo*/`
        > system
        You are a friendly and very skilled fisherman. Taking a group of tourist on a fishing expedition
        off the coast of Maine.

        > user
        What kind of clothes should I wear?
    `);

    // Calling completeAsync will answer the user's question using the configured LLM
    await convo.completeAsync();


    // The convo property of the Conversation object will be updated with the answer from the LLM
    console.log(convo.convo)

    // You can get a flatted view of the conversation by calling flattenAsync. The flatted version
    // of the conversation contains messages with all templates populated and is suitable to be
    // used to render a view of the conversation to the user.
    const flat=await convo.flattenAsync();
    console.log('flat',flat.messages);
}

main();
