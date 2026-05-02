# Convo Scripting Guide

Convo-Lang is an AI-native scripting language for building structured prompts, agent workflows, tool-calling experiences, and multi-step LLM conversations.

A Convo script is a plain text conversation plus executable logic. It can define messages, variables, functions, types, imports, tags, inline prompts, and runtime behavior in one auditable file.

## High Level Overview

A Convo script is made of a few core building blocks:

- **Messages** - conversation entries like `> system`, `> user`, and `> assistant`.
- **Variables** - state stored in `> define` or `> do` blocks.
- **Functions / tools** - callable functions that LLMs or scripts can use.
- **Types** - enums and structs used to describe structured data.
- **Tags** - metadata applied to the next message or function.
- **Imports** - reusable scripts, documents, modules, and content.
- **Inline prompts** - prompts executed inside functions for custom reasoning.
- **Dynamic expressions** - embedded code inside message content using `{{ ... }}`.

A small Convo script looks like this:

``` convo
> define
agentName='Riley'
topic='Convo-Lang'

> system
You are {{agentName}}, a helpful teacher.
You explain {{topic}} clearly and concisely.

> assistant
Hi, I'm {{agentName}}. What would you like to learn?

> user
What is Convo-Lang?
<__send/>
```

## Messages

Messages start with `>` followed by a role.

Common message roles:

- `system` - hidden instructions for the LLM.
- `assistant` - messages from the assistant.
- `user` - messages from the user.
- `define` - top-level deterministic declarations.
- `do` - top-level executable statements.
- `call` - a function call inserted by the LLM or script.
- `result` - the result of a function call.

``` convo
> system
You are a helpful assistant.

> assistant
How can I help?

> user
Tell me a joke about robots.
<__send/>
```

## Dynamic Expressions

Message content can include expressions inside double curly braces.

``` convo
> define
name='Maya'
today=dateTime()

> assistant
Hi {{name}}, today is {{today}}.
```

Dynamic expressions can call functions, reference variables, and perform calculations.

``` convo
> define
price=12
count=4

> assistant
The total is ${{mul(price count)}}.
```

## Comments

Convo has two comment styles:

``` convo
// Developer comment. Not shown to the LLM.

# Documenting comment. Used to describe the next message, type, or function to the LLM.
```

Use `#` comments to explain functions and type fields for the model.

``` convo
# Sends an email greeting to a user
> sendGreeting(
    # Email address to send the greeting to
    to:string

    # Greeting message
    message:string
)
```

## Variables

Variables are usually defined in `> define` or `> do` messages.

``` convo
> define
name='Sam'
age=32
likesPizza=true
colors=['red' 'green' 'blue']

> assistant
{{name}} is {{age}} years old.
```

### `define` vs `do`

Use `define` for static declarations and deterministic setup.

``` convo
> define
User=struct(
    name:string
    email:string
)

defaultUser=new(User {
    name:'Guest'
    email:'guest@example.com'
})
```

Use `do` when executing runtime logic or functions with side effects.

``` convo
> do
profile=httpGet('https://api.example.com/profile')
```

## System Variables

System variables start with `__` and configure runtime behavior.

Common system variables:

``` convo
> define
__model='gpt-4o'
__trackTime=true
__trackTokenUsage=true
__trackModel=true
```

Useful system variables:

- `__model` - default LLM model.
- `__endpoint` - completion endpoint.
- `__userId` - current user id.
- `__trackTime` - adds time tags.
- `__trackTokenUsage` - tracks token usage.
- `__trackModel` - tracks model usage.
- `__rag` - enables RAG.
- `__ragParams` - parameters passed to RAG.
- `__cwd` - current working directory in filesystem-enabled environments.
- `__debug` - enables debug output.

## Types

Convo supports primitive types, enums, arrays, maps, and structs.

### Primitive Types

Common primitive types:

- `string`
- `number`
- `int`
- `boolean`
- `time`
- `any`
- `null`
- `undefined`

### Enums

Use enums to restrict allowed values.

``` convo
> define
TicketType=enum('checkout' 'shipping' 'product-return' 'other')
```

### Structs

Use structs to define structured data.

``` convo
> define
SupportTicket=struct(
    type:TicketType
    message:string
    productName?:string
)
```

Optional fields use `?`.

``` convo
productName?:string
```

## Functions and Tools

Functions are one of the most important parts of Convo-Lang. They allow an LLM to take actions in a controlled way.

A function can define only a signature:

``` convo
# Creates a support ticket
> createTicket(
    # Type of support request
    type:enum('checkout' 'shipping' 'product-return' 'other')

    # User's support message
    message:string
)
```

If the LLM calls this function, Convo will return the arguments by default.

A function can also define a body:

``` convo
# Adds two numbers together
> addNumbers(
    a:number
    b:number
) -> (
    return(add(a b))
)

> user
What is 12 plus 30?
<__send/>
```

A function body can update variables, call HTTP endpoints, or return instructions.

``` convo
> define
cart=[]

# Adds a product to the cart
> addToCart(
    name:string
    price:number
) -> (
    item={
        name:name
        price:price
    }
    cart=aryAdd(cart item)
    return('Product added to cart')
)
```

## Extern Functions

Extern functions are implemented outside of Convo-Lang, usually in TypeScript or JavaScript, but exposed to a script.

``` convo
# Sets the color of a shape
> extern setShapeColor(
    shape:enum('circle' 'triangle' 'square')
    color:string
)
```

The host application registers the actual implementation.

Extern functions are useful for:

- Browser actions.
- Database writes.
- API calls.
- File operations.
- UI updates.
- Integrating existing application code.

## Tags

Tags start with `@` and apply to the next message, function, or statement.

``` convo
@suggestion
> assistant
Show me today's weather
```

Common tags:

- `@import` - imports another script or content source.
- `@edge` - evaluates the message with latest state.
- `@condition` - conditionally includes a message.
- `@json` - requests a JSON response.
- `@responseModel` - uses a specific model for a message.
- `@call` - controls tool calling.
- `@suggestion` - renders a clickable suggestion.
- `@renderOnly` - visible to user but hidden from LLM.
- `@hidden` - hidden render target.
- `@task` - assigns a message to a task.
- `@on` - creates a message trigger.
- `@transform` - transforms assistant output.
- `@component` - renders a custom UI component.

### Conditional Tags

Use `@condition` to include messages conditionally.

``` convo
> define
mode='friendly'

@edge
@condition = eq(mode 'friendly')
> system
You are warm, friendly, and encouraging.

@edge
@condition = eq(mode 'strict')
> system
You are concise and strict.
```

### Edge Messages

Use `@edge` when a message should be evaluated with the latest variable values.

``` convo
> define
balance=100

@edge
> system
Current account balance: {{balance}}

> deposit(amount:number) -> (
    balance=add(balance amount)
)
```

Without `@edge`, messages are evaluated in normal order.

## Imports

Imports are how Convo scripts reuse code, prompts, tools, documents, and modules.

An import uses the `@import` tag:

``` convo
@import ./shared-tools.convo
@import ./persona.convo

> user
Can you help me?
<__send/>
```

Imported content can be:

- Local `.convo` files.
- Remote `.convo` files over HTTP.
- Markdown or text content.
- Standard library imports like `std://file-blocks.convo`.
- Application-provided modules.
- Glob imports, depending on the host import service.

### Basic Import

``` convo
@import ./weather-tools.convo

> assistant
Ask me about the weather.
```

Example imported file:

``` convo
// weather-tools.convo

# Gets the current weather for a city
> getWeather(
    city:string
    state:string
) -> (
    return(httpGet('https://api.example.com/weather?city={{encodeURIComponent(city)}}&state={{state}}'))
)
```

### HTTP Import

``` convo
@import https://example.com/convo/customer-support.convo
```

### Standard Imports

Standard imports are built-in modules prefixed with `std://`.

``` convo
@import std://file-blocks.convo
@import std://bash-blocks.convo
```

Useful standard imports include:

``` convo
@import std://file-blocks.convo
@import std://bash-blocks.convo
@import std://node-blocks.convo
@import std://bun-blocks.convo
@import std://python-blocks.convo
@import std://make.convo
@import std://db.convo
```

### Importing Content as System Context

Markdown or plain text imports are usually wrapped as system context when they do not contain Convo roles.

``` convo
@import ./company-policy.md

> user
Can I approve this expense?
<__send/>
```

If `company-policy.md` has no Convo message roles, it is imported as a system message by default.

### Import Modifiers

Imports support modifiers using `!`.

Common modifiers:

- `!system` - only import system messages.
- `!ignoreContent` - ignore non-system content messages.
- `!merge` - merge multiple import results into one.
- `!tag:TAG_NAME` - wrap imported content in an XML-style tag.
- `!file` - wrap imported content in `FILE_CONTENT`.
- `!role:roleName` - assign imported content to a specific role.
- `!assign:varName` - assign imported source content to a variable.
- `as varName` - shorthand for `!assign:varName`.
- `!template:templateName` - use an import template.

### Import Only System Messages

``` convo
@import ./agent-persona.convo !system
```

### Import and Wrap Content in an XML Tag

``` convo
@import ./policy.md !tag:POLICY
```

The imported content is wrapped so the LLM can clearly identify it.

### Import as a File Block

``` convo
@import ./src/example.ts !file
```

This wraps the content in a `FILE_CONTENT` block.

### Import and Assign Content to a Variable

``` convo
@import ./about.md as aboutText

> system
Use this information:
{{aboutText}}
```

### Import With a Custom Role

``` convo
@import ./welcome.md !role:assistant
```

### Import Templates

Import templates let you control how imported content is wrapped.

``` convo
@importMatch *.md
> importTemplate
<document name="{{__importName}}">
$$CONTENT$$
</document>

@import ./docs/overview.md
```

Import templates are useful for RAG-like context, documentation packs, policy files, and source code.

### Good Import Practices

Prefer small focused imports:

``` convo
@import ./types.convo
@import ./tools/cart.convo
@import ./persona/friendly-shopper.convo
```

Avoid giant catch-all imports unless you are intentionally building a knowledge bundle.

Use imports for:

- Shared tool libraries.
- Shared data types.
- Agent personas.
- Policy documents.
- Domain knowledge.
- UI component transforms.
- Reusable examples.
- Standard response patterns.

## JSON Mode

Use `@json` to request a JSON response.

``` convo
> define
Planet=struct(
    name:string
    diameterInMiles:number
    numberOfMoons:number
)

@json Planet
> user
What is the largest planet in the solar system?
<__send/>
```

For arrays:

``` convo
@json Planet[]
> user
List the four largest planets.
<__send/>
```

You can also use anonymous JSON types:

``` convo
@json = struct(
    title:string
    summary:string
)
> user
Summarize Convo-Lang in one paragraph.
<__send/>
```

## RAG

RAG can be enabled with the `@rag` tag or by calling `enableRag`.

``` convo
@rag public/movies

> system
Use retrieved movie quotes to answer the user.

> user
Life is like a box of...
<__send/>
```

You can also enable RAG inside a function or trigger.

``` convo
> define
enableRag('/company/docs')
```

A RAG template controls how retrieved content is inserted.

``` convo
> ragTemplate
<RAG_CONTEXT>
$$RAG$$
</RAG_CONTEXT>
```

## Inline Prompts

Inline prompts let you ask an LLM something inside a function.

They start and end with `???`.

``` convo
@on user
> detectSupportNeed() -> (
    needsSupport=??? (+ boolean /m)
        Does the user need customer support?
    ???

    if(needsSupport) then(
        print('Support needed')
    )
)
```

### Common Inline Prompt Modifiers

- `+` - continue from prior inline context.
- `*` - extend from parent conversation.
- `/m` - wrap prompt as a moderator instruction.
- `boolean` - return true or false.
- `json:TypeName` - return structured JSON.
- `respond` - use result as the assistant response.
- `append` - append result to the triggering message.
- `suffix` - append hidden content to the triggering message.
- `replace` - replace the triggering message.
- `>>` - write prompt output to the conversation.
- `task:Description` - show a task label in the UI.

### Extracting Structured Data

``` convo
> define
Todo=struct(
    title:string
    dueDate?:string
)

@on user
> extractTodos() -> (
    ??? (+ todos=json:Todo[] /m task:Extracting todos)
        Extract any todo items from the user's message.
    ???
)
```

### Responding From a Trigger

``` convo
@on user
> answerMath() -> (
    if(??? (+ boolean /m)
        Is the user asking a math question?
    ???) then(
        ??? (+ respond /m task:Solving math)
            Answer the user's math question clearly.
        ???
    )
)
```

## Static Inline Prompts

Static inline prompts use `===` instead of `???`.

They do not call an LLM. They return the content directly.

``` convo
> getGreeting() -> (
    return(===
        Hello! How can I help?
    ===)
)
```

Static prompts are useful for returning instructions after tool calls.

``` convo
> submitTicket(message:string) -> (
    response=httpPost('https://api.example.com/tickets' {message:message})

    return(===
        Tell the user their ticket was submitted.
        Ticket ID: {{response.id}}
    ===)
)
```

## Message Triggers

Use `@on` to run a function when a user or assistant message is appended.

``` convo
@on user
> onUserMessage() -> (
    print('User said: {{content}}')
)
```

Triggers are commonly used for:

- Moderation.
- Memory extraction.
- Routing.
- Task detection.
- Auto-response.
- Message transformation.
- Custom reasoning flows.

Example:

``` convo
> define
UserProfile=struct(
    name?:string
    favoriteColor?:string
)

profile={}

@on user
> updateProfile() -> (
    info=??? (+ json:UserProfile /m task:Updating profile)
        Extract user profile information from the latest message.
    ???

    profile=merge(profile info)
)
```

## Components and Render-Only Messages

A message can be rendered to the user but not sent to the model.

``` convo
@renderOnly
> assistant
This is visible in the UI but hidden from the LLM.
```

A component message renders a custom component.

``` convo
@component
> assistant
<ProductCard id="abc123"/>
```

Input components can submit data back into the conversation.

``` convo
@component input
> assistant
<ContactForm/>
```

## Transforms

Transforms convert assistant output into structured data and optionally render UI components.

``` convo
> define
ProductCard=struct(
    name:string
    price:number
)

@transform ProductCard
@transformDescription Extract product card information from assistant messages.
@transformComponent ProductCardView ProductCard
> system
Convert product descriptions into ProductCard JSON.
```

Transforms are useful when the assistant should respond naturally, while the UI renders structured views.

## Parallel Messages

Parallel blocks allow multiple user messages to be completed at once.

``` convo
> addNumbers(a:number b:number) -> (
    return(add(a b))
)

> parallel

@call
> user
Add 2 and 3.

> user
Tell me a joke about cats.

> user
Tell me a joke about birds.
```

## Node Graphs

Node graphs allow procedural agent flows.

``` convo
> node start
Ask the user what kind of trip they want.

> assistant
What kind of trip are you planning?

@to collectDetails
> user
I want a beach vacation.

> node collectDetails
Collect trip details and preferences.

> assistant
What budget and dates do you have in mind?
```

Node graphs are useful for:

- Workflows.
- Multi-step forms.
- Agent routing.
- Process automation.
- Guided decision trees.

## Default Learning Guide

The following path is a practical sequence for learning how to write Convo scripts.

### Lesson 1 - Write a Basic Conversation

Start with messages.

``` convo
> system
You are a helpful assistant that answers in one paragraph.

> assistant
Ask me anything.

> user
What is TypeScript?
<__send/>
```

Key ideas:

- `system` controls behavior.
- `assistant` sets initial visible text.
- `user` asks the model to continue.
- `<__send/>` marks where an interactive example should send.

### Lesson 2 - Add Variables

``` convo
> define
teacherName='Ari'
subject='prompt engineering'

> system
You are {{teacherName}}, a teacher specializing in {{subject}}.

> assistant
Hi, I'm {{teacherName}}. Ready to learn {{subject}}?
```

Practice:

- Change `teacherName`.
- Change `subject`.
- Add another variable and insert it into the system message.

### Lesson 3 - Add Conditions

``` convo
> define
experience='beginner'

@edge
@condition = eq(experience 'beginner')
> system
Explain concepts using simple examples.

@edge
@condition = eq(experience 'advanced')
> system
Use concise technical language and assume prior knowledge.

> user
Explain embeddings.
<__send/>
```

Practice:

- Change `experience` to `advanced`.
- Add an `intermediate` condition.

### Lesson 4 - Define a Type

``` convo
> define
Book=struct(
    title:string
    author:string
    year:int
    tags:array(string)
)

@json Book
> user
Give me a classic science fiction book.
<__send/>
```

Practice:

- Add an optional field.
- Request an array using `@json Book[]`.

### Lesson 5 - Define a Tool

``` convo
# Gets a user's order status
> getOrderStatus(
    # Order id to look up
    orderId:string
) -> (
    return({
        orderId:orderId
        status:'shipped'
        eta:'Tomorrow'
    })
)

> user
Where is order A100?
<__send/>
```

Practice:

- Add a second field to the return object.
- Add another tool called `cancelOrder`.

### Lesson 6 - Track State

``` convo
> define
todos=[]

# Adds a todo item
> addTodo(
    title:string
) -> (
    todos=aryAdd(todos {title:title done:false})
    return('Todo added')
)

# Marks a todo item as done
> completeTodo(
    title:string
) -> (
    // Real apps should find by id. This keeps the example simple.
    return('Todo completed')
)

@edge
> system
Current todos:
{{toJson(todos)}}

> assistant
I can help manage your todos.

> user
Add "learn Convo-Lang" to my todo list.
<__send/>
```

Practice:

- Add a `removeTodo` function.
- Include due dates.

### Lesson 7 - Use Imports

Create reusable files.

`types.convo`:

``` convo
> define
SupportTicket=struct(
    type:enum('checkout' 'shipping' 'product-return' 'other')
    message:string
    productName?:string
)
```

`support-tools.convo`:

``` convo
# Submits a support ticket
> submitSupportTicket(ticket:SupportTicket) -> (
    return(httpPost('https://api.example.com/support' ticket))
)
```

Main script:

``` convo
@import ./types.convo
@import ./support-tools.convo
@import ./company-policy.md !tag:POLICY

> system
You are a customer support agent.
Use the imported policy when answering questions.

> user
My package is late. Can you help?
<__send/>
```

Practice:

- Split persona, types, and tools into separate imports.
- Import a markdown FAQ file.
- Try `!tag:FAQ` for imported documentation.

### Lesson 8 - Use JSON Mode

``` convo
> define
Recipe=struct(
    name:string
    ingredients:array(string)
    steps:array(string)
)

@json Recipe
> user
Give me a simple pancake recipe.
<__send/>
```

Practice:

- Convert the result into an array.
- Add fields for prep time and servings.

### Lesson 9 - Use Inline Prompts

``` convo
> define
SupportTicket=struct(
    type:enum('checkout' 'shipping' 'product-return' 'other')
    message:string
)

@on user
> supportRouter() -> (
    if(??? (+ boolean /m task:Checking support need)
        Does the user need customer support?
    ???) then(
        ticket=??? (+ json:SupportTicket /m task:Creating ticket)
            Create a support ticket from the user's latest message.
        ???

        print(ticket)
    )
)

> user
I can't complete checkout because the payment page freezes.
<__send/>
```

Practice:

- Add `productName`.
- Call an HTTP endpoint after creating the ticket.

### Lesson 10 - Build a Small Agent

``` convo
@import ./support-types.convo
@import ./support-tools.convo
@import ./company-faq.md !tag:FAQ

> define
agentName='Nora'
cart=[]

@edge
> system
You are {{agentName}}, a friendly support agent.

Use the FAQ when relevant:
<faq>
{{__importedFaq}}
</faq>

Current cart:
{{toJson(cart)}}

# Adds an item to the cart
> addToCart(
    name:string
    price:number
) -> (
    cart=aryAdd(cart {name:name price:price})
    return('Added to cart')
)

> assistant
Hi, I'm {{agentName}}. How can I help today?

@suggestion
> assistant
I need help with checkout

@suggestion
> assistant
Show me flooring options

> user
I want to buy waterproof vinyl tile.
<__send/>
```

Practice:

- Add product types.
- Add order placement.
- Add a support ticket fallback.
- Add `@edge` system context for cart state.

## Example - Customer Support Agent

``` convo
@import ./customer-support-types.convo
@import ./customer-support-tools.convo
@import ./company-policy.md !tag:COMPANY_POLICY

> define
agentName='Flo'

@edge
> system
You are {{agentName}}, a helpful customer support agent.

Follow company policy:
<COMPANY_POLICY>
{{companyPolicy}}
</COMPANY_POLICY>

Ask clarifying questions when needed.
Never request payment information directly in chat.

> assistant
Hi, I'm {{agentName}}. How can I help?

@suggestion
> assistant
Where is my order?

@suggestion
> assistant
I need to return a product

@suggestion
> assistant
Checkout is not working

> user
Checkout freezes when I click pay.
<__send/>
```

## Example - Research Assistant

``` convo
@import ./research-tools.convo
@import ./writing-style.md !tag:STYLE_GUIDE

> define
ResearchSummary=struct(
    title:string
    keyPoints:array(string)
    openQuestions:array(string)
    sources:array(string)
)

> system
You are a research assistant.
Use the writing style below.

<STYLE_GUIDE>
{{writingStyle}}
</STYLE_GUIDE>

# Searches for source material
> searchSources(
    query:string
) -> (
    return(httpGet('https://api.example.com/search?q={{encodeURIComponent(query)}}'))
)

@json ResearchSummary
> user
Research the benefits and risks of using AI assistants in education.
<__send/>
```

## Example - Tool Calling Workflow

``` convo
> define
Order=struct(
    product:string
    quantity:int
    shippingSpeed:enum('standard' 'express')
)

order=null

# Creates an order draft
> createOrder(orderDraft:Order) -> (
    order=orderDraft
    return('Order draft created')
)

# Confirms the current order
> confirmOrder() -> (
    if(not(order)) return('Error: No order draft exists')
    return('Order confirmed')
)

@edge
> system
Current order:
{{toJson(order)}}

> assistant
What would you like to order?

> user
I need 3 boxes of printer paper with express shipping.
<__send/>
```

## Example - Custom Reasoning With Inline Prompts

``` convo
> define
Intent=struct(
    intent:enum('question' 'support' 'purchase' 'other')
    confidence:number
)

@on user
> routeUser() -> (
    intent=??? (+ json:Intent /m task:Classifying intent)
        Classify the user's latest message.
    ???

    switch(
        intent.intent

        case('support') === (respond /m)
            Tell the user you can help with support and ask for one detail about the issue.
        ===

        case('purchase') === (respond /m)
            Ask what product they are interested in buying.
        ===

        default() === (suffix /m)
            Continue normally.
        ===
    )
)
```

## Scripting Checklist

When writing a Convo script, check:

1. **Purpose** - What should the agent do?
2. **Persona** - What should the system message say?
3. **State** - What variables should be tracked?
4. **Types** - What structured data is needed?
5. **Tools** - What actions can the LLM take?
6. **Imports** - What reusable scripts or documents should be included?
7. **Safety** - What restrictions should be enforced?
8. **Output** - Should responses be plain text, JSON, components, or tool calls?
9. **Triggers** - Should anything happen automatically on user or assistant messages?
10. **Testing** - Can each flow be tested with a short example?

## Recommended File Organization

A practical Convo project can be organized like this:

``` text
agents/
    support-agent.convo
    sales-agent.convo

shared/
    types.convo
    common-tools.convo
    safety.convo

knowledge/
    company-policy.md
    faq.md
    product-catalog.md

components/
    product-card-transform.convo
```

Example main agent:

``` convo
@import ../shared/types.convo
@import ../shared/common-tools.convo
@import ../shared/safety.convo
@import ../knowledge/company-policy.md !tag:COMPANY_POLICY
@import ../knowledge/faq.md !tag:FAQ

> system
You are a helpful support agent.

Use the imported policy and FAQ when relevant.
```

## Best Practices

### Keep Scripts Readable

Prefer clear, focused messages.

``` convo
> system
You are a helpful support assistant.
Ask one question at a time.
```

Avoid hiding important behavior across too many unrelated files.

### Use Types for Structure

If data matters, define a struct.

``` convo
> define
CustomerIssue=struct(
    category:enum('billing' 'shipping' 'technical' 'other')
    summary:string
    urgency:enum('low' 'medium' 'high')
)
```

### Document Tools With `#`

Good tool descriptions improve function calls.

``` convo
# Cancels an order if it has not shipped yet
> cancelOrder(
    # Order id to cancel
    orderId:string
)
```

### Use `@edge` for Current State

``` convo
@edge
> system
Current user profile:
{{toJson(profile)}}
```

### Use Imports for Reuse

Prefer this:

``` convo
@import ./types.convo
@import ./tools.convo
@import ./persona.convo
```

Over copying the same code into many agents.

### Keep Sensitive Actions Behind Tools

Do not ask the model to "just do" sensitive things in text. Define explicit functions.

``` convo
# Issues a refund after policy validation
> issueRefund(
    orderId:string
    reason:string
)
```

### Use JSON Mode for Machine-Readable Output

``` convo
@json SupportTicket
> user
Create a ticket for this issue: my order never arrived.
```

### Test Small Pieces

Test functions, imports, and prompts independently before combining them.

## Common Patterns

### Persona Import

``` convo
@import ./personas/friendly-teacher.convo
```

### Tool Library Import

``` convo
@import ./tools/calendar.convo
@import ./tools/email.convo
```

### Knowledge Import

``` convo
@import ./docs/policy.md !tag:POLICY
```

### Structured Extraction

``` convo
> define
Lead=struct(
    name?:string
    email?:string
    company?:string
    need:string
)

@json Lead
> user
Extract the lead info from this message: Jane from Acme needs help with billing.
<__send/>
```

### Tool Call Required

``` convo
# Looks up an invoice
> lookupInvoice(invoiceId:string)

@call lookupInvoice
> user
Look up invoice INV-100.
<__send/>
```

### Disable Tool Calling

``` convo
@call none
> user
Answer without using tools: what is a refund policy?
<__send/>
```

## Troubleshooting

### The LLM Is Not Calling a Function

Check:

- Is the function visible, not `local`?
- Does it have good `#` documentation?
- Are argument types clear?
- Did you accidentally use `@call none`?
- Is the function imported?
- Is the tool supported by the selected model?

### Imported Content Is Not Appearing

Check:

- Is the import path correct?
- Is the import service configured in the host app?
- Does the file contain valid Convo syntax?
- Did you use `!system` or `!ignoreContent` unintentionally?
- Did the module name already import once?

### Variables Are Stale

Use `@edge` for system messages that depend on latest state.

``` convo
@edge
> system
Current state:
{{toJson(state)}}
```

### JSON Is Invalid

Use a struct with `@json`.

``` convo
@json MyType
> user
Return data in the required structure.
```

### Message Trigger Is Not Running

Check:

- Is the function tagged with `@on user` or `@on assistant`?
- Is `disableTriggers` set in the host?
- Does the trigger condition evaluate to true?
- Is the triggering message a content message?

## Minimal Starter Template

``` convo
@import ./types.convo
@import ./tools.convo
@import ./knowledge.md !tag:KNOWLEDGE

> define
agentName='Convo Assistant'
state={}

@edge
> system
You are {{agentName}}.

Use this knowledge when relevant:
<KNOWLEDGE>
{{knowledge}}
</KNOWLEDGE>

Current state:
{{toJson(state)}}

> assistant
Hi, I'm {{agentName}}. How can I help?

> user
Hello!
<__send/>
```

## Next Steps

To keep learning:

1. Write a basic chat script.
2. Add variables and `@edge` context.
3. Define one struct.
4. Define one function.
5. Split types and functions into imports.
6. Add JSON mode.
7. Add an inline prompt trigger.
8. Add RAG or imported knowledge.
9. Add a component or transform if building UI.
10. Test with realistic conversations.

Convo-Lang works best when prompts, state, actions, and structure live together in a readable script.
`
