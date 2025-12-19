## Change Log

### v0.8.12
- **Convo-Make**: Added support for filtering items out of a make input list

### v0.8.11
- **Bug Fixes**: Fixed condition expression in graph ctrl
- **Functions**: Added a fallback for arrays returned as an object

### v0.8.10
- **Functions**: Added mdImg function for reading files and markdown images
- **Context**: Added ctx.getFullPath for getting full paths
- **Markdown**: Updated markdown image regex

### v0.8.4
- **Convo-Make**: Added better logging system - writes logs to a log file
- **Convo-Make**: Make stages now track which files they generate
- **Convo-Make**: Changed log directory name
- **Convo-Make**: Now ignores git-ignored convo-make files

### v0.8.3
- **Convo-Make**: Added support for targets to run shell commands instead of using AI
- **Convo-Make**: Now tracks stats in the .convo-make/.convo-make-stats folder
- **Convo-Make**: Target convo files can now be added to, to regenerate outputs

### v0.8.2
- **VSCode Extension**: Added support for syncing an entire make file with one click
- **VSCode Extension**: Added support for forcing review when rebuilding individual targets
- **VSCode Extension**: Fixed list syncing and main make command
- **VSCode Extension**: Running make items are auto-expanded now
- **VSCode Extension**: Added support for selecting markdown sections and JSON properties of input context files
- **VSCode Extension**: Added support for syncing cache file with current version of output
- **Convo-Make**: Review paths can now use wildcards
- **Convo-Make**: Added protocol property to ConvoMakeApp interface
- **Convo-Make**: Updated default system prompt to include instructions for full contents responses
- **Convo-Make**: Changed default markup color
- **Bug Fixes**: Fixed double escaping var insertion
- **Build System**: Updated pkij configuration and publish scripts

### v0.8.1
- **Build System**: Installed pkij

### v0.8.0
- **Build System**: Replaced NX build system with pkij
- **Compatibility**: Removed CJS build format
- **Node Version**: Removed support for NodeJS v18. v20 and above supported.
- **Package Management**: Changed package type to module for all package.json files
- **Infrastructure**: Ejected iyio and removed all NX dependencies

### v0.7.50
- **Convo-Make**: Added comprehensive Convo-Make system for build automation and code generation
  - Added support for make targets with dynamic inputs and outputs
  - Added multi-pass generation system with stage-based builds
  - Added sandbox mode for secure script execution
  - Added token usage tracking and observability improvements
  - Added VS Code Build side panel integration
  - Added support for previewing components and generating images
  - Added recursive input searching and working directory improvements

### v0.7.49
- **Image Support**: Added support for image message responses in OpenAI API providers
- **Message Handling**: Enhanced message processing with custom handlers and role-specific append functions
- **Standard Library**: Added filesystem base64 functions and std:// protocol imports
- **VS Code Extension**: Added buttons for make file operations, process indicators, and parsed target viewing
- **Legacy Code**: Moved legacy ConvoGraph code to separate package and removed deprecated VFS package

### v0.7.48
- **Bug Fixes**: Fixed inline prompting bugs
- **JSON Mode**: JSON response request message is now only appended if the message is the last message in the conversation

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
