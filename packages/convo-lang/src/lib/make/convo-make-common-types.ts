import { ZodTypeAny } from "zod";
import { ConvoTokenUsage } from "../convo-types.js";


export type ConvoMakeExplicitReviewType='http'|'source';
export type ConvoMakeReviewType='auto'|ConvoMakeExplicitReviewType;


export type ConvoMakeAppContentHostMode='react-page';

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
     * Usually https or http. Localhost and 127 addresses will default to http while all other
     * hosts will default to https.
     */
    protocol?:string;

    /**
     * Relative path from httpRoot where temporary pages can be written to preview generated components
     * and assets. For example when previewing generated components a new page will be created
     * to render the component on a path that is accessible from a browser.
     * @default "convo-make-tmp"
     */
    tmpPagesDir?:string;

    /**
     * The working directory of the app
     */
    dir:string;

    /**
     * If true review screens will be reloaded on changes instead of relying on hot reload
     */
    reloadOnChange?:boolean;

    /**
     * Determines how hosted content is displayed
     * @default "react-page"
     */
    componentHostMode?:ConvoMakeAppContentHostMode;


}

export interface ConvoMakeTargetAttachment extends ConvoMakeContentTemplate
{
    /**
     * A path relative to the input that will be used to load an additional file. Any stars in the
     * value of attach will be replaced with the filename of the input without its extension.
     */
    path:string;

    /**
     * If the attachment is a JSON array the string value of each item will be used a file pointed
     * to by the path. Any stars in the path will be replaced by the value of the item in the array.
     */
    listLoadPath?:string;

    item?:ConvoMakeContentTemplate;
}

/**
 * A declaration of a make target. The declaration is not yet expanded into a concrete make target
 */
export interface ConvoMakeTargetDeclaration extends ConvoMakeTargetSharedProps
{
    name?:string;

    /**
     * Name of the build state the target belongs to.
     */
    stage?:string;

    /**
     * Path or paths to input files. Any file other than a .convo file will be treated as context
     * and be inserted into context. Input paths can use a wildcard (*) character that is used
     * to map multiple inputs to matching outputs.
     */
    in?:string|string[];

    /**
     * Addition files to attach with the input of the target
     */
    attach?:string|ConvoMakeTargetAttachment|(string|ConvoMakeTargetAttachment)[];

    /**
     * Path to a file containing a json array. The items in the array will be used as input
     */
    inList?:string|string[];

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

    /**
     * Array of targets that this targets depends on and will be blocked by
     */
    deps?:string|string[];

    /**
     * Array of targets this target blocks
     */
    blocks?:string|string[];
}

export interface ConvoMakeTargetContentTemplate
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

export interface ConvoMakeInput extends ConvoMakeTargetContentTemplate
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
    name?:string;

    /**
     * Name of the build state the target belongs to.
     * @default "default"
     */
    stage:string;

    /**
     * Inputs of the target
     */
    in:ConvoMakeInput[];

    /**
     * Expanded path to target output.
     */
    out:string;

    /**
     * The part of the output path that is mapped from the input path of the target when the target
     * uses a wildcard.
     */
    outMappedPart?:string;

    /**
     * Is true if the target's output is based on a list
     */
    outFromList?:boolean;
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

    /**
     * The LLM to be used for generation
     */
    model?:string;

    /**
     * Array of targets that this targets depends on and will be blocked by
     */
    deps?:string[];

    /**
     * Array of targets this target blocks
     */
    blocks?:string[];
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
     * An explicit URL to preview the target using. Review URLs can be inferred using the `app`
     * and `appPath` when using apps. `reviewUrl` will override app and appPath.
     */
    reviewUrl?:string;

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

    /**
     * Path relative to app.httpRoot of app that contains the target. For NextJS
     * apps this a tmp page that will render a component
     */
    appHostFile?:string;

    /**
     * Determines how hosted content is displayed
     */
    appHostMode?:ConvoMakeAppContentHostMode;

    /**
     * Path used to import the component
     */
    appImportPath?:string

    /**
     * If true the target is a component
     */
    component?:boolean;
}

/**
 * Stages allow groups of targets to be generated in partitioned stages.
 */
export interface ConvoMakeStage extends ConvoMakeTargetSharedProps
{
    /**
     * Name of the stage. Stages with the same name will be merged at runtime
     */
    name:string;

    /**
     * Array of stages that this stage depends on and will be blocked by
     */
    deps?:string[];

    /**
     * Array of states this stage blocks
     */
    blocks?:string[];

    /**
     * Instructions passed to all targets of the state
     */
    instructions?:string|string[];
}
export interface ConvoMakeContentTemplate
{
    path?:string;

    template?:string;

    prefix?:string;

    suffix?:string;

    tag?:string;

    /**
     * If true and the content has a name the content will be wrapped in an xml tag that matches
     * its name.
     */
    tagWithName?:boolean;

    /**
     * Used to override content type of file extension of path
     */
    contentType?:string;

    /**
     * Select a markdown section or JSON property. If the context is a markdown file `select`
     * should be the name of a section to select. If the context is a json file `select` should
     * be a dot path.
     */
    select?:string|string[];

    /**
     * Max number of characters to use. Extra characters will be removed.
     */
    maxLength?:number;
}

export interface ConvoMakeContextTemplate extends ConvoMakeContentTemplate
{
    /**
     * Path to context file
     */
    path:string;

    /**
     * Tags to apply to the appended convo created by the context item
     */
    tags?:Record<string,string|boolean>;
}

/**
 * Properties shared between targets and stages. When defined in a stage the values act as defaults
 * for the targets of the stage.
 */
export interface ConvoMakeTargetSharedProps extends ConvoMakeTargetContentTemplate, ConvoMakeTargetAppProps
{
    /**
     * Path or paths to files that will serve as additional context to all inputs.
     */
    context?:string|string[]|ConvoMakeContextTemplate|ConvoMakeContextTemplate[];

    /**
     * Instructions that will be inserted in the context of all inputs.
     */
    instructions?:string|string[];

    /**
     * The LLM to be used for generation
     */
    model?:string;
}

export interface ConvoMakeActivePass
{
    index:number;
    startTime:number;
    endTime?:number;
    /**
     * Number of target outputs generated
     */
    genCount:number;
    /**
     * Number of targets skipped due to dependencies not being ready
     */
    skipCount:number;

    /**
     * Number of cached output targets
     */
    cachedCount:number;

    /**
     * Number of outputs forked
     */
    forkedCount:number;
}

export type ConvoMakePass=Required<ConvoMakeActivePass> & {
    cancelled?:boolean;
}

export interface ConvoMakeTargetRebuild
{
    /**
     * Full path to output
     */
    path:string;

    /**
     * If true the existing conversation should be continued
     */
    continueConversation?:boolean;
}

export interface ConvoMakeStats
{
    passes:ConvoMakePass[];
    usage:ConvoTokenUsage;
}
