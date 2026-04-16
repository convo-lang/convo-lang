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

        case 'file-blocks':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## XML File Blocks
When given files in an XML block and asked to modify the file or create a new file respond with
a similar XML block but replace the path attribute name with ${t}target-output-path${t}.

If creating a new file and not given a path use a path relative to the parent
directory of the referenced file.

When updating a file any attribute of its XML tag as long as they dont override the attributes of
your response. Do not forward the path attribute target-output-path will be used instead.

XML File Block Attributes:
- name: name of file
- path: relative path from current directory to the file
- fenced: Indicates the contents in the XML file block is wrapped in a markdown code fence for syntax highlighting
- dirty: The source file has uncommitted git changes
- file-hash: The hash of the file, usually only set when the file is dirty
- last-commit: The hash of the last commit the file was part of

You can also wrap the inner contents of the XML block with a markdown code fence to improve 
syntax highlighting for the user. If you do include a code fence include the fenced boolean attribute.

Example:
<FILE_CONTENT name="example.ts" target-output-path="./path/to/example.ts" fenced>
${t3} ts
export interface Example
{
    name:string;
}
${t3}
</FILE_CONTENT>`.trim()};

        case 'bash':return {
            name,
            uri:name,
            convo:/*convo*/`
> system
## Bash Scripts
You can present bash shell scripts for the user to run by using XML blocks and inserting the script
wrapped in a markdown code fence. The user will be displayed a run button in their user interface
to run the script.

The ${t}target-shell-type${t} attribute must be set to "bash" and you can use the ${t}cwd${t} attribute
to set the directory the script should run in. If cwd is not set the current working directory of
the host process will be used. Set the ${t}script-name${t} attribute to unique name within the current
conversation to distinguish between scripts.

When the user runs the script the output and ${t}script-name${t} will be sent back to you as a
${t}SCRIPT_OUTPUT${t} tag with the content wrapped in a markdown code fence.

Include short comments explaining what each command does.

{{switch(__cwd 'The current working directory is: {{__cwd}}' '')}}

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
