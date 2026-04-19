# Convo-Lang Core Developer Documentation

## Overview

Convo-Lang is the core language and runtime at the center of the Convo ecosystem.

It is designed around a simple but powerful idea:

- work with LLMs in plain text
- keep prompts, tool use, state changes, and control flow readable
- make agent behavior inspectable instead of opaque
- preserve a clear ledger of interactions with models, tools, transforms, and users

Convo-Lang is both a language and an execution engine. It provides the authoring model, parser, runtime, conversation state manager, flattening pipeline, completion orchestration, function execution model, and graph-based control flow used across the broader ecosystem.

This document focuses on the core of Convo-Lang, how it works internally, and why its architecture matters.

## Why plain text matters

A major benefit of Convo-Lang is that it keeps LLM systems grounded in plain text instead of burying behavior inside deeply nested JSON configuration, hidden framework state, or scattered callback chains.

Working with LLMs in plain text has several practical advantages:

- prompts remain readable by humans
- prompt engineering is closer to writing than wiring
- diffs are easier to inspect in source control
- system behavior can be audited line by line
- failures are easier to reproduce
- agent logic stays visible instead of being hidden in runtime objects
- model inputs and outputs can be preserved in a form that is still meaningful later

Convo-Lang builds on these strengths by making conversations executable without losing readability.

A Convo script is not just prompt text. It can also express:

- function definitions
- variable definitions
- imports
- transforms
- message triggers
- graph navigation
- structured output expectations
- UI component rendering
- retrieval behavior

Even with those capabilities, the system stays centered on text-first authoring.

## Transparency and the agent ledger

A key design goal of Convo-Lang is transparency.

In many agent systems, important steps are hidden in internal state:

- hidden prompts
- invisible tool invocation layers
- buried middleware transformations
- hard-to-reconstruct reasoning and side effects
- ad hoc orchestration outside the prompt itself

Convo-Lang moves in the opposite direction.

It gives developers a clear ledger of interactions with an LLM by representing behavior as messages and executable source. This means the conversation itself can often show:

- what was asked of the model
- what model or endpoint was used
- what function was called
- what arguments were passed
- what values were returned
- what variables were set
- what transforms ran
- what RAG context was injected
- what node in a graph was active
- what follow-up actions were appended

This ledger-like quality is one of the most important architectural benefits of the project. It makes agentic systems easier to:

- debug
- review
- replay
- audit
- test
- explain to other developers

Convo-Lang does not treat the conversation as disposable glue. It treats the conversation as the record of execution.

## Convo-Lang in the ecosystem

Convo-Lang is core to the Convo ecosystem.

It is the shared language and runtime model that connects tools, backend services, editors, UI, and automation. The surrounding projects extend the same core mental model rather than replacing it.

## Convo-Lang as the core

Convo-Lang provides:

- the source format
- the parser
- the type system
- the conversation runtime
- function execution
- trigger handling
- transforms
- node graph orchestration
- import and module systems
- model/provider integration
- component message semantics

The rest of the ecosystem builds on these primitives.

## Convo-Db

Convo-Db is a hybrid document, RAG, and graph database with:

- integrated permissions
- built-in function triggers
- the ability to act as a complete backend for agentic applications

Convo-Lang integrates with it through functions, imports, RAG flows, and execution patterns. Together they allow applications where the language, storage model, graph model, and retrieval model all fit together naturally.

## Convo-Make

Convo-Make is an LLM-powered scaffolding system inspired by the `make` build command.

It uses Convo-Lang to define build-like targets, stages, apps, and generation flows. The same language used for conversation logic can also drive project scaffolding and automation.

## Convo-VSCode

Convo-VSCode is a VSCode extension that provides:

- syntax highlighting
- an LSP
- direct execution of Convo-Lang
- support for running Convo-Make files
- an overview of code blocks in convo files

It also enables developers to create custom agent harnesses using the language directly in the editor.

## Convo-View

Convo-View is a ReactJS chat interface built around Convo-Lang.

It supports:

- file attachments
- response streaming
- voice recording
- live mode with active voice detection
- debugging tools such as raw convo viewing
- extensive customization, including CSS frameworks like Tailwind

This makes the core runtime practical in real user-facing applications.

## Convo-REST

Convo-REST is a Hono-based REST API that provides backend support for using Convo-Lang in the browser.

It exposes the core runtime over an API so browser clients can execute conversations, stream completions, and integrate with the larger ecosystem.

## Convo-CLI

Convo-CLI runs Convo-Lang from the command line.

It also hosts Convo-REST with a single command, making it easy to use the ecosystem locally, in scripting workflows, and in development automation.

## Core architecture

At the center of Convo-Lang are a few important layers:

1. source text
2. parsed message model
3. execution context
4. flattened conversation model
5. completion service and converter layer
6. runtime continuation loop

These layers preserve readability while allowing the system to behave like a programmable agent runtime.

## Main source files

The most important files for understanding the core are:

- `packages/convo-lang/src/lib/convo-types.ts`
- `packages/convo-lang/src/lib/convo-parser.ts`
- `packages/convo-lang/src/lib/convo-lib.ts`
- `packages/convo-lang/src/lib/Conversation.ts`

Supporting files that matter often include:

- `convo-code-block-lib.ts`
- `convo-completion-lib.ts`
- `convo-node-graph-lib.ts`
- `convo-rag-lib.ts`
- `convo-std-imports.ts`
- `ConvoExecutionContext.ts`

## Type system and shared vocabulary

`convo-types.ts` defines the common vocabulary of the system.

Important types include:

- `ConvoMessage`
- `ConvoFunction`
- `ConvoStatement`
- `ConvoTag`
- `FlatConvoMessage`
- `FlatConvoConversation`
- `ConvoCompletion`
- `ConvoTrigger`
- `ConvoImport`
- `ConvoModule`
- `ConvoCompletionService`
- `ConvoConversationConverter`

This file is the fastest way to understand what the runtime considers important.

## Source model

Convo-Lang source is parsed into `ConvoMessage[]`.

A message can represent:

- a content message with a role
- a function definition
- a top-level block like `define` or `do`
- a graph or node control message
- a modification message like `append` or `replace`
- a component message
- a message with tags, markdown, code blocks, and metadata

This unified message model is important because it lets the runtime treat conversation authoring, execution, and state mutation as parts of the same language.

## Parser architecture

The parser in `convo-parser.ts` converts plain text into structured messages and statements.

It recognizes:

- functions
- top-level blocks
- role-based messages
- tags
- comments
- strings and heredocs
- inline prompts
- embedded expressions
- node routes
- message triggers
- code blocks
- markdown parsing options

It uses a compact regex-driven parsing model and stores source positions so the runtime can often map behavior back to original text.

This source tracking is important for transparency and debugging.

## Roles and tags

The language contract is largely defined in `convo-lib.ts` through constants such as:

- `convoRoles`
- `convoTags`
- `convoFunctions`
- `convoVars`

These constants define the built-in semantics of the language.

Examples of important role groups:

- content roles like `user`, `assistant`, `system`
- execution roles like `define`, `do`, `result`, `call`
- modification roles like `append`, `replace`, `suffix`
- graph roles like `node`, `goto`, `exitGraph`
- orchestration roles like `queue`, `insert`, `parallel`

Examples of important tags:

- `@json`
- `@assign`
- `@condition`
- `@import`
- `@on`
- `@transform`
- `@component`
- `@rag`
- `@model`
- `@responseEndpoint`

The combination of roles and tags makes the language expressive while still staying text-first.

## Conversation runtime

`Conversation.ts` is the core orchestration class.

It manages:

- source strings
- parsed messages
- append flows
- flattening
- imports
- model completion
- function execution
- RAG injection
- transforms
- graph behavior
- component input flows
- triggers
- usage tracking
- cloning and forking

If you want to understand the runtime end to end, this is the primary file to study.

## Core runtime lifecycle

A typical conversation moves through the following stages.

## 1. Append source

Source is appended with `append()` or parsed objects are appended with `appendMessageObject()`.

This stage:

- stores source text
- parses messages
- attaches metadata such as file path or streaming id
- triggers auto-flattening unless disabled

## 2. Parse source

`parseConvoCode()` converts source text into `ConvoMessage[]`.

The parser can also:

- attach markdown lines
- attach code blocks
- parse triggers
- parse import match rules
- interpret transform component helpers
- convert route messages into route metadata

## 3. Flatten conversation

`flattenAsync()` is where the authored conversation becomes a runtime-ready conversation.

Flattening applies:

- imports
- top-level code execution
- conditions
- grouping
- message modifications
- thread filtering
- markdown variable extraction
- edge evaluation
- task partitioning
- transform collection
- node graph ordering
- RAG mode
- response formatting
- model and endpoint selection

Flattening is the semantic center of the runtime.

## 4. Select service and model

The conversation resolves a completion service and model using:

- configured completion services
- endpoint-specific service selection
- provider model metadata
- user and message-level tags

## 5. Complete or execute locally

Depending on the last message and current state, completion may mean:

- calling the LLM
- executing a function directly
- evaluating code
- waiting on a component input submission
- routing to another node
- replaying cached output

## 6. Append results back into the ledger

Outputs are typically written back as conversation messages.

This may include:

- assistant text
- function call messages
- result messages
- variable setters
- transform results
- trigger side effects
- graph summaries

This write-back step is what helps preserve the ledger of execution.

## Flattening as the semantic center

Although parsing gets a lot of attention, flattening is where the real meaning of the conversation is determined.

A flattened conversation is represented as `FlatConvoConversation` and contains:

- evaluated flat messages
- capabilities
- response model and endpoint
- execution context
- task metadata
- graph metadata
- transform metadata
- queue and parallel state
- message triggers
- markdown vars
- runtime nodes

This separation between source and flattened state is one of the strongest parts of the design.

It allows Convo-Lang to be:

- human-readable at author time
- executable at runtime
- inspectable after execution

## Execution context

`ConvoExecutionContext` is responsible for evaluating statements and functions.

It manages:

- variables
- shared variables
- type definitions
- loaded functions
- tag statement evaluation
- scope execution
- result propagation

A lot of Convo-Lang behavior feels prompt-oriented at the source level, but under the hood the execution context behaves more like a compact interpreter.

This hybrid design is what allows plain text authoring to support real control flow.

## Top-level execution

Top-level messages like `define` and `do` are executed during flattening.

That means state is materialized before a model sees the final conversation.

This is useful because it allows:

- dynamic system prompts
- variable-derived content
- conditional message inclusion
- model configuration in source
- graph state preparation

In other words, the model sees an evaluated conversation, not just raw source.

## Function model

Convo-Lang supports several function styles:

- local functions
- extern functions
- top-level execution blocks
- model-callable functions
- directly invoked functions
- message handlers
- trigger handlers

Functions can be defined in source or injected from code.

When a model returns a function call:

1. the call is represented as a call message
2. the target function is looked up
3. arguments are evaluated
4. the function is executed through the runtime
5. result messages and setters are appended
6. the conversation may continue automatically

This makes tool use transparent instead of hidden inside middleware.

## Message modification model

Convo-Lang uses explicit modification messages such as:

- `replace`
- `replaceForModel`
- `append`
- `prepend`
- `prefix`
- `suffix`
- `appendUser`
- `appendAssistant`
- `appendSystem`

These are merged during flattening by `mergeConvoFlatContentMessages()`.

This model has a major practical benefit: message mutation is represented as data in the conversation rather than as untraceable imperative edits.

That again contributes to the ledger quality of the system.

## Triggers

Triggers let message events call functions.

They are declared through tags and parsed into `ConvoTrigger`.

At runtime, `evalTriggersAsync()` evaluates:

- event role matching
- optional conditions
- target function existence

Then it executes the function inside the current execution context.

Triggers provide reactive behavior without requiring developers to leave the conversation model.

## Transforms

Transforms let assistant output be post-processed into structured or UI-oriented outputs.

They are collected during flattening and executed after text completions.

Transforms support:

- required and optional groups
- transform filters
- component generation
- source hide/remove behavior
- transform-created tags
- structured JSON output

This is one of the ways Convo-Lang bridges natural language generation and application UI.

## Components

Messages can be treated as components in either:

- `render` mode
- `input` mode

Input components can pause the flow and wait for user submission.

This supports chat-plus-application experiences where the conversation can render interfaces, not just plain text.

Component handling is wired through:

- component tags and parsing
- flat message component metadata
- completion callbacks
- submission events
- message continuation after submission

## Imports and modules

Imports let conversations pull in external resources and capabilities.

A `ConvoModule` can provide:

- convo source
- content
- types
- extern functions
- extern scope functions
- components
- file metadata

Imports can be resolved through:

- registered modules
- std imports
- custom import handlers
- import services

This keeps the core extensible without giving up text-first authoring.

## Standard imports

`convo-std-imports.ts` shows how built-in system imports are packaged.

Examples include standard instruction bundles for:

- XML file block editing
- bash script execution
- make and db related integrations

This illustrates an important ecosystem pattern: higher-level behavior can often be delivered as reusable Convo modules instead of hard-coded runtime special cases.

## Code blocks

`convo-code-block-lib.ts` extracts XML-tagged fenced code blocks from message content.

This powers workflows such as:

- runnable scripts
- file patch proposals
- structured code generation blocks
- editor tooling support
- code block overviews in Convo-VSCode

Code block parsing is another good example of how Convo-Lang turns plain text conventions into structured runtime features while preserving readability.

## RAG support

Convo-Lang supports retrieval augmented generation through:

- rag callbacks
- rag messages
- rag tags
- rag templates
- rag prefixes and suffixes
- document references

The runtime can inject retrieved context as explicit messages. This is important because it makes retrieval visible and inspectable instead of silently fused into some invisible prompt template.

Developers can see what context was actually supplied.

## Node graphs and agentic control flow

One of the strongest features in the core is graph-driven execution.

Convo-Lang supports workflow-like traversal using:

- `node`
- `goto`
- `to`
- `from`
- `exit`
- `exitGraph`

The runtime can:

- track current node
- carry node input and output
- evaluate route conditions
- use natural language route selection
- summarize graph execution when exiting
- support direct invoke nodes
- preserve runtime node history

This makes Convo-Lang useful not just for chat but for agentic systems with explicit operational flow.

Because the flow is represented in messages and graph metadata, it remains visible and reviewable.

## Parallel and queue orchestration

Convo-Lang includes orchestration helpers such as:

- queues
- insert blocks
- parallel blocks

These let developers control evaluation order and branch execution without abandoning the conversation abstraction.

This is important for agent systems where sequencing and side effects matter.

## Completion services and converters

A completion provider is abstracted through `ConvoCompletionService`.

A formatter/adapter is abstracted through `ConvoConversationConverter`.

This split keeps the design clean:

- services handle provider behavior
- converters handle message format conversion

It also makes it easier to support new providers, proxy APIs, or custom transports without reworking the runtime model.

## Debuggability

The core is designed to be debug-friendly.

Useful debugging mechanisms include:

- raw convo source retention
- flattened conversation inspection
- source references
- debug comments appended into conversation
- token tracking
- model tracking
- endpoint tracking
- import source events
- completion start events
- model input conversion inspection

Because the system preserves a ledger of behavior, debugging is often a matter of reading the conversation and flattened state rather than reverse-engineering runtime side effects.

## Contributor guidance

If you are new to the core codebase, this reading order is recommended:

1. `convo-types.ts`
2. `convo-lib.ts`
3. `convo-parser.ts`
4. `Conversation.ts`

After that, move into supporting areas based on interest:

- `ConvoExecutionContext.ts` for runtime evaluation
- completion library files for provider integration
- node graph files for orchestration
- RAG files for retrieval
- import files for modularity

## Design principles to preserve

When contributing to the core, keep these principles in mind.

- `Keep behavior visible` - Prefer solutions that keep execution legible in source or conversation history.

- `Keep plain text first` - Structured power is important, but not at the cost of losing readability.

- `Preserve the ledger` - Whenever possible, runtime actions should be representable as messages or explicit conversation state.

- `Distinguish source from evaluated state` - Do not confuse `ConvoMessage` with `FlatConvoMessage`. The distinction is foundational.

- `Make agent behavior inspectable` - Avoid pushing important behavior into places where developers can no longer see it in prompt or conversation flow.

- `Favor reusable language features over special cases` - If a feature can be implemented as a module, tag pattern, transform, import, or message convention, that is often better than adding hard-coded runtime branching.

## Why Convo-Lang matters
Convo-Lang matters because it provides a practical answer to a common problem in LLM engineering:

how do you build powerful systems around LLMs without making them impossible to understand?

Its answer is:

- keep the primary interface plain text
- make orchestration executable
- preserve the record of behavior
- expose tools, routing, transforms, and state in the conversation itself
- let the ecosystem build on a shared transparent core

That is why Convo-Lang is not just another prompt format. It is the foundation of an ecosystem for building understandable, inspectable, and operationally clear LLM systems.
