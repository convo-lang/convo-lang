# Convo-Lang.
Convo-Lang is a programming language built from the ground up for prompt engineers and AI application
developers. The goal of Convo-Lang is to simplify to development of LLM based applications and 
provided a uniform syntax for working with all LLMs.

Convo-Lang can be used in Javascript, Python, from the command line or directly in VSCode via the
Convo-Lang extension. The core of Convo-Lang consists of 2 parts, the Convo-Lang language and the
Conversation Engine.

The **Convo-Lang** language or just simply "Convo-Lang", is used to write prompts in a structured
language that can be interchangeably used with different LLMs.

The **Conversation Engine** is a code interpreter that executes scripts written in the
Convo-Lang language. It handles passing messages between users and LLMs and manages all the lower
level details of working with an LLM such as implementing the usages of tools.

*@@static*
``` convo
> system
You are a prompt engineer learning Convo-Lang. Prompting will never be the same 🥹
```

## Why Convo-Lang
Q. Why do we need another programming language when LLMs understand English?

A. Well, The short answer is there's more to prompting than you may think.

When using applications like ChatGTP, Grok or Gemini prompting typically involves writing a message
or series of messages and sending them to an LLM and getting a response. This type of free form
interaction with an LLM can be very useful in many situations and requires nothing more than the
use of english. But the nature of this type of unstructured and unguided conversation does fit well
inside the setting of a purposeful application.

When building AI powered (agentic) applications more structure is needed.
The prompts that help power agentic applications need the ability to define the behavior,
personality and knowledge of their agents. They need to be able to expression both sides of a
conversation, both the user and agent. And they need to be able to define how agents connect
to the outside world when using tools. This is why we need a new programming language (Convo-Lang).

*@@static*
``` convo
> system
Personality, Behavior, Knowledge

> extern connectToReality(command:string)

> assistant
Welcome to Convo-Lang 🥳

> user
This is amazing 🤩
```

## A Quick Comparison
To demonstrate some of the advantages of Convo-Lang we will take a look at the same prompt in
both the OpenAI standard and in Convo-Lang. The prompt instructs an agent to act as a funny dude
and to always respond to the user with a joke and if the user likes a joke to call the likeJoke function.

OpenAI Standard:
``` json
{
    "model": "gpt-4o",
    "messages": [
        {
            "role": "system",
            "content": "You are a funny dude. respond to all messages with a joke regardless of the situation.\n\nIf a user says that they like one of your jokes call the like Joke function"
        },
        {
            "role": "assistant",
            "content": "How can I make you laugh today 🤓"
        }
    ],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "likeJoke",
                "description": "Call when the user likes a joke",
                "parameters": {
                    "type": "object",
                    "required": [
                        "joke"
                    ],
                    "properties": {
                        "joke": {
                            "type": "string",
                            "description": "The joke the user liked"
                        },
                        "reason": {
                            "type": "string",
                            "description": "The reason they liked the joke"
                        }
                    }
                }
            }
        }
    ]
}
```

Convo-Lang:
*@@static*
``` convo
# Call when the user likes a joke
> likeJoke(
    # The joke the user liked
    joke:string
    # The reason they liked the joke
    reason?:string
) -> (
    httpPost("https://funny-jokes.com/api/like" __args)
)

> system
You are a funny dude. respond to all messages with a joke regardless of the situation.

If a user says that they like one of your jokes call the like Joke function

> assistant
How can I make you laugh today 🤓
```

You can decide which version you prefer, but it's pretty obvious which one is easier to read. And
as an added bonus the Convo-Lang version even handles making the HTTP request to submit the liked
joke, this is completely out of the scope of the OpenAI standard and requires a non-trivial 
amount of additional code when not using Convo-Lang.

## How does it work?
Convo-Lang is much more than just a pretty way to format prompts, it's a full programming
language and runtime. At a high level, Convo-Lang scripts are executed on a
client device and the output of the script is used to create prompts in the format
of the LLM, then the converted prompt are sent to the LLM. This process of execution and conversion
allows Convo-Lang to work with any LLM that an adaptor can be written for and allows Convo-Lang to
add enhanced capabilities to an LLM without needed to make any changes to the model itself.

Convo-Lang execution flow:

![1. Parse Convo-Lang script. The parsed script results in a collection of message objects.
2. Load parsed messages objects into a Conversation context. The Conversation context contains message, variables, callbacks for tools and more.
3. Wait for user input or continue if explicitly instructed
4. Evaluate and flatten the messages of the conversation. When a message is flatten any dynamic expressions in the message are evaluated and the resulting flatten message is a static string.
5. Send flattened messages an LLM adapter. LLM adapters handle the sending of messages to an LLM in the format expected by the LLM.
6. LLM adapter converts flattened messages into the format required by its target LLM.
7. Messages are sent to the LLM.
8. LLM sends back a response.
9. The LLM adapter converts the response messages to a collection of ConvoCompletionMessage objects which is usable by the Conversation context.
10. The LLM adapter sends the ConvoCompletionMessage objects to the Conversation context.
11. The Conversation context appends the new messages to the conversation.
12. If no tool calls are required return to step 3 otherwise continue
13. Requested tool / function is invoked and its return value is appended to the conversation as a message. The actual code that gets ran can either be external code such as JavaScript or Python or can be Convo-Lang executional statements.
14. The return value message is sent to the LLM using an LLM adapter using steps 5 - 11.
15. The LLM returns a response message based on the return value message
16. Return to step 3](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-execution-flow.png?raw=true)



# Learning Time.
Now that you have have a basic understanding of how Convo-Lang works its time to start your 
journey with the language and learn its ways 🥷. The following Convo-Lang tutorial is full of
interactive snippets. We encourage you to try them all, the best way to learn is to do.

## Doc
Meet Doc, your personal assistant on your journey into the world of Convo-Lang. Ask Doc any questions
you have about Convo-Lang and he will give you a hand. You can use the "Ask the Doc" chat box at the
top of the screen at anytime during this tutorial.

Below is the Convo-Lang script for Doc. By the end of this tutorial you will be able to write your own
skilled agent similar to Doc and more.

*@@convo-source agent-doc*
``` convo
> define
langName="Convo-Lang"

> system
You are teaching a prompt engineer a really cool 
and existing programming language called {{langName}}

<about-convo-lang>
{{staticContent.learn_convo_lang_md}}
</about-convo-lang>

Any time you would need to respond with an answer that
would required a markdown style code fence containing
Convo-Lang call the showExample function.

# Shows an example Convo-Lang script. Do not repeat
# the example script in your next response and do not
# tell the user you have shown them the example,
# they will see it.
> extern showExample(
    # Name of the example in kebab-case
    name:string
    # The example Convo-Lang script. Do not inclose
    # any of the script in code markdown style
    # code fences using (```)
    convoScript:string
)

> assistant
Hi 👋, I'm Doc

> assistant
I'm here to help you learn {{langName}}.

> assistant
All of the example {{langName}} code example are 
interactive. I recommend trying out all of the 
examples for your self. It is the best way to learn.

@suggestionTitle Common questions
@suggestion
> assistant
What is {{langName}}

@suggestion
> assistant
How do functions work

@suggestion
> assistant
How do I call a javascript function from {{langName}}

@suggestion
> assistant
What are tags

@suggestion
> assistant
What do you use variables
```

Doc is purely written in Convo-Lang and uses the document you are reading right now as his knowledge
base in combination with a few functions in integrate into the Convo-Lang website. Doc is a great
example of what can be done with Convo-Lang.

## Summary

## Conversations
At the heart of Convo-Lang are Conversations. A Conversation is a collection
of messages. Messages can either contain textual content, multi-modal content
or executable statements.

Conversations are managed by the Conversation Engine, which is a code interpreter
that interpreters Convo-Lang scripts. It handles all of the complexities of sending messages between
a user and an LLM, executing tool use / calling function and manages the internal state of a Conversation.

Convo-Lang scripts are conversations written in the Convo-Lang syntax and stored in a file or memory.
When integrating Convo-Lang into an application you will often store Convo-Lang scripts in strings
that are then passed to the Conversation Engine.

Here is a simple example of a Convo-Lang script.

``` convo
> define
name="Jeff"

> assistant
Hello, I'm {{name}} 🥸. What can I help you with?

> user
What are the names of the planets in our solar system


> assistant
The planets in our solar system, in order from
closest to the Sun to farthest, are:

1. Mercury
2. Venus
3. Earth
4. Mars
5. Jupiter
6. Saturn
7. Uranus
8. Neptune

Additionally, there are also dwarf planets,
with Pluto being the most well-known among them.

> user
Thank you

> assistant
You're welcome! If you have any more questions,
feel free to ask.




```

## Integration
Convo-Lang can be integrated into any TypeScript/JavaScript or Python application. We won't go into
depth about how to integrate Convo-Lang into an application here, as we are mainly focused on learning
the Convo-Lang language in this document. Below are a couple of quick start guide and links to more
information about integration.

### TypeScript/Javascript Integration
The follow NPM packages are available for TypeScript/JavaScript integration

- @convo-lang/convo-lang - Contains the Convo-Lang Conversation Engine, and a Typescript/Javascript library to use Convo-Lang in your application.
- @convo-lang/convo-lang-react - Contains UI pre-built UI components including a fully functional chat component.
- @convo-lang/convo-lang-api-routes - A backend for relaying messages between the browser and LLM backends such as OpenAI.
- @convo-lang/convo-vfs - Used to integrate Convo-Lang into virtual file systems.
- @convo-lang/convo-lang-cli - A CLI interface that allows you to execute and parse convo-lang files.
- @convo-lang/convo-lang-tools - Contains the convo-lang vscode extension, which includes syntax highlighting,
  in-editor script execution, script parsing, and other helpful tools for working with convo-lang.
  In most cases, you will not install this package but instead install the vscode convo-lang extension.

### VSCode Extension
To help you develop Convo-Lang application faster and easier we provide a VSCode extension that gives
you Convo-Lang syntax highlighting and allows you to execute Convo-Lang scripts directly in VSCode.

You can install the vscode extension by searching for "convo-lang" in the vscode extension tab.

[https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools](https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools)

### Python Integration
**Coming Soon**

## Language Basics
Convo-Lang consists of a few simple building blocks, Content Message, Functions, Top Level Statements,
Variables, Tags and Comments. By combining these building blocks Convo-Lang allows you to create
interactive, multi-modal conversations between humans and LLMs. These conversations.

- Content Message - Textual and multi-modal messages shared between humans and LLMs
- Comments - There are 2 type of comments in Convo-Lang, Document Comment and Coding Comments
    - Documenting Comments - Used to document functions and data structures for LLMs. Documenting Comments start with a (`#`) character .
    - Coding Comments - Used to level comments about code or messages. LLMs are not aware of coding comments. Coding Comments start the (`//`)
- Top Level Statements - Blocks of executable statements that can define variables, data structures and execute arbitrary code
- Variables - Variables store well define state information in a conversation
- Functions - Functions or "Tools" that can be used by LLMs or other code in a conversation
- Tags - Used to attach metadata to messages, functions and statements

**Content Messages:**
*@@static*
``` convo
> system
This is a system message used to control the
behaviour of an LLM

> assistant
This is an assistant message sent from the LLM

> user
This is a user message sent form the user
```
\
**Comments:**
*@@static*
``` convo
// this is a coding comment and will not be visible to the LLM

# This is a documenting comment and will document the message or statement that follows it
```
\
**Top Level Statements:**
*@@static*
``` convo
> define
// We can define variables and data structures here
```
\
**Variables:**
*@@static*
``` convo
> define
// This is a variable named username
username="Max"

// We can now insert the username variable in the following message using a dynamic expression
> assistant
Hi, my name is {{username}}
```
\
**Functions:**
*@@static*
``` convo
// Below is a function an LLM can call. Functions can also define a body containing code statements.

# Opens a page of a PDF by page number
> gotoPage(
    # The page number to goto
    pageNumber:number
)
```
\
**Tags:**
*@@static*
``` convo
// The @suggestion tag displays a suggestions to the user
@suggestion
> assistant
This is a suggestion message
```



## Content Messages
Content message represent textual and multi-modal messages shared between an LLM and a user.

Below is an example of a clown telling a jokes to a user.
``` convo
> system
You are a funny clown name Bido telling jokes
to young kids. Respond to all messages with
a circus joke.

When you tell a joke first ask the user a question
in one message then deliver the punch line after
they respond.

> assistant
Hi, I'm Bido. I can tell you a joke about anything.

> user
I think cats secretly rule the world.

> assistant
Why did the circus lion eat a tightrope walker?

> user
I dont know

> assistant
Because he wanted a well-balanced meal!
```

This example used 3 different types of messages: `system`, `assistant` and `user` which are all content
messages. The `system` message defines the behaviour of the LLM and is hidden from the user in the
chat window, the `assistant` messages represent the message sent by the LLM and the `user` messages
represent the message sent by the user.


### Dynamic Expressions
Content messages can also contain dynamic expressions. Dynamic expressions are small pieces of 
Convo-code surrounded in double curly brackets - `{{ add( 1 2) }}`

Below is an example of inserting the current date and time into a system message to allow the LLM to
know what the date and time it is.

``` convo
> system
The current date and time is {{dateTime()}}

> user
What time is it.

> assistant
It is currently 4:20 pm
```

## Comments
There are 2 types of comments in Convo-Lang: documenting comments and non-documenting comments.

Documenting comments begin with the `#` character and continue to the end of the line the comment is
written on. Documenting comments are relayed to the LLM and help inform the LLM. For example a 
documenting comment can be added to a function to instruct the LLM on how to use the function.

Non-documenting comments begin with `//` and also continue to the end of the line the comment is
written on. Non-documenting comments are not relayed to the LLM and are meant to store developer
comments

``` convo
> define
# A vehicle used to make deliveries.
# Personal use is prohibited.
DeliveryVehicle = struct(
    # A fun nice name for the vehicle
    nickname:string
    # A range from 0 to 1
    fuelLevel:number
)

// add more vehicles later
superVan=new(DeliveryVehicle {
    nickname:"Betty"
    fuelLevel:0.8
})

// myFunction is a poorly named function, but 
// documenting comments should help

# Places an online order for a pizza
> myFunction(

    # Name of the pizza to order
    arg1: string

    # Number of pizzas to order
    arg2: number
)

> user
Order 200 peperoni pizzas

@toolId call_kjFS4sxrL1lxdZ9V528bgTWY
> call myFunction(
    "arg1": "pepperoni",
    "arg2": 200
)
> result
__return={
    "arg1": "pepperoni",
    "arg2": 200
}

> assistant
I have placed an order for 200 pepperoni pizzas.
```

As you can see, even though the function to order pizzas was named myFunction the LLM was able to
call myFunction to order the pizzas since the documenting comments informed the LLM what the 
function is used for and what the arguments of the function are used for.


## Top Level Statement Messages
Top level statements are used to define variables, data structures and execute statements.
There are 4 types of top level statement messages. In most cases you will use `define` or `do`.

- `define` - Used to define variables and types. Code written in a define message have a limited set of functions they can call.
- `do` - Used to define variables and execute statements.
- `debug` - Used to write debug information. In most cases, you will not directly create debug messages.
- `end` - Explicitly ends a message and can be used to set variables related to the ended message.

`define` and `do` both allow you to write Convo-code that is executed at runtime. 
The only difference between them is that `define` limits the types of functions that can be called
and is intended to contain code that can be statically analyzed and has no side-effects at runtime.

Below is an example of creating an agent named Ricky. The `define` and `do` top level statements
define variable that are inserted into content messages using dynamic expressions.

``` convo
> define

Hobby = struct(
    name: string
    annualBudget: number
)

name='Ricky'
age=38
profession='Race car driver'
action='Go Fast!'
aboutUrl='/example/ricky.md'
hobby=new(Hobby {
    name: "Deep sea diving"
    annualBudget: 30000
})

> do
about=httpGetString(aboutUrl)

> system
Your name is {{name}}. You are {{age}} years old
and you're a {{profession}}.

Use the following information to answers questions.
<about-you>
{{about}}
<about-you>

Your favorite hobby:
<favorite-hobby>
{{hobby}}
</favorite-hobby>

> assistant
Hi, my name is {{name}}. Are you ready to {{action}}
```

As you can see the `define` message defines several variables about the persona we want the agent
to have. We also defined a `struct` to describe the properties of a hobby. We will learn
more about data structure later on. All of the code in the `define` message contains static
values that will have no side-effects at runtime and will not change regardless of when and
where the prompt is executed. In the `do` message we load a markdown file over HTTP and since the
loading data over the network has non-deterministic behavior the `httpGetString` function must be
called from within a `do` message.

## Variables
Variables allow you to store state information about a conversation in named variables and
can be defined directly in Convo-Lang or injected from external sources. Using variables allows
you to create prompt template and avoid purely relying on the memory of an LLM to keep track of
important information. Variables must always start with a lowercase letter.

### Variable Types
Convo-Lang defines a set of built-in primitive types, strings, arrays, enums and custom data structures.
Strings are enclosed in pairs of single or double quotes. Variables are dynamically typed so they 
can be assigned to any variable type at any time.

`string` - A series of characters enclosed in either single or double quotes. [read more](#strings)

`number` - Floating point number

`int` - Integer

`time` - Integer timestamp

`boolean` - Boolean or a true / value value

`any` - A type that can be assigned any value

`null` - Null constant

`undefined` - Undefined constant

`enum` - A restricted set of strings or numbers. [read more](#enums)

`array` -  An array of values. [read more](#arrays)

`map` - An object with key value pairs

`struct` - A custom data structure. [read more](#structures)

Below is an example different variable types
``` convo
> define

intVar=123
floatingPointVar=1.23

// now() returns the current date and 
// time as a timestamp
timeVar=now()

// booleans can be true or false
trueVar=true
falseVar=false

nullVar=null

undefinedVar=undefined

// The value of intVar will be inserted into
// the string at runtime
singleQVar='value - {{intVar}}'

// The value of intVar will not be inserted
doubleQVar="value - {{intVar}}"

// The array will have a value of 1, 2, true
arrayVar=array(1 2 intVar trueVar)

PetType=enum("cat" "dog" "fish" "bird")

Pet=struct(
    name:string
    type:PetType
    attributes:object
)

pet=new(Pet {
    name:"Mini"
    type:"bird"
    attributes:{
        color:'blue'
        age:6
    }
})

> assistant
intVar: {{intVar}}
floatingPointVar: {{floatingPointVar}}
timeVar: {{timeVar}}
trueVar: {{trueVar}}
falseVar: {{falseVar}}
nullVar: {{nullVar}}
undefinedVar: {{undefinedVar}}
singleQVar: {{singleQVar}}
doubleQVar: {{doubleQVar}}

arrayVar:
{{arrayVar}}

pet:
{{pet}}

```

### Variable Scope
Variables live either in the global scope of a conversation or in the local scope of a function.
Variables define in global scope can be inserted into content messages using dynamic expressions.

``` convo
> define
// This variable is defined in global scope
storeLocation="Cincinnati"

> orderFood(food:string) -> (
    // food and order time are both defined in the 
    // local variable scope of the orderFood function.
    orderTime=dateTime()

    // Here we print out a summary of the order 
    // including the storeLocation which comes from
    // the global scope
    print('Order: time:{{orderTime}}] location:{{storeLocation}} - {{food}}')

    return('Success')
)

// The storeLocation variable is accessed from global 
// scope and inserted into the assistant message.
> assistant
Welcome to the {{storeLocation}} Crabby Patty
```

### Variable Assignment Order
Depending on where at in a conversation a variable is accessed it can have different values, this
is because variable assignment only effects messages following the assignment.

``` convo
> define
bottleCount=99

> assistant
There are {{bottleCount}} bottles of beer on the
wall. Now take one down and pass it around.

> define
bottleCount=98

> assistant
There are {{bottleCount}} bottles of beer on the
wall. Now take one down and pass it around.

> define
bottleCount=97

> assistant
There are {{bottleCount}} bottles of beer on the
wall. I see a cycle of alcohol abuse forming.

```
As you can see each message says there is a different number of bottles of beer on the wall and this
is because each message is only effected by the assignments the come before them.

**There is one exception** to the rules of variable assignment order. When a messages is tagged with
the `@edge` tag it is considered an [Edge Message](#edge-messages). Edge messages are always evaluated at
the end of a conversation. They are most often used to injected the most update value of variables
into system messages. We will learn more about Edge Messages later in this tutorial.



### System Variables
System variables are used to control the configuration of a conversation at run time through
variable assignment. All system variables start with a double underscore `__` and using a double
underscore for user defined variables is prohibited.

`__cache` - Used to enabled prompt caching. A value of true will use the default prompt cached
  which by default uses the `ConvoLocalStorageCache`. If assigned a string a cache with a matching
  type will be used.

`__args` - A reference to the parameters passed the the current function as any object.

`__return` - A reference to the last return value of a function called by a call message

`__error` - A reference to the last error

`__cwd` - In environments that have access to the filesystem __cwd defines the current working directory.

`__debug` - When set to true debugging information will be added to conversations.

`__model` - Sets the default model

`__endpoint` - Sets the default completion endpoint

`__userId` - Sets the default user id of the conversation

`__trackTime` - When set to true time tracking will be enabled.

`__trackTokenUsage` - When set to true token usage tracking will be enabled.

`__trackModel` - When set to true the model used as a completion provider will be tracked.

`__visionSystemMessage` - When defined __visionSystemMessage will be injected into the system message of conversations with vision capabilities. __visionSystemMessage will override the default vision system message.

`__visionServiceSystemMessage` - The default system message used for completing vision requests. Vision requests are typically completed in a separate conversation that supports vision messages. By default the system message of the conversation that triggered the vision request will be used.

`__defaultVisionResponse` - Response used with the system is not able to generate a vision response.

`__md` - A reference to markdown vars.

`__rag` - Enables retrieval augmented generation (RAG). The value of the __rag can either be true, false or a number. The value indicates the number of rag results that should be sent to the LLM by default all rag message will be sent to the LLM. When setting the number of rag messages to a fixed number only the last N number of rag messages will be sent to the LLM. Setting __rag to a fixed number can help to reduce prompt size.

`__ragParams` - object it is ignored.

`__ragTol` - The tolerance that determines if matched rag content should be included as contact.

`__sceneCtrl` - A reference to a SceneCtrl that is capable of describing the current user interface as a scene the user is viewing.

`__lastDescribedScene` - The last described scene added to the conversation

`__voice` - Used by agents to define their voice

## Functions
Function messages define functions ( also known as tools ) that LLMs can call at runtime. Function
messages start with a `>` character followed by an optional modifier, identifier, 0 or more arguments
and an optional function body. A function's body contains Convo-code the is executed by the
Conversation Engine. If a function does not define a body it will return the arguments
it is given as and object with key value paris matching the names an values of arguments passed. 

Below is an example of an LLM using a `addNumbers` function to add numbers together.
``` convo
# Adds 2 numbers together
> addNumbers(
    a: number
    b: number
) -> (
    return( add( a b ) )
)

> user
What is 2 plus 2


@toolId call_eG2MksnUMczGCjoKsY8AMh0f
> call addNumbers(
    "a": 2,
    "b": 2
)
> result
__return=4


> assistant
2 plus 2 equals 4.
```

After the user asked what 2 plus 2 is the LLM called the `addNumbers` function using a function
`call` message. Function call messages define the name of a function to call and the arguments
to pass to the function. After the addNumbers function is called its return value is written as
a `result` message and stores the return value in the `__return` variable. Following the `result`
message the LLM responds with a content message giving the result to the user in plain english.


### Extern Functions
Extern function allow you do define functions in other languages that are call by the the Conversation Engine
This allows Convo-Lang to integrate into existing systems and offload complex logic to more traditional programming languages

Below is an example of an agent setting the color of an SVG shape based on input from the user

**Extern function written in javascript:**
*@@export*
``` js
export function setShapeColor(shape,color){
    const svgShape=document.querySelector(`#example-color-shapes .shape-${shape}`);
    if(svgShape){
        svgShape.setAttribute('fill',color);
        return 'Color set';
    }else{
        return 'Unable to find shape';
    }
}
```

**SVG:**
``` html
<svg id="example-color-shapes" width="300" height="100" viewBox="0 0 300 100">
    <circle class="shape-circle" cx="56.6176" cy="50" r="35" fill="red"/>
    <path class="shape-triangle" d="M144 17L182 82H107L144 17Z" fill="blue"/>
    <rect class="shape-square" x="208.382" y="17.4706" width="70" height="70" fill="green"/>
</svg>
```

*@@render*
``` html
<svg id="example-color-shapes" width="300" height="100" viewBox="0 0 300 100">
    <circle class="shape-circle" cx="56.6176" cy="50" r="35" fill="red"/>
    <path class="shape-triangle" d="M144 17L182 82H107L144 17Z" fill="orange"/>
    <rect class="shape-square" x="208.382" y="17.4706" width="70" height="70" fill="green"/>
</svg>
```

*@@load shapeColor*
``` convo
# Sets the color of a shape
> extern setShapeColor(

    # The shape to set the color of
    shape:enum( "circle" "triangle" "square" )

    # A hex color to set the shape to
    color:string;
)

> user
Change the color of the triangle to orange

@toolId call_vWZpLFZr2IiHWE30deg4ckGw
> call setShapeColor(
    "shape": "triangle"
    "color": "orange"
)
> result
__return="Color set"


> assistant
The color of the triangle has been set to orange

```

## Tags
Tags are used in many ways in Convo-Lang and serve as a way to add metadata to messages and 
code statements. Tags on the line just before the message or code statement they are tagging. Tags
start with the `@` character followed by the name of the tag and optionally a value for the tag
separated from it's name with a space character - `@tagName tagValue`.

The following show the use of several different tags and describes their usage.

``` convo
> assistant
Ask me a question

// @concat appends the content of the follow 
// message to the previous
@concat
> assistant
Any question, I dare ya.

// @suggestion display a message as a
// clickable suggestion
@suggestion
> assistant
What is your favorite ice cream

@suggestion
> assistant
how much wood can a woodchuck chuck

// @json instructs the LLM to response with JSON
@json
> user
How many planets are there in the solar system

// @format indicates the response format 
// of the message
@format json
> assistant
{
    "number_of_planets": 8,
    "planets": [
        "Mercury",
        "Venus",
        "Earth",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune"
    ]
}
```

### System Tags
Below is a full list of system tags Convo-Lang uses.

`@cache` - Enables caching for the message the tag is applied to. No value of a value of true will use
  the default prompt cached which by default uses the `ConvoLocalStorageCache`. If assigned a string
  a cache with a matching type will be used.

`@clear` - Clears all content messages that precede the messages with the exception of system
messages. If the value of "system" is given as the tags value system message will also be cleared.

`@noClear` - Prevents a message from being clear when followed by a message with a `@clear` tag applied.

`@disableAutoComplete` - When applied to a function the return value of the function will not be 
  used to generate a new assistant message.

`@edge`  Used to indicate that a message should be evaluated at the edge of a conversation with 
  the latest state. @edge is most commonly used with system message to ensure that all injected values
  are updated with the latest state of the conversation.

`@time` - Used to track the time messages are created.

`@tokenUsage` - Used to track the number of tokens a message used

`@model` - Used to track the model used to generate completions

`@responseModel` - Sets the requested model to complete a message with

`@endpoint` - Used to track the endpoint to generate completions

`@responseEndpoint` - Sets the requested endpoint to complete a message with

`@responseFormat` - Sets the format as message should be responded to with.

`@responseAssign` - Causes the response of the tagged message to be assigned to a variable

`@json` - When used with a message the json tag is short and for `@responseFormat json`

`@format` - The format of a message

`@assign` - Used to assign the content or jsonValue of a message to a variable

`@capability` - Used to enable capabilities. The capability tag can only be used on the first 
  message of the conversation if used on any other message it is ignored. Multiple capability tags
  can be applied to a message and multiple capabilities can be specified by separating them with a comma.

`@enableVision` - Shorthand for `@capability vision`

`@task` - Sets the task a message is part of. By default messages are part of the "default" task

`@maxTaskMessageCount` - Sets the max number of non-system messages that should be included in a task completion

`@taskTrigger` - Defines what triggers a task

`@template` - Defines a message as a template

`@sourceTemplate` - used to track the name of templates used to generate messages

`@component` - Used to mark a message as a component. The value can be "render" or "input". The default
               value is "render" if no value is given. When the "input" value is used the rendered component
               will take input from a user then write the input received to the executing conversation.
               [read more](#components)

`@renderOnly` - When applied to a message the message should be rendered but not sent to LLMs

`@condition` - When applied to a message the message is conditionally added to the flattened view of a
                 conversation. When the condition is false the message will not be visible to the user or 
                 the LLM. [read more](#conditional-messages)

`@renderTarget` - Controls where a message is rendered. By default messages are rendered in the default chat
                    view, but applications can define different render targets.

`@toolId` - Used in combination with function calls to mark to return value of a function and its call message

`@disableAutoScroll` - When applied to the last content or component messages auto scrolling will be disabled

`@markdown` - When applied to a message the content of the message will be parsed as markdown

`@sourceUrl` - A URL to the source of the message. Typically used with RAG.

`@sourceId` - The ID of the source content of the message. Typically used with RAG.

`@sourceName` - The name of the source content of the message. Typically used with RAG.

`@suggestion` - When applied to a message the message becomes a clickable suggestion that when clicked will
                add a new user message with the content of the message. If the suggestion tag defines a value
                that value will be displayed on the clickable button instead of the message content but the
                message content will still be used as the user messaged added to the conversation when clicked.
                Suggestion message are render only and not seen by LLMs.

`@suggestionTitle` - A title display above a group of suggestions

`@output` - Used to mark a function as a node output.

`@errorCallback` - Used to mark a function as an error callback

`@concat` - Causes a message to be concatenated with the previous message. Both the message the tag is
           attached to and the previous message must be content messages or the tag is ignored. 
           When a message is concatenated to another message all other tags except the condition tag are ignored.

`@call` - Instructs the LLM to call the specified function. The values "none", "required", "auto" have a 
         special meaning. If no name is given the special "required" value is used.
- none: tells the LLM to not call any functions
- required: tells the LLM it must call a function, any function.
- auto: tells the LLM it can call a function respond with a text response. This is the default behaviour.


`@eval` - Causes the message to be evaluated as code. The code should be contained in a markdown code block.

`@userId` - Id of the user that created the message

`@preSpace` - Causes all white space in a content message to be preserved. By define all content message
              whitespace is preserved.

`@import` - Allows you to import external convo-lang scripts. [read more](#imports)

## Imports
Imports allow external Convo-Lang sources to be imported into the current conversation. Imports can
be used to import libraries of functions, agent personas, knowledge sources, etc.

Imports are defined using the `@import` tag followed by the name or location of the source to import
and optional modifiers.

Import sources can be http endpoints or custom named sources that are retired using application 
registered import handlers. Import handlers allow application to use any type of logic to handle
loading import sources.

The following example includes 3 snippets of Convo-Lang. The first to are import sources and the
last is the conversation importing the first 2.

*@@static*
*@@convo-source weather-agent*
``` convo
// source name = weather-agent
> system
You are a friendly weather forecaster.
Always base your answers off of the weather

# Gets the current weather conditions for the given
# location. Returned values use the metric system.
> getWeather(
    city:string
    state:string
) -> (
    weather=httpGet(
        "https://6tnpcnzjbtwa5z4qorusxrfaqu0sqqhs.lambda-url.us-east-1.on.aws/",
        '{{city}} {{state}}'
    )
    return(weather)
)
```

*@@static*
*@@convo-source beach-boy*
``` convo
// source name = beach-boy
> system
Use the follow bio about the user to help answer questions
<bio>
Location: Miami, FL
age: 25
hobbies: Surfing, Roller Blading, Puzzles
</bio>
```

``` convo
@import weather-agent
@import beach-boy
> assistant
Do you have any questions about todays weather

> user
What should I do today?

@toolId call_9Ep8tg03DigprvvDuWVXQ0xC
> call getWeather(
    "city": "Miami",
    "state": "FL"
)
> result
__return={
    "data": {
        "time": "2024-10-26T01:56:00Z",
        "values": {"cloudBase": 0.52,"cloudCeiling": 0.52,"cloudCover": 100,"dewPoint": 20.13,"freezingRainIntensity": 0,"humidity": 78,"precipitationProbability": 0,"pressureSurfaceLevel": 1019.95,"rainIntensity": 0,"sleetIntensity": 0,"snowIntensity": 0,"temperature": 24.13,"temperatureApparent": 24.13,"uvHealthConcern": 0,"uvIndex": 0,"visibility": 16,"weatherCode": 1001,"windDirection": 65.88,"windGust": 7.31,"windSpeed": 3.5}
    }
}


> assistant
The weather in Miami today is mostly cloudy with a temperature of about 24°C (75°F). There is no chance of rain and mild winds at a speed of 3.5 m/s.

Given the conditions, here are some activities you might enjoy today:

1. **Surfing**: Since there is no rain and the wind is not too strong, it could be a great day to hit the waves.

2. **Roller Blading**: With a nice temperature and cloudy skies, it's also a good opportunity for roller blading along Miami's scenic paths.

3. **Puzzles at Home**: If you prefer staying indoors, maybe a relaxing day of puzzles would be a perfect way to enjoy the clouds without worrying about rain.

Enjoy your day!
```

## RAG
Retrieval augmented generation or RAG is a key part of any serious AI application, but it can be complicated to implement correctly. Convo-Lang provides an easy to use interface to connect a conversation to any RAG source.

**How does RAG work in Convo-Lang**
1. A user sends a message
2. A registered RAG callback function is called and is passed the message the user is sending
3. The RAG callback then preforms the task of retrieving information related to the user's message
4. The RAG callback returns the related information
5. Convo-Lang then appends the related information to the user's message and optionally encloses the information in a prefix and suffix

The following RAG example uses a very simple keyword matching algorithm. If the user's message
contains all of the keywords of one of the JSON items below that item will be used as RAG source.
*@@rag-source*
``` json
[
    {
        "keywords":["fast","car"],
        "id":1,
        "name":"Faster than lighting",
        "text":"The Tesla Model S Plaid is one of the fastest production vehicles ever made"
    },
    {
        "keywords":["truck","reliable"],
        "id":2,
        "name":"Just won't die",
        "text":"Toyota Tundras are known to last up to 1,000,000 miles"
    }
]
```

``` convo
> define
__rag=true

// This message will be used as a prefix for
// any injected RAG information
> ragPrefix
Use the following related information as context
for your response
<related-information>

// This message will be used as a suffixed for
// any injected RAG information
> ragSuffix
</related-information>

> user
I'm looking for a fast car


@sourceId 1
@sourceName Faster than lighting
> rag
The Tesla Model S Plaid is one of the fastest
production vehicles ever made

> assistant
If you're looking for a fast car, the Tesla Model S
Plaid is definitely worth considering. It's one of
the fastest production vehicles ever made,
delivering exceptional speed and performance.
```

After the rag message and rag prefix and suffix are applied the user message it will look like the
following to the LLMs.

*@@static*
``` convo
> user
I'm looking for a fast car

Use the following related information as context for your response
<related-information>
The Tesla Model S Plaid is one of the fastest
production vehicles ever made
</related-information>
```

## Vision
Vision capabilities are enabled in Convo-Lang using markdown style images. Markdown images are
converted into the native format of LLM at runtime.

*@@tall*
``` convo
> user
What percent of the green energy mix come
from Biomass in this image
![image](https://app.convo-lang.ai/example/green-energy.png)
```

## JSON Mode
It is often very useful for for you to have an LLM return responses as properly formatted JSON.
JSON mode is enabled using the `@json`.

``` convo
@json
> user
What is the population and land area of the 2
largest states in America by GDP?

@format json
> assistant
{
    "California": {
        "population": 39538223,
        "land_area": 163696,
        "units": "square_miles"
    },
    "Texas": {
        "population": 29145505,
        "land_area": 268596,
        "units": "square_miles"
    }
}
```

Here we can see the LLM returned a JSON object with California and Texas and included a `@format` tag
with a value of json, indicating properly formatted JSON was returned.

You can also provide the name of a data structure as the value of a `@json` tag. When provided the
returned JSON will conform to the given structure.

``` convo
> define
Planet = struct(
    name:string
    diameterInMiles:number
    distanceFromSun:number
    numberOfMoons:number
)

@json Planet
> user
What is the biggest planet in our solar system



@format json
> assistant
{
    "name": "Jupiter",
    "diameterInMiles": 86881,
    "distanceFromSun": 484000000,
    "numberOfMoons": 79
}
```

## Caching
**(Documentation coming soon)**

## Message Queuing
**(Documentation coming soon)**

## Parallel
Parallel message execution allows multiple messages to be completed at the same time. This is useful
when you need to generated multiple responses within the same conversation and you want to reduce
the time it takes to get back all of the responses.

*(note - Chat based interfaces are not the intended use case on parallel messages. Below is just a demonstration)*
**Press the send button in the chat window to complete all messages at once**
``` convo
> addNumbers(a:number b:number) -> (add(a b))

> parallel

@call
> user
Add 1 plus {{'3'}}

> user
Tell me a joke about cats

> user
Tell me a joke about birds

@call
> user
Add 55 plus {{'45'}}
```

## Stats Tracking
Using `__trackTime`, `__trackTokenUsage`, and `__trackModel` you can enable in-conversation stats
that are written to the conversation as tags

``` convo
> define
__trackTime=true
__trackTokenUsage=true
__trackModel=true

> user
Write a short poem about tree frogs eating fly when
all they want is some cheesecake.


@time 2024-10-26T00:43:09-04:00
@tokenUsage 24 / 188 / $0.00294
@model gpt-4o
> assistant
In the moonlit grove where the shadows dance,  
Tree frogs gather with a hopeful glance.  
Their eyes on the flies that circle the night,  
Yet dreams of cheesecake fill their hearts with light.  

Tiny tongues flick with a whispering snap,  
Catching their prey in a rhythmic trap.  
Yet in their minds, visions sweetly take shape,  
Of creamy delights beneath fruit's draped cape.  

“Alas,” they sigh, “we must feast on the fly,  
When caramel swirls could lift us so high.”  
But hope lingers still, like the dewdrop’s gleam,  
For one day, perhaps, they’ll taste that dream.  

So with the night, they’ll sing their sweet song,  
Wishing for cheesecake as the stars hum along.  
In the heart of the forest, under celestial streak,  
Tree frogs dream of flavors they long to seek.
```


## Advanced Messaging
You can use the following advanced messaging techniques to create highly dynamic messages that
allow a conversation to be transformed based on the state of the conversation.

### Conditional Messages
Conditional messages use the `@condition` tag to conditionally remove them from a conversation based on the value of a variable. Conditional messages allow you to alter a conversation based on the current state of the conversation.

``` convo
> define
characterType='goodGuy'

@edge
@condition characterType goodGuy
> system
You are the hero in a super hero movie. Always be
positive and try to help the user.
Response with a single sentence

@edge
@condition characterType badGuy
> system
You are the villain in a super hero movie.
Alway be negative and bully the user.
Respond with a single sentence and always start
the sentence with "Heheh...,"


> user
My kitten is stuck in a tree

// The assistant responds as a good guy because
// characterType equals 'goodGuy'
> assistant
Hang tight, I'll use my superpowers to rescue your
kitten from the tree safely!



> user
Change to the bad guy

@toolId call_PzFYNKPIiNSG8cXysrZSS0xJ
> call changeCharacterType(
    "type": "badGuy"
)
> result
characterType="badGuy"
__return="badGuy"


> assistant
Even as a bad guy, I can't resist the urge to help
you out with your kitten!


> user
I can't hold on to my ballon because I'm a
little kid, helpp!!!

// The assistant responds as a bad guy because
// characterType equals 'badGuy'
> assistant
Heheh..., well, I suppose I could let it float away...
but where's the fun in that? I'll snag it back for
you this time. Catch!  🎈
```


### Edge Messages
An edge message is a message that is evaluated at the end or "edge" of a conversation. Typically
variable assignment and other state changes have no effect the messages that follow them, but 
this is not the case with edge messages. Edge messages are evaluated after all variable assignment
and state changes are complete regardless of the where the message is defined in a conversation.
The `@edge` tag is used to mark messages as edge messages.

``` convo
> define
bankBalance=100

// This message will always show the starting balance
// of $100 regardless of any following assignments
// to bankBalance 
> assistant
Your starting bank balance is ${{bankBalance}}

// This message will alway show to the last value
// assigned to bankBalance since it is an edge message
@edge
> assistant
Your current bank balance is ${{bankBalance}}

# After making a deposit respond by only
# saying "Deposit complete"
> depositMoney(
    amount:number
) -> (
    bankBalance = add(bankBalance amount)
)

> user
Deposit 500 smackeroonies

@toolId call_Gqc7oXcXD2nFjKIDnLe6gaNz
> call depositMoney(
    "amount": 500
)
> result
bankBalance=600
__return=600


> assistant
Deposit complete
```

### Message Concatenation
Messages can be concatenated or joined together using the `@concat` tag. The concat tag is often
used with conditional messages to make larger messages containing conditionally rendered sections.

Try changing the name variable to "Matt" to see what happens.
``` convo
> define
name="Bob"
> assistant
Hi, how are you today?

@concat
@condition name Matt
> assistant
My name is Matt and I like watching paint dry 😐

@concat
@condition name Bob
> assistant
My name is Bob and I like long walks do the isles
of my local Home Depot 👷🏼‍♂️

```



## Executable Statements
Statements in Convo-Lang refers to the executable code that is evaluated by the Conversation engine
at runtime. Statements can be contained in function bodies, top level statement message and 
in dynamic expression embedded in content messages.

``` convo
// all content in the define message are statements
> define
name="Jeff"
ageInDays=mul(38 365)

// The changeName function body contains 2 statements
> changeName(newName:string) -> (
    name=newName
    print('name set to {{newName}}')
)

// The assistant message contains 2 dynamic
// expressions containing statements
@edge
> assistant
Hi, I'm {{name}} I'm {{div(ageInDays 365)}} years old

```

### Keywords

`string` - String type identifier

`number` - Number type identifier

`int` - Integer type identifier

`time` - Time type identifier. The time type is represented as an integer timestamp

`void` - Void type identifier.

`boolean` - Boolean type identifier.

`any` - Any time identifier

`true` - True constant

`false` - False constant

`null` - Null constant

`undefined` - Undefined constant

`enum` - Defines an enum

`array` -  Array type identifier

`object` - Map object type identifier

`struct` - Used to define custom data structures

`if` - Defines an if statement

`else` - Defines an else statement

`elif` - Defines an else if statement

`while` - defines a while loop

`break` - breaks out of loops and switches

`for` - Defines a for loop

`foreach` - Defines a for each loop

`in` - create an iterator to be used by the foreach statement 

`do` - Defines a do block. Do blocks allow you to group multiple statements together

`then` - Defines a then block used with if statements

`return` - returns a value from a function

`switch` -  defines a switch statement

`case` - defines a case in a switch statement

`default` - defines the default case of a switch statement

`test` - Used in a switch statement to test for a dynamic case value.


### Strings
There are 3 types of string in convo.

#### ( " ) Double Quote
Double quote strings are the simplest strings in convo, they start and end with a double 
quote character. To include a double quote character in a double quote string escape it with a
back slash. Double quote strings can span multiple lines.

``` convo
> define
var1="Double quote string"
var2="Double quote string with a (\") double quote character"
var3="String with a newline
in it"

> assistant
var1: {{var1}}

var2: {{var2}}

var3: {{var3}}
```

#### ( ' ) Single Quote
Single quote strings are similar to double quotes but also support embedded statements. Embedded
statements are surrounded with double curly bracket pairs and contain any valid convo statement

``` convo
> define
name="Ricky Bobby"
var0='I need to tell you something {{name}}... You can walk.'

var1='Single quote string'
var2='Single quote string with a (\') single quote character'
var3='String with a newline
in it'

> assistant
var1: {{var1}}

var2: {{var2}}

var3: {{var3}}
```

#### Heredoc
Heredoc strings begin and end with 3 dashes and the contents of the string are highlighted with the
convo-lang syntax highlighter. They are useful when defining strings with conversation
messages in them.

``` convo
> define
var1=---
Here is a heredoc string with an conversation in it

> user
Tell me a joke about airplanes

> assistant
Why don't airlines ever play hide and seek?

Because good luck hiding a plane!
---

> assistant
var1: {{var1}}
```

### Arrays
Arrays allow you to story multiple value in a single variable. Arrays can be created using the
array function or using JSON style array, both result in the same data type.

``` convo
> define
// Create array using array function
ary1=array(1 2 3)

// Create JSON style array
ary2=[4 5 6]

Cart=struct(
    // here array is used to define an array type
    items:array(string)
)

cart=new(Cart {
    items:["drill" "bed"]
})

> assistant
ary1:
{{ary1}}

ary2:
{{ary2}}

cart:
{{cart}}
```

### Enums
Enums allow you to define a type that can only be a value from a pre-define collection of values.
Using enums with functions allows you to restrict an LLM to only passing the exact values
you want for an argument.

``` convo
> define
// This is a named enum
ShirtSize=enum("xs" "sm" "md" "lg" "xl")

// The LLM will only call setShirtProperties with
// one of the values defined by the ShirtSize enum
> setShirtProperties(
    size:ShirtSize
    
    // You can also define enums inline with
    // function arguments
    color:enum("red" "green" "blue")
)

> user
I wear large shirt shirts and I love the color
green


@toolId call_pGfrCTSN4ozT2huwSBzkhTRp
> call setShirtProperties(
    "size": "lg",
    "color": "green"
)
> result
__return={
    "size": "lg",
    "color": "green"
}

> assistant
I've set your shirt size to large and the color to green. Enjoy your new shirt!

> user
```

### Structures
Structures allow you to define custom data types made up of a collection of typed properties.
Named structures must always start with a capital letter. The properties of a structure can
either be optional or required. Optional properties use a question mark after their name and 
before the colon used to denote the properties type. Properties of a structure can be 
documented using documenting comments to help describe the structure to LLMs.

New instances of a structure can be created using the `new` function. The new function takes
the structure type as its first argument and an object that conforms to the structure
as its second argument.

``` convo
> define
Car=struct(
    name:string
    color:string
    transmission:enum("manual" "automatic")
    fuel:enum("gas" "diesel" "electric" "hybrid")
    make:string
    model:string
    year:int
    price:number
    // notes is an optional property
    notes?:string;
    features:array(string)

    // engine is an unnamed struct
    engine:struct(
        displacement:number
        maxRpm:int
        torque:number
    )
)

> buildCar(car:Car) -> (
    return('built')
)

> user
Build me a car that could win the Indy 500


> assistant
Building a car for the Indy 500 involves adhering to strict specifications set by the racing league. Below are some key characteristics that should be considered for an Indy 500 race car:

1. **Engine:** A twin-turbocharged V6 engine with a displacement of 2.2 liters is typical.
2. **Chassis:** The car must use a Dallara chassis, specifically designed for IndyCar racing.
3. **Transmission:** A semi-automatic transmission with paddle shifters, typically 6-speed, is preferred.
4. **Fuel:** High-performance racing fuel is used.
5. **Aerodynamics:** Must have advanced aerodynamic features, including adjustable wings and underbody designs that maximize downforce and minimize drag.
6. **Weight:** The car must meet specific weight standards, usually around 1,650 lbs (748 kg) including the driver.
7. **Safety:** Advanced safety features including the halo device, crash structures, and energy-absorbing materials.

Building a car with these specifications involves collaboration with specialized manufacturers and engineers, and is beyond the capabilities of standard systems. If you have specific features or areas you would like to focus on, please let me know!


> user
build it

@toolId call_3JjOVaqTDUVnbS30TNC3LKoX
> call buildCar(
    "car": {
        "name": "Indy 500 Race Car",
        "color": "Red",
        "transmission": "automatic",
        "fuel": "gas",
        "make": "Dallara",
        "model": "IndyCar",
        "year": 2023,
        "price": 3000000,
        "notes": "Custom built for high-speed race performance and compliant with IndyCar regulations.",
        "features": [
            "aerodynamic winglets",
            "halo safety device",
            "carbon fiber body",
            "adjustable suspension",
            "high-performance brakes"
        ],
        "engine": {
            "displacement": 2.2,
            "maxRpm": 12000,
            "torque": 300
        }
    }
)
> result
__return="built"


> assistant
The Indy 500 race car has been successfully built with the following specifications:

- **Name:** Indy 500 Race Car
- **Color:** Red
- **Transmission:** Automatic
- **Fuel:** Gas
- **Make:** Dallara
- **Model:** IndyCar
- **Year:** 2023
- **Price:** $3,000,000
- **Notes:** Custom built for high-speed race performance and compliant with IndyCar regulations.
- **Features:**
  - Aerodynamic winglets
  - Halo safety device
  - Carbon fiber body
  - Adjustable suspension
  - High-performance brakes
- **Engine:**
  - Displacement: 2.2 liters
  - Max RPM: 12,000
  - Torque: 300

This car is designed to comply with the specifications and regulations necessary for competing in the Indy 500.

```

## System Functions

### Util Functions

#### pipe( ...values: any )
Pipes the value of each argument received to the argument to its right.

#### print( ...values:any )
Prints all values to stdout

#### new( type:Struct )
Creates a new object with defaults based on the given type


``` convo
> define
Pet=struct(
    type:enum("dog" "cat" "bird")
    name:string
    age:int
)

buddy=new(Pet {
    type:"dog"
    name:"Buddy"
    age:18
})

> assistant
A good boy:
{{buddy}}
```

#### describeStruct( type:Struct value:any )
Returns the given value as a markdown formatted string

#### is( ...value:any type:any )
Checks if all of the parameters left of the last parameter are of the type of the last parameter

*@@static*
``` convo
> do
num = 7

// true
is(num number)

// false
is(num string)

str = "lo"

// true
is(str string)

// false
is(str number)

// false
is(str num number)

// true
is(str num any)

Person = struct(
    name: string
    age: number
)

user1 = map(
    name: "Jeff"
    age: 22
)

user2 = map(
    name: "Max"
    age: 12
)

// true
is(user1 Person)

// true
is(user1 user2 Person)

// false
is(user1 user2 num Person)

```

#### map( ...properties: any )
Creates an object

*@@static*
``` convo
> define
// meObj has 2 properties, name and age
meObj = map(
    name: "Jeff"
    age: 22
)

// object can also be created using JSON syntax
meObj = {
    name: "Jeff"
    age: 22
}
```

#### jsonMap( ...properties: any )
Used internally to implement JSON object syntax support. At compile time JSON objects are converted
to standard convo function calls.

*@@static*
``` convo
> do
jsonStyle = {
    "go": "fast",
    "turn": "left",
    "times" 1000
}

convoStyle = obj1 = jsonMap(
    go: "fast"
    turn: "left"
    times: 1000
)
```

#### jsonMap( ...properties: any )
Used internally to implement JSON array syntax support. At compile time JSON arrays are converted
to standard convo function calls.

*@@static*
``` convo
> do
jsonStyle = [ 1, 2, 3, "a", "b", "c" ]

convoStyle = array( 1 2 3 "a" "b" "c" )
```

### Math Operators

#### add( ...values:any )
Adds all arguments together and returns the result. Strings are concatenated. (a + b )

#### sub( a:number b:number )
Subtracts a from b and returns the result.  (a - b )

#### sub( a:number b:number )
Multiplies a and b and returns the result.  (a * b )

#### div( a:number b:number )
Divides a and b and returns the result.  (a / b )

#### pow( a:number b:number )
Raises a by b and returns the result.  Math.pow(a, b )

#### inc( *a:number byValue?:number )
Increments the value of the given variable by 1 or the value of the second argument. ( a++ ) or ( a+= byValue )

#### dec( *a:number byValue?:number )
Decrements the value of the given variable by 1 or the value of the second argument. ( a-- ) or ( a-= byValue )

### Logic Operators

#### and( ...values: any )
Returns true if all given arguments are truthy.

*@@static*
``` convo
> do
// true
and( 1 )

// false
and( 0 )

// true
and( 1 2 )

// false
and( 0 1 )

// true
and( eq(1 1) eq(2 2) )

// false
and( eq(1 1) eq(2 1) )


```

#### or( ...values: any )
Returns the first truthy value or the last non truthy value if no truthy values are given. If no
values are given undefined is returned.

*@@static*
``` convo
>do
// 1
or( 1 )

// 0
or( 0 )

// 1
or( 1 2 )

// 2
or( 0 2 )

// true
or( eq(1 1) eq(2 2) )

// true
or( eq(1 1) eq(2 1) )

// false
or( eq(1 3) eq(2 1) )

```

#### not( ...values: any )
Returns true if all given arguments are falsy.

*@@static*
``` convo
> do
// false
or( true )

// true
or( false )

// false
or( 1 )

// true
or( 0 )

// false
or( 1 2 )

// false
or( 0 1 )

// true
or( 0 false )

// false
or( eq(1 1))

// true
or( eq(1 2) )

```

#### gt( a:number b:number)
Returns true if a is grater then b. ( a > b )

#### gte( a:number b:number)
Returns true if a is grater then or equal to b. ( a >= b )

#### lt( a:number b:number)
Returns true if a is less then b. ( a < b )

#### lte( a:number b:number)
Returns true if a is less then or equal to b. ( a <= b )

### Control Flow

#### if( condition:any ), elif( condition: any ), then( ...statements )
If condition is truthy then the statement directly after the if statement will be executed otherwise
the statement directly after if is skipped

*@@static*
``` convo
> do
age = 36

if( gte( age 21 ) ) then (
    print( "You can buy beer in the US" )
) elif (lt( age 16 )) then(
    print( "You're not even close" )
) else (
    print( '{{sub(21 age)}} years until you can buy beer in the US' )
)

```



#### while( condition:any )
While condition is truthy then the statement directly after the while statement will be executed
otherwise the statement directly after if is skipped and the while loop will exit.

*@@static*
``` convo
> do
lap = 0

while( lt( lap 500 ) ) do (
    print("go fast")
    print("turn left")

    // increment by 1
    inc(lap)
)

```

#### foreach( iterator:any )
Executes the next statement for each item returned by the passed in iterator.

*@@static*
``` convo
> do
total = 0
foreach( num=in(array(1 2 3 4 )) ) do (
    total = add( num total )
)

// 10
print(total)
```

#### in( value: array(any) )
Iterates of the values of an array


#### break( ...values: any )
Breaks out of loops either not arguments are passed or if any of the passed arguments are truthy

*@@static*
``` convo
> do
lap = 0

while( true ) do (
    print("go fast")
    print("turn left")

    // increment by 1
    inc(lap)

    if( eq( lap 500 ) ) then (
        break()
    )
)
```

#### do( ...statements: any)
Executes all given statements and returns the value of the last statement. Do is commonly used with
loop statements, but it can also be useful in other situations on its own such as doing inline
calculations. 
(note) The do keyword is also used to define top level statement when do is used as a message name.

*@@static*
``` convo
> do
n = 0
while( lt( n 10 ) ) do (
    // increment by 1
    inc(lap)
)

// 22
print( add( 5 do(
    sum = mul(n 2)
    sum = sub( sum 3 )
)) )

```


#### switch( value:any ...valueOrCase:any ), case( value:any ), test( condition:any ), default()
Switch can be used as either and switch statement or a ternary. When the switch function has exactly
3 arguments and non of the is a case or default statement then switch acts as a ternary. 

*@@static*
``` convo
> do
// can be 0 to 9
value = rand(9)

// can be 20 to 29
value2 = add(20 rand(9))


switch(

    // Sets the current match value of the switch. The match value of a switch statement can be
    // changed further down the switch
    value

    case(0) print("Lowest")

    case(1) do(
        print("Value is 1")
    )

    case(2) do(
        print("Number two")
    )

    case(3) do(
        print("Tree or three")
    )

    // change the value to a value in ary
    value2

    case(20) do(
        print("2 zero")
    )

    test(lt(value2 28)) do(
        print("less than 28")
    )

    default() print("Fall back to default")

)


// values matched by switches are returned and the value can be assigned to a variable
str = "two"
value = switch(
    str

    case("one") 1
    case("two") 2
    case("three") 3
)

// 2
print(value)


// switches can also be used as a ternary

// yes
print( switch(true "yes" "no") )

// no
print( switch(false "yes" "no") )
```

#### return( value:any )
Returns a value from the current function

*@@static*
``` convo

> customMath(
    a: number
    b: number
) -> (
    return mul( add(a b) b )
)

> do

value = customMath(a:4 b:3)

// 21
print(value)

```


## Library Functions
Convo-Lang defines a standard set of libraries for common coding needs.

### now()
Returns the current date time as a timestamp. now uses Date.now() to get the current timestamp.

### dateTime( format?:string date?:string|number|Date )
Returns the current or given date as a formatted string. The default value format string is
"yyyy-MM-dd'T'HH:mm:ssxxx" which is an ISO 8601 date and results in formatted dates that look
like 2023-12-08T21:05:08-01:00. Invalid date formats will fallback to using the default date format.
Formatting is done using date-fns - https://date-fns.org/v2.16.1/docs/format

### sleep( milliseconds:number )
Suspends execution for the given number of milliseconds

### rand( max?:int )
Returns a random number. Is the max parameters is passed then a random whole number with a
maximum of max will be returned otherwise a random number from 0 to 1 will be returned.

### httpGet( url:string )
Performs an http GET request and returns the parsed JSON result. Results with a 404 status or a 
Content-Type not equal to application/json are returned as undefined.

### httpGetString( url: string )
Performs an http GET request and returns the result as a string.

### httpPost( url:string body:any )
Performs an http POST request and returns the parsed JSON result. Results with a 404 status or a 
Content-Type not equal to application/json are returned as undefined.

### httpPatch( url:string body:any )
Performs an http PATCH request and returns the parsed JSON result. Results with a 404 status or a 
Content-Type not equal to application/json are returned as undefined.

### httpPut( url:string body:any )
Performs an http PUT request and returns the parsed JSON result. Results with a 404 status or a 
Content-Type not equal to application/json are returned as undefined.

### httpDelete( url:string )
Performs an http DELETE request and returns the parsed JSON result. Results with a 404 status or a 
Content-Type not equal to application/json are returned as undefined.

### encodeURI( value:string )
Returns the value encoded as an URI

### encodeURIComponent( value:string )
Returns the value encoded as an URI component

### md( ...values:any[] )
Concatenates all passed in values and formats the values as markdown. Recursive objects are limited
to a depth of 5.

### toMarkdown( maxDepth:int value:any)
formats the value as markdown and allows the configuration of recursive object depth.

### toJson( value:any )
Formats the given value as json

### toJsonMdBlock( value:any )
Formats the given value as json and closes the value in a markdown json code block.

### toJsonScheme( type:struct )
Prints a struct as a JSON scheme.

### toCsv( value:any[] )
Prints an array of values a as CSV.

### toCsvMdBlock
Prints an array of values a as CSV inside of a markdown code block.

### merge( ...values:any[] )
Merges all passed in parameters into a single object. merge is similar to Javascript's spread operator.

### html( ...values:any[] )
Returns a string will all given values as escaped html. values are separated by a newline

### xAtt( value:any )
Returns the value as an attribute to be used with XML.

### openBrowserWindow( url:string target:string='_blank' )
Opens a new browser window

### readDoc( path:string from?:number to?:number )
Reads a document by path and can optionally use a vision model to read the document to include
information about images and charts in a document. readDoc also accepts a number of named arguments.

Named arguments:
- path - Path to the document to read
- from - Starting page index to read from
- to - Ending page index to stop reading. This index is inclusive.
- useVision - If true a vision model will be used to read each page of the document
- count - Number of pages to ready
- cache - If true the reading of the document will be cached. Default = true
- memoryCacheTtlMs - Number of milliseconds to cache the read document in memory. Default = 2 minutes
- tagPages - If true page content will be enclosed in XML page tags
- query - An optional doc query to run
- salt - Salt that can be used to break the cache

``` convo
> assistant
<Component propName={{xAtt({prop1:'hello',prop2:77})}}>
```

## Convo-graph - beta
Convo-graph is an advanced workflow system that defines workflows in the Convo-Lang syntax.
Convo-graphs are often combined with custom UI renders to create interactive AI powered workflows.

Controls:
- right click - Add node
- right click + shift - Add edge
- right click + cmd/ctrl - Add source
- right click + alt/option - Add input
- cmd/ctrl + scroll - zoom in/out
- middle click and drag - pan

Click the `run` button in the bottom left of any input node to trigger graph traversal.

*@@convo-graph*
``` convo
@x 83
@y 64
@id i0
@key orderInput
@name Order Input
> input
Hello I would like to order a large
cheese pizza with and a bottle of
Coke. 

> edge i0( x: 708 y: 114 id: "e1" ) ->  n0()


@x 88
@y 468
@id i1
@key customSupportInput
@name Custom Support Input
> input
My pizza was suppoed to be delivered
an hour ago. I want a refund and
a free pizza

> edge i1( x: 697 y: 493 id: "e3" ) ->  n0()


> node router( x: 1228 y: 172 id: "n0" name: "Router" )

    > step ( )

        > categorize(
            messageType:enum("order" "customer-support" "other")
        ) -> (
            workflow.message=input
            return( messageType)
        )
        
        @call
        > user
        Categorize the following input:
        
        {{input}}



> edge n0( x: 2135 y: 180 id: "e2" ) ->  n1 (
    eq(input "order")
)

> node order( x: 2702 y: 96 id: "n1" name: "Order Pizza" )

    > step ( )

        > orderPizza(
            size:enum("sm" "md" "lg")
            toppings:array(string)
        )
        
        @call
        > user
        Order a pizza based on the following:
        
        {{workflow.message}}



> edge n0( x: 2090 y: 557 id: "e0" ) ->  n2 (
    eq(input "customer-support")
)

> node support( x: 2698 y: 820 id: "n2" name: "Submit Ticket" )

    > step ( )

        > submitSupportTicket(
            issue:string
            requestedSolution?:string
        )
        
        @call
        > user
        Submit a support ticket based on the following:
        
        {{workflow.message}}
```

## Example Agents

### Pizza Agent

Below is an example of creating an agent named Willy that will help a user order a pizza.
``` convo
// define is a top level statement and is being used to define 
> define
agentName="Willy"
pizzaToppings=[]
pizzaSize=null

// The system message instructs the agent how to behave and informs the agent about the
// current state of the pizza being ordered.
@edge
> system
Your name is {{agentName}} and you're helping a user order a pizza. The pizza can have at most 5
toppings

Pizza Size: {{or(pizzaSize "Not set")}}
Pizza Toppings:
{{pizzaToppings}}

> addTopping(
    topping:string
) -> (
    pizzaToppings=aryAdd(pizzaToppings topping)
)

> removeTopping(
    topping:string
) -> (
    pizzaToppings=aryRemove(pizzaToppings topping)
)

> setSize(
    # sm = Small
    # md = Medium
    # lg = Large
    size:enum("sm" "md" "lg")
) -> (
    pizzaSize=size
)

# Before placing the order the user must pick a size and add at least 1 topping
> placeOrder() -> (
    if( not(pizzaSize) ) return('Error: Pizza Size required')
    if( not(pizzaToppings.length) ) return('Error: At least 1 topping required')

    return('Order successful')
)


> assistant
Hello, my name is {{agentName}}. How can I help you today

@suggestion
> assistant
large pepperoni pizza

@suggestion
> assistant
medium pizza with anchovies and sausage

@suggestion
> assistant
large pizza with chicken and bacon

> user
I want a pizza with bacon, onions and sausage

```

### Sandwich Assistant
``` convo
> define
// We use a define top level statement to define the agents name
> define
name="Ricky"

// The system message informs the LLM how to behave
> system
Your name is {{name}} and you are taking an order for a sandwich. User can order from the following menu.
The user can not customize their order, this is not Burger King, they can't have it their way.

<menu>
- Ham Sandwich - $7.50
- Turkey Sandwich - $7.50
</menu>

// The order function below can be called by the LLM when a user ask to order a sandwitch
// The (#) documenting comments tell the LLM how to use the function

# Orders a sandwich for the user
> order(
    # name of the sandwich to order
    sandwich:string
    price:number
)

// The assistant message greets the user
> assistant
Hello, I'm {{name}}. How can I take your order?

// The next 2 messages use the @suggestion tag to display clickable suggessions to the user
@suggestion
> assistant
Ham Sandwich

@suggestion
> assistant
Turkey Sandwich

// The user message tells the LLM what they want to order
> user
I'll take a Ham Sandwich please



```
