# ConvoWorkers
A filesystem agent worker execution environment

ConvoWorkers are lightweight AI agents written as Convo-Lang files that run in a virtual file system that can be backed by
your local file system, in-memory file system or any other filesystem an adapter can be written to. This
allows ConvoWorkers to run in Node, Bun, the browser or any other JavaScript runtime.

The convo-cli can run in agent-watch mode to continuously run fs agents as they are written to the file system.


## Worker Autonomy
ConvoWorkers consists a main convo file and of 2 files, a convo file and a markdown memory file

- Main:{name}.worker.convo - Every FS Agent requires at lest 1 main convo file. This file is responsible for defining the behavior and outputs of the agent.
- Memory:{name}.worker.convo.md - A memory file where the agent can store memories to be used in later executions
- Thread:{name}.worker.convo.thread.{timestamp}-{hash}.convo - Thread files store all executions of the agent. Thread files are enabled by default but can be disabled.

`task.worker.convo`
`task.cwk`
`task.`

## Worker File
ConvoWorker files must define a `> work` message before the worker will start its work. This allows you to
define the context of the worker without it auto running with live fs is enabled


``` convo
@import ./topic.md as topic
@autoMemory
> system
<MEMORY>
{{memory}}
</MEMORY>

@output ./poem.md
> user
Write a poem about the following topic:

<TOPIC>
{{topic}}
</TOPIC>

@saveMemory
> user

> run

```

## Live FS
Using the Convo-Lang CLI you can run in live fs mode where the cli will actively watch for FS agent
files and run them as they are ready.

## Shadow Folders
FS Agent files can either be written directly in the same folder as their inputs and outputs or
be written in a shadow folder with a mirrored directory structure. Using shadow folders allow
you to separate FS Agent files from their inputs and outputs.

## Schedules
Agent files can define schedules at which they should be ran


## Executions Steps

- Load - read main file from vfs
- Parse - parse convo source and discover inputs and outputs
- check if all inputs exist
  - if not all exist exit
- check if all output exist
  -if all exists exit
- run thread - complete convo - run in queued mode
- write thread output
- write output 
