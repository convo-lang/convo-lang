import { Observable } from "rxjs";

export interface ConvoMakeApp
{
    name:string;
    startCommand?:string;
    port?:number;
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
     * Instructions that will be inserted in the context of all inputs.
     */
    instructions?:string;

    /**
     * Path or paths to target outputs. Output paths can use a wildcard (*) character that is used
     * to map multiple inputs to matching outputs.
     */
    out:string|string[];

    /**
     * The direction that paths are relative to
     */
    dir?:string;
}

export interface ConvoMakeContentTemplate
{
    contextTemplate?:string;

    contextTag?:string;

    inputTemplate?:string;

    inputTag?:string;
}

export interface ConvoMakeInput extends ConvoMakeContentTemplate
{
    path?:string;
    isContext?:boolean;
    convo?:string;
    ready:boolean;
    hash?:string;
    isConvoFile:boolean;
}

export interface ConvoMakeTarget extends ConvoMakeTargetAppProps
{
    in:ConvoMakeInput[];
    /**
     * Expanded path to target output.
     */
    out:string;
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
    app:ConvoMakeApp;

    reviewType:ConvoMakeExplicitReviewType;
    /**
     * For http this is the path relative to the web root.
     */
    appPath?:string;
}

export interface ConvoMakeOutputReviewRequest
{
    reviewType:ConvoMakeExplicitReviewType;
    /**
     * For http this is the path relative to the web root.
     */
    appPath?:string;
}
export interface ConvoMakeOutputReviewResponse
{
    review:ConvoMakeOutputReview;
    closePageAsync():void;
}

export interface ConvoMakeOutputReview
{
    message?:string;
    approved:boolean;
    error?:string;
    screenshot?:Blob;
    screenshotBase64Url?:string;
}

export interface ConvoMakeShell
{
    execAsync(shellCommand:string):ConvoMakeShellProc;

    isPortOpenAsync(port:number):Promise<boolean>;
}

export interface ConvoMakeShellProc
{
    dispose():void;
    get onOutput():Observable<string>;
    exitPromise:Promise<number>;
    exitCode?:number;
}

