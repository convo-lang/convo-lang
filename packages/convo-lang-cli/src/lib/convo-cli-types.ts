import { ConvoDbCommand, ConvoNodeQuery } from "@convo-lang/convo-lang";

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
    unregisteredVars?:Record<string,any>;
}

export interface ConvoCliOptions
{
    /**
     * ConvoCliConfig object or path to a ConvoCliConfig file
     */
    config?:string|ConvoCliConfig;

    /**
     * Path to env files to load environment variables from
     */
    env?:string|string[];

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
     * Similar to the --vars argument but the variables are added to the unregistered variable.
     * Use this for sensitive or environment specific variables that shouldn't be logged or tracked.
     */
    uVars?:string[];

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

    /**
     * Path or paths to a convo worker file
     */
    worker?:string[];

    /**
     * If true worker files will be watched
     */
    watchWorkers?:boolean;

    workerBasePath?:string;

    dryRun?:boolean;

    disableThreadLogging?:boolean;

    /**
     * If true the CLI will run an HTTP API server with a convo-lang endpoint
     */
    api?:boolean;

    /**
     * Port the API server will run on.
     * @default 7222
     */
    apiPort?:number;

    /**
     * If true the API port will be allowed to be reused for load balancing.
     * @note This option is only available when using the Bun runtime.
     */
    apiReusePort?:boolean;

    /**
     * If true CORS will be enabled for the API
     */
    apiCors?:boolean;

    /**
     * List of allowed origins for API CORS
     */
    apiCorsOrigins?:string[];

    /**
     * Enables API request logging
     */
    apiLogging?:boolean;

    /**
     * Path to a folder to server static files over http. Redirects are automatically created at runtime
     * for NextJS pages square bracket route params.
     */
    apiStaticRoot?:string;

    /**
     * If true all API endpoints will require a JWT to access
     */
    apiRequireSignIn?:boolean;

    /**
     * The route where the api will be rooted.
     * @default '/api/convo-lang'
     */
    apiRouteBase?:string;

    /**
     * Used to map file embedded during bun build
     */
    embeddedFileMap?:Record<string,string>;

    /**
     * Generates an embedding for the give text
     */
    generateEmbedding?:string;

    /**
     * The model to use for generating embeddings
     */
    embeddingModel?:string;

    /**
     * The provider to use for generating embeddings
     */
    embeddingProvider?:string;

    /**
     * The format to return embedding in
     */
    embeddingFormat?:string;

    /**
     * Number of dimensions embeddings should be generated with
     */
    embeddingDimensions?:number;

    /**
     * Maps database name and layers to backing store types. The default maps to an in-memory sqlite database.
     * Examples:
     * - `dev:mem` - Maps the `dev` db to an in-memory database, not SQLite in-memory
     * - `stg:sqlite` - Maps the `stg` db to an SQLite in-memory db
     * - `prd:sqlite:./prd.db` Maps the `prd` db to an SQLite database with a db file saved to ./prd.db
     * @default 'default:sqlite'
     */
    dbMap?:string[];

    /**
     * List of function file to load into the ConvoDb. Each item in the list is a colon separated
     * database name, node path, file path tuple. For example to load `functions/calculate.ts` in to the 
     * prd database and store the function at `/bin/calculate` you would use `prd:/bin/calculate:functions/calculate.ts`.
     * Wildcards can be used in the source path to load all functions in a directory: `prd:/bin:functions/*`.
     * Wildcards are not recursive.
     * Use `dbMap` to define databases. 
     */
    loadDbFunction?:string[];

    /**
     * If true bundled function will have their ending export dropped.
     */
    loadDbFunctionDropExport?:boolean;

    /**
     * A shell command to bundle db function. The `$dbFunctionSrcFilePath` variable will contain the 
     * path to the function file. bun build is used by default.
     * @default 'bun build "$dbFunctionSrcFilePath"'
     */
    dbFunctionBundleCommand?:string;

    /**
     * Path to a db function to call
     */
    callDbFunction?:string;

    /**
     * Args to pass to called db function
     */
    callDbFunctionArgs?:Record<string,any>;

    /**
     * A convo db node query
     */
    queryDb?:ConvoNodeQuery&{dbName:string};

    /**
     * Executes db commands
     */
    executeDbCommands?:{dbName:string,commands:ConvoDbCommand<any>[]};

    /**
     * If true authentication for api calls to the db will be disabled.
     */
    disableApiDbAuth?:boolean;

    /**
     * Indentation value passed to JSON.stringify when outputting JSON.
     * @default 4
     */
    jsonFormat?:number;
}

export type ConvoExecConfirmCallback=(command:string,commandIndex:number)=>Promise<boolean>|boolean;
