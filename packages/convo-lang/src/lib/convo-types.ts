import { CodeParsingResult, JsonScheme, MarkdownLine } from '@iyio/common';
import type { ZodObject, ZodType } from 'zod';
import type { Conversation } from "./Conversation";
import type { ConvoExecutionContext } from './ConvoExecutionContext';

export type ConvoMessageType='text'|'function';

export const convoValueConstants=['true','false','null','undefined'] as const;
export type ConvoValueConstant=(typeof convoValueConstants)[number];

export const convoNonFuncKeywords=['in'] as const;
export type ConvoNonFuncKeyword=(typeof convoNonFuncKeywords)[number];

export const convoReservedRoles=['call','do','result','define','debug','end'] as const;
export type ConvoReservedRole=(typeof convoReservedRoles)[number];


export const convoObjFlag='**convo**'

export interface ConvoTag
{
    name:string;
    value?:string;
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

export interface ConvoErrorReferences
{
    message?:ConvoMessage;
    fn?:ConvoFunction;
    statement?:ConvoStatement;
    statements?:ConvoStatement[];
    completion?:ConvoCompletionMessage;
    baseType?:ConvoBaseType;
}

export const allConvoCapabilityAry=['vision'] as const;
export type ConvoCapability=typeof allConvoCapabilityAry[number];
export const isConvoCapability=(value:any):value is ConvoCapability=>allConvoCapabilityAry.includes(value);

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
    tags?:ConvoTag[];
    markdown?:MarkdownLine[];

    /**
     * The target render area of the message.
     */
    renderTarget?:string;

    /**
     * A variable to assign the content or jsonValue of the message to
     */
    assignTo?:string;

    /**
     * The value of the message parsed as json
     */
    jsonValue?:any;

    /**
     * If the message has the `@component` tag the message will be marked as a component. If component
     * equals true then the component is an unnamed component. Components are by default cause the
     * message to be renderOnly
     */
    component?:string|boolean;

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
}

export const baseConvoToolChoice=['none','auto','required'] as const;
export type ConvoToolChoice=(typeof baseConvoToolChoice[number])|{name:string};

export interface ConvoMessagePart
{
    id?:string;
    content?:string;
    hidden?:boolean;
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
     * Name of a type variable that the function returns. If undefined the function
     * can return any type.
     */
    returnType?:string;

    /**
     * If true the function is a local statement that should only be called by other functions in the
     * current convo script
     */
    local:boolean;
    /**
     * If true it has been requested that the function be called.
     */
    call:boolean;

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

export const convoFlowControllerKey=Symbol('convoFlowControllerKey')
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

export const convoBaseTypes=['string','number','int','boolean','time','void','any','map','array'] as const;
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

    content?:string;

    /**
     * A function that can be called
     */
    fn?:ConvoFunction;
    /**
     * Params type of the function that can be called
     */
    fnParams?:ZodObject<any>;

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

    responseEndpoint?:string;

    responseFormat?:string;
    responseFormatTypeName?:string;
    responseFormatIsArray?:boolean;
    responseAssignTo?:string;

    task?:string;

    /**
     * If the message has the `@component` tag the message will be marked as a component. If component
     * equals true then the component is an unnamed component.
     */
    component?:string|boolean;

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

export interface ConvoCompletionService
{
    completeConvoAsync(flat:FlatConvoConversation):Promise<ConvoCompletionMessage[]>;
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

export interface FlatConvoConversation
{
    exe:ConvoExecutionContext;
    vars:Record<string,any>
    messages:FlatConvoMessage[];
    conversation:Conversation;
    capabilities:ConvoCapability[];
    task:string;
    /**
     * Maps task triggers to tasks.
     * triggerName -> task array
     */
    taskTriggers?:Record<string,string[]>;

    templates?:ConvoMessageTemplate[];

    markdownVars:Record<string,ConvoMarkdownLine|string>;

    /**
     * If defined the debug function should be written to with debug info.
     */
    debug?:(...args:any[])=>void;

    ragMode?:ConvoRagMode;
    ragPrefix?:string;
    ragSuffix?:string;

    toolChoice?:ConvoToolChoice;
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
}

export interface ConvoDocumentReference
{
    content:string;

    sourceId?:string;
    sourceName?:string;
    sourceUrl?:string;
}

export interface ConvoRagContext
{
    params:Record<string,any>;
    tolerance:number;
    lastMessage:FlatConvoMessage;
    flat:FlatConvoConversation;
    conversation:Conversation;
}

export type ConvoRagCallback=(
    ragContext:ConvoRagContext
)=>ConvoDocumentReference|null|Promise<ConvoDocumentReference|null>;

export interface AppendConvoMessageObjOptions
{
    disableAutoFlatten?:boolean;
    appendCode?:boolean;
}

export interface ConvoImport
{
    name:string;
}

export interface ConvoImportResult
{
    name:string;
    /**
     * Convo to be inserted before the import
     */
    convo?:string;


    /**
     * A type or set of types that will be converted to a convo type and imported
     */
    type?:ConvoTypeDef|ConvoTypeDef[];
}

export type ConvoImportHandler=(_import:ConvoImport)=>ConvoImportResult|null|undefined|Promise<ConvoImportResult|null|undefined>;

export interface ConvoComponentMessageState
{
    last:FlatConvoMessage;
    all:FlatConvoMessage[];
    flat:FlatConvoConversation;
    convo:Conversation;
}

export type ConvoComponentMessagesCallback=(state:ConvoComponentMessageState)=>void;
