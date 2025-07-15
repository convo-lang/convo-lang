## Change Log

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
