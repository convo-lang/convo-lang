
export type ConvoExecAllowMode='disable'|'ask'|'allow'

export interface ConvoCliConfig
{
    env?:Record<string,string>;
    /**
     * Contains how shell command execution is allowed
     */
    allowExec?:ConvoExecAllowMode|ConvoExecConfirmCallback;

    /**
     * If true values of the env property will override process.env values
     */
    overrideEnv?:boolean;

    /**
     * @default "vision"
     */
    capabilities?:string;
    apiKey?:string;
    apiBaseUrl?:string;
    chatModel?:string;
    audioModel?:string;
    imageModel?:string;
    visionModel?:string;
    secrets?:string;
    defaultModel?:string;
    defaultVars?:Record<string,any>;
}

export interface ConvoCliOptions
{
    /**
     * ConvoCliConfig object or path to a ConvoCliConfig file
     */
    config?:string|ConvoCliConfig;

    /**
     * Inline configuration as json
     */
    inlineConfig?:string;

    /**
     * Path to a source convo file
     */
    source?:string;

    /**
     * If true the source will be read from stdin
     */
    stdin?:boolean;

    /**
     * Inline convo code
     */
    inline?:string;

    /**
     * Used to set or overwrite the source path of executed files.
     */
    sourcePath?:string;

    /**
     * If true the CLI will operate in command mode which will allow function calling to be passed
     * though stdin and stdout
     */
    cmdMode?:boolean;

    /**
     * If true the CLI should enter REPL mode where the user can chat
     */
    repl?:boolean;

    /**
     * If true each line of output will be prefixed with characters to indicating what the output
     * is related to.
     */
    prefixOutput?:boolean;

    /**
     * If true the shared variable state will be printed
     */
    printState?:boolean;

    /**
     * If true the flattened messages will be printed
     */
    printFlat?:boolean;

    /**
     * If true the messages will be printed
     */
    printMessages?:boolean;

    /**
     * If true the give convo code will be parsed and output as JSON instead of executing the
     * code.
     */
    parse?:boolean;

    /**
     * JSON formatting used if the parse option is true
     */
    parseFormat?:number;

    /**
     * If true the input will be converted to input format of the target LLM and written as output.
     */
    convert?:boolean;

    /**
     * Either a function that will be called with each chunk of generated code or a path to write
     * output to. If out equals "." then the source path will be used. This allows you to run a
     * convo script then output the results back into the same file.
     */
    out?:((...chunks:string[])=>void)|string;

    /**
     * If true the output of the executor is buffered to be used later.
     */
    bufferOutput?:boolean;

    /**
     * Contains how shell command execution is allowed
     */
    allowExec?:ConvoExecAllowMode|ConvoExecConfirmCallback;

    /**
     * Conversation content to prepend to source
     */
    prepend?:string;

    /**
     * The current working directory used for context execution
     */
    exeCwd?:string;

    /**
     * Path to tsconfig of a TypeScript project that will be synchronized by scanning for tagged
     * interfaces, types and components
     */
    syncTsConfig?:string[];

    /**
     * If TypeScript projects being scanned with be updated in real time as changes are made.
     */
    syncWatch?:boolean;

    /**
     * The directory where generated synchronization output files are written
     */
    syncOut?:string;

    /**
     * A command line that can be ran in parallel with actions such as sync watching
     */
    spawn?:string;

    /**
     * Directory where to run the spawn command
     */
    spawnDir?:string;

    /**
     * Creates a new next js app using the create-next-app npx command using the convo-lang-nextjs-template
     */
    createNextApp?:boolean;

    /**
     * The directory where apps will be created
     */
    createAppDir?:string;

    /**
     * The directory where the create app command will be ran
     */
    createAppWorkingDir?:string;

    /**
     * If true all known models will be listed as JSON
     */
    listModels?:boolean;

    /**
     * Adds a named variable that can be used by executed convo-lang. To use spaces and other special
     * characters enclose the variable name and value in double or single quotes.
     *
     * By default variables are strings but can use a colon followed by a type to set the type of the variable.
     *
     * Variables with dots in their name can be used to override deeply nested values in objects
     * loaded using the `vars` or `varsPath` options.
     *
     * Vars that don't assign a value will be give a value of boolean true.
     *
     * Variables are assigned in the following order: --vars-path, --vars, --var
     *
     * @example --var winner=Ricky_Bobby
     * @example --var 'second=Cal Naughton, Jr.'
     * @example --var age:number=38
     * @example --var userData.lastSignIn=2025-11-13
     * @example --var 'data:object={"accountId":"3PRF1vx4niGfQJ9qbMhm","userType":"admin"}'
     * @example --var 'data:object=[5,1,3]'
     * @example --var isWinner
     */
    var?:string[];

    /**
     * A JSON object containing variables that can be used by executed convo-lang.
     * @example --vars '{"name":"Tom",age:55}'
     */
    vars?:string[];

    /**
     * Path to a JSON or .env file that defines variables that can be used by executed convo-lang.
     * Variables in .env files follow the same rules as vars define the by `--var` argument, allowing
     * them to use types and nested value assign name.
     * @example --vars-path ./customer-info.json
     * @example --vars-path ./.env.local
     */
    varsPath?:string[];

    /**
     * If true make targets should be built
     */
    make?:boolean;

    /**
     * If true make targets will be printed as JSON
     */
    makeTargets?:boolean;

    /**
     * If true the conversation will be ran as a graph
     */
    graph?:boolean;

    disableWriteGraphOnCompletion?:boolean;
}

export type ConvoExecConfirmCallback=(command:string,commandIndex:number)=>Promise<boolean>|boolean;
