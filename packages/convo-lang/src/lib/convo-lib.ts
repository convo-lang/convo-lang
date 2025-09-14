import { UnsupportedError, asArray, dupDeleteUndefined, getObjKeyCount, getValueByPath, parseBoolean, parseRegexCached, starStringTestCached, zodTypeToJsonScheme } from "@iyio/common";
import { parseJson5 } from '@iyio/json5';
import { format } from "date-fns";
import { ZodObject } from "zod";
import type { ConversationOptions } from "./Conversation.js";
import { ConvoError } from "./ConvoError.js";
import { ConvoExecutionContext } from "./ConvoExecutionContext.js";
import { ConvoDocumentReference } from "./convo-rag-types.js";
import { convoSystemMessages } from "./convo-system-messages.js";
import { ConvoBaseType, ConvoCompletion, ConvoCompletionMessage, ConvoCompletionService, ConvoFlowController, ConvoFunction, ConvoMessage, ConvoMessageModificationAction, ConvoMessageTemplate, ConvoMetadata, ConvoModelAlias, ConvoModelInfo, ConvoPrintFunction, ConvoScope, ConvoScopeError, ConvoScopeFunction, ConvoStatement, ConvoTag, ConvoThreadFilter, ConvoTokenUsage, ConvoType, FlatConvoConversation, FlatConvoConversationBase, FlatConvoMessage, OptionalConvoValue, ParsedContentJsonOrString, StandardConvoSystemMessage, convoFlowControllerKey, convoObjFlag, convoScopeFunctionMarker } from "./convo-types.js";

export const convoBodyFnName='__body';
export const convoArgsName='__args';
export const convoResultReturnName='__return';
export const convoResultErrorName='__error';
export const convoDisableAutoCompleteName='__disableAutoComplete';
export const convoStructFnName='struct';
export const convoNewFnName='new';
export const convoMapFnName='map';
export const convoArrayFnName='array';
export const convoJsonMapFnName='jsonMap';
export const convoJsonArrayFnName='jsonArray';
export const convoSwitchFnName='switch';
export const convoCaseFnName='case';
export const convoDefaultFnName='default';
export const convoTestFnName='test';
export const convoPipeFnName='pipe';
export const convoLocalFunctionModifier='local';
export const convoExternFunctionModifier='extern';
export const convoCallFunctionModifier='call';
export const convoInvokeFunctionModifier='invoke';
export const convoInvokeFunctionName='invoke';
export const convoGlobalRef='convo';
export const convoEnumFnName='enum';
export const convoMetadataKey=Symbol('convoMetadataKey');
export const convoCaptureMetadataTag='captureMetadata';
export const defaultConversationName='default';

export const convoMsgModifiers={
    /**
     * When applied to the function the function is used as the default function of an agent
     */
    agent:'agent',
} as const;

export const convoScopedModifiers=[convoMsgModifiers.agent]

export const defaultConvoTask='default';

export const convoAnyModelName='__any__';

export const convoRagTemplatePlaceholder='$$RAG$$';

export const convoRoles={
    user:'user',
    assistant:'assistant',
    system:'system',

    /**
     * Used to add a prefix to the previous content message. Prefixes are not seen by the user.
     */
    prefix:'prefix',

    /**
     * Used to add a suffix to the previous content message. Suffixes are not seen by the user.
     */
    suffix:'suffix',

    /**
     * Appends content to the previous content message
     */
    append:'append',

    /**
     * Appends content to the last system message
     */
    appendSystem:'appendSystem',

    /**
     * Appends content to the last user message
     */
    appendUser:'appendUser',

    /**
     * Appends content to the last assistant message
     */
    appendAssistant:'appendAssistant',

    /**
     * Prepends content to the previous content message
     */
    prepend:'prepend',

    /**
     * Used to replace the content of the previous content message
     */
    replace:'replace',

    /**
     * Used to replace the content of the previous content message before sending to an LLM. The
     * user will continue to see the previous content message.
     */
    replaceForModel:'replaceForModel',

    /**
     * Used to display message evaluated by inline / thinking prompts
     */
    thinking:'thinking',

    /**
     * Used to set variables set within inline / thinking prompts
     */
    thinkingResult:'thinkingResult',

    /**
     * Contains RAG content
     */
    rag:'rag',

    /**
     * Used to define a prefix to add to rag messages
     */
    ragPrefix:'ragPrefix',

    /**
     * Used to define a suffix to add to rag messages
     */
    ragSuffix:'ragSuffix',

    /**
     * A message used as a template to insert RAG content into. The value __RAG__ will be used replaced with the actual rag content
     */
    ragTemplate:'ragTemplate',

    /**
     * importTemplate messages are used to format imported content such as markdown.
     */
    importTemplate:'importTemplate',

    /**
     * When encountered a conversation will executed the preceding message before continuing unless
     * preceded by a flushed message.
     */
    queue:'queue',

    /**
     * signals a queue has been flushed
     */
    flush:'flush',

    /**
     * Starts an insertion block. Insertion blocks are used to reorder messages in a flattened conversation.
     */
    insert:'insert',

    /**
     * Ends an insertion block.
     */
    insertEnd:'insertEnd',

    /**
     * No op role. Messages with this role are completely ignored
     */
    nop:'nop',

    /**
     * Used to track transform results including tokens used by transforms
     */
    transformResult:'transformResult',

    /**
     * Starts a parallel execution block
     */
    parallel:'parallel',

    /**
     * Ends a parallel execution block
     */
    parallelEnd:'parallelEnd',

    /**
     * Ends the definition of an agent
     */
    agentEnd:'agentEnd',

    call:'call',
    do:'do',
    result:'result',
    define:'define',
    debug:'debug',
    end:'end',

    /**
     * Used by the convo make build system to define a make target. `std://make.convo` must
     * be imported to function correctly
     */
    target:'target',

    /**
     * Used by the convo make build system to define target defaults and configure build options
     */
    make:'make',

    /**
     * Used by the convo make build system to define an app. `std://make.convo` must
     * be imported to function correctly
     */
    app:'app',

    /**
     * Used by the convo make build system to define a build stage. `std://make.convo` must
     * be imported to function correctly
     */
    stage:'stage',
} as const;

/**
 * List of built-in role that are allowed to be used with custom message handlers
 */
export const convoHandlerAllowedRoles=[
    convoRoles.make,
    convoRoles.target,
    convoRoles.app,
    convoRoles.stage,
] as const;

/**
 * Reserved role names in Convo-Lang that have special meaning and cannot be used as custom roles.
 * These roles are used for system functionality like function calls, execution blocks, and debugging.
 */
export const convoReservedRoles=[
    convoRoles.call,
    convoRoles.do,
    convoRoles.result,
    convoRoles.define,
    convoRoles.debug,
    convoRoles.end,
    convoRoles.thinking
] as const;

export const convoFunctions={
    queryImage:'queryImage',

    getState:'getState',

    /**
     * When called __rag with be set to true and and params passed will be added the the __ragParams
     * array. If __ragParams is not an array it will be set to an array first. Duplicated values
     * will not be added to __ragParams.
     */
    enableRag:'enableRag',

    /**
     * Disables and clears all rag params
     */
    clearRag:'clearRag',

    /**
     * Defines a form that a user can be guided through
     */
    defineForm:'defineForm',

    today:'today',

    uuid:'uuid',
    shortUuid:'shortUuid',

    getVar:'getVar',

    setVar:'setVar',

    idx:'idx',

    describeScene:'describeScene',

    readDoc:'readDoc',

    /**
     * States the default value of a variable.
     */
    setDefault:'setDefault',

    /**
     * Returns an XML list of agents available to the current conversation.
     */
    getAgentList:'getAgentList',

    /**
     * Explicitly enables a transform by name
     */
    enableTransform:'enableTransform',

    /**
     * Explicitly enables all transforms
     */
    enableAllTransforms:'enableAllTransforms',

    /**
     * Pushes a conversation task on to the task stack. The task will be display in the UI
     * while a completion is in progress
     */
    pushConvoTask:'pushConvoTask',

    /**
     * Pops the last convo task off the stack
     */
    popConvoTask:'popConvoTask',

    /**
     * Reads a JSON value from the virtual file system
     */
    fsReadJson:'fsReadJson',

    /**
     * Reads a file from the virtual file system and returns it as a base64 string
     */
    fsReadBase64:'fsReadBase64',

    /**
     * Reads a file from the virtual file system and returns it as a base64 url. This function can
     * be used to read files as images or other assets that get embedded as base 64 urls.
     *
     * @signature (path:string contentType?:string) -> string
     *
     * @example This is an image: ![image description]({{fsReadBase64Url("./images/example.png")}})
     */
    fsReadBase64Url:'fsReadBase64Url',

    /**
     * Similar to fsReadBase64Url but returns an image formatted as markdown
     *
     * @signature (path:string description?:string contentType?:string) -> string
     */
    fsReadBase64Image:'fsReadBase64Image',

    /**
     * Writes a JSON value to the virtual file system and returns the written value.
     */
    fsWriteJson:'fsWriteJson',

    /**
     * Reads a string value from the virtual file system
     */
    fsRead:'fsRead',

    /**
     * Writes a string value to the virtual file system and returns the written value.
     */
    fsWrite:'fsWrite',

    /**
     * Delete a file or directory from the virtual file system
     */
    fsRemove:'fsRemove',

    /**
     * Creates a directory in the virtual file system
     */
    fsMkDir:'fsMkDir',

    /**
     * Checks if a path exists in the virtual file system
     */
    fsExists:'fsExists',

    /**
     * Reads directory items
     */
    fsReadDir:'fsReadDir',

    /**
     * Returns the full and normalized path for the given value.
     */
    fsFullPath:'fsFullPath',

    /**
     * Joins file paths
     */
    joinPaths:'joinPaths',

    /**
     * Returns true if all values passed to the function are undefined
     */
    isUndefined:'isUndefined',

    /**
     * Returns the passed in value as milliseconds
     */
    secondMs:'secondMs',

    /**
     * Returns the passed in value as milliseconds
     */
    minuteMs:'minuteMs',

    /**
     * Returns the passed in value as milliseconds
     */
    hourMs:'hourMs',

    /**
     * Returns the passed in value as milliseconds
     */
    dayMs:'dayMs',

    /**
     * Finds an item in an array using shallow comparison.
     */
    aryFindMatch:'aryFindMatch',

    /**
     * Removes the first matching item in an array using shallow comparison.
     */
    aryRemoveMatch:'aryRemoveMatch',

    /**
     * Used by the convo make build system to define target defaults and build options
     */
    makeDefaults:'makeDefaults',

    /**
     * Used by the convo make build system to define a output to make
     */
    makeTarget:'makeTarget',

    /**
     * Defines a make app
     */
    makeApp:'makeApp',

    /**
     * Defines a make stage
     */
    makeStage:'makeStage',

    /**
     * Similar to the map function except unlabeled values are place the the `_` property
     */
    mapWithCapture:'mapWithCapture'


} as const;

/**
 * reserved system variables
 */
export const convoVars={

    [convoResultReturnName]:convoResultReturnName,

    /**
     * Used to enabled prompt caching. A value of true will use the default prompt cached which
     * by default uses the `ConvoLocalStorageCache`. If assigned a string a cache with a matching
     * type will be used.
     */
    __cache:'__cache',

    /**
     * In environments that have access to the filesystem __cwd defines the current working directory.
     */
    __cwd:'__cwd',

    /**
     * Path to the main file that loaded the conversation
     */
    __mainFile:'__mainFile',

    /**
     * Path to the current convo file
     */
    __file:'__file',

    /**
     * When set to true debugging information will be added to conversations.
     */
    __debug:'__debug',

    /**
     * Sets the default model
     */
    __model:'__model',

    /**
     * Sets the default completion endpoint
     */
    __endpoint:'__endpoint',

    /**
     * Endpoint to a convo compatible endpoint
     */
    __convoEndpoint:'__convoEndpoint',

    /**
     * API key to send to completions endpoint. The `apiKey` of the `FlatConvoConversationBase` will
     * be populated by this variable if defined.
     */
    __apiKey:'__apiKey',

    /**
     * Sets the default user id of the conversation
     */
    __userId:'__userId',

    /**
     * When set to true time tracking will be enabled.
     */
    __trackTime:'__trackTime',

    /**
     * When set to true token usage tracking will be enabled.
     */
    __trackTokenUsage:'__trackTokenUsage',

    /**
     * When set to true the model used as a completion provider will be tracked.
     */
    __trackModel:'__trackModel',

    /**
     * When defined __visionSystemMessage will be injected into the system message of conversations
     * with vision capabilities. __visionSystemMessage will override the default vision
     * system message.
     */
    __visionSystemMessage:'__visionSystemMessage',

    /**
     * The default system message used for completing vision requests. Vision requests are typically
     * completed in a separate conversation that supports vision messages. By default the system
     * message of the conversation that triggered the vision request will be used.
     */
    __visionServiceSystemMessage:'__visionServiceSystemMessage',

    /**
     * Response used with the system is not able to generate a vision response.
     */
    __defaultVisionResponse:'__defaultVisionResponse',

    /**
     * A reference to markdown vars.
     */
    __md:'__md',

    /**
     * Enables retrieval augmented generation (RAG). The value of the __rag can either be true,
     * false or a number. The value indicates the number of rag results that should be sent to the
     * LLM by default all rag message will be sent to the LLM. When setting the number of rag
     * messages to a fixed number only the last N number of rag messages will be sent to the LLM.
     * Setting __rag to a fixed number can help to reduce prompt size.
     */
    __rag:'__rag',

    /**
     * An object that will be passed to the rag callback of a conversation. If the value is not an
     * object it is ignored.
     */
    __ragParams:'__ragParams',

    /**
     * The tolerance that determines if matched rag content should be included as contact.
     */
    __ragTol:'__ragTol',

    /**
     * Sets the current thread filter. Can either be a string or a ConvoThreadFilter. If __threadFilter
     * is a string it will be converted into a filter that looks like `{includeThreads:[__threadId]}`.
     */
    __threadFilter:'__threadFilter',

    /**
     * A reference to a SceneCtrl that is capable of describing the current scene the user is viewing.
     */
    __sceneCtrl:'__sceneCtrl',

    /**
     * The last described scene added to the conversation
     */
    __lastDescribedScene:'__lastDescribedScene',

    /**
     * Used by agents to define the voice they use
     */
    __voice:'__voice',

    /**
     * used to indicate that forms have been enabled
     */
    __formsEnabled:'__formsEnabled',

    /**
     * Default array of forms
     */
    __forms:'__forms',

    /**
     * Array of transforms names that have explicity been enabled. Transforms are enabled by default
     * unless they have the `transformOptional` tag applied. Adding "all" to the list will explicity
     * enable all components.
     */
    __explicitlyEnabledTransforms:'__explicitlyEnabledTransforms',

    /**
     * Name of the currently executing trigger
     */
    __trigger:'__trigger',

    /**
     * If true inline prompt messages should be written to debug output
     */
    __debugInline:'__debugInline',

    /**
     * Controls the penalty for repeated tokens in completions.
     */
    __frequencyPenalty:'__frequencyPenalty',

    /**
     * Controls the penalty for new tokens based on their presence in the text so far.
     */
    __presencePenalty:'__presencePenalty',

    /**
     * If set, requests log probabilities of generated tokens.
     */
    __logprobs:'__logprobs',

    /**
     * Sets the maximum number of tokens to generate in a completion.
     */
    __maxTokens:'__maxTokens',

    /**
     * Indicates the level of reasoning effort to apply.
     */
    __reasoningEffort:'__reasoningEffort',

    /**
     * Sets the random seed for reproducible completions.
     */
    __seed:'__seed',

    /**
     * Specifies the service tier to use for completions.
     */
    __serviceTier:'__serviceTier',

    /**
     * Controls the randomness of completions (temperature parameter).
     */
    __temperature:'__temperature',

    /**
     * Controls the nucleus sampling parameter for completions (top_p).
     */
    __topP:'__topP',

    /**
     * Requests the log probabilities for the top tokens.
     */
    __topLogprobs:'__topLogprobs',

    /**
     * Controls the verbosity of the model's response.
     */
    __responseVerbosity:'__responseVerbosity',

    /**
     * Allows biasing the likelihood of specific tokens.
     */
    __logitBias:'__logitBias',

    /**
     * Object containing additional parameters to pass to the LLM.
     */
    __modelParams:'__modelParams',

    /**
     * Array of ConvoMakeApp objects
     */
    __makeDefaults:'__makeDefaults',

    /**
     * Array of ConvoMakeTargetDeclaration objects
     */
    __makeTargets:'__makeTargets',

    /**
     * Array of ConvoMakeApp objects
     */
    __makeApps:'__makeApps',

    /**
     * Array of ConvoMakeStage objects
     */
    __makeStages:'__makeStages',

    /**
     * Maps custom messages to handler functions
     */
    __messageHandlers:'__messageHandlers',

    /**
     * Name of a type to be used as the default json response type
     */
    __defaultResponseType:'__defaultResponseType'

} as const;

export const convoImportModifiers={
    /**
     * Only system messages should be imported
     */
    system:'system',

    /**
     * Content messages should be ignored
     */
    ignoreContent:'ignoreContent',

    /**
     * Merges the contents of multiple files into a single imports. This is useful when importing
     * multiple content files using a glob.
     */
    merge:'merge'
} as const;

export const defaultConvoRagTol=1.2;

export const convoEvents={

    /**
     * Occurs when a user message is added to a conversation
     *
     * Functions listening to the `user` event will be called after user messages are
     * appended. The return value of the function will either replaces the content of the user
     * message or will be set as the messages prefix or suffix. If the function return false, null or
     * undefined it is ignored and the next function listening to the `user` event will be called.
     *
     * @usage (@)on user [replace|append|prepend|prefix|suffix] [condition]
     */
    user:'user',

    /**
     * Occurs when an assistant message is added to a conversation.
     *
     * Functions listening to the `assistant` event will be called after assistant messages are
     * appended. The return value of the function will either replaces the content of the assistant
     * message or will be set as the messages prefix or suffix. If the function return false, null or
     * undefined it is ignored and the next function listening to the `assistant` event will be called.
     *
     * @usage (@)on assistant [replace|append|prepend|prefix|suffix] [condition]
     */
    assistant:'assistant',
} as const;

export const convoTags={


    /**
     * When applied to a user message and the message is the last message in a conversation the message
     * is considered a conversation initializer.
     */
    init:'init',

    /**
     * Used to set the name of the message
     */
    name:'name',

    /**
     * Defines an event listener for a message. Functions tagged with `@on` will
     * be made local and not visible to LLMs.
     */
    on:'on',

    /**
     * Enable rag for a message. The value of the tag will be added as a rag path
     */
    ragForMsg:'ragForMsg',

    /**
     * Enables rag for the current conversation
     */
    rag:'rag',

    /**
     * Defines the start index and length of the actual rag content without prefix and suffix
     */
    ragContentRage:'ragContentRage',

    /**
     * Manually labels a message
     */
    label:'label',

    /**
     * Clears all content messages that precede the messages with the exception of system messages.
     * If the value of "system" is given as the tags value system message will also be cleared.
     */
    clear:'clear',

    /**
     * Prevents a message from being clear when followed by a message with a `@clear` tag applied.
     */
    noClear:'noClear',

    /**
     * Enables caching for the message the tag is applied to. No value of a value of true will use
     * the default prompt cached which by default uses the `ConvoLocalStorageCache`. If assigned
     * a string a cache with a matching type will be used.
     */
    cache:'cache',

    /**
     * Controls the penalty for repeated tokens in completions for the message the tag is applied to.
     */
    frequencyPenalty:'frequencyPenalty',

    /**
     * Controls the penalty for new tokens based on their presence in the text so far for the message the tag is applied to.
     */
    presencePenalty:'presencePenalty',

    /**
     * If set, requests log probabilities of generated tokens for the message the tag is applied to.
     */
    logprobs:'logprobs',

    /**
     * Sets the maximum number of tokens to generate in a completion for the message the tag is applied to.
     */
    maxTokens:'maxTokens',

    /**
     * Indicates the level of reasoning effort to apply for the message the tag is applied to.
     */
    reasoningEffort:'reasoningEffort',

    /**
     * Sets the random seed for reproducible completions for the message the tag is applied to.
     */
    seed:'seed',

    /**
     * Specifies the service tier to use for completions for the message the tag is applied to.
     */
    serviceTier:'serviceTier',

    /**
     * Controls the randomness of completions (temperature parameter) for the message the tag is applied to.
     */
    temperature:'temperature',

    /**
     * Controls the nucleus sampling parameter for completions (top_p) for the message the tag is applied to.
     */
    topP:'topP',

    /**
     * Requests the log probabilities for the top tokens for the message the tag is applied to.
     */
    topLogprobs:'topLogprobs',

    /**
     * Controls the verbosity of the model's response for the message the tag is applied to.
     */
    responseVerbosity:'responseVerbosity',

    /**
     * Object containing additional parameters to pass to the LLM for the message the tag is applied to.
     */
    modelParams:'modelParams',

    /**
     * When applied to a function the return value of the function will not be used to generate a
     * new assistant message.
     */
    disableAutoComplete:'disableAutoComplete',

    /**
     * Disables triggers on the message the tag is applied to.
     */
    disableTriggers:'disableTriggers',

    /**
     * Forces a message to be included in triggers. If the tag defines a value the value will be used
     * to match which trigger the message is included in.
     */
    includeInTriggers:'includeInTriggers',

    /**
     * Excludes a message from being included in triggers. If the tag defines a value the value will
     * be used to match the trigger it is excluded from.
     */
    excludeFromTriggers:'excludeFromTriggers',

    /**
     * When applied to a content message the message will be appended to the conversation after calling the
     * function specified by the tag's value. When applied to a function message the content of the
     * tag will be appended as a user message.
     */
    afterCall:'afterCall',

    /**
     * When used with the `afterCall` tag the appended message will be hidden from the user but
     * visible to the LLM
     */
    afterCallHide:'afterCallHide',

    /**
     * When used with the `afterCall` tag the appended message will use the given role
     */
    afterCallRole:'afterCallRole',

    /**
     * Indicates a message was created by a afterCall tag
     */
    createdAfterCalling:'createdAfterCalling',

    /**
     * Used to indicate that a message should be evaluated at the edge of a conversation with the
     * latest state. (@)edge is most commonly used with system message to ensure that all injected values
     * are updated with the latest state of the conversation.
     */
    edge:'edge',

    /**
     * Used to track the time messages are created.
     */
    time:'time',

    /**
     * Used to track the number of tokens a message used
     */
    tokenUsage:'tokenUsage',

    /**
     * Used to track the model used to generate completions
     */
    model:'model',

    /**
     * Sets the requested model to complete a message with
     */
    responseModel:'responseModel',

    /**
     * Used to track the endpoint to generate completions
     */
    endpoint:'endpoint',

    /**
     * Sets the requested endpoint to complete a message with
     */
    responseEndpoint:'responseEndpoint',

    /**
     * Sets the format as message should be responded to with.
     */
    responseFormat:'responseFormat',

    /**
     * Causes the response of the tagged message to be assigned to a variable
     */
    assign:'assign',

    /**
     * When used with a message the json tag is short and for `@responseFormat json`
     */
    json:'json',

    /**
     * The format of a message
     */
    format:'format',

    /**
     * Used to assign the content or jsonValue of a message to a variable
     */
    assignTo:'assignTo',

    /**
     * Used to enable capabilities. Only the first and last message in the conversation are used
     * to determine current capabilities. Multiple capability tags can be
     * applied to a message and multiple capabilities can be specified by separating them with a
     * comma.
     */
    capability:'capability',

    /**
     * Shorthand for `@capability vision`
     * Enables vision for all messages in a conversation
     */
    enableVision:'enableVision',

    /**
     * Shorthand for `@capability visionFunction`
     * The visionFunction capability adds vision support by passing vision messages to a vision model
     * and exposing vision capabilities as a function.
     */
    enabledVisionFunction:'enabledVisionFunction',

    /**
     * Enables vision for the message the tag is applied to
     */
    vision:'vision',

    /**
     * Sets the task a message is part of. By default messages are part of the "default" task
     */
    task:'task',

    /**
     * Can be used by functions to display a task message while the function is executing.
     */
    taskName:'taskName',

    /**
     * Can be used by functions to display a task message while the function is executing.
     */
    taskDescription:'taskDescription',

    /**
     * Sets the max number of non-system messages that should be included in a task completion
     */
    maxTaskMessageCount:'maxTaskMessageCount',

    /**
     * Defines what triggers a task
     */
    taskTrigger:'taskTrigger',

    /**
     * Defines a message as a template
     */
    template:'template',

    /**
     * used to track the name of templates used to generate messages
     */
    sourceTemplate:'sourceTemplate',

    /**
     * Used to mark a message as a component. The value can be "render" or "input". The default
     * value is "render" if no value is given. When the "input" value is used the rendered component
     * will take input from a user then write the input received to the executing conversation.
     */
    component:'component',

    /**
     * When applied to a message the message should be rendered but not sent to LLMs
     */
    renderOnly:'renderOnly',

    /**
     * Controls where a message is rendered. By default messages are rendered in the default chat
     * view, but applications can define different render targets.
     */
    renderTarget:'renderTarget',

    /**
     * Sets the renderTarget of the message to "hidden"
     */
    hidden:'hidden',

    toolId:'toolId',

    /**
     * When applied to the last content or component messages auto scrolling will be disabled
     */
    disableAutoScroll:'disableAutoScroll',

    /**
     * When applied to a message the content of the message will be parsed as markdown
     */
    markdown:'markdown',

    /**
     * When applied to a message the content of the message will be parsed as markdown and the
     * elements of the markdown will be auto assigned to vars
     */
    markdownVars:'markdownVars',

    /**
     * When applied to a message the message is conditionally added to the flattened view of a
     * conversation. When the condition is false the message will not be visible to the user
     * or the LLM.
     *
     * @note The example below uses (@) instead of the at symbol because of a limitation of jsdoc.
     *
     * The example below will only render and send the second system message to the LLM
     * @example
     *
     * ``` convo
     * > define
     * animal = 'dog'
     *
     * (@)condition animal frog
     * > system
     * You are a frog and you like to hop around.
     *
     * (@)condition animal dog
     * > system
     * You are a dog and you like to eat dirt.
     * ```
     */
    condition:'condition',

    /**
     * When applied to a message the message is completely disregarded and removed from the conversation
     */
    disabled:'disabled',

    /**
     * A URL to the source of the message. Typically used with RAG.
     */
    sourceUrl:'sourceUrl',

    /**
     * The ID of the source content of the message. Typically used with RAG.
     */
    sourceId:'sourceId',

    /**
     * The name of the source content of the message. Typically used with RAG.
     */
    sourceName:'sourceName',

    /**
     * When applied to a message the message becomes a clickable suggestion that when clicked will
     * add a new user message with the content of the message. If the suggestion tag defines a value
     * that value will be displayed on the clickable button instead of the message content but the
     * message content will still be used as the user messaged added to the conversation when clicked.
     * Suggestion message are render only and not seen by LLMs.
     */
    suggestion:'suggestion',

    /**
     * A title display above a group of suggestions
     */
    suggestionTitle:'suggestionTitle',

    /**
     * Sets the threadId of the current message and all following messages. Using the `@thread` tag
     * without a value will clear the current thread id.
     */
    thread:'thread',

    /**
     * Used to mark a function as a node output.
     */
    output:'output',

    /**
     * Used to mark a function as an error callback
     */
    errorCallback:'errorCallback',

    /**
     * Used to import external convo script code
     */
    import:'import',

    /**
     * Matches an import by path. The match value can use wild cards are be a regular expression.
     * Regular expressions start with a (!) followed by a space then the regular expression pattern
     *
     * @example // By path
     * (@)importMatch ./company-policies.md
     *
     * @example // wildcard
     * (@)importMatch *policies.md
     *
     * @example // regular expression
     * (@)importMatch ! policies\.(md|mdx)$
     */
    importMatch:'importMatch',

    importRole:'importRole',

    /**
     * Causes a message to be concatenated with the previous message. Both the message the tag
     * is attached to and the previous message must be content messages or the tag is ignored.
     * When a message is concatenated to another message all other tags except the condition
     * tag are ignored.
     */
    concat:'concat',

    /**
     * Instructs the LLM to call the specified function. The values "none", "required", "auto" have
     * a special meaning. If no name is given the special "required" value is used.
     * - none: tells the LLM to not call any functions
     * - required: tells the LLM it must call a function, any function.
     * - auto: tells the LLM it can call a function respond with a text response. This is the default behaviour.
     */
    call:'call',

    /**
     * Causes the message to be evaluated as code. The code should be contained in a markdown code block.
     */
    eval:'eval',

    /**
     * Id of the user that created the message
     */
    userId:'userId',

    /**
     * Causes all white space in a content message to be preserved. By define all content message
     * whitespace is preserved.
     */
    preSpace:'preSpace',

    /**
     * Indicates a message is the system message used to give an LLM instructions on how to use
     * agents
     */
    agentSystem:'agentSystem',

    /**
     * Defines capabilities for a message
     */
    cap:'cap',

    /**
     * Conversation ID
     */
    cid:'cid',

    /**
     * Adds a message to a transform group. Transform groups are used to transform assistant output.
     * The transform tags value can be the name of a type or empty. Transform groups are ran after all
     * text responses from the assistant. Transform messages are not added to the flattened conversation.
     */
    transform:'transform',

    /**
     * Sets the name of the transform group a message will be added to when the transform tag is used.
     */
    transformGroup:'transformGroup',

    /**
     * If present on a transform message the source message processed will be hidden from the user
     * but still visible to the LLM
     */
    transformHideSource:'transformHideSource',

    /**
     * Overrides `transformHideSource` and `transformRemoveSource`
     */
    transformKeepSource:'transformKeepSource',

    /**
     * If present on a transform message the source message processed will not be added to the
     * conversation
     */
    transformRemoveSource:'transformRemoveSource',

    /**
     * If present the transformed message has the `renderOnly` tag applied to it causing it to be
     * visible to the user but not the LLM.
     */
    transformRenderOnly:'transformRenderOnly',

    /**
     * A transform condition that will control if the component tag can be passed to the created message
     */
    transformComponentCondition:'transformComponentCondition',

    /**
     * Messages created by the transform will include the defined tag
     * @example (@)transformTag renderTarget sideBar
     */
    transformTag:'transformTag',

    /**
     * A shortcut tag combines the `transform`, `transformTag`, `transformRenderOnly`, `transformComponentCondition`
     * and `transformHideSource` tags to create a transform that renders a
     * component based on the data structure of a named
     * struct.
     * @usage (@)transformComponent [groupName] {componentName} {propType} [?[!] condition]
     *
     * Renders the CarView component after every assistant message. The transform is using the default transform group.
     * @example (@)transformComponent CarView CarProps
     *
     * Renders the CatPickerView component if the transformed message is a json object with the "type" key is set to cat.
     * The transform is in the CatPicker transform group.
     * @example (@)transformComponent CatPicker CatPickerView AnimalPrefs ? type cat
     *
     * Renders the AnimalsOtherThanPickerView component if the transformed message is a json object with the "type" key is NOT set to cat.
     * The transform is in the default transform group.
     * @example (@)transformComponent AnimalsOtherThanPickerView AnimalPrefs ?! type cat
     */
    transformComponent:'transformComponent',

    /**
     * Applied to messages created by a transform
     */
    createdByTransform:'createdByTransform',

    /**
     * When applied to a message the message will be included in all transform prompts. It is common
     * to apply includeInTransforms to system messages
     */
    includeInTransforms:'includeInTransforms',

    /**
     * Describes what the result of the transform is
     */
    transformDescription:'transformDescription',

    /**
     * If applied to a transform message it will not be passed through a filter prompt
     */
    transformRequired:'transformRequired',

    /**
     * When applied to a message the transform filter will be used to select which transforms to
     * to select. The default filter will list all transform groups and their descriptions to select
     * the best fitting transform for the assistants response
     */
    transformFilter:'transformFilter',

    /**
     * If applied to a transform message the transform must be explicity enabled applying the `enableTransform`
     * tag to another message or calling the enableTransform function.
     */
    transformOptional:'transformOptional',

    /**
     * Applied to transform output messages when overwritten by a transform with a higher priority
     */
    overwrittenByTransform:'overwrittenByTransform',

    /**
     * Explicitly enables a transform. Transforms are enabled by default unless the transform has
     * the `transformOptional` tag applied.
     */
    enableTransform:'enableTransform',

    /**
     * Defines a component to render a function result
     */
    renderer:'renderer',

    /**
     * Indicates a message is a standard system message. Standard system messages are used to
     * implement common patterns such as the moderator pattern.
     */
    stdSystem:'stdSystem',

    /**
     * Prevents a message from accepting modifiers and allows modifiers to flow through the message
     */
    disableModifiers:'disableModifiers',

    /**
     * Attached to a message to indicate the user has reached their limit of tokens
     */
    tokenLimit:'tokenLimit',

    router:'router',

    routeTo:'routeTo',

    routeFrom:'routeFrom',

    /**
     * Use to mark a function as a message handler. Functions tagged with `@messageHandler` will
     * be made local and not visible to LLMs.
     */
    messageHandler:'messageHandler',

    /**
     * Name of the prop that the head value of handles messages are passed to.
     * @default "name"
     */
    messageHandlerHeadProp:'messageHandlerHeadProp',

    /**
     * When applied to a message handler the handler will assume the location of the message
     * the handler is handling
     */
    assumeHandledMessageLocation:'assumeHandledMessageLocation',

} as const;

/**
 * Functions marked with tags defined in `localFunctionTags` will be marked as local and not visible
 * to LLMs.
 */
export const localFunctionTags:string[]=[
    convoTags.on,
    convoTags.messageHandler,
]

/**
 * Tags that are allowed to have dynamic expressions as the value when using the equals operator.
 * @example (@)condition = eq(name "Bob")
 */
export const convoDynamicTags:string[]=[
    convoTags.condition,
    convoTags.disabled,
    convoTags.taskName,
    convoTags.taskDescription,
    convoTags.json,
    convoTags.routeTo,
    convoTags.routeFrom,
];

/**
 * Tags whom have a dynamic expression will be evaluated as an anonymous type
 */
export const convoAnonTypeTags:string[]=[
    convoTags.json,
]

/**
 * Prefix used to define anonymous types
 */
export const convoAnonTypePrefix='AnonType_';

/**
 * JSDoc tags can be used in combination with the Convo-Lang CLI to import types, components and
 * functions from TypeScript.
 */
export const convoJsDocTags={
    /**
     * Marks a function or class as a convo component
     */
    convoComponent:'convoComponent',

    /**
     * When used with a component the source message that gets transform into the component should be
     * kept visible in the conversation
     */
    convoKeepSource:'convoKeepSource',

    /**
     * Used to ignore properties in a type
     */
    convoIgnore:'convoIgnore',

    /**
     * Marks a interface or type as a type to define in convo
     */
    convoType:'convoType',

    /**
     * Marks a function as a function to define in convo
     */
    convoFn:'convoFn',

    /**
     * Used with the convoFn tag to mark a function as local. When a function is local it is not
     * exposed to the LLM but can be called from convo scripts.
     */
    convoLocal:'convoLocal'

} as const;

export const convoTaskTriggers={
    /**
     * Triggers a text message is received. Function calls will to trigger.
     */
    onResponse:'onResponse'
} as const;

export const commonConvoCacheTypes={
    localStorage:'localStorage',
    memory:'memory',
    vfs:'vfs',
    userVfs:'userVfs',
}

/**
 * In the browser the default cache type is local storage and on the backend vfs is the default cache type.
 */
export const defaultConvoCacheType=globalThis.window?commonConvoCacheTypes.localStorage:commonConvoCacheTypes.vfs;

export const convoDateFormat="yyyy-MM-dd'T'HH:mm:ssxxx";

export const defaultConvoRenderTarget='default';

export const defaultConvoTransformGroup='default';

export const convoStdImportPrefix='std://';

export const getConvoDateString=(date:Date|number=new Date()):string=>{
    return format(date,convoDateFormat);
}

export const defaultConvoVisionSystemMessage=(
    'If the user references a markdown image without a '+
    'description or the description can not answer the user\'s question or '+
    `complete the user\`s request call the ${convoFunctions.queryImage} function. `+
    'Do not use the URL of the image to make any assumptions about the image.'
);

export const defaultConvoVisionResponse='Unable to answer or respond to questions or requests for the given image or images';

export const allowedConvoDefinitionFunctions=[
    convoNewFnName,
    convoStructFnName,
    convoMapFnName,
    convoFunctions.mapWithCapture,
    convoArrayFnName,
    convoEnumFnName,
    convoJsonMapFnName,
    convoJsonArrayFnName,
    convoFunctions.getState,
    convoFunctions.enableRag,
    convoFunctions.clearRag,
    convoFunctions.defineForm,
    convoFunctions.uuid,
    convoFunctions.shortUuid,
    convoFunctions.getVar,
    convoFunctions.setVar,
    convoFunctions.idx,
    convoFunctions.setDefault,
    convoFunctions.enableTransform,
    convoFunctions.enableAllTransforms,
    convoFunctions.isUndefined,
    convoFunctions.secondMs,
    convoFunctions.minuteMs,
    convoFunctions.hourMs,
    convoFunctions.dayMs,
    convoFunctions.aryFindMatch,
    convoFunctions.aryRemoveMatch,
    'print',
    'setObjDefaults',
    'is',
    'and',
    'or',
    'not',
    'eq',
    'gt',
    'gte',
    'lt',
    'lte',
    'isIn',
    'contains',
    'regexMatch',
    'starMatch',
    'deepCompare',
    'add',
    'sub',
    'mul',
    'div',
    'mod',
    'pow',
    'inc',
    'dec',
    'rand',
    'now',
    'dateTime',
    'encodeURI',
    'encodeURIComponent',

] as const;

export const passthroughConvoInputType='FlatConvoConversation';

export const passthroughConvoOutputType='ConvoCompletionMessageAry';


export const createOptionalConvoValue=(value:any):OptionalConvoValue=>{
    return {
        [convoObjFlag]:'optional',
        value,
    }
}

export const createConvoType=(typeDef:Omit<ConvoType,typeof convoObjFlag>):ConvoType=>{
    (typeDef as ConvoType)[convoObjFlag]='type';
    return typeDef as ConvoType;
}
export const createConvoBaseTypeDef=(type:ConvoBaseType):ConvoType=>{
    return {
        [convoObjFlag]:'type',
        type,
    }
}

export const makeAnyConvoType=<T>(type:ConvoBaseType,value:T):T=>{
    if(!value){
        return value;
    }
    (value as any)[convoObjFlag]='type';
    (value as any)['type']=type;
    return value;
}

interface CreateConvoScopeFunctionOverloads
{
    ():ConvoScopeFunction;
    (fn:ConvoScopeFunction):ConvoScopeFunction;
    (flowCtrl:ConvoFlowController,fn?:ConvoScopeFunction):ConvoScopeFunction;
}

export const createConvoScopeFunction:CreateConvoScopeFunctionOverloads=(
    fnOrCtrl?:ConvoFlowController|ConvoScopeFunction,
    fn?:ConvoScopeFunction
):ConvoScopeFunction=>{
    if(typeof fnOrCtrl === 'function'){
        (fnOrCtrl as any)[convoScopeFunctionMarker]=true;
        return fnOrCtrl;
    }
    if(!fn){
        fn=(scope)=>scope.paramValues?scope.paramValues[scope.paramValues.length-1]:undefined;
    }
    if(fnOrCtrl){
        (fn as any)[convoFlowControllerKey]=fnOrCtrl;
    }
    (fn as any)[convoScopeFunctionMarker]=true;
    return fn;
}

export const isConvoScopeFunction=(value:any):value is ConvoScopeFunction=>{
    return (value && value[convoScopeFunctionMarker])?true:false;
}

export const setConvoScopeError=(scope:ConvoScope|null|undefined,error:ConvoScopeError|string)=>{
    if(typeof error === 'string'){
        error={
            message:error,
            statement:scope?.s,
        }
    }
    if(!scope){
        throw error;
    }
    scope.error=error;
    if(scope.onError){
        const oe=scope.onError;
        delete scope.onError;
        delete scope.onComplete;
        for(let i=0;i<oe.length;i++){
            oe[i]?.(error);
        }
    }
}

const notWord=/\W/g;
const newline=/[\n\r]/g;
const multiTagReg=/^(\w+)__\d+$/;

export const convoTagMapToCode=(tagsMap:Record<string,string|undefined>,append='',tab=''):string=>{
    const out:string[]=[];
    for(const e in tagsMap){
        const v=tagsMap[e];
        const nameMatch=multiTagReg.exec(e);
        out.push(`${tab}@${(nameMatch?.[1]??e).replace(notWord,'_')}${v?' '+v.replace(newline,' '):''}`)
    }
    return out.join('\n')+append
}

export const containsConvoTag=(tags:ConvoTag[]|null|undefined,tagName:string):boolean=>{
    if(!tags){
        return false;
    }
    for(let i=0;i<tags.length;i++){
        if(tags[i]?.name===tagName){
            return true;
        }
    }
    return false;
}

export const getConvoTag=(tags:ConvoTag[]|null|undefined,tagName:string):ConvoTag|undefined=>{
    if(!tags){
        return undefined;
    }
    for(let i=0;i<tags.length;i++){
        const tag=tags[i];
        if(tag?.name===tagName){
            return tag;
        }
    }
    return undefined;
}

export const getConvoFnMessageByTag=(tag:string,messages:ConvoMessage[]|null|undefined,startIndex=0):ConvoMessage|undefined=>{
    if(!messages){
        return undefined;
    }
    for(let i=startIndex;i<messages.length;i++){
        const msg=messages[i];
        if(!msg || !msg.tags || !msg.fn || msg.fn.call){
            continue;
        }
        for(const t of msg.tags){
            if(t.name===tag){
                return msg;
            }
        }
    }
    return undefined;
}

export interface FindConvoMessageOptions
{
    tag?:string;
    tagValue?:string;
    role?:string;
    startIndex?:number;
}
export const findConvoMessage=(messages:ConvoMessage[]|null|undefined,{
    tag,
    tagValue,
    role,
    startIndex=0,
}:FindConvoMessageOptions):ConvoMessage|undefined=>{
    if(!messages){
        return undefined;
    }
    for(let i=startIndex;i<messages.length;i++){
        const msg=messages[i];
        if(!msg || !msg.tags || (role!==undefined && msg.role!==role)){
            continue;
        }
        if(tag!==undefined){
            for(const t of msg.tags){
                if( t.name===tag &&
                    (tagValue===undefined?true:t.value===tagValue)
                ){
                    return msg;
                }
            }
            continue;
        }

        return msg;
    }
    return undefined;
}

export const getConvoFnByTag=(tag:string,messages:ConvoMessage[]|null|undefined,startIndex=0):ConvoFunction|undefined=>{
    return getConvoFnMessageByTag(tag,messages,startIndex)?.fn;
}

export const convoTagsToMap=(tags:ConvoTag[],exe:ConvoExecutionContext):Record<string,string|undefined>=>{
    const map:Record<string,string|undefined>={};
    for(const t of tags){
        let name=t.name;
        if(name in map){
            let i=2;
            while(`${t.name}__${i}` in map){
                i++;
            }
            name=`${t.name}__${i}`;
        }

        if(t.statement){
            const values=exe.getTagStatementValue(t);
            let value:any;
            if(values.length===1){
                let value=values[0];
                if(value && typeof value === 'object'){
                    value=JSON.stringify(value);
                }
            }else{
                value=JSON.stringify(value);
            }
            if(value===false || value===null || value===undefined){
                map[name]=undefined;
            }else{
                map[name]=value+'';
            }
        }else{
            map[name]=t.value;
        }
    }
    return map;
}


export const mapToConvoTags=(map:Record<string,string|undefined>):ConvoTag[]=>{
    const tags:ConvoTag[]=[];
    for(const e in map){
        tags.push({
            name:e,
            value:map[e]
        })
    }
    return tags;
}

export const getFlatConvoTagValues=(name:string,tags:Record<string,string|undefined>|null|undefined):string[]=>{
    const values:string[]=[];
    if(!tags || !(name in tags)){
        return values;
    }
    values.push(tags[name]??'');
    let i=2;
    while(`${name}__${i}` in tags){
        i++;
        values.push(tags[`${name}__${i}`]??'');
    }
    return values;
}


const transformTagReg=/^\s*(\w+)(.*)/;
export const parseConvoTransformTag=(value:string):ConvoTag|undefined=>{
    const match=transformTagReg.exec(value);
    if(!match){
        return undefined;
    }
    return {
        name:match[1]??'',
        value:match[2]?.trim(),
    }
}

export const createConvoMetadataForStatement=(statement:ConvoStatement):ConvoMetadata=>{
    return {
        name:(
            (statement.set && !statement.setPath)?
                statement.set
            :statement.label?
                statement.label
            :
                undefined
        ),
        comment:statement.comment,
        tags:statement.tags,
    };
}

export const getConvoMetadata=(value:any):ConvoMetadata|undefined=>{
    return value?.[convoMetadataKey];
}

export const getConvoStructPropertyCount=(value:any):number=>{
    const metadata=getConvoMetadata(value);
    return metadata?.properties?getObjKeyCount(metadata.properties):0;
}

export const convoLabeledScopeFnParamsToObj=(
    scope:ConvoScope,
    fnParams:ConvoStatement[],
):Record<string,any>=>{
    return convoParamsToObj(scope,undefined,false,fnParams);
}

export const convoLabeledScopeParamsToObj=(
    scope:ConvoScope,
):Record<string,any>=>{
    return convoParamsToObj(scope,undefined,false);
}

export const convoParamsToObj=(
    scope:ConvoScope,
    unlabeledMap?:string[],
    unlabeledKey:string|boolean=true,
    fallbackFnParams?:ConvoStatement[]
):Record<string,any>=>{
    const obj:Record<string,any>={};
    const labels=scope.labels;
    let metadata:ConvoMetadata|undefined=undefined;
    if(scope.cm || (scope.s.tags && containsConvoTag(scope.s.tags,convoCaptureMetadataTag))){
        metadata=createConvoMetadataForStatement(scope.s);
        metadata.properties={};
        (obj as any)[convoMetadataKey]=metadata;
    }
    const labeled:number[]=[];
    let hasLabels=false;
    if(labels){
        for(const e in labels){
            hasLabels=true;
            const label=labels[e];
            if(label===undefined){
                continue;
            }
            const isOptional=typeof label === 'object'
            const index=isOptional?label.value:label;
            if(index!==undefined){
                labeled.push(index);
                const v=scope.paramValues?.[index]
                obj[e]=isOptional?createOptionalConvoValue(v):v;

                if(metadata?.properties && scope.s.params){
                    const propStatement=scope.s.params[index];
                    if(propStatement){
                        metadata.properties[e]={
                            name:e,
                            comment:propStatement.comment,
                            tags:propStatement.tags
                        }
                    }
                }

            }
        }
    }
    if(unlabeledKey){
        const values:any[]=[];
        if(scope.paramValues){
            for(let i=0;i<scope.paramValues.length;i++){
                if(!labeled.includes(i)){
                    values.push(scope.paramValues[i]);
                }
            }
        }
        obj[unlabeledKey===true?'_':unlabeledKey]=values;
        if(unlabeledMap){
            for(let i=0;i<unlabeledMap.length;i++){
                const key=unlabeledMap[i]??'';
                if(obj[key]===undefined){
                    obj[key]=values[i];
                }

            }
        }
    }else if(!hasLabels && fallbackFnParams && scope.paramValues){
        for(let i=0;i<fallbackFnParams.length;i++){
            const p=fallbackFnParams[i];
            const v=scope.paramValues[i];
            if(!p?.label || v===undefined){
                continue;
            }
            obj[p.label]=v;
        }
    }
    return obj;
}

export const isReservedConvoRole=(role:string)=>{
    return convoReservedRoles.includes(role as any);
}

export const isValidConvoRole=(role:string)=>{
    return /^\w+$/.test(role);
}

export const isValidConvoIdentifier=(role:string)=>{
    return /^[a-z]\w*$/.test(role);
}

export const formatConvoMessage=(role:string,content:string,prefix=''):string=>{
    if(!isValidConvoRole(role)){
        throw new ConvoError('invalid-role',undefined,`(${role}) is not a valid role`);
    }
    if(isReservedConvoRole(role)){
        throw new ConvoError('use-of-reserved-role-not-allowed',undefined,`${role} is a reserved role`);
    }
    return `${prefix}> ${role}\n${escapeConvoMessageContent(content)}`;
}

export interface EscapeConvoMessageContentOptions
{
    removeNewLines?:boolean;
}

export const escapeConvo=(content:string|null|undefined,isStartOfMessage=true,options?:EscapeConvoMessageContentOptions):string=>{
    // todo escape tags at end of message

    if(typeof content !== 'string'){
        content=''+content;
    }

    if(!content){
        return '';
    }

    if(content.includes('{{')){
        content=content.replace(/\{\{/g,'\\{{');
    }
    if(content.includes('>')){
        content=content.replace(
            // the non start of message reg should be the same except no start of input char should be included
            isStartOfMessage?
                /((?:\n|\r|^)[ \t]*\\*)>/g:
                /((?:\n|\r)[ \t]*\\*)>/g,
            (_,space)=>`${space}\\>`);
    }
    if(options?.removeNewLines){
        content=content.replace(/[\n\r]/g,'');
    }
    return content;
}

export const escapeConvoMessageContent=escapeConvo;

export const spreadConvoArgs=(args:Record<string,any>,format?:boolean):string=>{
    const json=JSON.stringify(args,null,format?4:undefined);
    return json.substring(1,json.length-1);
}

export const defaultConvoPrintFunction:ConvoPrintFunction=(...args:any[]):any=>{
    console.log(...args);
    return args[args.length-1];
}

export const collapseConvoPipes=(statement:ConvoStatement):number=>{
    const params=statement.params;
    if(!params){
        return 0;
    }
    delete statement._hasPipes;
    let count=0;
    for(let i=0;i<params.length;i++){
        const s=params[i];
        if(!s?._pipe){
            continue;
        }
        count++;

        const dest=params[i-1];
        const src=params[i+1];

        if(i===0 || i===params.length-1 || !dest || !src){// discard - pipes need a target and source
            params.splice(i,1);
            i--;
            continue;
        }

        if(dest.fn===convoPipeFnName){
            if(!dest.params){
                dest.params=[];
            }
            dest.params.unshift(src);
            params.splice(i,2);
        }else{

            const pipeCall:ConvoStatement={
                s:dest.s,
                e:dest.e,
                fn:convoPipeFnName,
                params:[src,dest]
            }

            params.splice(i-1,3,pipeCall);
        }
        i--;

    }

    return count;
}

export const convoDescriptionToCommentOut=(description:string,tab='',out:string[])=>{
    const lines=description.split('\n');
    for(let i=0;i<lines.length;i++){
        const line=lines[i];
        out.push(`${i?'\n':''}${tab}# ${line}`);
    }
}
export const convoDescriptionToComment=(description:string,tab=''):string=>{
    const out:string[]=[];
    convoDescriptionToCommentOut(description,tab,out);
    return out.join('\n');
}

export const convoStringToCommentOut=(str:string,tab='',out:string[])=>{
    const lines=str.split('\n');
    for(let i=0;i<lines.length;i++){
        const line=lines[i];
        out.push(`${tab}// ${line}`);
    }
}
export const convoStringToComment=(str:string,tab=''):string=>{
    const out:string[]=[];
    convoStringToCommentOut(str,tab,out);
    return out.join('\n');
}


const nameReg=/^[a-z_]\w{,254}$/
const typeNameReg=/^[A-Z]\w{,254}$/
export const isValidConvoVarName=(name:string):boolean=>{
    return nameReg.test(name);
}
export const isValidConvoFunctionName=(name:string):boolean=>{
    return nameReg.test(name);
}
export const isValidConvoTypeName=(typeName:string):boolean=>{
    return typeNameReg.test(typeName);
}
export const validateConvoVarName=(name:string):void=>{
    if(nameReg.test(name)){
        throw new ConvoError(
            'invalid-variable-name',
            undefined,
            `${name} is an invalid Convo variable name. Variable names must start with a lower case letter followed by 0 to 254 more word characters`
        );
    }
}
export const validateConvoFunctionName=(name:string):void=>{
    if(nameReg.test(name)){
        throw new ConvoError(
            'invalid-function-name',
            undefined,
            `${name} is an invalid Convo function name. Function names must start with a lower case letter followed by 0 to 254 more word characters`
        );
    }
}
export const validateConvoTypeName=(name:string):void=>{
    if(nameReg.test(name)){
        throw new ConvoError(
            'invalid-type-name',
            undefined,
            `${name} is an invalid Convo type name. Type names must start with an upper case letter followed by 0 to 254 more word characters`
        );
    }
}

export const convoUsageTokensToString=(usage:Partial<ConvoTokenUsage>):string=>{
    return `${usage.inputTokens??0} / ${usage.outputTokens??0}${usage.tokenPrice?' / $'+usage.tokenPrice:''}`;
}

export const convoPartialUsageTokensToUsage=(usage:Partial<ConvoTokenUsage>):ConvoTokenUsage=>{
    return {
        inputTokens:usage.inputTokens??0,
        outputTokens:usage.outputTokens??0,
        tokenPrice:usage.tokenPrice??0
    }
}

export const parseConvoUsageTokens=(str:string):ConvoTokenUsage=>{
    const parts=str.split('/');
    return {
        inputTokens:Number(parts[0])||0,
        outputTokens:Number(parts[1])||0,
        tokenPrice:Number(parts[2]?.replace('$',''))||0,
    }
}

export const addConvoUsageTokens=(to:Partial<ConvoTokenUsage>,from:Partial<ConvoTokenUsage>|string):void=>
{
    if(typeof from === 'string'){
        from=parseConvoUsageTokens(from);
    }
    if(to.inputTokens===undefined){
        if(from.inputTokens!==undefined){
            to.inputTokens=from.inputTokens;
        }
    }else{
        to.inputTokens+=from.inputTokens??0;
    }
    if(to.outputTokens===undefined){
        if(from.outputTokens!==undefined){
            to.outputTokens=from.outputTokens;
        }
    }else{
        to.outputTokens+=from.outputTokens??0;
    }
    if(to.tokenPrice===undefined){
        if(from.tokenPrice!==undefined){
            to.tokenPrice=from.tokenPrice;
        }
    }else{
        to.tokenPrice+=from.tokenPrice??0;
    }
}

export const createEmptyConvoTokenUsage=():ConvoTokenUsage=>({
    inputTokens:0,
    outputTokens:0,
    tokenPrice:0,
})

export const resetConvoUsageTokens=(usage:ConvoTokenUsage)=>{
    usage.inputTokens=0;
    usage.outputTokens=0;
    usage.tokenPrice=0;
}
export const isConvoTokenUsageEmpty=(usage:ConvoTokenUsage):boolean=>{
    return (
        usage.inputTokens===0 &&
        usage.outputTokens===0 &&
        usage.tokenPrice===0
    );
}

/**
 * The token price used when the input or output token price of a model is unknown. This value is
 * set high to $150 per 1M tokens to avoid losing money.
 */
export const unknownConvoTokenPrice=150/1000000;
export const calculateConvoTokenUsage=(
    model:string,
    models:ConvoModelInfo[],
    inputTokens=0,
    outputTokens=0,
):ConvoTokenUsage=>{
    const info=models.find(m=>m.name===model)??models.find(m=>m.matchNameStart && model.startsWith(m.name));
    if(!info){
        return {
            inputTokens,
            outputTokens,
            tokenPrice:(
                inputTokens*unknownConvoTokenPrice+
                outputTokens*unknownConvoTokenPrice
            )
        }
    }else{
        return {
            inputTokens,
            outputTokens,
            tokenPrice:(
                inputTokens*(info.inputTokenPriceUsd??unknownConvoTokenPrice)+
                outputTokens*(info.inputTokenPriceUsd??unknownConvoTokenPrice)
            )
        }
    }
}

const jsonContentReg=/^\s*```\s*json.*?\n(.*)```\s*$/s;
export const isConvoJsonMessage=(content:string|null|undefined):boolean=>{
    if(!content){
        return false;
    }
    return jsonContentReg.test(content);
}

/**
 * Parses message content as json if the content is in a json markdown code block
 */
export const parseConvoJsonOrStringMessage=(content:string|null|undefined,returnJsonAsString=false):ParsedContentJsonOrString=>{
    if(!content){
        return {
            isJson:false,
            value:content,
        };
    }
    const jsonMatch=jsonContentReg.exec(content);
    if(jsonMatch){
        if(returnJsonAsString){
            return {
                isJson:true,
                value:(jsonMatch[1]??'').trim(),
            }
        }else{
            return {
                isJson:true,
                value:parseJson5(jsonMatch[1]??''),
            }
        }
    }else{
        return {
            isJson:false,
            value:content.trim(),
        }
    }
}

const jsonBlockReg=/(^|\n)```[^\n]*\n[ \t]*[\{\[]]/;
const blockEndReg=/\n[ \t]*```/
const formatNumberReg=/:\s*([\d.,\$]*[\d.])(\s*,?\s*[}\r\n])/g;
const notNumberChars=/[^\d.]/g
const bracketOpen=/\s*[\{\[]/

export const parseConvoJsonMessage=(json:string,expectArray?:boolean):any=>{
    let value:any;
    try{
        value=parseJson5(json);
    }catch(ex){

        json=json.replace(formatNumberReg,(_,number:string,end:string)=>':'+number.replace(notNumberChars,'')+end);
        let parsed=false;

        // search for json markdown block
        const match=jsonBlockReg.exec(json);
        if(match){
            json=json.substring(match.index+match[0].length-1);
            const endMatch=blockEndReg.exec(json);
            if(endMatch){
                json=json.substring(0,endMatch.index);
            }
            try{
                value=parseJson5(json);
                parsed=true;
            }catch{
                //
            }
        }



        if(!parsed){
            const lines=json.split('\n');
            lines: for(let i=0;i<lines.length;i++){
                const line=lines[i] as string;
                if(bracketOpen.test(line)){
                    for(let e=lines.length;e>i;e--){
                        try{
                            value=parseJson5(lines.slice(i,e).join('\n'));
                            break lines;
                        }catch{
                            //
                        }
                    }
                }
            }
        }
    }

    if(expectArray && !Array.isArray(value) && value && (typeof value === 'object')){
        for(const e in value){
            return value[e];
        }
    }

    return value;
}

const danglingReg=/[\r\n^](\s*>\s*user\s*)$/;

export const removeDanglingConvoUserMessage=(code:string):string=>{
    const dm=danglingReg.exec(code);
    if(!dm){
        return code;
    }
    return code.substring(0,code.length-(dm[1]??'').length).trim();
}

export const concatConvoCode=(a:string,b:string):string=>{
    const dm=danglingReg.exec(a);
    if(!dm){
        return a+b;
    }
    return a.substring(0,a.length-(dm[1]??'').length)+b;
}


export const concatConvoCodeAndAppendEmptyUserMessage=(a:string,b:string):string=>{
    const code=concatConvoCode(a,b);
    if(!danglingReg.test(code)){
        return code+'\n\n> user\n';
    }else{
        return code;
    }
}

export const isConvoMessageIncludedInTask=(msg:ConvoMessage,task:string):boolean=>{
    const msgTask=getConvoTag(msg.tags,convoTags.task)?.value??defaultConvoTask;
    return msgTask===task;

}

export const parseConvoMessageTemplate=(msg:ConvoMessage,template:string):ConvoMessageTemplate=>{
    const match=/^(\w+)\s*([\w.]+)?\s*(.*)/.exec(template);
    return match?{
        message:msg,
        name:match[1],
        watchPath:match[2],
        matchValue:match[3],
    }:{
        message:msg,
    }
}

export const getConvoStatementSource=(statement:ConvoStatement,code:string):string=>{
    return code.substring(statement.s,statement.e);
}

/**
 * If the value is empty, null or undefined true is returned, otherwise the Boolean
 * constructor is used to parse the value.
 */
export const parseConvoBooleanTag=(value:string|null|undefined)=>{
    if(!value){
        return true;
    }
    return parseBoolean(value);
}

export const getFlatConvoTagBoolean=(message:FlatConvoMessage|ConvoCompletionMessage|null|undefined,tagName:string)=>{
    if(!message?.tags || !(tagName in message.tags)){
        return false;
    }
    return parseConvoBooleanTag(message.tags[tagName]);
}

export const shouldDisableConvoAutoScroll=(messages:FlatConvoMessage[]):boolean=>{
    for(let i=messages.length-1;i>=0;i--){
        const m=messages[i];
        if(m && (m.content!==undefined || m.component!==undefined)){
            return getFlatConvoTagBoolean(m,convoTags.disableAutoScroll);
        }
    }
    return false;
}

export const convoRagDocRefToMessage=(
    flat:FlatConvoConversation,
    docs:ConvoDocumentReference|null|undefined|(ConvoDocumentReference|null|undefined)[],
    role:string
):ConvoMessage|undefined=>{
    const ary=asArray(docs);
    if(!ary){
        return undefined;
    }
    const msg:ConvoMessage={
        role,
        content:ary.map(d=>d?.content??'').join('\n\n'),
        tags:[]
    }

    if(!msg.content){
        return undefined;
    }

    for(const doc of ary){
        if(!doc){
            continue;
        }
        if(doc.sourceId){
            if(!msg.sourceId){
                msg.sourceId=doc.sourceId;
            }
            msg.tags?.push({name:convoTags.sourceId,value:doc.sourceId})
        }

        if(doc.sourceName){
            if(!msg.sourceName){
                msg.sourceName=doc.sourceName;
            }
            msg.tags?.push({name:convoTags.sourceName,value:doc.sourceName})
        }

        if(doc.sourceUrl){
            if(!msg.sourceUrl){
                msg.sourceUrl=doc.sourceUrl;
            }
            msg.tags?.push({name:convoTags.sourceUrl,value:doc.sourceUrl})
        }
    }

    let template=flat.ragTemplate;
    if(!template && (flat.ragPrefix || flat.ragSuffix)){
        template=(
            (flat.ragPrefix?flat.ragPrefix+'\n\n':'')+
            convoRagTemplatePlaceholder+
            (flat.ragSuffix?'\n\n'+flat.ragSuffix:'')
        )
    }

    if(template){
        const i=template.indexOf(convoRagTemplatePlaceholder);
        if(i!==-1){
            msg.tags?.push({name:convoTags.ragContentRage,value:`${i} ${msg.content.length}`})
            msg.content=template.replace(convoRagTemplatePlaceholder,msg.content);
        }
    }

    if(!msg.tags?.length){
        delete msg.tags;
    }

    return msg;
}

export const escapeConvoTagValue=(value:string):string=>{
    return value.replace(/[\n\r\s]/g,' ');
}

export const convoMessageToString=(msg:ConvoMessage):string=>{
    if(msg.fn || msg.statement){
        throw new UnsupportedError(
            'convoMessageToString only supports text based messages without embedded statements'
        );
    }

    const out:string[]=[];

    if(msg.tags){
        for(const tag of msg.tags){
            out.push(`@${tag.name}${tag.value===undefined?'':' '+escapeConvoTagValue(tag.value)}`);
        }
    }

    out.push(`> ${msg.role??'user'}`);
    if(msg.content){
        out.push(escapeConvoMessageContent(msg.content,true));
    }

    return out.join('\n');
}

export const getLastCompletionMessage=(messages:FlatConvoMessage[]):FlatConvoMessage|undefined=>{
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(!msg || msg.role==='function' || msg.role===convoRoles.system){
            continue;
        }
        return msg;
    }
    return undefined;
}

export const isConvoThreadFilterMatch=(filter:ConvoThreadFilter,tid:string|undefined|null):boolean=>{
    if((filter.excludeNonThreaded && !tid) || filter.excludeThreads?.includes(tid??'')){
        return false;
    }

    if(filter.includeNonThreaded && !tid){
        return true;
    }else if(filter.includeThreads){
        return filter.includeThreads.includes(tid??'');
    }else{
        return true;
    }
}


export const mergeConvoOptions=(source:ConversationOptions|null|undefined,...overrides:(ConversationOptions|null|undefined)[]):ConversationOptions=>{
    if(!overrides?.length){
        return source??{};
    }

    let merge=source??{};

    for(const override of overrides){
        if(!override){
            continue;
        }
        const source=merge;
        merge={
            ...source,
            ...dupDeleteUndefined(override),
        }

        if(source.onComponentMessages && override.onComponentMessages){
            merge.onComponentMessages=[
                ...asArray(source.onComponentMessages),
                ...asArray(override.onComponentMessages)
            ]
        }

        if(source.define && override.define){
            merge.define=[
                ...source.define,
                ...override.define,
            ]
        }
    }

    return merge;
}

export const getLastConvoMessageWithRole=<T extends ConvoMessage|FlatConvoMessage>(messages:T[]|undefined|null,role:string):T|undefined=>{
    if(!messages){
        return undefined;
    }
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(msg?.role===role){
            return msg;
        }
    }
    return undefined;
}

export const getLastNonCalledConvoFlatMessage=(messages:FlatConvoMessage[]):FlatConvoMessage|undefined=>{
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(msg && !msg.called && msg.role!==convoRoles.system){
            return msg;
        }
    }
    return undefined;
}

export const getLastConvoContentMessage=(messages:FlatConvoMessage[]):FlatConvoMessage|undefined=>{
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(msg && !msg.called && msg.content!==undefined && msg.role!==convoRoles.system){
            return msg;
        }
    }
    return undefined;
}

export const getLastCalledConvoMessage=(messages:ConvoMessage[],startIndex=messages.length-1):ConvoMessage|undefined=>{
    for(let i=startIndex;i>=0;i--){
        const msg=messages[i];
        if(msg && msg.fn?.call){
            return msg;
        }
    }
    return undefined;
}

export interface CreateTextConvoCompletionMessageOptions
{
    flat:FlatConvoConversationBase;
    role:string;
    content:string|null|undefined;
    model:string;
    models?:ConvoModelInfo[];
    inputTokens?:number;
    outputTokens?:number;
    tokenPrice?:number;
    tags?:Record<string,string|undefined>;
    defaults?:ConvoCompletionMessage;
}
export const createTextConvoCompletionMessage=({
    flat,
    role,
    content,
    model,
    models,
    inputTokens,
    outputTokens,
    tokenPrice,
    defaults,
    tags,
}:CreateTextConvoCompletionMessageOptions):ConvoCompletionMessage=>{
    const lastContentMessage=getLastConvoContentMessage(flat.messages);
    const jsonMode=lastContentMessage?.responseFormat==='json';

    return {
        role:role,
        content:content??undefined,
        format:jsonMode?'json':undefined,
        formatTypeName:jsonMode?lastContentMessage?.responseFormatTypeName:undefined,
        formatIsArray:jsonMode?lastContentMessage?.responseFormatIsArray:undefined,
        assignTo:lastContentMessage?.responseAssignTo,
        endpoint:flat.responseEndpoint,
        model,
        tags,
        ...((models && tokenPrice===undefined)?calculateConvoTokenUsage(
            model,
            models,
            inputTokens,
            outputTokens,
        ):{
            inputTokens,
            outputTokens,
            tokenPrice,
        }),
        ...(defaults && dupDeleteUndefined(defaults))
    }
}


export interface CreateFunctionCallConvoCompletionMessageOptions
{
    flat:FlatConvoConversationBase;
    model:string;
    toolId?:string;
    callFn:string;
    callParams:Record<string,any>|undefined;
    models?:ConvoModelInfo[];
    inputTokens?:number;
    outputTokens?:number;
    tokenPrice?:number;
    defaults?:ConvoCompletionMessage;
}
export const createFunctionCallConvoCompletionMessage=({
    flat,
    model,
    toolId,
    callFn,
    callParams,
    models,
    inputTokens,
    outputTokens,
    tokenPrice,
    defaults,
}:CreateFunctionCallConvoCompletionMessageOptions):ConvoCompletionMessage=>{
    return {
        callFn,
        callParams:callParams??[],
        tags:toolId?{toolId}:undefined,
        endpoint:flat.responseEndpoint,
        model,
        ...((models && tokenPrice===undefined)?
            calculateConvoTokenUsage(
                model,
                models,
                inputTokens,
                outputTokens
            )
        :
            {
                inputTokens,
                outputTokens,
                tokenPrice
            }
        ),
        ...(defaults && dupDeleteUndefined(defaults))
    };
}

export const getSerializableFlatConvoConversation=(flat:FlatConvoConversation|FlatConvoConversationBase):FlatConvoConversationBase=>{
    const flatBase=flatConvoConversationToBase(flat);

    const messages=[...flatBase.messages];
    flatBase.messages=messages;

    for(let i=0;i<messages.length;i++){
        let msg=messages[i];
        if(!msg){continue}

        let updated=false

        if(msg.fnParams){
            if(!updated){
                msg={...msg};
                updated=true;
                msg._fnParams=zodTypeToJsonScheme(msg.fnParams as ZodObject<any>);
                delete msg.fnParams;
            }
        }

        if(updated){
            messages[i]=msg;
        }


    }
    return flatBase;
}

export const flatConvoConversationToBase=(flat:FlatConvoConversation|FlatConvoConversationBase):FlatConvoConversationBase=>{

    return {
        messages:flat.messages,
        capabilities:flat.capabilities,
        ragMode:flat.ragMode,
        ragPrefix:flat.ragPrefix,
        ragSuffix:flat.ragSuffix,
        ragTemplate:flat.ragTemplate,
        toolChoice:flat.toolChoice,
        responseModel:flat.responseModel,
        responseEndpoint:flat.responseEndpoint,
        userId:flat.userId,
        apiKey:flat.apiKey,
        model:flat.model,
    }
}

export interface NormalizedFlatMessageListOptions
{
    /**
     * Disables all processing of messages
     */
    disableAll?:boolean;

    /**
     * If true rag messages will not be added to user message content
     */
    disableRag?:boolean;

    /**
     * If true all system messages should be merged into a single message
     */
    mergeSystemMessages?:boolean;
}

/**
 * Returns the full content of the message including prefix and suffix
 */
export const getFullFlatConvoMessageContent=(msg:FlatConvoMessage)=>{
    return `${msg.prefix?msg.prefix+'\n\n':''}${msg.content??''}${msg.suffix?'\n\n'+msg.suffix:''}`;
}

/**
 * Normalizes flat messages before sending to LLMs. This function is typically used by converter.
 */
export const getNormalizedFlatMessageList=(
    flat:FlatConvoConversationBase,
    options:NormalizedFlatMessageListOptions={}
):FlatConvoMessage[]=>{

    if(options?.disableAll){
        return flat.messages;
    }

    const messages=[...flat.messages];
    let firstSystemMessage:FlatConvoMessage|undefined;


    let lastContentMessage:FlatConvoMessage|undefined;
    let lastContentMessageI=0;

    const {
        disableRag,
        mergeSystemMessages
    }=options;

    for(let i=0;i<messages.length;i++){
        let msg=messages[i];
        if(!msg){continue}

        if(msg.modelContent){
            msg={...msg}
            messages[i]=msg;
            msg.content=msg.modelContent;
            delete msg.modelContent;
        }

        if(msg.prefix || msg.suffix){
            msg={...msg}
            messages[i]=msg;
            msg.content=getFullFlatConvoMessageContent(msg);
        }

        if(msg.role===convoRoles.rag){
            messages.splice(i,1);
            i--;

            if(!lastContentMessage?.content || disableRag){
                continue;
            }

            lastContentMessage={...lastContentMessage};
            messages[lastContentMessageI]=lastContentMessage;
            lastContentMessage.content+='\n\n'+(msg.content??'');
            continue;
        }

        if(msg.content!==undefined){
            lastContentMessage=msg;
            lastContentMessageI=i;
        }

        if(msg.role==='system'){
            if(!firstSystemMessage){
                firstSystemMessage=msg;
            }else if(mergeSystemMessages){
                if(firstSystemMessage.content===undefined){
                    firstSystemMessage.content='';
                }
                if(msg.content){
                    firstSystemMessage.content+='\n\n'+msg.content;
                }
                messages.splice(i,1);
                i--;
            }
        }

    }


    return messages;
}

export const formatConvoContentSpace=(content:string):string=>{
    return content.replace(spaceFormatReg,(_,a:string,b:string)=>`${a} ${b}`);
}

const spaceFormatReg=/(\w|\.|,|\?|!)[ \t]*\r?\n([a-zA-Z])/g;

/**
 * Converts the flat conversation to a string for display purposes. This function does not
 * preserve all of the information of the conversation and should not be used for purposes
 * outside of logging and display. For example all code in define, do and function bodies are
 * lost and not part of the output of this function.
 */
export const getFlattenConversationDisplayString=(flat:FlatConvoConversation,includeConsoleHeaderFooter=false):string=>{
    const out:string[]=[];

    if(includeConsoleHeaderFooter){
        out.push('Flat Conversation\n------------\n');
    }
    for(const msg of flat.messages){
        if(msg.tags){
            for(const e in msg.tags){
                const v=msg.tags[e];
                out.push(`@${e}${v?' '+v:''}\n`)
            }
        }
        out.push(`>${msg.called?' call':''} ${msg.fn?`${msg.fn.name}()`:msg.role}\n`);
        if(msg.content){
            out.push(msg.content)
            out.push('\n\n');
        }
    }
    if(includeConsoleHeaderFooter){
        out.push('------------\n');
    }

    return out.join('');
}

export interface ConversationSuggestions
{
    title?:string;
    suggestions:string[];
    messages:FlatConvoMessage[];
}

export const getLastConvoSuggestions=(messages:FlatConvoMessage[]):ConversationSuggestions|undefined=>{
    const sug:FlatConvoMessage[]=[];
    let title:string|undefined;
    for(let i=messages.length-1;i>=0;i--){
        const msg=messages[i];
        if(!msg){
            continue;
        }

        if(msg.isSuggestion){
            sug.unshift(msg);
            const t=msg.tags?.[convoTags.suggestionTitle];
            if(t){
                title=t;
            }
        }else if(sug.length){
            break;
        }
    }

    if(!sug.length){
        return undefined;
    }

    return {
        messages:sug,
        suggestions:sug.map(s=>s.content??''),
        title,
    }
}

export const evalConvoTransformCondition=(transformContent:string,condition:string|null|undefined)=>{
    if(!condition?.trim()){
        return true;
    }
    try{
        const parts=condition.trim().split(' ').filter(v=>v);
        const not=parts[0]==='!';
        if(not){
            parts.shift();
        }
        const obj=JSON.parse(transformContent);
        const v=getValueByPath(obj,parts[0]??'');
        let cond:boolean;
        if(parts.length<2){
            cond=v?true:false;
        }else{
            cond=(v+'')===(parts[1]+'');
        }
        return not?!cond:cond;
    }catch{
        return false;
    }
}

export const getConvoDebugLabelComment=(label:string)=>{
    label=label.replace(/[\s\n\r]+/g,' ');
    const pad='///////////////////';
    const l=label.length+2;
    const gap='/'.repeat(l);
    return `  ${pad}${gap}${pad}\n ${pad} ${label} ${pad}\n${pad}${gap}${pad}`
}

export const isConvoModelAliasMatch=(name:string,alias:ConvoModelAlias):boolean=>{
    if(alias.name && starStringTestCached(alias,alias.name,name)){
        return true;
    }

    if(alias.pattern){
        const reg=parseRegexCached(alias,alias.pattern,alias.patternFlags);
        if(reg.test(name)){
            return true;
        }
    }

    return false;
}

export const insertSystemMessageIntoFlatConvo=(msg:string,flat:FlatConvoConversation)=>{
    const flatMsg:FlatConvoMessage={
        role:'system',
        isSystem:true,
        content:msg,
    }
    for(let i=0;i<flat.messages.length;i++){
        const m=flat.messages[i];
        if(m?.role==='system'){
            flat.messages.splice(i+1,0,flatMsg);
            return;
        }
    }
    flat.messages.unshift(flatMsg);
}


const serviceModelCache:Record<string,ConvoModelInfo[]>={};
export const getConvoCompletionServiceModelsAsync=async (service:ConvoCompletionService<any,any>,disableCache=service.disableModelInfoCaching):Promise<ConvoModelInfo[]>=>{
    const cached=disableCache?undefined:serviceModelCache[service.serviceId];
    if(cached){
        return cached;
    }
    if(!service.getModelsAsync){
        return [];
    }

    const models=(await service.getModelsAsync())??[];
    if(!disableCache){
        serviceModelCache[service.serviceId]=models;
    }
    return models;
}

const modeFindReg=/(^| |\t)(replaceForModel|replace|append|prepend|prefix|suffix|respond)($| |\t)/;
export const getConvoMessageModificationAction=(str:string):ConvoMessageModificationAction|undefined=>{
    return modeFindReg.exec(str)?.[2] as any;
}

/**
 * Appends a value to the prefix of a flat conversation message.
 * If a prefix already exists, the new value is concatenated with optional separation.
 *
 * @param msg - The flat conversation message to modify
 * @param value - The string value to append to the prefix
 * @param sep - Whether to add separator (double newlines) between existing and new content
 */
export const appendFlatConvoMessagePrefix=(msg:FlatConvoMessage,value:string,sep=true)=>{
    if(msg.prefix){
        msg.prefix+=(sep?'\n\n':'')+value;
    }else{
        msg.prefix=value;
    }
}

/**
 * Appends a value to the suffix of a flat conversation message.
 * If a suffix already exists, the new value is concatenated with optional separation.
 *
 * @param msg - The flat conversation message to modify
 * @param value - The string value to append to the suffix
 * @param sep - Whether to add separator (double newlines) between existing and new content
 */
export const appendFlatConvoMessageSuffix=(msg:FlatConvoMessage,value:string,sep=true)=>{
    if(msg.suffix){
        msg.suffix+=(sep?'\n\n':'')+value;
    }else{
        msg.suffix=value;
    }
}

/**
 * Converts a flat convo message to a completion message
 */
export const convertFlatConvoMessageToCompletionMessage=(msg:FlatConvoMessage):ConvoCompletionMessage=>({
    role:msg.role,
    content:msg.content,
    callFn:msg.called?.name,
    callParams:msg.calledParams,
    model:msg.responseModel,
    format:msg.responseFormat,
    endpoint:msg.responseEndpoint,
    formatTypeName:msg.responseFormatTypeName,
    assignTo:msg.responseAssignTo,
    tags:msg.tags?{...msg.tags}:undefined,
})

export const getConvoSystemMessage=(type:StandardConvoSystemMessage)=>{
    const content=convoSystemMessages[type];
    if(!content){
        throw new Error(`Invalid standard convo system message - ${type}`)
    }

    return `@${
        convoTags.stdSystem} ${type
    }\n@${
        convoTags.includeInTriggers
    }\n@${
        convoTags.disableModifiers
    }\n${content.trim()}`
}

const flatConvoMsgCachedJsonKey=Symbol('flatConvoMsgCachedJsonKey')
export const getFlatConvoMessageCachedJsonValue=(msg:FlatConvoMessage|null|undefined):any=>{
    return (msg as any)?.[flatConvoMsgCachedJsonKey];
}
export const setFlatConvoMessageCachedJsonValue=(msg:FlatConvoMessage|null|undefined,value:any):any=>{
    if(msg){
        (msg as any)[flatConvoMsgCachedJsonKey]=value;
    }
    return value;
}

const flatConvoMsgConditionKey=Symbol('flatConvoMsgConditionKey')
export const getFlatConvoMessageCondition=(msg:FlatConvoMessage|null|undefined):ConvoTag=>{
    return (msg as any)?.[flatConvoMsgConditionKey];
}
export const setFlatConvoMessageCondition=(msg:FlatConvoMessage|null|undefined,tag:ConvoTag):void=>{
    if(msg){
        (msg as any)[flatConvoMsgConditionKey]=tag;
    }
}

/**
 * Converts the messages into static convo lang with all expressions evaluated
 */
export const flatConvoMessagesToTextView=(messages:FlatConvoMessage[]|null|undefined):string=>{
    if(!messages){
        return '';
    }
    return messages.map(m=>{
        if(m.content===undefined){
            return null
        }
        let tagContent='';
        if(m.tags){
            for(const name in m.tags){
                const v=m.tags[name];
                tagContent+=`@${name}${v?` ${escapeConvoTagValue(v)}`:''}\n`
            }
        }
        return `${tagContent}> ${m.role}\n${m.content}`;
    }).filter(m=>m).join('\n\n')??''
}

export const getAssumedConvoCompletionValue=(completion:ConvoCompletion):any=>{
    if(completion.returnValues){
        return completion.returnValues[completion.returnValues.length-1];
    }else if(completion.message?.format==='json'){
        return parseConvoJsonMessage(completion.message.content??'',completion.message.formatIsArray);
    }else{
        return completion.message?.content;
    }
}

const slotReg=/\$\$(RAG|CHILD|CHILDREN|CONTENT|SLOT_(\w+))\$\$/g;
export const insertConvoContentIntoSlot=(content:string,template:string,slotName?:string):string=>{
    slotReg.lastIndex=0;
    return template.replace(slotReg,(_,_type:string,slot?:string)=>{
        if(slotName){
            return slot===slotName?escapeConvo(content):_;
        }else{
            return escapeConvo(content);
        }
    })
}

const hasRoleReg=/(^|\n)\s*>/;
export const contentHasConvoRole=(content:string):boolean=>{
    return hasRoleReg.test(content);
}

export const defaultConvoImportServicePriority=0;

export const isConvoTypeArray=(value:any):boolean=>{
    return (
        Array.isArray(value) &&
        value.length &&
        value.every(v=>v?.[convoMetadataKey])
    )?true:false;
}
