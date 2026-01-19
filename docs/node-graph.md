# Convo-Lang Node Graph
The Convo-Lang Node Graph system allow Convo-Lang scripts to define automations using a node
traversal system.

``` convo
> user
It is a beautiful day out side.

> node start
Start of Graph

    > categorize(category:enum('positive' 'neutral' 'negative'));
    
    @call
    > user
    Categorize the input


> goto start

```

## Traversal

## Routing
Routes from one node to another can be defined using either routing tags or routing messages.

Routing tags are defined by adding `@to`, `@from` and `@exit` tags to a node. They are more compact
and typically easier to read as a group but limit you to writing route conditions to a single line.

Routing messages defined by adding `> to`, `> from` and `> exit` messages after a node. Routing 
messages allow you to define routing conditions on multiple lines and allow you to use tags as 
part of the condition evaluation.

Routing conditions are only evaluated after the execution of a node. For tag routes this means 
dynamic tag values are not evaluated during conversation flattening. For message routes this means
statements and variable insertion is not evaluated at the time of conversation flattening.

## Context Depth
Node context depth controls the number of previous nodes message groups to include in the context
of the current executing node. The default depth is 0 which only includes messages from the current
node.

## Lifecycle events
Node Graph execution exposes several events to tap into the lifecycle of a node graph by defining
events on the `ConvoNodeGraphCtrl` class.

## Node Utility Functions

- getNodeInfo
- getNodeInput
