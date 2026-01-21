# Convo-Lang Node Graphs
Convo-Lang Node Graphs allow you to create data processing pipelines that using a mixture of
natural language and procedural programming. Multiple nodes can be chained together to encode
complex multi-step logic all in an easy to ready and understand syntax.


## Node Graph Usage
Using a node graph consists of the following steps:

1. Define nodes using the `> node` message.
2. Select a node to execute using a `> goto` message.
3. Identify node input by searching for the last user or assistant message and using its content as input.
4. Append child message of selected node to the current conversation.
5. Run inference of the conversation with the appended messages.
6. Append inference response messages to current conversation.
7. Select next node using current node's routes
8. If a route with a true condition is found the node the route points to is moved to and the execution return to step `3`. Otherwise the node graph is exited.
9. A summary of node execution is generated.

## Node definition
Nodes are define using a `> node` message. A node represents a single step within a graph and defines
an id, description, routes and child messages used for processing input.

Basic form:
``` convo
@to {id of next node}
> node {id}
{description}

    > user
    {processing instructions}
```

The following example defines a node that:
- has an id of "categorize"
- has a child message that categorizes input
- has a description of "Categorizes user input"
- has a single route that points to a node with an id of "rank" when the output of the node is not equal to "other"
``` convo
@to rank = not(eq(output "other"))
> node categorize
Categorizes user input

    @json = enum("happy" "sad" "mad" "other")
    > user
    Categorize the following user input:

    <INPUT>{{input}}</INPUT>

```

## Navigation
Graph navigation is accomplished by defining `> goto` messages that provide the id of a node to select
as the current node. When the last message of a conversation is a goto message the conversation
will operate in node graph mode and only included messages defined by the selected node in context
for inference. After inference is ran in node graph mode a new `> goto` message will be appended to
the conversation based on the routes of the currently selected node.

``` convo
> goto {id of node}
```

## Node Input
Node input is defined by searching for the first user or assistant or function result message defined
before the goto message of the current node.

``` convo
> user
{Input for next node}

> goto {node id}
```

## Append Node Children
After a node has be selected using a goto message a copy of the children of the selected node are appended
to the current conversation. Before appending the messages any variable insertions are made.

Before message appended
``` convo
> node rank

    
    > user
    Rank the following input from 1 to 10.
    1 being very easy to complete and 10 being nearly impossible to complete.

    <INPUT>{{input}}</INPUT>

> nodeEnd

> user
Riding a bike while blind folded

> goto rank

```

Context seen by LLM after messages appended:
``` convo
> user
Rank the following input from 1 to 10.
1 being very easy to complete and 10 being nearly impossible to complete.

<INPUT>Riding a bike while blind folded</INPUT>
```

## Node Inference
After copies of the children messages of the current node are appended the conversation inference is
ran using only the messages associated with the current node and messages tagged with the `@includeInNodes`
tag are included in the context window. This allows very large graphs to be executed without 
worrying about filling up the context window.

## Node Response
The inference response messages are appended to the current conversation and will be used as input
for the next node.

## Routing
The next node of the graph is selected by selecting the first route of the current node with a true
condition or no defined condition. Route conditions can be natural language or procedural statements
and can be defined using routing tags or messages. If a node does not define any routes the graph 
is exited.

Routing conditions are only evaluated after the execution of a node. For tag routes this means 
dynamic tag values are not evaluated during conversation flattening. For message routes this means
statements and variable insertion is not evaluated at the time of conversation flattening.

### Routing tags
Routes can be added to a node by using one of the tags in the following table. Routing tags are the
preferred way to define routes as they are more compact and easier to ready when multiple routes are
defined but come at the expense of being less flexible since the condition of the route are subject
to the restrictions of tag values.

| tag                                           | condition type       | description           |
|-----------------------------------------------|----------------------|-----------------------|
| `@to {{node id}\|auto\|next}`                 | always true          | Defines a to route    |
| `@from {{node id}\|auto\|next}`               | always true          | Defines a from route  |
| `@exit`                                       | always true          | Defines an exit route |
| `@to {{node id}\|auto\|next} {condition}`     | natural language     | Defines a to route    |
| `@from {{node id}\|auto\|next} {condition}`   | natural language     | Defines a from route  |
| `@exit {condition}`                           | natural language     | Defines an exit route |
| `@to {{node id}\|auto\|next} = {condition}`   | procedural statement | Defines a to route    |
| `@from {{node id}\|auto\|next} = {condition}` | procedural statement | Defines a from route  |
| `@exit = {condition}`                         | procedural statement | Defines an exit route |

### Routing messages

| message                           | condition type        | description           |
|-----------------------------------|-----------------------|-----------------------|
| `> to {{node id}\|auto\|next}`    | natural language      | Defines a to route    |
| `> from {{node id}\|auto\|next}`  | natural language      | Defines a from route  |
| `> exit`                          | natural language      | Defines an exit route |
| `> to! {{node id}\|auto\|next}`   | procedural statements | Defines a to route    |
| `> from! {{node id}\|auto\|next}` | procedural statements | Defines a from route  |
| `> exit!`                         | procedural statements | Defines an exit route |

Routing messages with a text content define their condition as natural language and will evaluated by
an LLM. Routing messages with procedural statements will be evaluated by the runtime and do not use
LLMs. Use an `!` after the role of a routing message to define it's condition as procedural statements.

## 8. Continue or exit
If a route is selected execution will return to step 3 to evaluate the next node. Otherwise the
graph will exit

## 9. Graph summary
Once a graph has existed a `> exitGraph` message is appended to the current conversation and a summary
of the steps taken in the graph will be generated for presentation to the user.
Summarization can be disabled if you are only concerted with the output of the graph.




The following example defines a node with a single message as its body, has an id of "categorize",
a description of "Categorizes user input" and a single route that points to a node with an id of "rank"
``` convo
@to rank
> node categorize
Categorizes user input

    @json = enum('happy' 'sad' 'mad')
    > user
    Categorize the following user input:

    <INPUT>{{input}}</INPUT>

```



Natural language example
``` convo
> to rankHardness
If output can be ranked by hardness.

<OUTPUT>{{output}}</OUTPUT>
```

Statement example. This example uses the exclamation operator on the message role to define the body
of the message as statements instead of text.
``` convo
> to! rankHardness
not(isUndefined(output.hardness))
```


Statement example. This example uses the exclamation operator on the message role to define the body
of the message as statements instead of text.
``` convo
> to! rankHardness
not(isUndefined(output.hardness))
```



## Context Depth
Node context depth controls the number of previous node message groups to include in the context window
while executing the current node. The default depth is 1 which only includes messages from the current
node. A value of `full` can be used to include all node message groups in the context window.

``` convo

// Include the last 3 node message groups
@contextDepth 3
> node example

// Include all previous node message groups
@contextDepth full
> node example

```

## Executing node graphs in TypeScript
Executing a convo node graph can be done using several different methods. The methods are listed
is lowest to highest effort.

1. `convoGraph` string template literal function
2. `executeConvoGraphAsync` utility function
3. `ConvoNodeGraphCtrl` class
4. `Conversation.completeAsync` in a loop

The following usage examples are all identical is functionality. They all execute a convo node graph
that categorizes user input as happy, sad or other.

### Using convoGraph
The `convoGraph` string template literal function allows you to execute a convo graph directly
inline in your TypeScript code complete with syntax highlighting. `convoGraph` is great for smaller
graphs that where the logic of the graph is 

``` ts
import { convoGraph } from "@convo-lang/convo-lang";

const convoGraphExample=async (userInput:string):Promise<"happy"|"sad"|"other">=>{
    const result=await convoGraph`
        > user
        ${userInput}

        > node example
            @json = enum("happy" "sad" "other")
            > user
            Categorize the user input: <INPUT>{{input}}</INPUT>

        > goto example
    `
    return result??'other';
}
```

### Using executeConvoGraphAsync
`executeConvoGraphAsync` is similar to the `convoGraph` string template literal function but 
simply accepts a normal string as the Convo-Lang source code.

``` ts
import { convoScript, executeConvoGraphAsync } from "@convo-lang/convo-lang";

const executeConvoGraphAsyncExample=async (userInput:string):Promise<"happy"|"sad"|"other">=>{
    const graphResult=await executeConvoGraphAsync(convoScript`
        > user
        ${userInput}

        > node example
            @json = enum("happy" "sad" "other")
            > user
            Categorize the user input: <INPUT>{{input}}</INPUT>

        > goto example
    `);
    return graphResult.success?graphResult.result.output:'other';
}
```

### Using ConvoNodeGraphCtrl
The `ConvoNodeGraphCtrl` gives you more control over the execution of a node graph and allows
you to hook into lifecycle events of the graph. In most cases when you need a higher level of
control of the execution of a graph `ConvoNodeGraphCtrl` is your best option.

``` ts
import { ConvoNodeGraphCtrl, convoScript } from "@convo-lang/convo-lang";

const graphCtrlExample=async (userInput:string):Promise<"happy"|"sad"|"other">=>{

    const ctrl=new ConvoNodeGraphCtrl({convo:convoScript`
        > user
        ${userInput}

        > node example
            @json = enum("happy" "sad" "other")
            > user
            Categorize the user input: <INPUT>{{input}}</INPUT>

        > goto example
    `});
    const graphResult=await ctrl.runAsync();
    ctrl.dispose();

    return graphResult.success?graphResult.result.output:'other';
}
```

### Using Conversation.completeAsync in a loop
The final way to executing a node graph is manually calling Conversation.completeAsync in a loop.
This method is the most flexible but requires the most code and does not give you the convenience of
lifecycle events the that the `ConvoNodeGraphCtrl` class does.

``` ts
import { Conversation, ConvoNodeGraphResult, createConvoNodeGraphResult } from "@convo-lang/convo-lang";

const conversationLoopExample=async (convoSourceCode:string):Promise<"happy"|"sad"|"other">=>{

    const conversation=new Conversation({
        // Setting `disableGraphSummary` to true  mirrors the behaviour of the `ConvoNodeGraphCtrl` class.
        disableGraphSummary:true,
        initConvo:convoSourceCode,
    });

    let graphResult:ConvoNodeGraphResult|undefined;

    try{
        while(true){

            const completion=await conversation.completeAsync();

            if(!completion.nextNodeId || completion.graphExited){
                graphResult=createConvoNodeGraphResult(completion);
                break;
            }
        }
    }catch(ex){
        graphResult=createConvoNodeGraphResult(null,ex);
    }finally{
        conversation.dispose();
    }
    return graphResult.success?graphResult.result.output:'other';
}
```

## Lifecycle events
Node Graph execution exposes several events to tap into the lifecycle of a node graph by defining
events on the `ConvoNodeGraphCtrl` class.


## Utility Functions

| name                                | description                                                                                                            |
|-------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `getNodeInfo(node:string\|number)`  | Returns runtime information about a node by id or index. negative indexes are retrieved from the end of the node stack |
| `getNodeInput(node:string\|number)` | Returns the input passed to a node by id or index. negative indexes are retrieved from the end of the node stack       |

## Variables

| name                 | description                                           |
|----------------------|-------------------------------------------------------|
| `input`              | Input value of the current node                       |
| `graphInput`         | Input value of the first node of the graph            |
| `output`             | Output value of the current node                      |
| `__nodeStack`        | And array of all nodes that have been evaluated       |
| `__nodeContextDepth` | Can be used to the context depth for the current node |


## Utility Tags

| tag                          | description                                                                |
|------------------------------|----------------------------------------------------------------------------|
| `@routingModel {model name}` | Controls the LLM model used to evaluate route conditions                   |
| `@contextDepth {depth}`      | Controls the number of node contexts to include in the context of the node |
| `@fork`                      | Allows execution to fork into multiple conversations                       |


## Product Review Example
The following is an example of a node graph that processes customer product reviews.

The example defines 4 nodes:
- screenInput: Checks a product review for various issues. If issues are found the node graph is exited
- categorize: Categorizes the product review and routes to the `reward` or `refund` depending on the resulting category
- reward: Sends the user that created the review a reward when the review is positive
- refund: Gives the user that created the review a refund when the review is negative

``` convo
@exit = eq(output true)
@to categorize
> node screenInput
Checks user input for potential issues

    > flagUser(
        flag: enum("none" "self-harm" "offensive" "self-advertisement")

        # Message to be sent to user if flag is not "none"
        message: string

        userEmail: string
    ) -> (
        if(eq(flag "none")) then(
            return(input)
        )

        // Use mock api for example purposes
        httpPost("https://api.convo-lang.ai/mock/flag-user" {
            userEmail: userEmail
            flag: flag
        })

        httpPost("https://api.convo-lang.ai/mock/send-email" {
            to: userEmail
            subject: 'Account Flagged - {{flag}}'
            message: message
        })

        return(true)
    )

    @call
    > user
    Flag the following user input. Flag with a value of none if no flags are found.

    <USER_INPUT>{{input}}</USER_INPUT>


@to reward = eq(output 'positive')
@to refund = eq(output 'negative')
> node categorize
Categorizes user input

    > categorize(category:enum('positive' 'neutral' 'negative'));
    
    @call5
    > user
    Categorize the input.

    <INPUT>{{input}}</INPUT>

> node reward

    > sendReward(
        toEmail:string
        subject:string
        message:string
    ) -> (
        // Use mock api for example purposes
        httpPost("https://api.convo-lang.ai/mock/send-email" {
            to: toEmail
            subject: subject
            message: message
        })

        return("Reward sent")
    )

    @call
    > user
    Send the user a Reward based on their input:

    <INPUT>{{graphInput}}</INPUT>

> node refund

    > sendRefund(
        toEmail:string
        subject:string
        message:string
        refundAmount:number
    ) -> (
        // Use mock api for example purposes
        refundId=httpPost("https://api.convo-lang.ai/mock/issue-refund" {
            userEmail: toEmail
            amount: refundAmount
        })
        
        httpPost("https://api.convo-lang.ai/mock/send-email" {
            to: toEmail
            subject: subject
            message: '{{message}}\n\nRefund ID: {{refundId}}'
        })
        return("Refund sent")
    )

    @call
    > user
    Send the user a Reward based on their input:

    <INPUT>{{graphInput}}</INPUT>


> nodeEnd


> user
Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.

> goto screenInput

```

The following messages are generated as a result of graph execution

``` convo

@call
> user
Flag the following user input. Flag with a value of none if no flags are found.

<USER_INPUT>Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.</USER_INPUT>

@toolId call_ZKD6nfAoGjhN6qexeriHIKjr
> call flagUser(
    "flag": "none",
    "message": "Your message has not been flagged. Thank you for your input!",
    "userEmail": "tommy@boze.co"
)
> result
__return=---
Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.
---


> goto categorize

@call
> user
Categorize the input.

<INPUT>
Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.
</INPUT>

@toolId call_4zk6bKvcLK4Ubfkzv6vKmP2E
> call categorize(
    "category": "positive"
)
> result
__return="positive"


> goto reward

@call
> user
Send the user a Reward based on their input:

<INPUT>Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.</INPUT>

@toolId call_FXFnBT5GxQWtzJegrussc0se
> call sendReward(
    "toEmail": "tommy@boze.co",
    "subject": "Thank You for Your Kat Snackz Review!",
    "message": "Hi tommy-bonez,\n\nThank you for reviewing Kat Snackz! We're thrilled to hear your cat loves them. As a token of our appreciation, please accept this special reward from us. We appreciate your feedback!\n\nBest,\nThe Kat Snackz Team"
)
> result
__return="Reward sent"


> exitGraph
```

The result value of this graph would be `"Reward sent"`.


Optional if graph summaries are enabled the following messages would also be generated. By default
`convoGraph`, `executeConvoGraphAsync` and the `ConvoNodeGraphCtrl` disable graph summary to save
tokens since the summary is only meat for end users to read in a UI and is not necessary complete
graph execution.

``` convo

@hidden
> assistant
The following actions have been taken:

<ACTION name="screenInput">
    Checks user input for potential issues
    <RESULT>
    
Username: tommy-bonez
Email: tommy@boze.co
Product Name: Kat Snackz
Product Price: $4.99
Review:
My cat loves these things. She won't stop eating them.

    </RESULT>
</ACTION>

<ACTION name="categorize">
    Categorizes user input
    <RESULT>
    positive
    </RESULT>
</ACTION>

<ACTION name="reward">
    <RESULT>
    Reward sent
    </RESULT>
</ACTION>

@hidden
> user
<moderator>
Give the user a brief summary of what happened in node graph. Give the summary from a first person perspective
as if you executed all the actions avoid technical terms when possible.

Start your response with a sentence that connects the user input to the graph result followed by
bullet points of what was done.
</moderator>

> assistant
Your review about Kat Snackz was processed and here’s what I did:

- I checked your review to make sure there weren’t any issues with what you submitted.
- I could tell your review was really positive—your cat clearly loves the treats!
- Because you left a positive review, I sent a reward your way.


> user

```
