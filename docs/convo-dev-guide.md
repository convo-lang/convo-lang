# Convo-Lang

*>_ The language of AI*

Convo-Lang is an open source, AI-native programming language designed for building structured,
auditable, and maintainable LLM applications. Instead of scattering prompts across string literals,
JSON configs, and framework-specific abstractions, Convo-Lang gives you a single, readable, plain
text format that represents the entirety of an agent - messages, tools, state, reasoning, and all.

This guide is a developer's introduction to the core Convo-Lang language. It starts with the value
proposition and a brief tour of the ecosystem, then progressively dives into the language itself.

---

## Table of Contents

- [Why Convo-Lang](#why-convo-lang)
- [The Plain Text Advantage](#the-plain-text-advantage)
- [The Convo-Lang Ecosystem](#the-convo-lang-ecosystem)
- [Language Fundamentals](#language-fundamentals)
    - [Messages](#messages)
    - [Comments](#comments)
    - [Tags](#tags)
    - [Variables and Types](#variables-and-types)
    - [Top-Level Statements](#top-level-statements)
    - [Dynamic Expressions](#dynamic-expressions)
    - [Functions and Tools](#functions-and-tools)
    - [Extern Functions](#extern-functions)
- [Conversation Flow](#conversation-flow)
    - [The Conversation Engine](#the-conversation-engine)
    - [Message Modifiers](#message-modifiers)
    - [Conditional and Edge Messages](#conditional-and-edge-messages)
    - [Message Triggers](#message-triggers)
- [Advanced Language Features](#advanced-language-features)
    - [Inline Prompts](#inline-prompts)
    - [Transforms](#transforms)
    - [Imports and Modules](#imports-and-modules)
    - [RAG Integration](#rag-integration)
    - [Multi-Model Support](#multi-model-support)
    - [Node Graphs](#node-graphs)
- [Integrating Convo-Lang](#integrating-convo-lang)
    - [TypeScript / JavaScript](#typescript--javascript)
    - [The Conversation Class](#the-conversation-class)
    - [Working with the Parser](#working-with-the-parser)
- [Convo-Lang as the Core of the Ecosystem](#convo-lang-as-the-core-of-the-ecosystem)

---

## Why Convo-Lang

LLMs speak natural language, but building reliable products on top of them requires more structure
than a single string prompt can provide. Real agentic systems need:

- Stateful multi-step conversations
- Reliable tool/function calling
- Typed, validated structured output
- Retrieval augmentation
- Reasoning and control flow that can be inspected and tested
- A way to version, diff, and review changes over time

Convo-Lang standardizes all of this in a single language. It treats a conversation as a
first-class program with messages, variables, functions, and control flow - all expressed in a
syntax that is just as readable as a plain chat transcript.

```convo
> system
You are a friendly travel assistant.

# Looks up the current weather for a city
> getWeather(city:string) -> (
    return(httpGet('https://api.example.com/weather/{{city}}'))
)

> user
What's the weather in Paris?
```

That's a fully functional agent. There's no SDK boilerplate, no separate JSON schema file for the
function, no wrapper code - just the conversation itself.

---

## The Plain Text Advantage

One of the defining principles of Convo-Lang is that **everything about an agent lives in plain
text**. The system prompt, tool definitions, tool calls, tool results, assistant responses, user
input, intermediate reasoning, token usage - all of it is written as a readable, appendable log.

This has significant practical benefits:

### Transparency and Auditability

Every interaction between the user, the LLM, and any tools is recorded sequentially in the
conversation. There's no hidden state buried in framework internals. If something goes wrong, you
can read the conversation top to bottom and see exactly what happened, in the order it happened.

```convo
> user
Approve the Indigo Flats project

@toolId call_abc123
> call approveProjectCompletion(
    "projectId": "uLJ9jZJZ"
)
> result
projects.uLJ9jZJZ.status="approved"
__return="approved"

> assistant
The Indigo Flats project has been approved.
```

Reviewing an agent's behavior is as simple as reading the script. No log aggregation, no tracing
UI - just text.

### Version Control Friendly

Because conversations are plain text, they work naturally with Git. You can:

- Diff agent changes in a code review
- Branch experimental agent behaviors
- Tag releases of an agent
- Blame specific lines to find when a prompt regressed

### Portability

An agent written in Convo-Lang can be copied, pasted, emailed, stored in a database, shared in
Slack, or committed to a repository. It is not tied to any particular IDE, framework, or vendor.

### LLM-Native

LLMs themselves are very good at reading and writing Convo-Lang. This means you can use LLMs to
help you build, refactor, and test Convo-Lang agents - and you can even have agents generate other
agents.

### Ledger-Style Execution

A Convo-Lang conversation functions as a ledger. New messages are always appended, never rewritten.
This makes it trivial to:

- Replay a conversation deterministically
- Fork a conversation to explore alternatives
- Snapshot state at any point
- Reason about the causal order of events

---

## The Convo-Lang Ecosystem

Convo-Lang itself is a language, but around it sits a broader ecosystem of tools built to work
together. Each piece consumes and produces Convo-Lang, so they compose cleanly.

- **Convo-Db** - A hybrid document, RAG, and graph database with an integrated permissions system
  and built-in function triggers. Capable of serving as a full backend for an agentic application.

- **Convo-Make** - An LLM-powered scaffolding and build system that takes inspiration from the
  classic `make` command. Describes build targets and stages in Convo-Lang and lets an LLM carry
  them out.

- **Convo-VSCode** - A VSCode extension that provides an LSP, syntax highlighting, direct
  execution of Convo-Lang, a runner for Convo-Make files, and an overview of code blocks. Using
  the extension, developers can set up their own custom agent harnesses directly in the editor.

- **Convo-View** - A fully featured React chat interface that speaks Convo-Lang natively. Supports
  file attachments, response streaming, voice recording, live mode with active voice detection,
  debugging tools such as viewing raw Convo code, and is highly customizable with CSS frameworks
  like Tailwind.

- **Convo-REST** - A Hono-based REST API providing full backend support for running Convo-Lang
  from the browser or any HTTP client.

- **Convo-CLI** - A command-line tool for running Convo-Lang scripts. Also capable of hosting the
  Convo-REST API with a single command.

Each of these components is independently useful, but they share one thing: they all read and
write the same Convo-Lang format. That's what makes the ecosystem feel cohesive - the language is
the interchange format.

---

## Language Fundamentals

Convo-Lang is made up of a small number of building blocks that compose to create rich agents.

### Messages

A conversation is a sequence of messages. Messages start with a `>` followed by a role name and
continue until the next `>` at the start of a line.

```convo
> system
You are a helpful assistant.

> user
Hello!

> assistant
Hi there - how can I help?
```

Common roles include `system`, `user`, `assistant`, `define`, `do`, `function`, `call`, and
`result`. Custom roles are allowed as long as they don't collide with reserved names.

### Comments

There are two kinds of comments:

```convo
// Code comments - invisible to the LLM, used by developers

# Documentation comments - visible to the LLM, used to describe functions, types, and parameters
```

Documentation comments are important because they are how you give the LLM context about your
functions and types. Even poorly named functions can be used correctly when documented.

### Tags

Tags attach metadata to messages, functions, and statements. A tag starts with `@`, is placed on
the line before what it tags, and can optionally take a value.

```convo
@suggestion
> assistant
Tell me a joke

@edge
@condition = eq(mode "debug")
> system
Debug mode is active - be extra verbose.
```

Tags drive a huge amount of Convo-Lang's behavior: conditional rendering, edge evaluation,
caching, JSON responses, tool choice, and more.

### Variables and Types

Variables store state about a conversation. They are declared inside `> define` or `> do` blocks
and can be referenced anywhere in the conversation using dynamic expressions.

```convo
> define
name = "Ricky"
age = 38

Pet = struct(
    name: string
    kind: enum("dog" "cat" "bird")
    age: int
)

buddy = new(Pet {
    name: "Buddy"
    kind: "dog"
    age: 7
})
```

Convo-Lang has built-in types: `string`, `number`, `int`, `boolean`, `time`, `any`, `null`,
`undefined`, `array`, `map`, and user-defined `struct` and `enum` types.

Variable names must start with a lowercase letter. Type names must start with an uppercase letter.
System variables (prefixed with `__`) are reserved and used to configure runtime behavior.

### Top-Level Statements

`> define` and `> do` messages contain executable statements.

- `> define` - Used for variables, types, and side-effect-free setup. Restricted to a safe subset
  of functions.
- `> do` - Used for arbitrary code that may have side effects (HTTP calls, filesystem access,
  etc.).

```convo
> define
greetingTemplate = "Hello, {{name}}"

> do
profile = httpGet("https://api.example.com/me")
```

### Dynamic Expressions

Anywhere in a content message, `{{ ... }}` executes a Convo-Lang expression and inlines the
result.

```convo
> define
user = "Max"

> assistant
Hi, {{user}}! It is currently {{dateTime()}}.
```

### Functions and Tools

Functions define callable units. They can serve as tools the LLM may call, or as local helpers
invoked by other Convo-Lang code.

```convo
# Adds two numbers
> addNumbers(
    a: number
    b: number
) -> (
    return(add(a b))
)

> user
What is 2 plus 2?
```

When a function has no body, Convo-Lang automatically returns the arguments as an object. When a
function does have a body, it can contain arbitrary Convo-Lang statements including control flow
(`if`, `while`, `foreach`, `switch`) and calls to other functions.

Functions can be modified:

- `> local myFn(...)` - Not exposed to the LLM, only callable from other Convo-Lang code
- `> extern myFn(...)` - Implementation lives in the host language (JavaScript/Python)
- `> call myFn(...)` - A function invocation message (usually inserted by the engine)

### Extern Functions

When Convo-Lang is embedded in an application, extern functions bridge into the host language.

```convo
> extern setShapeColor(
    shape: enum("circle" "triangle" "square")
    color: string
)
```

```ts
conversation.implementExternFunction('setShapeColor', (shape, color) => {
    document.querySelector(`.shape-${shape}`)?.setAttribute('fill', color);
    return 'ok';
});
```

This is how agents gain arbitrary capabilities - calling databases, updating the UI, hitting
internal APIs, and so on.

---

## Conversation Flow

### The Conversation Engine

A Convo-Lang script is interpreted by the **Conversation Engine**, which manages:

- Parsing source code into messages
- Tracking variable state
- Flattening dynamic expressions before sending to the LLM
- Dispatching tool calls and appending their results
- Applying tags and transformers
- Streaming responses back to the caller

Execution flow at a high level:

1. Parse Convo source into messages.
2. Flatten messages, evaluating dynamic expressions.
3. Send flattened messages to an LLM adapter.
4. Receive a response; if it contains a function call, invoke the function.
5. Append the result and continue until the LLM returns a plain content message.
6. Repeat as new user input arrives.

Because all intermediate state is appended back to the conversation, the full execution is
recoverable and inspectable at any point.

### Message Modifiers

Modifier messages adjust the previous content message without the LLM or the user having to
regenerate it:

- `> append` / `> prepend` - Add content visible to user and LLM.
- `> prefix` / `> suffix` - Add content visible only to the LLM.
- `> replace` / `> replaceForModel` - Replace the content, optionally for the model only.
- `> appendUser` / `> appendAssistant` / `> appendSystem` - Append to the last message of that
  role.

These are especially useful inside message triggers and inline prompts.

### Conditional and Edge Messages

`@condition` makes a message conditional:

```convo
> define
verbose = true

@condition = verbose
> system
Include step-by-step explanations in all answers.
```

`@edge` defers evaluation of a message until the *end* of flattening, so it always sees the latest
state. Combine `@edge` with `@condition` or dynamic expressions to inject up-to-date context into
system messages.

```convo
@edge
> system
Current cart: {{toJson(cart)}}
```

### Message Triggers

Triggers fire functions in response to new messages:

```convo
@on user
> onUserMessage() -> (
    if( ??? (+ boolean /m) Does the user sound frustrated? ??? ) then(
        ??? (+ respond /m) Acknowledge the frustration and offer help ???
    )
)
```

Triggers are how you build custom reasoning, moderation, logging, or preprocessing into an agent
without touching host code.

---

## Advanced Language Features

### Inline Prompts

Inline prompts run sub-LLM calls from inside a function. They are enclosed in `???` and accept a
header with modifiers.

```convo
> classifyIntent() -> (
    ??? (+ intent=json:Intent /m task:Classifying)
        Classify the user's intent as one of the known Intent types.
    ???
)
```

Common modifiers:

| Modifier | Meaning |
|----------|---------|
| `*` | Extend - include user/assistant messages from the parent conversation |
| `+` | Continue - include parent messages *and* previous inline prompt output |
| `/m` | Wrap content in a `<moderator>` tag |
| `boolean` | Return a true/false result |
| `json:Type` | Return JSON matching the given type |
| `respond` | Set the response of the current user message |
| `replace` / `append` / `prepend` / `prefix` / `suffix` | Modify the current message |
| `>>` | Append the inline prompt output directly to the conversation |
| `{var}=` | Assign the prompt result to a variable |
| `last:N` | Include the last N user/assistant messages |
| `task:Description` | Display a task label in the UI while running |

Static inline prompts use `===` instead of `???` and return their content verbatim instead of
invoking an LLM - useful for constructing rich responses from pre-written text.

### Transforms

Transforms post-process assistant output into structured data, typically for rendering a custom UI
component.

```convo
@transformComponent WeatherCard WeatherProps
> system
Convert weather-related assistant output into a WeatherProps object.
```

When an assistant message matches the transform's conditions, it is converted into structured
JSON, tagged as a component, and delivered to the UI.

### Imports and Modules

The `@import` tag pulls in external Convo-Lang sources:

```convo
@import ./weather-agent.convo
@import ./user-profile.convo
@import std://file-blocks
```

Imports can be:

- Local files (`./some-agent.convo`)
- HTTP URLs
- Standard library modules (`std://...`)
- Named modules registered with the runtime

Import modifiers control how the import behaves:

```convo
@import ./policies.md !file
@import ./helpers.convo !system
```

### RAG Integration

Enabling retrieval augmentation is a single call:

```convo
> define
enableRag("public/movies")

> user
Life is like a box of...
```

When the user sends a message, the registered RAG callback retrieves relevant documents, the
engine appends them as `> rag` messages, and the LLM sees them as context. The host application
supplies the actual retriever - Pinecone, Convo-Db, or a custom vector store.

### Multi-Model Support

Switching models is a variable assignment:

```convo
> define
__model = "gpt-4o"

> user
Summarize the attached document.
```

Convo-Lang handles the format conversion per-model, including augmenting capabilities like
function calling and JSON mode for models that don't support them natively. This means you can
write one prompt and run it against OpenAI, Claude, Llama, DeepSeek, Bedrock, OpenRouter, or a
local LM Studio endpoint without rewriting anything.

### Node Graphs

For more structured agentic flows, Convo-Lang supports nodes and routes. Each `> node` defines a
step; `@to`, `@from`, and `@exit` tags define edges between nodes. `> goto` transitions between
them at runtime.

```convo
> node collectInfo
@to next = validateInfo
> user
Please provide your email.

> node validateInfo
@to next = done
@exit = error
> do
if( not(isValidEmail(input)) ) then( setVar('error' true) )
```

Node graphs allow you to build explicit, inspectable workflows while still leveraging LLMs for
individual steps.

---

## Integrating Convo-Lang

### TypeScript / JavaScript

Install the core package:

```sh
npm install @convo-lang/convo-lang
```

Create a conversation and interact with it:

```ts
import { Conversation } from '@convo-lang/convo-lang';

const convo = new Conversation();

convo.append(/*convo*/`
    > system
    You are a concise assistant.

    > user
    Give me three ideas for a weekend project.
`);

const completion = await convo.completeAsync();
console.log(completion.message?.content);
```

Additional packages extend the core:

- `@convo-lang/convo-lang-api-routes` - Standard HTTP routes
- `@convo-lang/convo-lang-aws-cdk` - AWS Lambda deployment
- `@convo-lang/convo-lang-bedrock` - AWS Bedrock LLMs
- `@convo-lang/convo-lang-cli` - Command-line interface
- `@convo-lang/convo-lang-pinecone` - Pinecone RAG provider
- `@convo-lang/convo-lang-react` - React UI components
- `@convo-lang/convo-vfs` - Virtual filesystem for agents

### The Conversation Class

`Conversation` is the central runtime object. A few common patterns:

**Appending and awaiting:**

```ts
convo.append('> user\nHello');
const result = await convo.completeAsync();
```

**Defining variables and functions from host code:**

```ts
convo.defineVar({ name: 'userName', value: 'Alice' });

convo.defineFunction({
    name: 'lookupOrder',
    description: 'Looks up an order by id',
    paramsJsonScheme: { type: 'object', properties: { id: { type: 'string' } } },
    callback: async ({ id }) => {
        return await orderDb.get(id);
    },
});
```

**Calling a function directly:**

```ts
const summary = await convo.callFunctionAsync('summarize', { text });
```

**Getting structured JSON:**

```ts
const result = await convo.completeJsonSchemeAsync(
    z.object({ sentiment: z.enum(['positive','neutral','negative']) }),
    'How does this review feel? ' + review
);
```

**Forking:**

```ts
const fork = convo.fork({ label: 'analysis' });
fork.append('> user\nWhat are the risks?');
const risks = await fork.completeAsync();
```

A forked conversation inherits state but appends back into the parent as thinking messages,
keeping the main conversation clean.

**Observing events:**

```ts
convo.onAppend.subscribe(({ text }) => console.log('APPEND:', text));
convo.onChunk.subscribe(chunk => process.stdout.write(chunk.chunk ?? ''));
```

**Flattening:**

```ts
const flat = await convo.flattenAsync();
// flat.messages contains the fully-evaluated messages that will be sent to the LLM
```

### Working with the Parser

The parser is exposed for tooling and validation use cases:

```ts
import { parseConvoCode } from '@convo-lang/convo-lang';

const result = parseConvoCode(sourceText, { logErrors: true });

if (result.error) {
    console.error(result.error.message);
} else {
    for (const msg of result.result ?? []) {
        console.log(msg.role, msg.content);
    }
}
```

Parsed messages carry references back to their source locations (`s`, `e`, `ln`), which makes it
easy to build LSP features, inspectors, and debuggers.

---

## Convo-Lang as the Core of the Ecosystem

Everything described so far - the messages, the tool calls, the variables, the triggers, the node
graphs - exists in a single shared representation. That representation is what makes the larger
Convo-Lang ecosystem possible.

- **Convo-Db** stores and retrieves nodes, edges, and embeddings using functions that return
  Convo-Lang data structures, so query results drop directly into a conversation. Function
  triggers on the database can emit Convo-Lang that is appended into the conversation that caused
  them.

- **Convo-Make** is driven entirely by `> target`, `> make`, `> app`, and `> stage` messages.
  Build configurations, app definitions, and stage pipelines are all Convo-Lang. The builder is
  itself an agent that reads and writes Convo.

- **Convo-VSCode** understands the language semantically. It provides syntax highlighting, LSP
  features, inline execution, and a view into the parsed message tree - because the editor speaks
  the same language as the runtime.

- **Convo-View** renders a conversation object directly. There is no separate message format for
  the UI to consume; the chat view renders the same text that is sent to the LLM (with support
  for streaming, transforms, and custom components).

- **Convo-REST** exposes the Conversation engine over HTTP. Requests and responses are
  Convo-Lang, so a browser client and a server both reason about exactly the same object.

- **Convo-CLI** runs Convo-Lang scripts from the terminal and can boot a full Convo-REST server
  in one command - the same scripts you run locally are the scripts served over HTTP.

Because the language is the contract between every layer, components can be swapped or extended
without breaking the system. You can:

- Start with the CLI and move to Convo-REST without rewriting agents
- Replace the default LLM backend without touching agent code
- Build your own UI and have it render the same conversations the reference UI does
- Store conversations in Convo-Db, then replay them in Convo-VSCode for debugging
- Treat an agent as a file, a row, a payload, or a stream - interchangeably

The plain-text, ledger-style nature of Convo-Lang isn't just a developer convenience. It's a
design decision that lets the entire ecosystem stay simple, transparent, and composable.

---

## Further Reading

- `learn-convo-lang.md` - Full language tutorial with runnable examples
- `@convo-lang/convo-lang` on npm - Core runtime
- The VSCode extension - Syntax highlighting and execution
- Example agents in the mono-repo - Patterns for common agent types

Happy building.
