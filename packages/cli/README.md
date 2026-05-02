# Convo-Lang
The language of AI
**GitHub** - [ https://github.com/convo-lang/convo-lang](https://github.com/convo-lang/convo-lang)

This package provides the `convo` command as prebuilt binaries for supported platforms.


## What is Convo-Lang?
Convo-Lang is an open source AI-native programming language and ecosystem designed specifically for
building powerful, structured prompts and agent workflows for large language models (LLMs) like
GPT-4, Claude, Llama, DeepSeek, and more.

Convo-Lang is a mixture between a procedural programming language, prompting template system and 
conversation state management system. You can execute convo-lang in Javascript, Python,
from the command line or directly in VSCode.

Convo-Lang aims to provided a uniform prompting syntax that is LLM agnostic and allows you to
store both prompts, metadata and tradition programming logic in a single file or template string.

The convo-lang syntax supports advanced features such as function calling, tool usage and vision.
The Convo-Lang ecosystem consists of a parser, interpreter, Typescript/Javascript/Python libraries,
a CLI, and a vscode extension for syntax highlighting and in-editor script execution.


## Install

For MacOS
``` bash
brew install convo
```

Or
``` bash
npm install -g @convo-lang/cli
```

Or run it without installing globally:

``` bash
npx @convo-lang/cli --help
```

## Usage

``` bash
convo [source] [arguments]
convo --source ./chat.convo
convo --inline "> user\nHello"
convo --help
```

## Notes

- Arguments use kebab-case names matching ConvoCliOptions properties.
  Example: `allowExec` -> `--allow-exec`
- Boolean arguments are enabled by passing the flag.
  Example: `--repl`
- Array arguments can be passed multiple times.
  Example: `--var name=Tom --var age:number=55`

## Arguments

### General

| Argument          | Value        | Description                                                                  |
|-------------------|--------------|------------------------------------------------------------------------------|
| `--help`, `-h`    |              | Prints the help message.                                                     |
| `--config`        | path or JSON | ConvoCliConfig object or path to a ConvoCliConfig file.                      |
| `--inline-config` | JSON         | Inline configuration as JSON.                                                |
| `--env`           | path         | Path to env files to load environment variables from.                        |
| `--json-format`   | number       | Indentation value passed to JSON.stringify when outputting JSON. Default: 4. |

### Input and execution

| Argument                              | Value               | Description                                                |
|---------------------------------------|---------------------|------------------------------------------------------------|
| `[source]`                            | path                | Path to a source convo file.                               |
| `--source`                            | path                | Path to a source convo file.                               |
| `--stdin`                             |                     | Reads the source from stdin.                               |
| `--inline`                            | code                | Inline convo code.                                         |
| `--source-path`                       | path                | Sets or overrides the source path of executed code.        |
| `--prepend`                           | code                | Conversation content to prepend to source.                 |
| `--exe-cwd`                           | path                | Current working directory used for context execution.      |
| `--allow-exec`                        | disable, ask, allow | Controls shell command execution.                          |
| `--cmd-mode`                          |                     | Enables command mode for function calls over stdin/stdout. |
| `--repl`                              |                     | Enters REPL mode.                                          |
| `--graph`                             |                     | Runs the conversation as a graph.                          |
| `--disable-write-graph-on-completion` |                     | Disables graph output after each completed step.           |
| `--dry-run`                           |                     | Enables dry run behavior where supported.                  |
| `--disable-thread-logging`            |                     | Disables worker thread logging.                            |

### Output

| Argument           | Value | Description                                                        |
|--------------------|-------|--------------------------------------------------------------------|
| `--out`            | path  | Writes output to a file. Use `.` to write back to the source file. |
| `--buffer-output`  |       | Buffers executor output.                                           |
| `--prefix-output`  |       | Prefixes each output line with output type characters.             |
| `--print-state`    |       | Prints shared variable state.                                      |
| `--print-flat`     |       | Prints flattened messages.                                         |
| `--print-messages` |       | Prints conversation messages.                                      |

### Parse and convert

| Argument         | Value  | Description                                              |
|------------------|--------|----------------------------------------------------------|
| `--parse`        |        | Parses convo code and outputs JSON instead of executing. |
| `--parse-format` | number | Indentation value used with `--parse` JSON output.       |
| `--convert`      |        | Converts input to target LLM input format.               |

### Variables

| Argument      | Value      | Description                                                                    |
|---------------|------------|--------------------------------------------------------------------------------|
| `--var`       | name=value | Adds or overrides a named variable. Supports typed names like `age:number=38`. |
| `--vars`      | JSON       | Adds variables from a JSON object.                                             |
| `--vars-path` | path       | Loads variables from a JSON or `.env` file.                                    |
| `--u-vars`    | JSON       | Adds unregistered variables from a JSON object.                                |

### TypeScript and package sync

| Argument           | Value | Description                                                                                   |
|--------------------|-------|-----------------------------------------------------------------------------------------------|
| `--sync-ts-config` | path  | Path to a tsconfig file to scan for convo tagged interfaces, types, functions and components. |
| `--sync-watch`     |       | Watches TypeScript projects for changes.                                                      |
| `--sync-out`       | path  | Directory where generated synchronization output files are written.                           |

### Process spawning

| Argument      | Value   | Description                                                    |
|---------------|---------|----------------------------------------------------------------|
| `--spawn`     | command | Runs a command in parallel with actions such as sync watching. |
| `--spawn-dir` | path    | Directory where the spawn command is run.                      |

### App creation

| Argument                   | Value | Description                                              |
|----------------------------|-------|----------------------------------------------------------|
| `--create-next-app`        |       | Creates a new Next.js app using the convo-lang template. |
| `--create-app-dir`         | path  | Directory where the app will be created.                 |
| `--create-app-working-dir` | path  | Directory where create-next-app will be run.             |

### Models and embeddings

| Argument                 | Value  | Description                                               |
|--------------------------|--------|-----------------------------------------------------------|
| `--list-models`          |        | Lists all known models as JSON.                           |
| `--generate-embedding`   | text   | Generates an embedding for the given text.                |
| `--embedding-model`      | name   | Model to use for generating embeddings.                   |
| `--embedding-provider`   | name   | Provider to use for generating embeddings.                |
| `--embedding-format`     | format | Format to return embedding in.                            |
| `--embedding-dimensions` | number | Number of dimensions embeddings should be generated with. |

### Make

| Argument         | Value | Description                  |
|------------------|-------|------------------------------|
| `--make`         |       | Builds make targets.         |
| `--make-targets` |       | Prints make targets as JSON. |

### Workers

| Argument             | Value | Description                  |
|----------------------|-------|------------------------------|
| `--worker`           | path  | Path to a convo worker file. |
| `--watch-workers`    |       | Watches worker files.        |
| `--worker-base-path` | path  | Base path used by workers.   |

### API server

| Argument                | Value  | Description                                                |
|-------------------------|--------|------------------------------------------------------------|
| `--api`                 |        | Runs an HTTP API server with a convo-lang endpoint.        |
| `--api-port`            | number | Port the API server will run on. Default: 7222.            |
| `--api-reuse-port`      |        | Allows API port reuse when using Bun.                      |
| `--api-cors`            |        | Enables CORS for the API.                                  |
| `--api-cors-origins`    | origin | List of allowed origins for API CORS.                      |
| `--api-logging`         |        | Enables API request logging.                               |
| `--api-static-root`     | path   | Serves static files from a folder over HTTP.               |
| `--api-require-sign-in` |        | Requires a JWT to access API endpoints.                    |
| `--api-route-base`      | route  | Route where the API is rooted. Default: `/api/convo-lang`. |
| `--disable-api-db-auth` |        | Disables authentication for API calls to the database.     |
| `--embedded-file-map`   | JSON   | Maps files embedded during bun build.                      |

### Database

| Argument                         | Value           | Description                                                                               |
|----------------------------------|-----------------|-------------------------------------------------------------------------------------------|
| `--db-map`                       | spec            | Maps database names and layers to backing store types. Example: `default:sqlite`.         |
| `--load-db-function`             | db:path:src     | Loads a function file into ConvoDb. Wildcards can be used in the source path.             |
| `--load-db-function-drop-export` |                 | Drops the ending export from bundled db functions.                                        |
| `--db-function-bundle-command`   | command         | Shell command used to bundle db functions. Default: `bun build "$dbFunctionSrcFilePath"`. |
| `--call-db-function`             | db:path         | Calls a db function.                                                                      |
| `--call-db-function-args`        | JSON            | Args to pass to the called db function.                                                   |
| `--query-db`                     | JSON or db:path | Executes a convo db node query.                                                           |
| `--execute-db-commands`          | JSON            | Executes db commands.                                                                     |

## Examples

Run a convo file:

``` bash
convo ./chat.convo
```

Run inline convo code:

``` bash
convo --inline "> user\nTell me a joke"
```

Read convo code from stdin:

``` bash
cat ./chat.convo | convo --stdin
```

Start the REPL:

``` bash
convo --repl
```

Parse a convo file as JSON:

``` bash
convo ./chat.convo --parse --parse-format 4
```

Convert convo code to model input:

``` bash
convo ./chat.convo --convert
```

Run with variables:

``` bash
convo ./chat.convo --var name=Tom --var age:number=55 --vars "{city:'Austin'}"
```

Load variables from a file:

``` bash
convo ./chat.convo --vars-path ./.env.local --vars-path ./vars.json
```

Allow shell execution without prompting:

``` bash
convo ./task.convo --allow-exec allow
```

Generate an embedding:

``` bash
convo --generate-embedding "hello world" --embedding-model text-embedding-3-small
```

Run the API server:

``` bash
convo --api --api-port 7222 --api-cors --api-route-base /api/convo-lang
```

Run the API server with a database:

``` bash
convo --api --db-map default:sqlite:./dev.db
```

Query a database node:

``` bash
convo --db-map default:sqlite:./dev.db --query-db default:/users
```

Load db functions:

``` bash
convo --db-map prd:sqlite:./prd.db --load-db-function prd:/bin:functions/*
```

Call a db function:

``` bash
convo --db-map prd:sqlite:./prd.db --call-db-function prd:/bin/calculate --call-db-function-args "{x:1,y:2}"
```

Sync TypeScript interfaces and watch for changes:

``` bash
convo --sync-ts-config ./tsconfig.json --sync-out ./src/convo --sync-watch
```

Create a Next.js app:

``` bash
convo --create-next-app --create-app-dir ./my-app
```

## Related packages

- `convo-lang`
- `@convo-lang/convo-lang`