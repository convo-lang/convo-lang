import { convoStdImportPrefix } from "./convo-lib.js";
import { ConvoImport, ConvoModule } from "./convo-types.js";

export const getStdConvoImportAsync=async (name:string):Promise<ConvoModule|undefined>=>{
    if(name.startsWith(convoStdImportPrefix)){
        name=name.substring(convoStdImportPrefix.length);
    }
    switch(name){
        
        case 'make.convo':
            return (await import('./make/convo-make-convo-exports.js')).convoMakeExports(name);

        case 'db.convo':
        case 'db-extern-functions.convo':
            return (await import('./db/convo-db-convo-exports.js')).convoDbExports(name);

        case 'file-blocks.convo':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## XML File Blocks
When given files in an XML block and asked to modify the file or create a new file respond with
a similar XML block but replace the path attribute name with ${t}target-output-path${t}. Respond
with the full content of the file, never partial sections or ranges.

If creating a new file and not given a path use a path relative to the parent
directory of the referenced file.

When updating a file, any attributes of the XML tag of that file should be forwarded to your XML
response.
Do not forward any attributes that will override the attributes or your response.
Do not forward the path attribute, target-output-path will be used instead.

XML File Block Attributes:
- name: name of file
- path: relative path from current directory to the file
- target-output-path: path of target output
- dirty: The source file has uncommitted git changes
- file-hash: The hash of the file, usually only set when the file is dirty
- last-commit: The hash of the last commit the file was part of
- showing-ranges: If present only a limited range of the file will be displayed. Ranges are displayed in FILE_CONTENT_RANGE xml tags

You must always wrap the inner contents of the XML block with a markdown code fence to improve 
syntax highlighting for the user.

Example:
<FILE_CONTENT name="example.ts" target-output-path="./path/to/example.ts">
${t3} ts
export interface Example
{
    name:string;
}
${t3}
</FILE_CONTENT>`.trim()};

        case 'bash-blocks.convo':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## Bash Scripts
You can present bash shell scripts for the user to run by using XML blocks and inserting the script
wrapped in a markdown code fence. The user will be displayed a run button in their user interface
to run the script.

The ${t}target-shell-type${t} attribute must be set to "bash" and you can use the ${t}cwd${t} attribute
to set the directory the script should run in. Use relative paths when setting cwd unless told otherwise.
If cwd is not set the current working directory of the host process will be used. Set the ${t}script-name${t} 
attribute to unique name within the current conversation to distinguish between scripts.

When the user runs the script the output and ${t}script-name${t} will be sent back to you as a
${t}SCRIPT_OUTPUT${t} tag with the content wrapped in a markdown code fence.

Include short comments explaining what each command does.

Script Block:
<RUNNABLE_SCRIPT script-name="list-frontend-package-content" cwd="packages/frontend" target-shell-type="bash">
${t3} bash
# list contents of frontend package
ls -lh
${t3}
</RUNNABLE_SCRIPT>

Script Output Block after user runs script:
<SCRIPT_OUTPUT script-name="list-frontend-package-content">
${t3} output
drwxr-xr-x@  3 scott  staff    96B Apr  5 10:47 pages
-rw-r--r--@  1 scott  staff   793B Apr 15 00:33 next.config.ts
${t3}
</SCRIPT_OUTPUT>
`.trim()};

        case 'node-blocks.convo':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## Node Scripts
You can present Javascript code for the user to run in NodeJS by using XML blocks and inserting the Javascript
wrapped in a markdown code fence. The user will be displayed a run button in their user interface
to run the Javascript. Use modern ES modules syntax.

The ${t}target-shell-type${t} attribute must be set to "node" and you can use the ${t}cwd${t} attribute
to set the directory the script should run in. Use relative paths when setting cwd unless told otherwise.
If cwd is not set the current working directory of the host process will be used. Set the ${t}script-name${t} 
attribute to unique name within the current conversation to distinguish between scripts.

When the user runs the script the output and ${t}script-name${t} will be sent back to you as a
${t}SCRIPT_OUTPUT${t} tag with the content wrapped in a markdown code fence.

Include a comment at the top of the file explaining what it does.

Script Block:
<RUNNABLE_SCRIPT script-name="read-json-value" cwd="data" target-shell-type="node">
${t3} js
// This script will read the contents of tasks.json and output the names of the read tasks
import {readFileSync} from "node:fs";

const jsonContent=readFileSync('tasks.json').toString();
const tasks=JSON.parse(jsonContent);
console.log(${t}Task names = \${tasks.map(t=>t.name).join(', ')}${t});
${t3}
</RUNNABLE_SCRIPT>

Script Output Block after user runs script:
<SCRIPT_OUTPUT script-name="list-frontend-package-content">
${t3} output
Task names = Pickup milk, Clean bathroom
${t3}
</SCRIPT_OUTPUT>

When asked to run Javascript you should use a ${t}RUNNABLE_SCRIPT${t}
`.trim()};

        case 'bun-blocks.convo':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## Bun Scripts
You can present TypeScript or Javascript code for the user to run using BunJS by using XML blocks and
inserting the TypeScript or Javascript wrapped in a markdown code fence. The user will be displayed a
run button in their user interface to run the TypeScript or Javascript. Use modern ES modules syntax.

The ${t}target-shell-type${t} attribute must be set to "bun" and you can use the ${t}cwd${t} attribute
to set the directory the script should run in. Use relative paths when setting cwd unless told otherwise.
If cwd is not set the current working directory of the host process will be used. Set the ${t}script-name${t} 
attribute to unique name within the current conversation to distinguish between scripts.

When the user runs the script the output and ${t}script-name${t} will be sent back to you as a
${t}SCRIPT_OUTPUT${t} tag with the content wrapped in a markdown code fence.

Include a comment at the top of the file explaining what it does.

Script Block:
<RUNNABLE_SCRIPT script-name="read-json-value" cwd="data" target-shell-type="bun">
${t3} ts
// This script will read the contents of tasks.json and output the names of the read tasks
import {readFileSync} from "fs";

interface Task{
    name:string;
    task:string;
}

const jsonContent:string=readFileSync('tasks.json').toString();
const tasks:Task[]=JSON.parse(jsonContent);
console.log(${t}Task names = \${tasks.map(t=>t.name).join(', ')}${t});
${t3}
</RUNNABLE_SCRIPT>

Script Output Block after user runs script:
<SCRIPT_OUTPUT script-name="list-frontend-package-content">
${t3} output
Task names = Pickup milk, Clean bathroom
${t3}
</SCRIPT_OUTPUT>

When asked to run TypeScript or Javascript you should use a ${t}RUNNABLE_SCRIPT${t}
`.trim()};

        case 'python-blocks.convo':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## Bun Scripts
You can present Python code for the user to run using XML blocks and
inserting the Python code wrapped in a markdown code fence. The user will be displayed a
run button in their user interface to run the Python code.

The ${t}target-shell-type${t} attribute must be set to "python" and you can use the ${t}cwd${t} attribute
to set the directory the script should run in. Use relative paths when setting cwd unless told otherwise.
If cwd is not set the current working directory of the host process will be used. Set the ${t}script-name${t} 
attribute to unique name within the current conversation to distinguish between scripts.

When the user runs the script the output and ${t}script-name${t} will be sent back to you as a
${t}SCRIPT_OUTPUT${t} tag with the content wrapped in a markdown code fence.

Include a comment at the top of the file explaining what it does.

Script Block:
<RUNNABLE_SCRIPT script-name="read-json-value" cwd="data" target-shell-type="python">
${t3} py
// This script will read the contents of tasks.json and output the names of the read tasks
import json

with open('tasks.json', 'r', encoding='utf-8') as f:
    tasks = json.load(f)

print(f"Task names = {', '.join(task['name'] for task in tasks)}")
${t3}
</RUNNABLE_SCRIPT>

Script Output Block after user runs script:
<SCRIPT_OUTPUT script-name="list-frontend-package-content">
${t3} output
Task names = Pickup milk, Clean bathroom
${t3}
</SCRIPT_OUTPUT>

When asked to run Python code you should use a ${t}RUNNABLE_SCRIPT${t}
`.trim()};

        default:
            return undefined;
    }
}

const t='`';
const t3='```';

export const convoStdImportHandler=async (_import:ConvoImport):Promise<ConvoModule|undefined>=>{
    if(!_import.name.startsWith(convoStdImportPrefix)){
        return undefined;
    }
    return await getStdConvoImportAsync(_import.name);
}
