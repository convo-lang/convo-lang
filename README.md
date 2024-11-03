# Convo-Lang
A Conversational Language

![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/learn-convo-demo.webp)

**Interactive Demo** - [https://learn.convo-lang.ai/playground](https://learn.convo-lang.ai/playground)

**Convo-Lang Tutorial**  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai/learn)

**GitHub** - [ https://github.com/convo-lang/convo-lang](https://github.com/convo-lang/convo-lang)

**NPM** - [https://www.npmjs.com/package/@convo-lang/convo-lang](https://www.npmjs.com/package/@convo-lang/convo-lang)


## What is Convo-Lang?
Convo-Lang is a programming language built from the ground up for prompt engineers and AI application
developers. The goal of Convo-Lang is to simplify to development of LLM based applications and 
provided a uniform syntax for working with all LLMs.

Convo-Lang is a mixture between a procedural programming language, prompting template system and 
conversation state management system. You can execute convo-lang in Javascript, Python,
from the command line or directly in VSCode.

Convo-Lang aims to provided a uniform prompting syntax that is LLM agnostic and allows you to
store both prompts, metadata and tradition programming logic in a single file or template string.

The convo-lang syntax supports advanced features such as function calling, tool usage and vision.
The Convo-Lang ecosystem consists of a parser, interpreter, Typescript/Javascript/Python libraries,
a CLI, and a vscode extension for syntax highlighting and in-editor script execution.


## Packages
- @convo-lang/convo-lang - Contains the Convo-Lang Conversation Engine, and a Typescript/Javascript library to use Convo-Lang in your application.
- @convo-lang/convo-lang-react - Contains UI pre-built UI components including a fully functional chat component.
- @convo-lang/convo-lang-openai - Conversation adapter for OpenAI.
- @convo-lang/convo-lang-api-routes - A backend for relaying messages between the browser and LLM backends such as OpenAI.
- @convo-lang/convo-vfs - Used to integrate Convo-Lang into virtual file systems.
- @convo-lang/convo-lang-cli - A CLI interface that allows you to execute and parse convo-lang files.
- @convo-lang/convo-lang-tools - Contains the convo-lang vscode extension, which includes syntax highlighting,
  in-editor script execution, script parsing, and other helpful tools for working with convo-lang.
  In most cases, you will not install this package but instead install the vscode convo-lang extension.


## Installation
For use in an application install the @convo-lang/convo-lang package
``` sh
npm i @convo-lang/convo-lang
```

For use on the command line install the @convo-lang/convo-lang-cli package
``` sh
npm i @convo-lang/convo-lang-cli -g
```


## VSCode extension
You will also probably want to install the vscode extension for syntax highlighting and other
developer niceties. You can install the vscode extension by searching for "convo-lang" in the
vscode extension tab.

https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools 

## Using convo-lang in a NextJs project

Install packages:
``` sh
npm i \
    @convo-lang/convo-lang \
    @convo-lang/convo-lang-react \
    @convo-lang/convo-lang-openai \
    @convo-lang/convo-lang-api-routes \
    @iyio/nextjs-common \
    @iyio/react-common \
    @iyio/node-common
```

Add API endpoint to `/pages/api/convo-lang/[convo-api-action].ts`. This API endpoint will be used
to relay messages between LLMs while keep your API secrets safe.
``` ts
import { createRequestHandler } from "@/lib/api-handler";
import { createConvoLangApiRoutes } from "@convo-lang/convo-lang-api-routes";
import { initOpenAiBackend } from '@convo-lang/convo-lang-openai';

initOpenAiBackend();

const routes=createConvoLangApiRoutes({prefix:'/api/convo-lang/'});

const handler=createRequestHandler({routes});

export default handler;

```

The code below create a fully functional chat interface with a website assistant agent
``` tsx
import { ConversationView } from "@convo-lang/convo-lang-react";
import { NextJsBaseLayoutView } from "@iyio/nextjs-common";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const exampleConvo=/*convo*/`

> define
agentName='Doc'

> system
Your name is {{agentName}} and you're helping a user navigate a website

Pages:
- Dashboard: path = /
- Contact: path = /contact
- News: path = /news
- Profile: path = /users-place
- Projects: path = /project-jobs

> extern openPage(
    # Path of page to open
    path:string
)

> assistant
Hi 👋, I'm {{agentName}}. I'm here to help you navigate this awesome website

`


export function AgentView(){

    return (
        <NextJsBaseLayoutView>
            <ConversationView
                theme="dark"
                showInputWithSource
                enabledSlashCommands
                template={exampleConvo}
                httpEndpoint="/api/convo-lang"
                externFunctions={{
                    openPage:async (path:string)=>{
                        window.history.pushState(null,'',path);
                    },
                }}
            />
        </NextJsBaseLayoutView>
    )

}

```

## NextJs example project
The `convo-lang/convo-lang-nextjs-example` repo contains a fully functional example of using Convo-Lang 
in a NextJs project to create a collection of agents that can manipulate an interactive canvas.

https://github.com/convo-lang/convo-lang-nextjs-example

![NextJS example](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-nextjs-example.webp?raw=true)



## NodeJs example project
The `convo-lang/convo-lang-node-example` repo contains a full featured CLI tool that can load
Convo-Lang scripts, accept messages over HTTP and accept live input.

https://github.com/convo-lang/convo-lang-node-example

![NextJS example](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-node-example.webp?raw=true)


## Using Convo-Lang in without a UI framework
When using convo-lang in a javascript application, you will primarily interact with Conversation objects.
Conversation objects store the messages of a convo script and allow new messages to be appended
and LLMs to respond to messages from the user.

``` js
import { Conversation } from '@convo-lang/convo-lang';
import { initRootScope, EnvParams } from '@iyio/common';
import { openaiConvoModule } from '@convo-lang/convo-lang-openai';

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

    // Converts and relays message to OpenAI
    reg.use(openaiConvoModule);

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

```

## Using the convo-lang extension
With the convo vscode extension installed, you can execute convo scripts directly in vscode. Just
press **(CMD+R)** to run a script.

You can also run snippets of convo scripts that are embedded in other
document types. Just highlight the convo code you want to run, open the command palette, and
search for "Complete Convo Conversation" and press enter. Then the snippet will be opened in a new
convo file and completed. This is great for quick prototyping and testing prompts in your application
without having to start your full application.

## Using the CLI
The convo CLI can be used to execute convo scripts from the command line

``` sh
# install the convo cli
npm install -g @iyio/convo-cli

# Results will be printed to stdout
convo talky-time.convo

# Results will be written to a new file named something-happened.convo
convo talky-time.convo --out something.convo

# Result will be written to the source input file. This allows you to have a continuous conversation
convo talky-time.convo --out .
```

There is currently only one way to configure the convo cli and vscode extension. This will be extended
soon to include reading configuration files from your current workspace. 


## CLI and extension configuration
To allow convo to access OpenAI, create a JSON file called ~/.config/convo/convo.json and add the
following contents. Remember to replace the API key with your OpenAI api key.

``` json
{
    "env":{
        "openAiApiKey":"YOUR_OPEN_AI_KEY",
        "openAiChatModel":"gpt-4o",
        "openAiVisionModel":"gpt-4o",
        "openAiAudioModel":"whisper-1",
        "openAiImageModel":"dall-e-3"
    }
}
```

## Learn More
You can check out an interactive demo of Convo-Lang here - [https://learn.convo-lang.ai/playground](https://learn.convo-lang.ai/playground)

If you want to learn the Convo-Lang language check out this tutorial  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai/learn)

## Contact

Email - doc@convo-lang.ai

X - https://x.com/ConvoLang

Join our Discord Server - https://discord.gg/GyXp8Dsa
