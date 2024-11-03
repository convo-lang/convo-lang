# Convo-Lang NodeJs example

This is an example project using [Convo-Lang](https://learn.convo-lang.ai) in a NodeJs CLI application

![Convo-Lang NodeJs example](https://github.com/convo-lang/convo-lang/blob/main/assets/convo-lang-node-example.webp?raw=true)

If you want to learn the Convo-Lang language check out this tutorial  - [https://learn.convo-lang.ai/learn](https://learn.convo-lang.ai)

## Getting Started

1. Copy `example.env.development` to `.env.development`
2. Replace `OPENAI_API_KEY` value in `.env.development` with your OpenAI API key
3. Install dependencies, run `npm install`
4. Start the server, run `npm run start`

*(note - `npm run start` is equivalent to `node src/server.mjs -i -l`)*

## Examples

### simple.mjs
A bear bones example of using Convo-Lang in a node application. simple.mjs executes its arguments
as raw Convo-Lang.

**using simple.mjs**
``` sh
node src/simple.mjs "
> system
You are a pirate. respond in pirate talk with a masters degree in psychics.

> user
I can't swim
"
```

### server.mjs
A full featured CLI tool that can load Convo-Lang scripts, accept messages over HTTP and accept live input

**server.mjs arguments:**
``` txt
-f | --file         [file path]    Loads and executes a convo file from the given path
-c | --convo        [raw convo]    Loads the given input and executes it
-l | --listen       [port]         Creates an HTTP server that will accept requests of. Default = 8091
                                   raw convo at http://0.0.0.0:{port}/convo
-o | --options      [options]      Conversation options in JSON format
-i | --interactive                 Starts an interact REPL session
-e | --env          [.env path]    Path to an .env file to load. Default = .env.development and .env
                                   --env can be passed multiple times
-h | --help                        Print this help menu
```

## REPL
When running `server.mjs` in REPL / interactive mode the server will read input line by line.
If a line starts with a `>`, `@`, `#` or `\` the REPL will buffer all following lines until an empty
line is received then send all of the buffered lines. While message are being buffered lines only
containing a single `\` are added to the buffer as an empty line. Message buffering allows you to
send multi-line messages. If a message does not start with one of the said characters and the REPL
is not buffering lines then the line will be send as a user message.

## Executing Convo-Lang Scripts
`.convo` files can be loaded and executed by `server.mjs` by using the -f or --file argument.

``` sh
node src/server.mjs --file example.convo
```

You can also combine the `--file` argument with the `--interactive` flag to load a convo script 
then enter into REPL mode.

``` sh
node src/server.mjs --interactive --file example.convo
```

## Convo-Lang File Syntax Highlighting
Install the "convo-lang" VSCode extension for Convo-Lang syntax highlighting of (.convo) file.

https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools


## Using the HTTP Server
**http-example.http** has been provided for sending request to the example HTTP server. Install the
"REST Client" VSCode extension to use .http files.

https://marketplace.visualstudio.com/items?itemName=humao.rest-client


## Links
- Learn Convo-Lang - https://learn.convo-lang.ai
- GitHub - https://github.com/convo-lang/convo-lang
- NPM - https://www.npmjs.com/package/@convo-lang/convo-lang


