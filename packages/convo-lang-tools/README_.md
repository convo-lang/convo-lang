# Convo-VSCode

Convo-VSCode is the VSCode extension for working with Convo-Lang directly inside the editor.

It provides a practical environment for authoring, running, inspecting, and reviewing `.convo` files, Convo-Make workflows, embedded Convo regions, generated file outputs, and runnable shell blocks.

## What it does

Convo-VSCode brings AI workflows into normal source files so you can:

- write and run `.convo` conversations in VSCode
- inspect parsed, flattened, and variable state
- review generated file outputs before writing them
- run shell scripts emitted in convo responses
- use Convo-Make for scaffolding and automation
- author modular file-based agent harnesses with imports
- work with embedded Convo in Markdown, JavaScript, TypeScript, and Python

The extension is designed to keep execution visible and developer-controlled instead of hiding everything behind a chat-only UI.

## Main features

- syntax highlighting for Convo-Lang
- support for `.convo`, `.convo-make`, and `.convo-make-target`
- embedded Convo highlighting in JS, TS, JSX, TSX, Python, and Markdown
- import path autocomplete
- clickable import links
- LSP-backed syntax diagnostics
- conversation execution commands
- graph execution support
- parsing, flattening, message, and variable inspection
- code lenses for recognized output blocks
- reviewable file outputs
- runnable shell script blocks
- Code Blocks tree view
- Make Build tree view for Convo-Make
- markdown preview highlighting for `convo` fenced blocks
- image paste support for Convo documents

## Installation

Install the extension in VSCode, then configure your model provider settings.

Depending on your setup, that may include values such as:

- `convo.defaultModel`
- `convo.openAiBaseUrl`
- `convo.openAiApiKey`
- `convo.awsBedrockProfile`
- `convo.awsBedrockApiKey`
- `convo.awsBedrockRegion`
- `convo.openRouterBaseUrl`
- `convo.openRouterApiKey`

After configuration, open a `.convo` file and run one of the Convo commands from the command palette.

## Quick start

Create a file named `example.convo`:

```convo
> system
You are a concise engineering assistant.

> user
Explain the difference between REST and GraphQL.
```

Then run:

- `Convo: Complete`

The extension will run the conversation and append the result back into the file.

## Working with generated file outputs

Convo responses can include XML file blocks that target real files.

Example:

```xml
<FILE_CONTENT name="example.ts" target-output-path="./src/example.ts">
``` ts
export const value='hello';
```
</FILE_CONTENT>
```

For recognized file output blocks, the extension can:

- open output
- open diff
- write output
- copy output

This makes AI-generated file changes reviewable before you apply them.

## Running shell scripts from convo output

Convo responses can also include runnable shell blocks.

Example:

```xml
<RUNNABLE_SCRIPT script-name="list-project" cwd="." target-shell-type="bash">
``` bash
# list project files
ls -la
```
</RUNNABLE_SCRIPT>
```

The extension can run the script, stream output, and append a structured `SCRIPT_OUTPUT` block back into the conversation.

This is useful for:

- inspecting a project
- validating generated changes
- running guided refactors
- keeping shell-assisted workflows explicit and reviewable

## Convo-Make support

Convo-VSCode includes support for Convo-Make workflows.

With the Make Build view, you can:

- inspect make targets
- build a target
- rebuild a single target
- sync outputs
- open generated outputs
- delete generated outputs
- open target convo files

This makes the extension useful not just for conversations, but also for AI-assisted scaffolding and repeatable generation workflows.

## File-based agent harnesses

A powerful way to use Convo-Lang is to compose reusable prompts, tools, and policies with imports.

Example:

```convo
@import ./shared/system-prompt.convo
@import ./shared/tools.convo
@import ./shared/review-rules.convo

> define
targetFile="./src/app.ts"

> system
Use the imported rules and tools to improve {{targetFile}}.

> user
Refactor the target file for readability and return a file output block.
```

This lets you build modular, source-controlled AI workflows instead of relying on hidden prompt configuration.

## Embedded Convo support

Convo-VSCode also supports Convo syntax in mixed-language projects, including:

- JavaScript
- TypeScript
- JSX
- TSX
- Python
- Markdown

This is useful when prompt logic lives inside app code, documentation, or workflow files rather than only in standalone `.convo` files.

## Commands

The extension includes commands for completing and inspecting conversations, including:

- `Convo: Complete`
- `Convo: Complete Graph`
- `Convo: Parse`
- `Convo: Flatten`
- `Convo: Flat Message Objects`
- `Convo: Message Objects`
- `Convo: Vars`
- `Convo: Convert`
- `Convo: Fork`
- `Convo: Complete Fork`
- `Convo: List Models`
- `Convo: Open Settings`
- `Convo: Modules`

## Keybindings

Default keybindings include:

- `Ctrl+R` / `Cmd+R` for complete
- `Ctrl+Shift+R` / `Cmd+Shift+R` for complete fork

## Views and tooling

### Code Blocks view

The Code Blocks view helps you inspect structured outputs grouped by message and document.

You can use it to:

- open block source
- open referenced outputs
- diff generated files
- write file outputs
- copy content
- run scripts
- apply all actions in a message

### Make Build view

The Make Build view provides a UI for Convo-Make targets and generated outputs.

## Markdown preview

The extension highlights `convo` fenced code blocks in Markdown preview, which is helpful when writing docs or prompt specs in Markdown.

## Diagnostics

A language server validates Convo source and reports syntax errors directly in the editor.

## Why use Convo-VSCode

Convo-VSCode is useful if you want AI workflows that are:

- file-first
- review-first
- modular
- transparent
- source-controlled
- easy to inspect and diff

Instead of hiding generation and execution behind an opaque coding agent, the extension keeps prompts, outputs, and actions in normal files under your control.

## Related projects

Convo-VSCode is part of the Convo ecosystem, which also includes:

- Convo-Lang
- Convo-Make
- Convo-CLI
- Convo-REST
- Convo-View

## License

See the repository license for license details.
