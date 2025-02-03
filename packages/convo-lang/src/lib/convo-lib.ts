import { UnsupportedError, asArray, dupDeleteUndefined, parseXml, zodTypeToJsonScheme } from "@iyio/common";
import { format } from "date-fns";
import { parse as parseJson5 } from 'json5';
import { ZodObject } from "zod";
import type { ConversationOptions } from "./Conversation";
import { ConvoError } from "./ConvoError";
import { ConvoBaseType, ConvoCompletionMessage, ConvoCompletionService, ConvoComponent, ConvoComponentMode, ConvoConversationConverter, ConvoConversion, ConvoDocumentReference, ConvoFlowController, ConvoFunction, ConvoMessage, ConvoMessageTemplate, ConvoMetadata, ConvoModelInfo, ConvoPrintFunction, ConvoScope, ConvoScopeError, ConvoScopeFunction, ConvoStatement, ConvoTag, ConvoThreadFilter, ConvoTokenUsage, ConvoType, FlatConvoConversation, FlatConvoConversationBase, FlatConvoMessage, OptionalConvoValue, ParsedContentJsonOrString, convoFlowControllerKey, convoObjFlag, convoReservedRoles, convoScopeFunctionMarker, isConvoComponentMode } from "./convo-types";

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

export const convoRoles={
    user:'user',
    assistant:'assistant',
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
} as const;

export const convoFunctions={
    queryImage:'queryImage',

    getState:'getState',

    /**
     * When called __rag with be set to true and and params passed will be added the the __ragParams
     * array. If __ragParams is not an array it will be set to an array first. Duplicated values
     * will not be added to __ragParams.
     */
    enableRag:'enableRag',

    today:'today',

    uuid:'uuid',
    shortUuid:'shortUuid',

    getVar:'getVar',

    describeScene:'describeScene',

    readDoc:'readDoc',

    /**
     * Returns an XML list of agents available to the current conversation.
     */
    getAgentList:'getAgentList',
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

} as const;

export const convoImportModifiers={
    /**
     * Only system messages should be imported
     */
    system:'system',

    /**
     * Content messages should be ignored
     */
    ignoreContent:'ignoreContent'
} as const;

export const defaultConvoRagTol=1.2;

export const convoTags={

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
     * When applied to a function the return value of the function will not be used to generate a
     * new assistant message.
     */
    disableAutoComplete:'disableAutoComplete',
    /**
     * Used to indicate that a message should be evaluated at the edge of a conversation with the
     * latest state. @edge is most commonly used with system message to ensure that all injected values
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
     * @note The example below uses (at) instead of the at symbol because of a limitation of jsdoc.
     *
     * The example below will only render and send the second system message to the LLM
     * @example
     *
     * ``` convo
     * > define
     * animal = 'dog'
     *
     * (at)condition animal frog
     * > system
     * You are a frog and you like to hop around.
     *
     * (at)condition animal dog
     * > system
     * You are a dog and you like to eat dirt.
     * ```
     */
    condition:'condition',

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
    convoArrayFnName,
    convoEnumFnName,
    convoJsonMapFnName,
    convoJsonArrayFnName,
    convoFunctions.getState,
    convoFunctions.enableRag,
    convoFunctions.uuid,
    convoFunctions.shortUuid,
    convoFunctions.getVar,
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

export const convertConvoInput=(
    flat:FlatConvoConversation,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[]
):ConvoConversion<any>=>{
    for(const converter of converters){
        if(converter.supportedInputTypes.includes(inputType)){
            return {
                success:true,
                converter,
                result:converter.convertConvoToInput(flat,inputType),
            }
        }
    }
    return {
        success:false
    }
}

export const convertConvoOutput=(
    output:any,
    outputType:string,
    input:any,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[],
    flat:FlatConvoConversation
):ConvoConversion<any>=>{
    for(const converter of converters){
        if(converter.supportedOutputTypes.includes(outputType)){
            return {
                success:true,
                converter,
                result:converter.convertOutputToConvo(output,outputType,input,inputType,flat),
            }
        }
    }
    return {
        success:false
    }
}

export const requireConvertConvoInput=(
    flat:FlatConvoConversation,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[]
):any=>{
    const r=convertConvoInput(flat,inputType,converters);
    if(!r.success){
        throw new Error(`No convo converter found for input type - ${inputType}`);
    }
    return r.result;
}

export const requireConvertConvoOutput=(
    output:any,
    outputType:string,
    input:any,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[],
    flat:FlatConvoConversation
):ConvoCompletionMessage[]=>{
    const r=convertConvoOutput(output,outputType,input,inputType,converters,flat);
    if(!r.success){
        throw new Error(`No convo converter found for output type - ${outputType}`);
    }
    return r.result;
}

export const completeConvoUsingCompletionServiceAsync=async (
    flat:FlatConvoConversation,
    service:ConvoCompletionService<any,any>|null|undefined,
    converters:ConvoConversationConverter<any,any>[]
):Promise<ConvoCompletionMessage[]>=>{
    if(!service){
        return [];
    }
    const input=requireConvertConvoInput(flat,service.inputType,converters);
    const r=await service.completeConvoAsync(input,flat);
    return requireConvertConvoOutput(r,service.outputType,input,service.inputType,converters,flat);
}

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

export const convoTagMapToCode=(tagsMap:Record<string,string|undefined>,append='',tab=''):string=>{
    const out:string[]=[];
    for(const e in tagsMap){
        const v=tagsMap[e];
        out.push(`${tab}@${e.replace(notWord,'_')}${v?' '+v.replace(newline,' '):''}`)
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

export const getConvoFnByTag=(tag:string,messages:ConvoMessage[]|null|undefined,startIndex=0):ConvoFunction|undefined=>{
    return getConvoFnMessageByTag(tag,messages,startIndex)?.fn;
}

export const convoTagsToMap=(tags:ConvoTag[]):Record<string,string|undefined>=>{
    const map:Record<string,string|undefined>={};
    for(const t of tags){
        map[t.name]=t.value;
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

export const convoLabeledScopeParamsToObj=(
    scope:ConvoScope
):Record<string,any>=>{
    return convoParamsToObj(scope,undefined,false);
}

export const convoParamsToObj=(
    scope:ConvoScope,
    unlabeledMap?:string[],
    unlabeledKey:string|boolean=true,
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
    if(labels){
        for(const e in labels){
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
        out.push(`${tab}# ${line}`);
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

export const addConvoUsageTokens=(to:ConvoTokenUsage,from:Partial<ConvoTokenUsage>|string):void=>
{
    if(typeof from === 'string'){
        from=parseConvoUsageTokens(from);
    }
    to.inputTokens+=from.inputTokens??0;
    to.outputTokens+=from.outputTokens??0;
    to.tokenPrice+=from.tokenPrice??0;
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

export const unknownConvoTokenPrice=1000/1000000;
export const calculateConvoTokenUsage=(
    model:string,
    models:ConvoModelInfo[],
    inputTokens=0,
    outputTokens=0,
):ConvoTokenUsage=>{
    const info=models.find(m=>m.name===model);
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
                inputTokens*(info.inputTokenPriceUsd??0)+
                outputTokens*(info.inputTokenPriceUsd??0)
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

export const parseConvoJsonMessage=(json:string):any=>{
    return parseJson5(json
        .replace(/^\s*`+\s*\w*/,'')
        .replace(/`+\s*$/,'')
        .trim()
    );
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
    return Boolean(value);
}

export const getFlatConvoTag=(message:FlatConvoMessage|null|undefined,tagName:string)=>{
    if(!message?.tags || !(tagName in message.tags)){
        return false;
    }
    return parseConvoBooleanTag(message.tags[tagName]);
}

export const shouldDisableConvoAutoScroll=(messages:FlatConvoMessage[]):boolean=>{
    for(let i=messages.length-1;i>=0;i--){
        const m=messages[i];
        if(m && (m.content!==undefined || m.component!==undefined)){
            return getFlatConvoTag(m,convoTags.disableAutoScroll);
        }
    }
    return false;
}

export const convoRagDocRefToMessage=(docs:ConvoDocumentReference|null|undefined|(ConvoDocumentReference|null|undefined)[],role:string):ConvoMessage|undefined=>{
    const ary=asArray(docs);
    if(!ary){
        return undefined;
    }
    const msg:ConvoMessage={
        role,
        content:ary.map(d=>d?.content??'').join('\n'),
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

    if(!msg.tags?.length){
        delete msg.tags;
    }

    return msg;
}

export const escapeConvoTagValue=(value:string):string=>{
    return value.replace(/\s/g,' ');
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
        if(!msg || msg.role==='function'){
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

/**
 * Finds the component type of a message.
 */
export const getConvoMessageComponentMode=(content:string|null|undefined):ConvoComponentMode|undefined=>{
    const types=(content?/^\s*```([^\n]*).*```\s*$/s.exec(content):null)?.[1]?.trim().split(' ');
    if(!types){
        return undefined;
    }
    const last=types[types.length-1];
    return isConvoComponentMode(last)?last:undefined;
}

const convoComponentCacheKey=Symbol('convoComponentCacheKey');

/**
 * Parses message content as a convo component. Components are written in xml.
 * @param content string content to parse
 */
export const parseConvoComponent=(content:string|null|undefined):ConvoComponent|undefined=>{

    if(!content){
        return undefined;
    }

    const codeBlockMatch=/^\s*```[^\n]*(.*)```\s*$/s.exec(content);
    if(codeBlockMatch?.[1]){
        content=codeBlockMatch[1];
    }

    const xml=parseXml(content,{parseJsonAtts:true,stopOnFirstNode:true});

    if(xml.error){
        console.error('convo component parsing failed',xml.error);
    }

    return xml.result?.[0];



}
/**
 * Parses message content as a convo component. Components are written in xml. The parsed component
 * is cached and stored on the message using a private symbol.
 * @param msg The message to parse
 */
export const getConvoMessageComponent=(msg:FlatConvoMessage|null|undefined):ConvoComponent|undefined=>{
    if(!msg?.content){
        return undefined;
    }
    const cached=(msg as any)[convoComponentCacheKey];
    if(cached){
        return cached;
    }

    const comp=parseConvoComponent(msg.content);
    if(comp){
        (msg as any)[convoComponentCacheKey]=comp;
    }
    return comp;
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
        if(msg && !msg.called){
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
    defaults,
}:CreateTextConvoCompletionMessageOptions):ConvoCompletionMessage=>{

    const lastContentMessage=getLastNonCalledConvoFlatMessage(flat.messages);
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
        ...(models && calculateConvoTokenUsage(
            model,
            models,
            inputTokens,
            outputTokens
        )),
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
    defaults,
}:CreateFunctionCallConvoCompletionMessageOptions):ConvoCompletionMessage=>{
    return {
        callFn,
        callParams:callParams??[],
        tags:toolId?{toolId}:undefined,
        endpoint:flat.responseEndpoint,
        model,
        ...(models && calculateConvoTokenUsage(
            model,
            models,
            inputTokens,
            outputTokens
        )),
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
        toolChoice:flat.toolChoice,
        responseModel:flat.responseModel,
        responseEndpoint:flat.responseEndpoint,
        userId:flat.userId,
        apiKey:flat.apiKey,
    }
}

export interface NormalizedFlatMessageListOptions
{
    disableAll?:boolean;
    disableRag?:boolean;
}

export const getNormalizedFlatMessageList=(
    flat:FlatConvoConversationBase,
    options?:NormalizedFlatMessageListOptions
):FlatConvoMessage[]=>{

    if(options?.disableAll){
        return flat.messages;
    }

    const messages=[...flat.messages];


    let lastContentMessage:FlatConvoMessage|undefined;
    let lastContentMessageI=0;

    const disableRag=options?.disableRag;

    for(let i=0;i<messages.length;i++){
        let msg=messages[i];
        if(!msg){continue}

        if(msg.prefix || msg.suffix){
            msg={...msg}
            messages[i]=msg;
            msg.content=`${msg.prefix??''}${msg.content??''}${msg.suffix??''}`
        }

        if(msg.role==='rag' && !disableRag){

            if(!lastContentMessage?.content){
                continue;
            }

            let content=msg.content??'';
            if(flat.ragPrefix){
                content=flat.ragPrefix+'\n\n'+content;
            }
            if(flat.ragSuffix){
                content+='\n\n'+flat.ragSuffix;
            }
            lastContentMessage={...lastContentMessage};
            messages[lastContentMessageI]=lastContentMessage;
            lastContentMessage.content+='\n\n'+content;
            continue;
        }

        if(msg.content!==undefined){
            lastContentMessage=msg;
            lastContentMessageI=i;
        }

    }


    return messages;
}

const jsonReg=/json/i;

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
