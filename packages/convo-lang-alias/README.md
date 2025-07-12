# Convo-Lang
A Conversational Language

---
> ⚠️⚠️⚠️ This package is an alias of @convo-lang/convo-lang ⚠️⚠️⚠️
>
> ⚠️⚠️⚠️ Use [@convo-lang/convo-lang](https://www.npmjs.com/package/@convo-lang/convo-lang) instead - https://www.npmjs.com/package/@convo-lang/convo-lang ⚠️⚠️⚠️
---

![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/learn-convo-demo.webp)

**Interactive Demo** - [https://learn.convo-lang.ai/playground](https://learn.convo-lang.ai/playground)

**Convo-Lang Tutorial**  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai/learn)

**GitHub** - [ https://github.com/convo-lang/convo-lang](https://github.com/convo-lang/convo-lang)

**NPM** - [https://www.npmjs.com/package/@convo-lang/convo-lang](https://www.npmjs.com/package/@convo-lang/convo-lang)

**VSCode Extension** - [https://marketplace.visualstudio.com/items?itemName=iyio.convo-lang-tools](https://marketplace.visualstudio.com/items?itemName=iyio.convo-lang-tools)


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
- @convo-lang/convo-lang-bedrock - Conversation adapter for AWS Bedrock.
- @convo-lang/convo-lang-api-routes - A backend for relaying messages between the browser and LLM backends such as OpenAI.
- @convo-lang/convo-vfs - Used to integrate Convo-Lang into virtual file systems.
- @convo-lang/convo-lang-cli - A CLI interface that allows you to execute and parse convo-lang files.
- @convo-lang/convo-lang-tools - Contains the convo-lang vscode extension, which includes syntax highlighting,
  in-editor script execution, script parsing, and other helpful tools for working with convo-lang.
  In most cases, you will not install this package but instead install the vscode convo-lang extension.


## Quick Start with NextJS
You can use the `npx @convo-lang/convo-lang-cli --create-next-app` command to quickly get started building AI Agents powered
by Convo-Lang in a NextJS project

**Step 1:** Create project using convo CLI
``` sh
npx @convo-lang/convo-lang-cli --create-next-app
```

**Step 1:** Open newly created project in VSCode or your favorite editor
``` sh
# Open project directory
cd {NEWLY_CREATED_PROJECT_NAME}

# Open Code Editor
code .
# -or-
vim .
# -or-
# Use GUI
```

**Step 3:** Copy example env file to `.env.development` 
``` sh
cp example.env.development .env.development
```

**Step 4:** Add your OpenAI API key to `.env.development` 
``` conf
OPENAI_API_KEY={YOUR_OPEN_AI_API_KEY}
```

**Step 5:** Start the NextJS server
``` sh
npm run dev
```

**Step 6:** Start modifying example agent prompts in any of the example pages
- pages/index.tsx: Routing agent that opens requested agent
- pages/agent/todo-list.tsx: Todo list agent that can manage a todo list
- pages/agent/video-dude.tsx: A video player agent that plays the best YouTube videos
- pages/agent/weather.tsx: A weather man agent that can tell you the weather anywhere in the world


## Model Provider Support

- OpenAI - https://platform.openai.com/docs/models
  - chatgpt-4o-latest
  - gpt-3.5-turbo
  - gpt-3.5-turbo-0125
  - gpt-3.5-turbo-1106
  - gpt-3.5-turbo-16k
  - gpt-4
  - gpt-4-0125-preview
  - gpt-4-0613
  - gpt-4-1106-preview
  - gpt-4-turbo
  - gpt-4-turbo-2024-04-09
  - gpt-4-turbo-preview
  - gpt-4o
  - gpt-4o-2024-05-13
  - gpt-4o-2024-08-06
  - gpt-4o-mini
  - gpt-4o-mini-2024-07-18
  - o1-mini
  - o1-mini-2024-09-12
  - o1-preview
  - o1-preview-2024-09-12

- OpenAI Chat Completions Compatible APIs
  - LM Studio - https://lmstudio.ai/docs/app/api/endpoints/openai
  - Ollama - https://ollama.com/blog/openai-compatibility
  - Llama.cpp - https://github.com/ggml-org/llama.cpp/tree/master/tools/server

- AWS Bedrock - https://aws.amazon.com/bedrock/
  - us.amazon.nova-lite-v1:0
  - us.amazon.nova-micro-v1:0
  - us.amazon.nova-pro-v1:0
  - us.anthropic.claude-3-5-haiku-20241022-v1:0
  - us.anthropic.claude-3-5-sonnet-20240620-v1:0
  - us.anthropic.claude-3-5-sonnet-20241022-v2:0
  - us.anthropic.claude-3-7-sonnet-20250219-v1:0
  - us.anthropic.claude-3-haiku-20240307-v1:0
  - us.anthropic.claude-opus-4-20250514-v1:0
  - us.anthropic.claude-sonnet-4-20250514-v1:0
  - us.deepseek.r1-v1:0
  - us.meta.llama3-1-70b-instruct-v1:0
  - us.meta.llama3-1-8b-instruct-v1:0
  - us.meta.llama3-2-11b-instruct-v1:0
  - us.meta.llama3-2-1b-instruct-v1:0
  - us.meta.llama3-2-3b-instruct-v1:0
  - us.meta.llama3-2-90b-instruct-v1:0
  - us.meta.llama3-3-70b-instruct-v1:0
  - us.meta.llama4-maverick-17b-instruct-v1:0
  - us.meta.llama4-scout-17b-instruct-v1:0
  - us.mistral.pixtral-large-2502-v1:0


## VSCode extension
You will also probably want to install the vscode extension for syntax highlighting and other
developer niceties. You can install the vscode extension by searching for "convo-lang" in the
vscode extension tab.

https://marketplace.visualstudio.com/items?itemName=iyio.convo-lang-tools 


## Using Convo-Lang
When using Convo-Lang in a TypeScript or JavaScript project will use the Convo-Lang Conversation Engine
by creating instances of the `Conversation` class and appending messages and awaiting the
completion of those messages. Conversations are made up of collections of messages that represent
messages from the user, LLM, tool definitions and more.

Install Convo-Lang packages
``` sh
npm install @convo-lang/convo-lang @convo-lang/convo-lang-openai
```

*(note - syntax highlighting for Convo-Lang embedded in string template literals is provided using the "convo-lang" VSCode extension)*
``` js
// example.mjs
import { Conversation } from "@convo-lang/convo-lang";
import { initOpenAiBackend } from '@convo-lang/convo-lang-openai';

initOpenAiBackend();
const conversation=new Conversation();


await conversation.completeAsync(/*convo*/`
> system
You are a super smart and funny astronomer that love make funny quotes

> define
Planet = struct(
    name: string
    moonCount: number
    quote: string
)

@json Planet[]
> user
List the planets in our solar system
`);


console.log(conversation.convo);
```

``` sh
# Set the OPENAI_API_KEY env var however you see fit
export OPENAI_API_KEY=sk-___YOUR_KEY___

node example.mjs

```

Output:
``` convo
@format json
> assistant
[
    {
        "name": "Mercury",
        "moonCount": 0,
        "quote": "I'm Mercury. I don't have any moons, but who needs them when you're this close to the Sun? 🍳"
    },
    {
        "name": "Venus",
        "moonCount": 0,
        "quote": "Venus here! No moons in sight, but you should see my cloud cover. It's haute couture! ☁️👗"
    },
    {
        "name": "Earth",
        "moonCount": 1,
        "quote": "Earth, the only planet with pizza! Oh, and one moon which we keep for dramatic lunar eclipses. 🌕🍕"
    },
    {
        "name": "Mars",
        "moonCount": 2,
        "quote": "Mars calling! With my two moons, Phobos and Deimos, I basically have my own double feature in the sky! 🎬🌌"
    },
    {
        "name": "Jupiter",
        "moonCount": 79,
        "quote": "Jupiter, moon hoarder extraordinaire! With 79 moons, my nightly show is never the same—it's cosmic channel surfing! 📺🌔"
    },
    {
        "name": "Saturn",
        "moonCount": 83,
        "quote": "Saturn here, all about those rings AND 83 moons! Talk about accessories stealing the spotlight! 💍🌕"
    },
    {
        "name": "Uranus",
        "moonCount": 27,
        "quote": "Uranus checking in! With 27 moons, I have more natural satellites than most people have friends. 🌑👽"
    },
    {
        "name": "Neptune",
        "moonCount": 14,
        "quote": "Neptune, ruler of the deep space! With 14 moons, I'm never alone, even in the far reaches of the solar system. 🌊🔭"
    }
]
```

## NodeJs example project
The `convo-lang/convo-lang-node-example` repo contains a full featured CLI tool that can load
Convo-Lang scripts, accept messages over HTTP and accept live input.

https://github.com/convo-lang/convo-lang-node-example

![NextJS example](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-node-example.webp?raw=true)



## Using convo-lang in a existing NextJs project
Follow the step below to you Convo-Lang in an existing NextJS project


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

The code below creates a fully functional chat interface with a website assistant agent
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

For use on the command line install the @convo-lang/convo-lang-cli package
``` sh
npm i @convo-lang/convo-lang-cli -g
```

``` sh
# install the convo cli
npm i -g @convo-lang/convo-lang-cli

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
        "openAiImageModel":"dall-e-3",

        "awsBedrockProfile":"{optional - AWS profile to use for Bedrock models}"
    }
}
```

## IYIO ( eye·o )
Convo-Lang uses many of the packages of the IYIO library and began as a package in the IYIO library.
IYIO is a collection of utilities and frameworks useful for many different situations.

IYIO - https://github.com/iyioio/common

## Learn More
You can check out an interactive demo of Convo-Lang here - [https://learn.convo-lang.ai/playground](https://learn.convo-lang.ai/playground)

If you want to learn the Convo-Lang language check out this tutorial  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai/learn)

## Contact

Email - doc@convo-lang.ai

X - https://x.com/ConvoLang

Join our Discord Server - https://discord.gg/GyXp8Dsa
