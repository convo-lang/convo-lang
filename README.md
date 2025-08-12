# Convo-Lang
The language of AI

![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/vscode-demo.gif)

**Learn Convo-Lang with Live Demos**  - [https://learn.convo-lang.ai](https://learn.convo-lang.ai)

**GitHub** - [ https://github.com/convo-lang/convo-lang](https://github.com/convo-lang/convo-lang)

**NPM** - [https://www.npmjs.com/package/@convo-lang/convo-lang](https://www.npmjs.com/package/@convo-lang/convo-lang)


## What is Convo-Lang?
Convo-Lang is an open source AI-native programming language and ecosystem designed specifically for
building powerful, structured prompts and agent workflows for large language models (LLMs) like
GPT-4, Claude, Llama, DeepSeek, and more.

Convo-Lang is a mixture between a procedural programming language, prompting template system and 
conversation state management system. You can execute convo-lang in Javascript, Python,
from the command line or directly in VSCode.

Convo-Lang aims to provided a uniform prompting syntax that is LLM agnostic and allows you to
store both prompts, metadata and tradition programming logic in a single file or template string.

The convo-lang syntax supports advanced features such as function calling, tool usage and vision.
The Convo-Lang ecosystem consists of a parser, interpreter, Typescript/Javascript/Python libraries,
a CLI, and a vscode extension for syntax highlighting and in-editor script execution.

## Index
- [Quick Start with NextJS](#quick-start-with-nextjs)
- [VSCode extension](#vscode-extension)
- [Model Provider Support](#model-provider-support)
- [Using Convo-Lang in Javascript](#using-convo-lang-in-javascript)
- [Using the CLI](#using-the-cli)
- [CLI configuration](#cli-configuration)
- [IYIO ( eye·o )](#iyio--eyeo-)
- [Learn More](#learn-more)
- [Contact](#contact)
- [Change Log](#change-log)


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


## VSCode extension
You will also probably want to install the vscode extension for syntax highlighting and other
developer niceties. You can install the vscode extension by searching for "convo-lang" in the
vscode extension tab.

https://marketplace.visualstudio.com/items?itemName=iyio.convo-lang-tools

After installing the extension add an OpenAI or AWS Bedrock API key to run prompts directly in the editor.

![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/vscode-settings.png)

With the Convo-Lang vscode extension installed and configured, you can execute convo scripts directly in vscode
by pressing the play button at the top right of a `.convo` file or using the `(CMD+R)` hotkey.

You can also run snippets of convo scripts that are embedded in other
document types. Just highlight the convo code you want to run, open the command palette, and
search for "Complete Convo Conversation" and press enter. Then the snippet will be opened in a new
convo file and completed. This is great for quick prototyping and testing prompts in your application
without having to start your full application.


## Model Provider Support

- OpenAI - https://platform.openai.com/docs/models
  - gpt-5
  - gpt-5-mini
  - gpt-5-nano
  - gpt-4.1
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
  - chatgpt-4o-latest
  - o1-mini
  - o1-mini-2024-09-12
  - o1-preview
  - o1-preview-2024-09-12
  - gpt-3.5-turbo
  - gpt-3.5-turbo-0125
  - gpt-3.5-turbo-1106
  - gpt-3.5-turbo-16k

- OpenAI Chat Completions Compatible APIs
  - LM Studio - https://lmstudio.ai/docs/app/api/endpoints/openai
  - Ollama - https://ollama.com/blog/openai-compatibility
  - Llama.cpp - https://github.com/ggml-org/llama.cpp/tree/master/tools/server

- Open Router - 400+ models - https://openrouter.ai/models

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


## Using Convo-Lang in Javascript
When using Convo-Lang in a TypeScript or JavaScript project will use the Convo-Lang Conversation Engine
by creating instances of the `Conversation` class and appending messages and awaiting the
completion of those messages. Conversations are made up of collections of messages that represent
messages from the user, LLM, tool definitions and more.

Install Convo-Lang packages
``` sh
npm install @convo-lang/convo-lang
```

*(note - syntax highlighting for Convo-Lang embedded in string template literals is provided using the "convo-lang" VSCode extension)*
``` js
// example.mjs
import { convo } from "@convo-lang/convo-lang";
import { initOpenAiBackend } from '@convo-lang/convo-lang';

initOpenAiBackend();


const planets=await convo`
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
`;


console.log(planets);
```

``` sh
# Set the OPENAI_API_KEY env var however you see fit
export OPENAI_API_KEY=sk-___YOUR_KEY___

node example.mjs

```

Output:
``` json
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


![convo](https://raw.githubusercontent.com/convo-lang/convo-lang/refs/heads/main/assets/using-convo-lang-node.png)

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

### CLI Arguments

| argument                 | description                                                                    |
|--------------------------|--------------------------------------------------------------------------------|
| --config                 | ConvoCliConfig object or path to a ConvoCliConfig file                         |
| --inline-config          | Inline configuration as JSON                                                   |
| --source                 | Path to a source convo file                                                    |
| --stdin                  | If present, the source will be read from stdin                                 |
| --inline                 | Inline convo code                                                              |
| --source-path            | Used to set or overwrite the source path of executed files                     |
| --cmd-mode               | If present, CLI operates in command mode for function calling via stdin/stdout |
| --repl                   | If present, CLI enters REPL mode for chat                                      |
| --prefix-output          | If present, each output line is prefixed to indicate its relation              |
| --print-state            | If present, prints the shared variable state                                   |
| --print-flat             | If present, prints the flattened messages                                      |
| --print-messages         | If present, prints the messages                                                |
| --parse                  | If present, parses convo code and outputs as JSON instead of executing         |
| --parse-format           | JSON formatting used if parse option is present                                |
| --convert                | If present, converts input to target LLM format and writes as output           |
| --out                    | Function or path for output; if ".", writes to source path                     |
| --buffer-output          | If present, buffers executor output for later use                              |
| --allow-exec             | Controls shell command execution permissions                                   |
| --prepend                | Conversation content to prepend to source                                      |
| --exe-cwd                | Current working directory for context execution                                |
| --sync-ts-config         | Path(s) to tsconfig for TypeScript project synchronization                     |
| --sync-watch             | If present, updates TypeScript projects in real time during scan               |
| --sync-out               | Directory for generated sync output files                                      |
| --spawn                  | Command line to run in parallel with actions like sync watching                |
| --spawn-dir              | Directory where spawn command runs                                             |
| --create-next-app        | If present, creates a new Next.js app using the template                       |
| --create-app-dir         | Directory where apps will be created                                           |
| --create-app-working-dir | Directory where the create app command will be run                             |
| --list-models            | If present, lists all known models as JSON                                     |

## CLI configuration
To allow the Convo-Lang CLI to access OpenAI and other model providers, create a JSON file called ~/.config/convo/convo.json and add the
following contents. Remember to replace the API key with your OpenAI api key.

``` json
{
    "env":{
        "openAiApiKey":"{API key for using OpenAI models}",
        "awsBedrockApiKey":"{API key for using AWS Bedrock models}"
    },
    "defaultModel":"{Default LLM model to use - gpt-5, gpt-4.1, claude, llama, deepseek, etc}"
}
```

## IYIO ( eye·o )
Convo-Lang uses many of the packages of the IYIO library and began as a package in the IYIO library.
IYIO is a collection of utilities and frameworks useful for many different situations.

IYIO - https://github.com/iyioio/common

## Learn More

If you want to learn the Convo-Lang language check out this tutorial  - [https://learn.convo-lang.ai](https://learn.convo-lang.ai)

## Contact

Email - doc@convo-lang.ai

Join our sub Reddit - https://www.reddit.com/r/ConvoLang/

Join our Discord Server - https://discord.gg/GyXp8Dsa

X - https://x.com/ConvoLang

## Change Log

### v0.7.46
- **OpenRouter Integration**: Added support for OpenRouter API as a model provider

### v0.7.45
- **VSCode Extension**: Added settings menu to vscode extension
- **VSCode extension**: Added configuration settings
- **VSCode extension**: Added buttons for executing common actions
- **VSCode extension**: Imports are now linkable
- **Error Handling**: fRead functions now catch errors for improved stability
- **AWS Bedrock**: Added support for using Bedrock API keys
- **Model Parameters**: Added model parameters that can be defined using tags or system variables
  - frequencyPenalty
  - presencePenalty
  - logprobs
  - reasoningEffort
  - seed
  - serviceTier
  - topLogprobs
  - responseVerbosity
  - logitBias
  - modelParams

### v0.7.43
- **OpenAI Models**: Added OpenAI model definitions for gpt-5 and gpt-oss
- **Package Deprecation**: Marked all exports from @convo-lang/convo-lang-openai as deprecated - all OpenAI support has been moved into core package
- **Markdown & JSON Imports**: Markdown and JSON files can now be directly imported and use import templates
- **Virtual File System**: Added ConvoVfsImportService to handle imports using the virtual file system
- **HTTP Imports**: Added ConvoHttpImportService to handle imports over http
- **CLI Improvements**: Replaced the custom ConvoCli import handler with the ConvoHttpImportService and ConvoVfsImportService services
- **VSCode Extension**: Fixed issues with converting and flattening relative imports

### v0.7.39
- **Bug Fix**: Replaced all uses of instanceof operator on Zod objects to fix issues with using different versions of Zod in the same project
- **Async Functions**: Added convertAsync and flattenAsync functions to convo text template

### v0.7.38
- **Bug fix**: Fixed a bug in convo text template function that caused extern function to not be registered
- **OpenAI**: Moved the initOpenAiBackend function into the main convo-lang package

### v0.7.37
- **Template Function Registration**: String template functions now register passed functions as extern functions, enabling JavaScript/TypeScript function calls within templates

### v0.7.36
- **Template Literals**: Added convo, useConvo, useConvoValue functions for using Convo-Lang as awaitable string template literals
- **Parser Enhancement**: Code passed to convo parser without defined roles now automatically uses the user role
- **UI Events**: Added onInput prop to ConversationInput for hooking into user typing
- **Completion Events**: Added onCompletionStart event with completion promise reference

### v0.7.34
- **JSON Tags**: The `@json` tag now supports inline anonymous types
- **RAG Behavior**: Updated the behavior of RAG messages to be more transparent
- **Edge Messages**: Function result responses do not effect with edge messages until the function call is complete
- **Function Results**: Function result setters now include the path of updated object values instead of reassigning the entire object
- **VFS Functions**: Added functions for interacting with the virtual file system
- **Time Conversion**: Added functions for converting values to milliseconds
- **Function Registration**: Newly imported functions are now properly registered with the current execution context. This mainly effects imports

### v0.7.33
- **Child Conversations**: Child conversations now pass tasks up to their parents for better task coordination
- **Message Conversion**: Fixed convert message relaying functionality
- **RAG Integration**: RAG now adds tasks to the UI for better user visibility
- **API Routes**: Added mock API route for convo demos
- **Bedrock Models**: Added user-friendly aliases to bedrock models
- **UI Enhancements**: Added more styling options for suggestions and markdown viewer improvements
- **RAG Service**: Added convoRagService scope service to standardize RAG implementations
- **Pinecone Integration**: Added @convo-lang/convo-lang-pinecone package for using Pinecone as a RAG service
- **Extension**: Added convo-lang new file detection to the VS Code extension
- **Bug Fix**: Fixed bug in extension that caused new unsaved files to not be able to be completed

### v0.7.32
- **Model Listing**: Added support for listing all registered models
  - CLI: use the `--list-models` argument
  - Extension: Run the `List Convo Models` command
  - Conversation UI - enter the `/models` command 
- **Prompt Conversion**: Added support for converting convo into target LLM format
  - CLI: use the `--convert` argument
  - Extension: Run the `Convert Convo` command
  - Conversation UI - enter the `/convert` command
- **AWS CDK**: Added the `@convo-lang/convo-lang-aws-cdk` package for deploying Convo-Lang compatible APIs using AWS CDK
- **API**: Added the /usage endpoint to the standard convo-lang API routes
- **Models**: Added gpt-4.1 to OpenAI model list and set as default
- **System Variables**: Added the __convoEndpoint system variable for defining endpoints to convo lang compatible endpoints using the http relay service
- **Imports**: Added support for imports in CLI and VS Code extension (filesystem and HTTP imports)
- **Extensions**: Added the "complete in new file" command to the VS Code extension
- **Convo Functions**: Added aryContact, aryDistinct and aryJoin convo functions for array operations
- **Error Handling**: The Conversation class now logs all parsing errors

### v0.7.31
- **Inline Prompts**: Added task display while executing inline prompts
- **UI**: Improved task view visuals for better user experience
- **Inline Prompts**: General improvements to inline prompting functionality

### v0.7.30
- **Bug Fix**: Restored empty tag value back to undefined

### v0.7.29
- **Inline Prompts**: Added "continue" inline prompt modifier for continuing conversations
- **Inline Prompts**: Added short symbols for extend and continue inline prompts
- **Inline Prompts**: Enhanced message inclusion rules - inline prompts now only include user and assistant messages by default
- **Inline Prompts**: Added json:{Type} modifier support for adding @json tags to inline prompts
- **Inline Prompts**: Auto-assign prompt role when no role is defined for inline prompts
- **Events**: Added @on tag for defining events, replacing onUser and onAssistant tags
- **Conditions**: Enhanced condition and disabled tags to support dynamic expressions

### v0.7.28
- **Message Triggers**: Added onUser and onAssistant message triggers for automatic function execution
- **Performance**: Added cached parsing for Convo-Lang code with `parseConvoType` and `parseConvoCached` functions
- **Content Merging**: Enhanced message merging with prefix/suffix/append/prepend/replace/replaceForModel roles
- **Type System**: Added TrueFalse built-in type alias for boolean prompts

### v0.7.27
- **Inline Prompts**: Added support for inline prompts in functions using the
- **Features**: Added serviceId to ConvoCompletionService for better service identification
- **Performance**: Added model info caching to improve completion performance
- **API**: The http completion service can now relay messages to its host
- **Infrastructure**: Upgrade iyio packages

### v0.7.26
- **Core**: Dropped support for old ai-complete packages
- **UI**: Added conversation input auto focus for better user experience
- **Bug Fixes**: Ignore edge messages if they don't have dynamic expressions

### v0.7.25
- **Models**: Added support for setting default model using scope parameters
- **Bug Fix**: Made required role message hidden for better UX

### v0.7.24
- **Models**: Updated default model selection logic
- **API**: Added `requiredFirstMessageRole` to model info to account for models that must have specified role start conversations
- **Infrastructure**: Updated convo-lang-api-routes to use updated logic for selecting models

### v0.7.23
- **Infrastructure**: iyio package upgrades and source config improvements
- **Models**: Added support for Bedrock models
- **Processing**: Added pre and post processing for flat conversations for implementing model specific capabilities

### v0.7.22
- **Components**: Component transformer optimizations
- **CLI**: CLI conversion improvements

### v0.7.21
- **Components**: Fixed name of description tag

### v0.7.20
- **UI**: Added markdown support in MessageView
- **Code Quality**: Made generated component registry a const object for better type support

### v0.7.19
- **CLI**: Only allow TypeScript files to trigger scan for better performance

### v0.7.18
- **UI**: Added onVarsChange to ConversationView for better state management

### v0.7.17
- **CLI**: Added --create-next-app command to CLI for easier project setup
- **Components**: Better component support using type sync CLI

### v0.7.16
- **Security**: Removed free Tomorrow IO API key
- **CLI**: Added spawn support to convo CLI

### v0.7.15
- **Forms**: Added forms and multiple model support
- **Transformers**: Added transformer prompts
- **UI**: Added more UI display modes and component rendering support
- **API**: Added support for completion interception in API

### v0.7.13
- **Models**: Moved OpenAI service into convo-lang package
- **Providers**: Started Anthropic provider development
- **Functions**: executeFunctionResultAsync now works with extern functions

### v0.7.11
- **Error Handling**: Catch errors while parsing conversation UI templates
- **Types**: Added convo-knowledge types

### v0.7.9
- **UI**: Added the hidden tag for message control
- **Rendering**: ConversationView rendering improvements

### v0.7.8
- **Transcription**: Added WhisperX transcription support
- **Graph**: Added more options for resuming convo graph traversers
- **Data**: Output user data in graph logs

### v0.7.6
- **Components**: Started agents development
- **Graph**: Added convo graph user data view
- **PDF**: Changed default art style of pdf-adventure

### v0.7.5
- **Components**: Made Gen compatible with React strict mode
- **Chat**: Started ChatNodeView development
- **VFS**: Added createConvoVfsGenRenderer for Gen components

### v0.7.4
- **Functions**: Functions that return undefined now work properly
- **Graph**: Added convo graph styling and pan zoom controls
- **Components**: Added Gen component status indicators
- **Documentation**: Added utility functions for message type checking

### v0.7.0
- **Parallel Processing**: Added support for parallel message execution
- **Caching**: Added message caching support in conversations
- **VFS**: Added VFS cache support
- **PDF**: Added convo-lang-pdf for reading PDFs
- **Components**: Added Gen component for generating data on the fly
- **Images**: Added image generation endpoint and GenImg component

### v0.6.9
- **UI**: Added appendTrigger and getCtrl to ConversationView
- **Dependencies**: Updated dependency versions

### v0.6.7
- **Examples**: Added NextJS example with animations
- **Functions**: Added externFunctions and externScopeFunctions to ConversationOptions
- **Vision**: Disabled vision for system messages in OpenAI converter

### v0.6.6
- **Examples**: Added NextJS example project
- **Documentation**: Updated READMEs and package.json repo URLs
- **Backend**: Added shorthand backend initialization for OpenAI

### v0.6.4
- **Tutorial**: Added Convo-Lang tutorial
- **Vision**: Added vision capability support for vision models
- **API**: Added message normalization
- **Services**: Replaced AiCompletionService with @convo-lang/convo-lang-openai

### v0.5.9
- **Examples**: Initialized NextJS example
- **Dependencies**: NPM audit fixes and resolved React double loading
- **Documentation**: Updated various documentation files

### Early Versions (v0.1.0 - v0.5.5)
- **Language Features**: 
  - Basic Convo-Lang syntax and parsing
  - Message types (system, assistant, user)
  - Function definitions and extern functions
  - Variable assignment and dynamic expressions
  - Tags and comments system
  - Conditional messages and edge messages
  - Data structures (structs, enums, arrays)
- **Graph System**: 
  - Convo-graph workflow system
  - Node and edge traversal
  - Visual graph editor
- **Components**:
  - Component message handling
  - Markdown viewer
  - Conversation view and controls
- **Models**: 
  - OpenAI integration
  - Model selection and configuration
- **Tools**:
  - VSCode extension
  - CLI tools
  - Python integration packages
- **Features**:
  - RAG (Retrieval Augmented Generation) support
  - Vision capabilities
  - JSON mode
  - Import system
  - Caching
  - Stats tracking
