import { AnyFunction, CodeParsingOptions, CodeParsingResult, JsonScheme, MarkdownLine, Progress } from '@iyio/common';
import type { ZodObject, ZodType } from 'zod';
import type { Conversation } from "./Conversation";
import type { ConvoExecutionContext } from './ConvoExecutionContext';
import { ConvoComponentDef } from './convo-component-types';
import type { convoReservedRoles } from './convo-lib';
import type { convoSystemMessages } from './convo-system-messages';

export type ConvoMessageType='text'|'function';

export const convoValueConstants=['true','false','null','undefined'] as const;
export type ConvoValueConstant=(typeof convoValueConstants)[number];

export const convoNonFuncKeywords=['in'] as const;
export type ConvoNonFuncKeyword=(typeof convoNonFuncKeywords)[number];

/** Union type of all reserved role names */
export type ConvoReservedRole=(typeof convoReservedRoles)[number];


export const convoObjFlag='**convo**'

export interface ConvoTag
{
    name:string;
    value?:string;
    statement?:ConvoStatement[];
    /**
     * Stores the original string source of the tag when the tag uses statements
     */
    srcValue?:string;
}

export type ConvoErrorType=(
    'invalid-return-value-type'|
    'function-call-parse-count'|
    'function-call-args-suspended'|
    'unexpected-base-type'|
    'invalid-args'|
    'proxy-call-not-supported'|
    'function-not-defined'|
    'function-return-type-not-defined'|
    'function-args-type-not-defined'|
    'function-args-type-not-an-object'|
    'suspended-scheme-statements-not-supported'|
    'zod-object-expected'|
    'scope-waiting'|
    'suspension-parent-not-found'|
    'variable-ref-required'|
    'max-type-conversion-depth-reached'|
    'unknown-json-scheme-type'|
    'invalid-scheme-type'|
    'invalid-variable-name'|
    'invalid-function-name'|
    'invalid-type-name'|
    'invalid-register-only-function'|
    'invalid-role'|
    'use-of-reserved-role-not-allowed'|
    'invalid-message-response-scheme'|
    'missing-defaults'
);

export type StandardConvoSystemMessage=keyof typeof convoSystemMessages;

export interface ConvoErrorReferences
{
    message?:ConvoMessage;
    fn?:ConvoFunction;
    statement?:ConvoStatement;
    statements?:ConvoStatement[];
    completion?:ConvoCompletionMessage;
    baseType?:ConvoBaseType;
}

export const allConvoCapabilityAry=['vision','visionFunction'] as const;
export type ConvoCapability=typeof allConvoCapabilityAry[number];
export const isConvoCapability=(value:any):value is ConvoCapability=>allConvoCapabilityAry.includes(value);

export const allConvoComponentModeAry=['render','input'] as const;
export type ConvoComponentMode=typeof allConvoComponentModeAry[number];
export const isConvoComponentMode=(value:any):value is ConvoComponentMode=>allConvoComponentModeAry.includes(value);


/**
 * Can be a text message or function definition
 */
export interface ConvoMessage
{
    role?:string;
    content?:string;
    description?:string;
    statement?:ConvoStatement;
    fn?:ConvoFunction;
    /** Message triggers that will be evaluated when this function is defined */
    messageTriggers?:ConvoTrigger[];
    tags?:ConvoTag[];
    markdown?:MarkdownLine[];

    insert?:ConvoInsert;

    /**
     * Used to mark the message for insertion and control flow. Some message types like queue
     * message are auto labeled. The `@label` tag can be used to manually tag messages.
     */
    label?:string;

    /**
     * The target render area of the message.
     */
    renderTarget?:string;

    /**
     * The value of the message parsed as json
     */
    jsonValue?:any;

    /**
     * When defined the message is handled as a component and is rendered as a custom ui element.
     * A component message can either render an custom UI without effecting the current conversation
     * or a component message can collect and submit data into the current conversation.
     */
    component?:ConvoComponentMode;

    /**
     * If true the message should be rendered but not sent to LLMs
     */
    renderOnly?:boolean;

    sourceUrl?:string;

    sourceId?:string;

    sourceName?:string;

    /**
     * If true the message should be clickable and when clicked the content of the message should be
     * added to the conversation.
     */
    isSuggestion?:boolean;

    /**
     * Thread Id. Conversations can be divided into threads and during evaluation threads can be
     * used to control which messages are included.
     */
    tid?:string;

    /**
     * The line number the message started on in source code.
     */
    sourceLineNumber?:number;
    /**
     * The character index the message started on
     */
    sourceCharIndex?:number;

    /**
     * If true the message should be evaluated as code
     */
    eval?:boolean;

    /**
     * The id of the user that sent the message
     */
    userId?:string;

    /**
     * If true and the message is a content message the content message will have all space preserved.
     * By default content messages will  have newlines removed between lines of text that that
     * begin and end with alpha numeric characters.
     */
    preSpace?:boolean;

    /**
     * Conversation ID
     */
    cid?:string;

    /**
     * Path to file where the message was defined in
     */
    [convoMessageSourcePathKey]?:string;
}

export const convoMessageSourcePathKey=Symbol('convoMessageSourcePathKey');

export const baseConvoToolChoice=['none','auto','required'] as const;
export type ConvoToolChoice=(typeof baseConvoToolChoice[number])|{name:string};

export interface ConvoMessagePart
{
    id?:string;
    content?:string;
    hidden?:boolean;
}

export interface ConvoPostCompletionMessage
{
    content?:string;
    hidden?:boolean;
    evalMessage?:ConvoMessage;
    evalRole?:string;
    createdAfterCalling?:string;
}

export interface ConvoStatement
{
    /**
     * Raw value
     */
    value?:any;

    /**
     * name of function to invoke
     */
    fn?:string;

    /**
     * Dot path used with fn
     */
    fnPath?:string[];

    /**
     * Args to pass to fn if defined
     */
    params?:ConvoStatement[];

    /**
     * Name of a variable to set the function call result or value to.
     */
    set?:string;

    /**
     * Dot path used with set
     */
    setPath?:string[];

    /**
     * Name of a referenced variable
     */
    ref?:string;

    /**
     * Dot path used with ref
     */
    refPath?:string[];

    /**
     * Label optional - If true the statement is option. Used in com
     */
    opt?:boolean;

    /**
     * Statement label
     */
    label?:string;

    /**
     * Name of a non function keyword
     */
    keyword?:string;

    comment?:string;

    tags?:ConvoTag[];

    /**
     * If true the statement has the shared tag and assignment of variables will be stored in the
     * shared variable scope.
     */
    shared?:boolean;

    /**
     * Source index start
     */
    s:number;

    /**
     * Source index end. The index is non-inclusive.
     */
    e:number;

    /**
     * Source index close. Only used with function calls. The index is non-inclusive.
     */
    c?:number;

    /**
     * If true the statement is a match case. Match cases are used with switch statements. Match
     * case functions include (case, test and default)
     */
    mc?:boolean;

    /**
     * If the statement has child match case statements.
     */
    hmc?:boolean;

    /**
     * Used to start the source code of a statement. Source is most commonly used by message templates.
     */
    source?:string;

    /**
     * If true the statement in font of the current pipe statement will be  piped to the statement
     * behind the current pipe statement. Pipe statements are converted to calls to the pipe function
     * when a convo script is parsed and will to be present in a fully parsed syntax tree
     */
    _pipe?:boolean;

    /**
     * If true the statement has pipe statements in it's args.
     */
    _hasPipes?:boolean;

    /**
     * Used with prompt strings and indicates the string is a prompt to be completed
     */
    prompt?:InlineConvoPrompt;
}

/**
 * Convo-Lang prompts that can be executed inline inside of a function
 */
export interface InlineConvoPrompt
{
    /**
     * The header portion of the source the prompt was parsed from
     */
    header:string;

    /**
     * If true the prompt should extend the current conversation. Only content based and top level
     * messages are included. Use the `system` and `functions` properties to include functions and
     * system messages. The (@)includeWithTriggers add individual messages
     */
    extend?:boolean;

    /**
     * If true the prompt will continue the inline conversation. If the prompt is static the content
     * of the prompt will be appended to the current inline conversation.
     * The `+` modifier is used to continue the conversation.
     */
    continue?:boolean;

    /**
     * The action the prompt should take after evaluating. The action is relative to the message
     * that triggered the prompt
     *
     * @example
     * ??? (+respond)
     * <moderator>
     * Tell the user they have ran out of credits and must buy more first.
     * </moderator>
     * ???
     */
    action?:ConvoMessageModificationAction;


    /**
     * If true the output of the prompt should be appended to the conversation. The `>>` modifier
     * is used to enable `appendOutput`
     *
     * @example
     * === (>>)
     * > assistant
     * Thank you. We will be in contact soon.
     * ===
     */
    appendOutput?:boolean;

    /**
     * If true the prompt has at least one message defined using a role. Prompts that do not have
     * a role will automatically be given one when a role is required.
     */
    hasRole?:boolean;

    /**
     * Name of a variable to assign the output of the prompt to
     */
    assignOutputTo?:string;

    /**
     * Name of tag to wrap the content of the prompt in. Do not use a wrapper tag if the prompt
     * uses roles.
     */
    wrapInTag?:string;

    /**
     * Array of standard system messages to include. For example when using the `/m` modifier to
     * wrap the prompt content in a moderator tag the `moderatorMessages` standard system message
     * will be appended to the conversation
     */
    systemMessages?:StandardConvoSystemMessage[];

    /**
     * When extends is true and system is true system messages will be cloned from the
     * parent conversation.
     */
    system?:boolean;

    /**
     * When extends is true and functions is true functions will be cloned form the
     * parent conversation.
     */
    functions?:boolean;

    /**
     * When extends is true and transforms is true the prompt will allow transform to be enabled.
     */
    transforms?:boolean;

    /**
     * Causes only the last N number of message to be cloned
     */
    last?:number;

    /**
     * Drops the last N number of messages from the cloned conversation
     */
    dropLast?:number;

    /**
     * If true the return value of the prompt should have the not (!) operator applied
     */
    not?:boolean;

    /**
     * Message of the prompt to be evaluated
     */
    messages:ConvoMessage[];

    /**
     * If true the prompt will not be evaluated and it content will be returned as string
     */
    isStatic?:boolean;

    /**
     * The json schema the prompt should return
     */
    jsonType?:string;

    /**
     * If true the prompt should return an array.
     */
    jsonAry?:boolean;

    /**
     * A task description to display while the prompt is evaluating
     */
    task?:ConvoTask;

    /**
     * If true the white space of the response of the prompt will be preserved.
     */
    preSpace?:boolean;

    tags?:ConvoTag[];
}

export interface ConvoMessageAndOptStatement
{
    message:ConvoMessage;
    statement?:ConvoStatement;
}

export interface ConvoFunction
{
    name:string;

    modifiers:string[];

    /**
     * If true the function defines an agent
     */
    isAgent?:boolean;

    /**
     * Name of a type variable that the function returns. If undefined the function
     * can return any type.
     */
    returnType?:string;

    /**
     * If true the function is a local statement that should only be called by other functions in the
     * current convo script
     */
    local?:boolean;

    /**
     * If true the implementation of the function is external from the conversation.
     */
    extern?:boolean;

    /**
     * If true it has been requested that the function be called.
     */
    call?:boolean;

    /**
     * If true the function should be directly invoked when it is the last message of the conversation.
     * The function should not define any parameters. invoke will be true if the function is named
     * invoke or has the invoke modifier.
     */
    invoke?:boolean;

    /**
     * If true the function is a collection of top level statements
     */
    topLevel:boolean;

    /**
     * If true the function only defines types
     */
    definitionBlock?:boolean;


    description?:string;

    /**
     * The body statements of the function. If a function does not have a body then it is either
     * a function interface or a call or called statement.
     */
    body?:ConvoStatement[];
    params:ConvoStatement[];
    paramType?:string;
}

/**
 * Filters what messages are included in a conversation based on the rules of the filter.
 * Exclusive rules take priority over inclusive rules.
 */
export interface ConvoThreadFilter
{

    /**
     * Ids of threads to include. If defined only messages with a thread id that is included in
     * includeThreads will be included in the evaluation of a conversation. Messages without a
     * threadId will be included if includeNonThreaded is true.
     */
    includeThreads?:string[];

    /**
     * If true and a message does not have a thread id the message is included.
     */
    includeNonThreaded?:boolean;

    /**
     * Ids of threads to excluded. If defined any messages with a thread id that is included in
     * excludeThreads will be excluded from the evaluation of a conversation. Messages without a
     * threadId will be excluded if excludeNonThreaded is true.
     */
    excludeThreads?:string[];

    /**
     * If true and a message does not have a thread id the message is excluded.
     */
    excludeNonThreaded?:boolean;
}

export type ConvoParsingResult=CodeParsingResult<ConvoMessage[]>

export interface ConvoScopeError
{
    message:string;
    error?:any;
    statement?:ConvoStatement;
}

export interface OptionalConvoValue<T=any>
{
    [convoObjFlag]:'optional';
    value?:T;

}
export const isOptionalConvoValue=(value:any):value is OptionalConvoValue=>(value as OptionalConvoValue)?.[convoObjFlag]==='optional';

export interface ConvoFlowControllerDataRef
{
    ctrlData?:any;
    childCtrlData?:Record<string,ConvoFlowControllerDataRef>;
}

export const convoFlowControllerKey=Symbol('convoFlowControllerKey');
export const convoScopeFunctionMarker=Symbol('convoScopeFunctionMarker');
export interface ConvoFlowController
{

    /**
     * If true only the last param value is stored in the scopes param value array
     */
    discardParams?:boolean;

    usesLabels?:boolean;

    /**
     * If true return control flow should be caught
     */
    catchReturn?:boolean;

    /**
     * If true break control flow should be caught
     */
    catchBreak?:boolean;

    sourceFn?:ConvoFunction;

    /**
     * If true the ctrl data will be stored by the parent scope of the ctrl
     * This is useful for ctrls that manage loops or iterators.
     */
    keepData?:boolean;

    startParam?(
        scope:ConvoScope,
        parentScope:ConvoScope|undefined,
        ctx:ConvoExecutionContext
    ):number|false;

    nextParam?(
        scope:ConvoScope,
        parentScope:ConvoScope|undefined,
        paramStatement:ConvoStatement,
        ctx:ConvoExecutionContext
    ):number|false;

    shouldExecute?(
        scope:ConvoScope,
        parentScope:ConvoScope|undefined,
        ctx:ConvoExecutionContext
    ):boolean;

    transformResult?(
        value:any,
        scope:ConvoScope,
        parentScope:ConvoScope|undefined,
        ctx:ConvoExecutionContext
    ):any;
}

export type ConvoScopeFunction=(scope:ConvoScope,ctx:ConvoExecutionContext)=>any;

export const convoScopeFnKey=Symbol('convoScopeFnKey');
export const convoScopeParentKey=Symbol('convoScopeParentKey');

export interface ConvoScope
{
    /**
     * suspension id
     */
    si?:string;

    onComplete?:((value:any)=>void)[];

    onError?:((error:any)=>void)[];

    /**
     * value
     */
    v?:any;

    /**
     * If true the control flow should return from the current function
     */
    r?:boolean;

    /**
     * If true the control flow should break the current loop
     */
    bl?:boolean;

    /**
     * If defined li tells control flow that the statement at the given index is the body of a
     * loop statement
     */
    li?:number;

    /**
     * index
     */
    i:number;

    s:ConvoStatement;


    /**
     * Wait id. Id of another scope to wait for before resuming
     */
    wi?:string;

    /**
     * Parent suspension id
     */
    pi?:string;

    /**
     * Suspension Finished
     */
    fi?:boolean;

    [convoScopeFnKey]?:ConvoScopeFunction;

    /**
     * Param values used with function statements
     */
    paramValues?:any[];

    /**
     * Maps label names to param indexes
     */
    labels?:Record<string,number|OptionalConvoValue<number>>;

    error?:ConvoScopeError;

    /**
     * If true the scope is defining a type
     */
    td?:boolean;

    ctrlData?:any;

    /**
     * Similar to ctrlData but can be used by child statement controls to store data between
     * statements executions. Used by the (in) function to store iterator position.
     */
    childCtrlData?:Record<string,any>;

    fromIndex?:number;

    gotoIndex?:number;

    /**
     * When this index is reached flow control should break. The statement at the index will not be executed.
     * breakIndex (bi) does not effect the scopes parent.
     */
    bi?:number;

    it?:ConvoIterator;

    /**
     * Variable scope for the scope. When a function is executed all scopes generated will share the
     * same vars scope object. This is important to remember when serializing scope objects.
     */
    vars:Record<string,any>;

    /**
     * If true metadata should be captured. Metadata capturing is implemented in ConvoFlowControllers.
     */
    cm?:boolean;

    /**
     * Stores the current switch value
     */
    sv?:any;

    /**
     * If true the scope is used as the default scope object. This property is used for internal
     * optimization and should be ignored
     */
    _d?:boolean;
}

export interface ConvoIterator
{
    /**
     * Index of current iteration item
     */
    i:number;

    /**
     * Keys of item currently being iterated. Used when iterating over objects
     */
    keys?:string[];
}

export interface ConvoKeyValuePair
{
    key:string;
    value:any;
}

export const convoBaseTypes=['string','number','int','boolean','time','void','any','map','array','object'] as const;
export type ConvoBaseType=(typeof convoBaseTypes)[number];
export const isConvoBaseType=(value:any):value is ConvoBaseType=>convoBaseTypes.includes(value);

export interface ConvoType
{
    [convoObjFlag]:'type';
    type:string;
    enumValues?:any[];
}
export const isConvoType=(value:any):value is ConvoType=>(value as ConvoType)?.[convoObjFlag]==='type';

export interface ConvoMarkdownLine
{
    [convoObjFlag]:'md',
    line:MarkdownLine;
}
export const isConvoMarkdownLine=(value:any):value is ConvoMarkdownLine=>
    (value as ConvoMarkdownLine)?.[convoObjFlag]==='md';

export interface FlatConvoMessage
{
    role:string;

    isUser?:boolean;

    isAssistant?:boolean;

    isSystem?:boolean;

    content?:string;

    /**
     * Used to mark the message for insertion and control flow. Some message types like queue
     * message are auto labeled. The `@label` tag can be used to manually tag messages.
     */
    label?:string;

    /**
     * Content prefix
     */
    prefix?:string;

    /**
     * Content suffix
     */
    suffix?:string;

    /**
     * Content that will override the content that is sent to the LLM
     */
    modelContent?:string;

    /**
     * A function that can be called
     */
    fn?:ConvoFunction;

    /**
     * Params type of the function that can be called
     */
    fnParams?:ZodObject<any>;

    /**
     * fnParams as a JsonScheme for serialization,
     */
    _fnParams?:JsonScheme;

    /**
     * The target render area of the message.
     */
    renderTarget?:string;

    /**
     * A function that was called
     */
    called?:ConvoFunction;
    /**
     * The parameters that where passed to the function
     */
    calledParams?:any;
    /**
     * The value the called function returned
     */
    calledReturn?:any;

    /**
     * If true message was generated at the edge of the conversation, meaning the template expressions
     * where evaluated with the latest variables.
     */
    edge?:boolean;

    /**
     * Used with messages that set variables such as define and result messages.
     */
    setVars?:Record<string,any>;


    tags?:Record<string,string|undefined>;

    /**
     * The model the message has been requested to be completed with.
     */
    responseModel?:string;

    /**
     * The endpoint the message has been requested to be completed with.
     */
    responseEndpoint?:string;

    /**
     * The id of the user that sent the message
     */
    userId?:string;

    /**
     * Use "json" for json mode
     */
    responseFormat?:string;
    responseFormatTypeName?:string;
    responseFormatIsArray?:boolean;
    responseAssignTo?:string;

    task?:string;

    /**
     * When defined the message is handled as a component and is rendered as a custom ui element.
     * A component message can either render an custom UI without effecting the current conversation
     * or a component message can collect and submit data into the current conversation.
     */
    component?:ConvoComponentMode;

    /**
     * An ordered index given to flat component messages
     */
    componentIndex?:number;

    /**
     * If true the component message is actively being waited on.
     */
    componentActive?:boolean;

    /**
     * If true the message should be rendered but not sent to LLMs
     */
    renderOnly?:boolean;

    markdown?:MarkdownLine[];

    sourceUrl?:string;

    sourceId?:string;

    sourceName?:string;

    /**
     * If true the message should be clickable and when clicked the content of the message should be
     * added to the conversation.
     */
    isSuggestion?:boolean;

    /**
     * Thread Id. Conversations can be divided into threads and during evaluation threads can be
     * used to control which messages are included.
     */
    tid?:string;

    /**
     * If true the message should be evaluated as code
     */
    eval?:boolean;

    vision?:boolean;

    preSpace?:boolean;

    /**
     * If true the message can be executed in parallel
     */
    parallel?:boolean;

    insert?:ConvoInsert;

}

export interface ConvoCompletionMessage extends Partial<ConvoTokenUsage>
{
    role?:string;
    content?:string;
    callFn?:string;
    callParams?:any;
    tags?:Record<string,string|undefined>;
    model?:string;
    format?:string;
    formatTypeName?:string;
    formatIsArray?:boolean;
    assignTo?:string;
    endpoint?:string;
}

export interface ConvoCompletionService<TInput,TOutput>
{

    serviceId:string;

    inputType:string;

    outputType:string;

    /**
     * Called after checking for model matches and can be used to decide if the completion service
     * can handle the conversation based on the state of the conversation. If the service
     * does not define any models canComplete will always be called for every unique model.
     */
    canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean;

    completeConvoAsync(input:TInput,flat:FlatConvoConversationBase,ctx:ConvoCompletionCtx<TInput,TOutput>):Promise<TOutput>

    getModelsAsync?():Promise<ConvoModelInfo[]|undefined>;

    /**
     * If true models return from getModelsAsync will not be cached.
     */
    disableModelInfoCaching?:boolean;

    /**
     * Used to relay message formatting. This is primarily used by the HttpConvoCompletionService
     * to convert message using converters server side.
     */
    relayConvertConvoToInputAsync?(flat:FlatConvoConversationBase,inputType?:string):Promise<TInput>;
}

export interface ConvoCompletionCtx<TInput=any,TOutput=any>
{
    beforeComplete?:(service:ConvoCompletionService<TInput,TOutput>,input:TInput,flat:FlatConvoConversationBase)=>void|Promise<void>;
    afterComplete?:(service:ConvoCompletionService<TInput,TOutput>,output:TOutput,input:TInput,flat:FlatConvoConversationBase)=>void|Promise<void>;
}

export interface ConvoCompletionServiceAndModel
{
    service:ConvoCompletionService<any,any>;
    model?:ConvoModelInfo;
}

export interface ConvoConversationConverter<TInput,TOutput>
{

    supportedInputTypes:string[];

    supportedOutputTypes:string[];

    convertConvoToInput(flat:FlatConvoConversationBase,inputType:string):TInput;

    convertOutputToConvo(
        output:TOutput,
        outputType:string,
        input:TInput,
        inputType:string,
        flat:FlatConvoConversationBase
    ):ConvoCompletionMessage[];
}

export interface ConvoConversion<T>
{
    success:boolean;
    result?:T;
    converter?:ConvoConversationConverter<any,any>
}

export type ConvoCompletionStatus='complete'|'busy'|'error'|'disposed';

export type ConvoRagMode=boolean|number;
export const isConvoRagMode=(value:any):value is ConvoRagMode=>(
    value===true ||
    value===false ||
    (typeof value === 'number')
)

export interface ConvoFnCallInfo
{
    name:string;
    message:ConvoMessage;
    fn:ConvoFunction;
    returnValue:any;
}

export interface ConvoCompletion
{
    status:ConvoCompletionStatus;
    message?:ConvoCompletionMessage;
    messages:ConvoCompletionMessage[];
    error?:any;
    exe?:ConvoExecutionContext;
    lastFnCall?:ConvoFnCallInfo;
    returnValues?:any[];
    task:string;
}

export interface FlatConvoTransform
{
    name:string;
    description?:string;
    required?:boolean;
    messages:FlatConvoMessage[];
    outputType?:string;
    optional?:boolean;
}

export interface ConvoQueueRef
{
    label:string;
    index:number;
}

export interface FlatConvoConversation extends FlatConvoConversationBase
{
    exe:ConvoExecutionContext;
    vars:Record<string,any>
    conversation:Conversation;
    task:string;
    /**
     * Maps task triggers to tasks.
     * triggerName -> task array
     */
    taskTriggers?:Record<string,string[]>;

    templates?:ConvoMessageTemplate[];

    markdownVars:Record<string,ConvoMarkdownLine|string>;

    transforms?:FlatConvoTransform[];

    transformFilterMessages?:FlatConvoMessage[];

    response?:ConvoCompletionMessage[];


}

export interface FlatConvoConversationBase
{
    messages:FlatConvoMessage[];
    capabilities:ConvoCapability[];

    hiddenSource?:string;


    ragMode?:ConvoRagMode;
    ragPrefix?:string;
    ragSuffix?:string;

    toolChoice?:ConvoToolChoice;

    /**
     * The model the conversation has been requested to be completed with.
     */
    responseModel?:string;

    model?:ConvoModelInfo;

    /**
     * The endpoint the conversation has been requested to be completed with.
     */
    responseEndpoint?:string;

    /**
     * The id of the user to last send a message
     */
    userId?:string;

    /**
     * Reference to a queue that is being flushed
     */
    queueRef?:ConvoQueueRef;

    /**
     * Messages to execute in parallel.
     */
    parallelMessages?:ConvoMessage[];

    /**
     * The max number of tokens that should be returned by the LLM
     */
    maxTokens?:number;

    /**
     * The likelihood of the model selecting higher-probability options while generating a response.
     * A lower value makes the model more likely to choose higher-probability options, while a
     * higher value makes the model more likely to choose lower-probability options.
     */
    temperature?:number;

    /**
     * The percentage of most-likely candidates that the model considers for the next token.
     */
    topP?:number;

    afterCall?:Record<string,(ConvoPostCompletionMessage|string)[]>;

    /** Array of message triggers that will be automatically evaluated for applicable messages */
    messageTriggers?:ConvoTrigger[];

    apiKey?:string;

    /**
     * If true the complete service used the provided api key
     */
    apiKeyUsedForCompletion?:boolean;

    /**
     * If defined the debug function should be written to with debug info.
     */
    debug?:(...args:any[])=>void;
}

export interface ConvoExecuteResult
{
    scope:ConvoScope;
    value?:any;
    valuePromise?:Promise<any>
}

/**
 * A function that prints the args it is passed and returns the last arg.
 */
export type ConvoPrintFunction=(...args:any[])=>any;

export interface ConvoMetadata
{
    name?:string;
    comment?:string;
    tags?:ConvoTag[];
    properties?:Record<string,ConvoMetadata>;
}


export interface ConvoPipeTarget
{
    convoPipeSink(value:any):Promise<any>|any
}

export const isConvoPipeTarget=(value:any):value is ConvoPipeTarget=>{
    return (typeof (value as ConvoPipeTarget)?.convoPipeSink) === 'function';
}

export interface ConvoGlobal extends ConvoPipeTarget
{
    conversation?:Conversation;
    exe?:ConvoExecutionContext;
}

export interface ConvoTypeDef<T=any>
{
    name:string;
    type:ZodType<T>|JsonScheme;
}

export interface ConvoVarDef<T=any>
{
    name:string;
    value:T;
}

export interface ConvoFunctionDef<P=any,R=any>
{
    description?:string;
    name:string;
    local?:boolean;

    paramsType?:ZodType<P>;
    paramsJsonScheme?:JsonScheme;

    returnTypeName?:string;
    returnScheme?:ConvoTypeDef<P>;

    /**
     * Convo function body code
     */
    body?:string;

    callback?:(params:P)=>R;
    scopeCallback?:ConvoScopeFunction;

    disableAutoComplete?:boolean;

    /**
     * If true the function will only be registered and will not be added the to conversation code.
     * This is useful for defining library functions or functions that don't need to be tracked as
     * part of a conversation. Setting registerOnly will for the function to be local.
     */
    registerOnly?:boolean;
}

export interface ConvoDefItem<T=any,R=any>
{
    type?:ConvoTypeDef<T>;
    var?:ConvoVarDef<T>;
    fn?:ConvoFunctionDef<T,R>;

    /**
     * If true the item will be registered but its code will not be added to the conversation.
     */
    hidden?:boolean;

    types?:Record<string,ConvoTypeDef['type']>;
    vars?:Record<string,ConvoVarDef['value']>;
    fns?:Record<string,Omit<ConvoFunctionDef,'name'>|((params?:any)=>any)>;
}

export interface ConvoAppend
{
    text:string;
    messages:ConvoMessage[];
}

/**
 * Completes a flattened conversation. Flatten conversations are conversation where all template
 * variables have been applied and the conversation is ready to be passed to an LLM or other
 * service that will use the flatten view of the conversation.
 */
export type ConvoFlatCompletionCallback=(flat:FlatConvoConversation)=>Promise<ConvoCompletionMessage[]>|ConvoCompletionMessage[];


export interface ConvoTokenUsage
{
    inputTokens:number;
    outputTokens:number;
    tokenPrice:number;
}

export interface ConvoMessagePrefixOptions
{
    includeTokenUsage?:boolean;
    msg?:ConvoCompletionMessage;
}

export interface ConvoTransformResult
{
    inputTokens?:number;
    outputTokens?:number;
    tokenPrice?:number;
    selectedTransforms?:string[];
}

export interface FlattenConvoOptions
{
    /**
     * If true the flatten view of the conversation will be set as the current flatten version
     * @default task === "default"
     */
    setCurrent?:boolean;

    /**
     * The name of the current task being executed.
     * @default "default"
     */
    task?:string;

    discardTemplates?:boolean;

    threadFilter?:ConvoThreadFilter;

    toolChoice?:ConvoToolChoice;

    /**
     * Overrides the messages of the conversation
     */
    messages?:ConvoMessage[];

    initFlatMessages?:FlatConvoMessage[];

    flatMessages?:FlatConvoMessage[];

    excludeMessages?:ConvoMessage[];
    excludeMessageSetters?:ConvoMessage[];

    /**
     * A message index in the messages array of the Conversation object at where edge messages with
     * be force to be flattened instead of waiting till all other messages have been processed.
     * This is used by function call responses to not see edge state early.
     */
    edgeStopIndex?:number;

    disableTransforms?:boolean;

    messageStartIndex?:number;
}

export interface ConvoSubTask
{
    name:string;
    promise:Promise<ConvoCompletion>;
}

export interface ConvoCompletionOptions
{
    task?:string;
    append?:string;

    /**
     * Output from an LLM and the input given to the LLM to produce the output.
     * The output structure should match the expected model of the conversation.
     */
    modelInputOutput?:ConvoModelInputOutputPair;

    /**
     * If true completion should stop and return just before a function is to be called
     */
    returnOnCall?:boolean;

    /**
     * If true completion should stop and return after a function is called before sending a response
     * to the LLM
     */
    returnOnCalled?:boolean;

    threadFilter?:ConvoThreadFilter;

    /**
     * If defined the token usage will be added to the defined usage.
     */
    usage?:ConvoTokenUsage;

    debug?:boolean;

    toolChoice?:ConvoToolChoice;
}

export interface ConvoMessageTemplate
{
    message:ConvoMessage;
    name?:string;
    watchPath?:string;
    matchValue?:string
    startValue?:any;
}

export interface CloneConversationOptions
{
    systemOnly?:boolean;
    noFunctions?:boolean;
    cloneConvoString?:boolean;
    removeAgents?:boolean;
    last?:number;
    dropLast?:number;
    dropUntilContent?:boolean;
    empty?:boolean;
    triggerName?:string;
    inlinePrompt?:InlineConvoPrompt;
}

export interface AppendConvoMessageObjOptions
{
    /**
     * If the the conversation will not be automatically flattened.
     */
    disableAutoFlatten?:boolean;

    /**
     * If true the source for appending the message objects will be generated from converting the
     * message object to text.
     */
    appendCode?:boolean;

    /**
     * The source fo the objects to be appended. `source` will override `appendCode`
     */
    source?:string;
}

export interface AppendConvoOptions
{
    mergeWithPrev?:boolean;
    throwOnError?:boolean;
    disableAutoFlatten?:boolean;
    addTags?:ConvoTag[];
    /**
     * Will be assigned to all appended messages
     */
    filePath?:string;
}

export interface ConvoImportContext
{
    /**
     * The file path of the current convo file
     */
    sourceFilepath?:string;
}

export interface ConvoImport extends ConvoImportContext
{
    name:string;
    /**
     * Modifiers of the import statement. Modifiers are defined as part of an import using a bang (!)
     * before the modifiers name.
     * @example \@import teaching-agent !system
     */
    modifiers:string[];

    /**
     * If true only system messages should be imported.
     */
    system:boolean;

    /**
     * If true content messages should not be imported.
     */
    ignoreContent:boolean;

    /**
     * The directory of the current convo file
     */
    sourceDirectory?:string;
}

export interface ConvoModule
{
    name:string;

    /**
     * Source URI where the module was imported from
     */
    uri?:string;

    /**
     * Convo to be inserted before the import
     */
    convo?:string;

    /**
     * A type or set of types that will be converted to a convo type and imported
     */
    type?:ConvoTypeDef|ConvoTypeDef[];

    /**
     * Zod schemes that map to type defined in the convo property
     */
    typeSchemes?:Record<string,ZodType>;

    /**
     * extern functions to be added to the conversation
     */
    externFunctions?:Record<string,AnyFunction>;

    /**
     * extern functions to be added to the conversation
     */
    externScopeFunctions?:Record<string,ConvoScopeFunction>;

    functionParamSchemes?:Record<string,ZodType[]>;

    /**
     * components to be added to the conversation
     */
    components?:Record<string,ConvoComponentDef>;

    /**
     * The file path of module
     */
    filePath?:string;
}

export type ConvoImportHandler=(_import:ConvoImport)=>ConvoModule|ConvoModule[]|null|undefined|Promise<ConvoModule|ConvoModule[]|null|undefined>;



export interface ConvoParsingOptions extends CodeParsingOptions
{
    includeLineNumbers?:boolean;
    logErrors?:boolean;
}

export interface InlineConvoParsingOptions extends ConvoParsingOptions
{
    includeLineNumbers?:boolean;
    isStatic?:boolean;
    applyToStatement?:boolean;
}

export interface ParsedContentJsonOrString
{
    value:any;
    isJson:boolean;
}

export interface ConvoModelAlias
{
    /**
     * Name can contain wildcards (*).
     */
    name?:string;
    pattern?:string|RegExp;
    patternFlags?:string;
    /**
     * Used when picking between multiple models with matching names or aliases
     */
    priority?:number;
}

export type ConvoModelCapability='text'|'image'|'audio'|'video'|'embedding';
export interface ConvoModelInfo
{
    /**
     * The full name of the model. This will often include a vendor prefix. Use the `aliases` property
     * to define shorter alias names or matching patters
     */
    name:string;

    /**
     * If true the models name will match more specific model names if the more specific model name
     * starts with the value of the name property.
     */
    matchNameStart?:boolean;

    /**
     * Used when picking between multiple models with matching names or aliases
     */
    priority?:number;
    aliases?:ConvoModelAlias[];
    /**
     * If true the model is the default for it's completion service
     */
    isServiceDefault?:boolean;
    version?:string;
    description?:string;
    contextWindowSize?:number;
    inputCapabilities?:ConvoModelCapability[];
    outputCapabilities?:ConvoModelCapability[];
    inputTokenPriceUsd?:number;
    outputTokenPriceUsd?:number;
    inputAudioTokenPriceUsd?:number;
    outputAudioTokenPriceUsd?:number;
    inputVideoTokenPriceUsd?:number;
    outputVideoTokenPriceUsd?:number;
    inputMinutePriceUsd?:number;
    outputMinutePriceUsd?:number;
    outputDimension?:number;
    imagePriceUsd?:number;
    imageLgPriceUsd?:number;
    imageHdPriceUsd?:number;
    imageLgHdPriceUsd?:number;

    supportsChat?:boolean;

    /**
     * If true the model natively support function calling
     */
    supportsFunctionCalling?:boolean;

    /**
     * If true a hidden "respondWithText" function will be added to the list of functions for the
     * model when functions are being used. This allows models that always response with a function
     * call to response with text. When the respondWithText function is called the call with be
     * treated as a text response.
     */
    enableRespondWithTextFunction?:boolean;

    /**
     * Source convo code used in place of default when enableRespondWithTextFunction is true
     */
    respondWithTextFunctionSource?:string;

    noSystemMessageSupport?:boolean;

    supportsJsonMode?:boolean;

    /**
     * If true functions set to the LLM converter will be pre filtered to match user tool choice.
     */
    filterToolChoice?:boolean;

    /**
     * If defined the model requires that the first message in a conversation be of the specified role.
     * For example some models require the first message to be a "user" message. If a conversation
     * starts with a message with a different role then a message with the specified role will
     * automatically be inserted at the start of the conversation. Use the `requiredFirstMessageRoleContent`
     * property to control the content of the message inserted.
     */
    requiredFirstMessageRole?:string;

    /**
     * Used with `requiredFirstMessageRole` to set the content of the first role required message
     * @default "You can start the conversation"
     */
    requiredFirstMessageRoleContent?:string;

    /**
     * List of roles used to determine if a role required message should be inserted at the start
     * of the conversation.
     * @default ["assistant","user"]
     */
    requiredFirstMessageRoleList?:string[];

    /**
     * If true all functions should be disabled when json mode is enabled. This can prevent models
     * that always try calling functions from calling a function instead of return json.
     */
    jsonModeDisableFunctions?:boolean;

    /**
     * If true no JSON instructions will be added to JSON mode messages.
     */
    jsonModeDisableInstructions?:boolean;

    /**
     * JSON mode instructions that will override the default instructions
     */
    jsonModeInstructions?:string;


    /**
     * JSON instructions added before the default JSON instructions
     */
    jsonModeInstructionsPrefix?:string;

    /**
     * JSON instructions added after the default JSON instructions
     */
    jsonModeInstructionsSuffix?:string;

    /**
     * If true JSON instructions will include instructions to wrap return JSON in a markdown code
     * block and to not include any pre or post-amble
     */
    jsonModeInstructWrapInCodeBlock?:boolean;

    /**
     * If true JSON mode will be implemented using a `respondWithJSON` function. When a message
     * is using JSON mode and jsonImplementAsFunction is true the only function that will be
     * exposed to the LLM will be the `responseWithJSON` function.
     */
    jsonModeImplementAsFunction?:boolean;

    /**
     * Convo source code that will override the default source code of the responseWithJSON function.
     * The value `__TYPE__` will be replaced with the type in convo format that should be
     * responded with.
     */
    respondWithJSONFunctionSource?:string;
}

export type ConvoStartOfConversationCallback=()=>string|ConvoMessage[]|undefined|null;

export interface ConvoConversationCache{
    cacheType:string;
    getCachedResponse?:(flat:FlatConvoConversation)=>ConvoCompletionMessage[]|null|undefined|Promise<ConvoCompletionMessage[]|null|undefined>;
    cachedResponse?:(flat:FlatConvoConversation,messages:ConvoCompletionMessage[])=>void|Promise<void>;
}

export interface ParallelConvoTrimResult
{
    convo:string;
    messages:string[];
}

export interface ConvoTask
{
    name:string;
    progress?:Progress;
    documentUrl?:string;
    delayMs?:number;
}

export interface ConvoInsert
{
    label:string;
    before:boolean;
}

export type BeforeCreateConversationExeCtx=(conversation:Conversation)=>void;

export interface ConvoRoomState
{
    readonly conversations:Conversation[];
    readonly lookup:Record<string,Conversation>;
}

export interface ConvoAgentDef
{
    name:string;
    description?:string;
    main:ConvoMessage;
    capabilities:string[];
    functions:ConvoMessage[];
}

export interface SimulatedConvoFunctionCall
{
    functionName:string;
    parameters:Record<string,any>;
}

export interface ConvoHttpToInputRequest
{
    flat:FlatConvoConversationBase;
    inputType?:string;
}

export const allConvoMessageModification=['replace','replaceForModel','append','prepend','prefix','suffix'] as const;

export const allConvoMessageModificationAction=[...allConvoMessageModification,'respond'] as const;

/**
 * Defines type type of modification that can be made to message using modification messages
 * - replace: Replaces the content of a message.
 * - replaceForModel: Replaces the content of a message but only for the LLM. User will see the original content.
 * - append: Appends text to the content of a message that is visible to the user.
 * - prepend: Prepends text to the content of a message that is visible to the user.
 * - prefix: Adds text to the prefix of a message that is not visible to the user.
 * - suffix: Adds text to the suffix of a message that is not visible to the user.
 * - respond: Responds to the current evaluating message
 */
export type ConvoMessageModification=typeof allConvoMessageModification[number];
export const isConvoMessageModification=(value:any):value is ConvoMessageModification=>allConvoMessageModification.includes(value);

/**
 * Defines how a message should be modified. Values are the same as ConvoMessageModification
 * excluding the response value.
 */
export type ConvoMessageModificationAction=typeof allConvoMessageModificationAction[number];
export const isConvoMessageModificationAction=(value:any):value is ConvoMessageModificationAction=>allConvoMessageModificationAction.includes(value);

/**
 * Defines a trigger that should call a function based on eventName, condition and role
 */
export interface ConvoTrigger
{
    eventName:string;

    /** The message role that triggers this function call */
    role?:string;

    /** The name of the function to call when triggered */
    fnName:string;

    /** Optional condition that must be true for the trigger to fire */
    condition?:ConvoStatement[];
}

export interface ConvoMessageTriggerEvent
{
    message:FlatConvoMessage|ConvoCompletionMessage;
    trigger:ConvoTrigger;
    content:string;
    isUser:boolean;
    isAssistant:boolean;
}

export interface ConvoModelInputOutputPair
{
    input:any;
    output:any;
}


