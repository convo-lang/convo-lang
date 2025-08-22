import { Observable } from "rxjs";
import { ZodTypeAny } from "zod";

export interface ConvoMakeApp
{
    /**
     * Name of the app
     */
    name:string;

    /**
     * A command that can be used to start the app. If no command is supplied it will be assumed the
     * app is running
     */
    startCommand?:string;

    /**
     * The port the app listens on
     */
    port?:number;

    /**
     * The hostname the app can be addressed by.
     * @default "localhost"
     */
    host?:string;
    /**
     * Path in the make project that serves as the http root directory when the app is running.
     * For NextJS projects this is the `pages` or `app` directory.
     */
    httpRoot?:string;

    /**
     * The working directory of the app
     */
    dir:string;

    /**
     * If true review screens will be reloaded on changes instead of relying on hot reload
     */
    reloadOnChange?:boolean;
}

/**
 * A declaration of a make target. The declaration is not yet expanded into a concrete make target
 */
export interface ConvoMakeTargetDeclaration extends ConvoMakeContentTemplate, ConvoMakeTargetAppProps
{
    /**
     * Path or paths to input files. Any file other than a .convo file will be treated as context
     * and be inserted into context. Input paths can use a wildcard (*) character that is used
     * to map multiple inputs to matching outputs.
     */
    in?:string|string[];

    /**
     * Path or paths to files that will serve as additional context to all inputs.
     */
    context?:string|string[];

    /**
     * Path to a file containing a json array. The items in the array will be used as input
     */
    inList?:string|string[];

    /**
     * Instructions that will be inserted in the context of all inputs.
     */
    instructions?:string;

    /**
     * Path or paths to target outputs. Output paths can use a wildcard (*) character that is used
     * to map multiple inputs to matching outputs.
     */
    out:string|string[];

    /**
     * The list output type of the target. Can be a Zod object or a convo type as an object or it
     * string representation in Convo-Lang syntax.
     */
    outListType?:ZodTypeAny|Record<string,any>|string;

    /**
     * The output type of the target. Can be a Zod object or a convo type as an object or it string
     * representation in Convo-Lang syntax.
     */
    outType?:ZodTypeAny|Record<string,any>|string;

    /**
     * When used with an input list and the out uses a wildcard `outNameProp` will populate the
     * value of the wildcard with the prop of the item used to generate the output
     */
    outNameProp?:string;

    /**
     * The direction that paths are relative to
     */
    dir?:string;
}

export interface ConvoMakeContentTemplate
{
    /**
     * A template that context contents will be inserted into. The string "$$CONTENT$$" will be
     * replaced with input contents.
     */
    contextTemplate?:string;

    /**
     * Name of an XML tag that will surround context content.
     */
    contextTag?:string;

    /**
     * A template that input contents will be inserted into. The string "$$CONTENT$$" will be
     * replaced with input contents.
     */
    inputTemplate?:string;

    /**
     * Name of an XML tag that will surround input content.
     */
    inputTag?:string;
}

export interface ConvoMakeInput extends ConvoMakeContentTemplate
{
    /**
     * Relative file path of the input. Inputs not source from a file such as inline instructions
     * will not have a path
     */
    path?:string;

    /**
     * If true the input is part of the general context of a target and is shared between all inputs
     * of a target
     */
    isContext?:boolean;

    /**
     * If true the input is a user command
     */
    isCommand?:boolean;

    /**
     * Content of the input represented as Convo-Lang source code
     */
    convo?:string;

    /**
     * If true the input's content is loaded and ready to be used as a generation input
     */
    ready:boolean;

    /**
     * The hash sum of the content of the input
     */
    hash?:string;

    /**
     * If defined the input's list index is it index in an array within an input file
     */
    listIndex?:number;

    /**
     * If true the content of the input will be used as a list to generate multiple outputs
     */
    isList?:boolean;

    /**
     * If true the input is a convo file
     */
    isConvoFile:boolean;

    /**
     * The JSON value of the input. Use when generating dynamic outputs based on inputs as json arrays
     */
    jsonValue?:any;
}

export interface ConvoMakeTarget extends ConvoMakeTargetAppProps
{

    /**
     * Inputs of the target
     */
    in:ConvoMakeInput[];

    /**
     * Expanded path to target output.
     */
    out:string;

    /**
     * If true the target will output a list
     */
    outIsList?:boolean;
    /**
     * The output type of the target expressed as an convo struct or other convo type
     */
    outType?:string;

    /**
     * Used with targets that are generated based on list inputs. `outNameProp` will take the value
     * of the item in the list the output is generated from and use that value as the value that
     * will be inserted into the placeholder of the output path of the target.
     */
    outNameProp?:string;

    /**
     * If defined the output path of the target is dynamic and can be any path matched by the
     * expression. Dynamic targets will be replaced by non-dynamic targets after generation is
     * complete
     */
    dynamicOutReg?:RegExp;
}

export interface ConvoMakeTargetAppProps
{

    /**
     * If truthy the outputs of the target will be reviewed by the user.
     *
     * auto - preview type will be automatically chosen based on the targets output type and path
     * http - The target will be reviewed in the browser
     * source - The target will be reviewed as source code
     * true - alias of auto
     */
    review?:boolean|ConvoMakeReviewType;

    /**
     * Name of the app the target is a part of
     */
    app?:string;

    /**
     * Path with in the app of the target that the outputs can be viewed at.
     */
    appPath?:string;

    /**
     * If true the extension of the output path should be keep when determining the appPath
     */
    keepAppPathExt?:boolean;
}

export type ConvoMakeExplicitReviewType='http'|'source';
export type ConvoMakeReviewType='auto'|ConvoMakeExplicitReviewType;

export interface ConvoMakeAppTargetRef
{
    /**
     * The referenced app
     */
    app:ConvoMakeApp;

    /**
     * The type of review to be used by the target
     */
    reviewType:ConvoMakeExplicitReviewType;

    /**
     * For http this is the path relative to the web root.
     */
    appPath?:string;
}

export interface ConvoMakeOutputReviewRequest
{
    /**
     * The requested review type
     */
    reviewType:ConvoMakeExplicitReviewType;

    /**
     * For http this is the path relative to the web root.
     */
    appPath?:string;
}

export interface ConvoMakeOutputReview
{
    /**
     * A message from the user with comments of the current state of the output.
     */
    message?:string;

    /**
     * If true the user approved of the output.
     */
    approved:boolean;

    /**
     * An error message associated with the output.
     */
    error?:string;

    /**
     * Raw image data of a screenshot of the output.
     */
    screenshot?:Blob;

    /**
     * A screenshot of the output as a base64 url.
     */
    screenshotBase64Url?:string;
}

export interface ConvoMakeShell
{
    /**
     * Starts the execution of a shell command and returns a process object to interact with the process
     */
    execAsync(shellCommand:string):ConvoMakeShellProc;

    /**
     * Checks if a specific port is open
     */
    isPortOpenAsync(port:number):Promise<boolean>;
}

export interface ConvoMakeShellProc
{
    /**
     * Disposes of and kills the process
     */
    dispose():void;

    /**
     * Occurs with the process writes text to stdout
     */
    get onOutput():Observable<string>;

    /**
     * A promise that is completed when the process exits
     */
    exitPromise:Promise<number>;

    /**
     * The exit code of the process or undefined if the process has not exited.
     */
    exitCode?:number;
}

