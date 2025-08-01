import { AnyFunction, CancelToken, DisposeCallback, ReadonlySubject, aryRemoveItem, asArray, asArrayItem, createJsonRefReplacer, delayAsync, deleteUndefined, getDirectoryName, getErrorMessage, getObjKeyCount, getValueByPath, isClassInstanceObject, log, parseMarkdown, pushBehaviorSubjectAry, pushBehaviorSubjectAryMany, removeBehaviorSubjectAryValue, removeBehaviorSubjectAryValueMany, safeParseNumber, shortUuid, starStringToRegex } from "@iyio/common";
import { parseJson5 } from "@iyio/json5";
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { ZodType, ZodTypeAny, z } from "zod";
import { ConvoError } from "./ConvoError";
import { ConvoExecutionContext } from "./ConvoExecutionContext";
import { ConvoRoom } from "./ConvoRoom";
import { HttpConvoCompletionService } from "./HttpConvoCompletionService";
import { requireParseConvoCached } from "./convo-cached-parsing";
import { applyConvoModelConfigurationToInputAsync, applyConvoModelConfigurationToOutput, completeConvoUsingCompletionServiceAsync, convertConvoInput, getConvoCompletionServiceAsync, getConvoCompletionServicesForModelAsync, requireConvertConvoOutput } from "./convo-completion-lib";
import { getConvoMessageComponent } from "./convo-component-lib";
import { ConvoComponentCompletionCtx, ConvoComponentCompletionHandler, ConvoComponentDef, ConvoComponentMessageState, ConvoComponentMessagesCallback, ConvoComponentSubmissionWithIndex } from "./convo-component-types";
import { evalConvoMessageAsCodeAsync } from "./convo-eval";
import { ConvoForm } from "./convo-forms-types";
import { getGlobalConversationLock } from "./convo-lang-lock";
import { FindConvoMessageOptions, addConvoUsageTokens, appendFlatConvoMessageSuffix, containsConvoTag, convertFlatConvoMessageToCompletionMessage, convoAnyModelName, convoDescriptionToComment, convoDisableAutoCompleteName, convoFunctions, convoImportModifiers, convoLabeledScopeParamsToObj, convoMessageToString, convoMsgModifiers, convoPartialUsageTokensToUsage, convoRagDocRefToMessage, convoResultReturnName, convoRoles, convoScopedModifiers, convoStringToComment, convoTagMapToCode, convoTags, convoTagsToMap, convoTaskTriggers, convoUsageTokensToString, convoVars, createEmptyConvoTokenUsage, defaultConversationName, defaultConvoCacheType, defaultConvoPrintFunction, defaultConvoRagTol, defaultConvoTask, defaultConvoTransformGroup, defaultConvoVisionSystemMessage, escapeConvo, escapeConvoMessageContent, evalConvoTransformCondition, findConvoMessage, formatConvoContentSpace, formatConvoMessage, getAssumedConvoCompletionValue, getConvoCompletionServiceModelsAsync, getConvoDateString, getConvoDebugLabelComment, getConvoStructPropertyCount, getConvoTag, getFlatConvoMessageCachedJsonValue, getFlatConvoMessageCondition, getFlatConvoTagBoolean, getFlatConvoTagValues, getFlattenConversationDisplayString, getFullFlatConvoMessageContent, getLastCalledConvoMessage, getLastCompletionMessage, isConvoThreadFilterMatch, isValidConvoIdentifier, mapToConvoTags, parseConvoJsonMessage, parseConvoMessageTemplate, parseConvoTransformTag, setFlatConvoMessageCachedJsonValue, setFlatConvoMessageCondition, spreadConvoArgs, validateConvoFunctionName, validateConvoTypeName, validateConvoVarName } from "./convo-lib";
import { parseConvoCode } from "./convo-parser";
import { defaultConvoRagServiceCallback } from "./convo-rag-lib";
import { ConvoDocumentReference, ConvoRagCallback } from "./convo-rag-types";
import { convoScript } from "./convo-template";
import { AppendConvoMessageObjOptions, AppendConvoOptions, AwaitableConversation, BeforeCreateConversationExeCtx, CloneConversationOptions, ConvoAgentDef, ConvoAppend, ConvoCapability, ConvoCompletion, ConvoCompletionMessage, ConvoCompletionOptions, ConvoCompletionService, ConvoCompletionServiceAndModel, ConvoCompletionStartEvt, ConvoConversationCache, ConvoConversationConverter, ConvoDefItem, ConvoExecuteResult, ConvoFlatCompletionCallback, ConvoFnCallInfo, ConvoFunction, ConvoFunctionDef, ConvoImport, ConvoImportContext, ConvoImportHandler, ConvoMarkdownLine, ConvoMessage, ConvoMessageAndOptStatement, ConvoMessageModification, ConvoMessagePart, ConvoMessagePrefixOptions, ConvoMessageTemplate, ConvoMessageTriggerEvent, ConvoModelInfo, ConvoModelInputOutputPair, ConvoModule, ConvoParsingResult, ConvoPostCompletionMessage, ConvoPrintFunction, ConvoQueueRef, ConvoRagMode, ConvoScope, ConvoScopeFunction, ConvoStartOfConversationCallback, ConvoStatement, ConvoSubTask, ConvoTag, ConvoTask, ConvoThreadFilter, ConvoTokenUsage, ConvoTransformResult, ConvoTrigger, ConvoTypeDef, ConvoVarDef, FlatConvoConversation, FlatConvoConversationBase, FlatConvoMessage, FlatConvoTransform, FlattenConvoOptions, InlineConvoPrompt, allConvoMessageModificationAction, baseConvoToolChoice, convoMessageSourcePathKey, convoObjFlag, isConvoCapability, isConvoMessageModification, isConvoMessageModificationAction, isConvoRagMode } from "./convo-types";
import { schemeToConvoTypeString, zodSchemeToConvoTypeString } from "./convo-zod";
import { convoCacheService, convoCompletionService, convoConversationConverterProvider, convoDefaultModelParam } from "./convo.deps";
import { isAwaitableConversation } from "./convoAsync";
import { createConvoVisionFunction } from "./createConvoVisionFunction";
import { convoScopeFunctionEvalJavascript } from "./scope-functions/convoScopeFunctionEvalJavascript";

let nextInstanceId=1;

export interface ConversationOptions
{
    name?:string;
    room?:ConvoRoom;
    userRoles?:string[];
    assistantRoles?:string[];
    systemRoles?:string[];
    roleMap?:Record<string,string>;
    completionService?:ConvoCompletionService<any,any>|ConvoCompletionService<any,any>[];
    converters?:ConvoConversationConverter<any,any>[];
    serviceCapabilities?:ConvoCapability[];
    capabilities?:ConvoCapability[];
    disableMessageCapabilities?:boolean;
    maxAutoCompleteDepth?:number;
    /**
     * If true the conversation is an agent
     */
    isAgent?:boolean;
    /**
     * If true time tags will be added to appended user message
     */
    trackTime?:boolean;

    /**
     * If true tokenUsage tags will be added to completed messages
     */
    trackTokens?:boolean;

    /**
     * Called whenever tokens usage occurs
     */
    onTokenUsage?:(usage:ConvoTokenUsage)=>void;

    /**
     * If defined the conversation will add used tokens to the usage object
     */
    usage?:ConvoTokenUsage;


    /**
     * If true model tags will be added to completed messages
     */
    trackModel?:boolean;

    /**
     * If true the conversation will not automatically be flattened when new message are appended.
     */
    disableAutoFlatten?:boolean;

    /**
     * Number of milliseconds to delay before flattening the conversation. The delay is used to
     * debounce appends.
     */
    autoFlattenDelayMs?:number;

    /**
     * A function that will be used to output debug values. By default debug information is written
     * to the output of the conversation as comments
     */
    debug?:(...values:any[])=>void;

    debugMode?:boolean;

    /**
     * If true all text based messages will be parsed as markdown and the lines of the markdown will
     * be used to set vars.
     */
    setMarkdownVars?:boolean;

    /**
     * If true all text based message will be parsed as markdown
     */
    parseMarkdown?:boolean;

    /**
     * A callback used to implement rag retrieval.
     */
    ragCallback?:ConvoRagCallback;

    /**
     * An initial convo script to append to the Conversation
     */
    initConvo?:string;

    /**
     * Called at the end of the Conversation constructor
     */
    onConstructed?:(convo:Conversation)=>void;

    defaultVars?:Record<string,any>;

    /**
     * Array of ConvoDefItems to define
     */
    define?:ConvoDefItem[];

    /**
     * Handles import requests
     */
    importHandler?:ConvoImportHandler;

    onComponentMessages?:ConvoComponentMessagesCallback|ConvoComponentMessagesCallback[];

    /**
     * Used to complete conversations ending with a component
     */
    componentCompletionCallback?:ConvoComponentCompletionHandler;

    /**
     * If true arbitrary code will be allowed to be executed.
     */
    allowEvalCode?:boolean;


    ragPrefix?:string;

    ragSuffix?:string;

    ragTemplate?:string;

    formatWhitespace?:boolean;

    externFunctions?:Record<string,AnyFunction>;

    externScopeFunctions?:Record<string,ConvoScopeFunction>;

    components?:Record<string,ConvoComponentDef>;

    /**
     * Array of modules that can be imported. The modules are not automatically imported, they have
     * to be imported to take effect.
     */
    modules?:ConvoModule[];

    /**
     * Called each time the conversation is flattened allowing dynamic messages to be inserted
     * at the start of the conversation.
     */
    getStartOfConversation?:ConvoStartOfConversationCallback;

    /**
     * Used to cache responses
     */
    cache?:boolean|ConvoConversationCache|ConvoConversationCache[];

    /**
     * If true the flattened version of the conversation will be logged before sending to LLMs.
     * @note Cached responses are not logged. Use `logFlatCached` to log both cached and non-cached
     * flattened conversations.
     */
    logFlat?:boolean;

    /**
     * If true both cached and non-cached versions of the conversation are logged before being set
     * to an LLM
     */
    logFlatCached?:boolean;

    beforeCreateExeCtx?:BeforeCreateConversationExeCtx;

    defaultModel?:string|null;

    childDepth?:number;

    /** When true, message triggers will not be evaluated automatically */
    disableTriggers?:boolean;

    /**
     * Prevents transforms from being applied
     */
    disableTransforms?:boolean;

    /**
     * When the current conversation is an inline prompt inlineHost is the conversation that is
     * hosting inline conversation
     */
    inlineHost?:Conversation;

    /**
     * The inline prompt the conversation the conversation represents
     */
    inlinePrompt?:InlineConvoPrompt;
}

export class Conversation
{
    private _convo:string[]=[];
    public get convo(){return this._convo.join('\n\n')}
    public getConvoStrings(){
        return [...this._convo];
    }

    public readonly instanceId:number;

    public readonly name:string;

    public readonly room:ConvoRoom;

    public readonly isAgent:boolean;

    public readonly childDepth:number;

    public readonly inlineHost?:Conversation;

    public inlinePrompt?:InlineConvoPrompt;

    private _messages:ConvoMessage[]=[];
    public get messages(){return this._messages}

    private readonly _onAppend=new Subject<ConvoAppend>();
    public get onAppend():Observable<ConvoAppend>{return this._onAppend}

    private readonly _openTasks:BehaviorSubject<ConvoTask[]>=new BehaviorSubject<ConvoTask[]>([]);
    public get openTasksSubject():ReadonlySubject<ConvoTask[]>{return this._openTasks}
    public get openTasks(){return this._openTasks.value}

    private readonly _activeTaskCount:BehaviorSubject<number>=new BehaviorSubject<number>(0);
    public get activeTaskCountSubject():ReadonlySubject<number>{return this._activeTaskCount}
    public get activeTaskCount(){return this._activeTaskCount.value}

    private readonly _trackTime:BehaviorSubject<boolean>;
    public get trackTimeSubject():ReadonlySubject<boolean>{return this._trackTime}
    public get trackTime(){return this._trackTime.value}
    public set trackTime(value:boolean){
        if(value==this._trackTime.value){
            return;
        }
        this._trackTime.next(value);
    }

    private readonly _trackTokens:BehaviorSubject<boolean>;
    public get trackTokensSubject():ReadonlySubject<boolean>{return this._trackTokens}
    public get trackTokens(){return this._trackTokens.value}
    public set trackTokens(value:boolean){
        if(value==this._trackTokens.value){
            return;
        }
        this._trackTokens.next(value);
    }

    private readonly _onTokenUsage?:(usage:ConvoTokenUsage)=>void;

    /**
     * Tracks the token usages of the Conversation
     */
    public readonly usage:ConvoTokenUsage;

    private readonly _trackModel:BehaviorSubject<boolean>;
    public get trackModelSubject():ReadonlySubject<boolean>{return this._trackModel}
    public get trackModel(){return this._trackModel.value}
    public set trackModel(value:boolean){
        if(value==this._trackModel.value){
            return;
        }
        this._trackModel.next(value);
    }

    private readonly _debugMode:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get debugModeSubject():ReadonlySubject<boolean>{return this._debugMode}
    public get debugMode(){return this._debugMode.value}
    public set debugMode(value:boolean){
        if(value==this._debugMode.value){
            return;
        }
        this._debugMode.next(value);
    }

    private readonly _flat:BehaviorSubject<FlatConvoConversation|null>=new BehaviorSubject<FlatConvoConversation|null>(null);
    public get flatSubject():ReadonlySubject<FlatConvoConversation|null>{return this._flat}
    /**
     * A reference to the last flattening of the conversation
     */
    public get flat(){return this._flat.value}


    private readonly _subTasks:BehaviorSubject<ConvoSubTask[]>=new BehaviorSubject<ConvoSubTask[]>([]);
    public get subTasksSubject():ReadonlySubject<ConvoSubTask[]>{return this._subTasks}
    public get subTasks(){return this._subTasks.value}

    private readonly _beforeAppend=new Subject<ConvoAppend>();
    public get beforeAppend():Observable<ConvoAppend>{return this._beforeAppend}



    /**
     * Unregistered variables will be available during execution but will not be added to the code
     * of the conversation. For example the __cwd var is often used to set the current working
     * directory but is not added to the conversation code.
     *
     * @note shares the same functionality as defaultVars. Maybe remove
     */
    public readonly unregisteredVars:Record<string,any>={};

    public userRoles:string[];
    public assistantRoles:string[];
    public systemRoles:string[];
    public roleMap:Record<string,string>

    private completionService?:ConvoCompletionService<any,any>|ConvoCompletionService<any,any>[];

    private converters:ConvoConversationConverter<any,any>[];

    public maxAutoCompleteDepth:number;

    public beforeCreateExeCtx?:BeforeCreateConversationExeCtx;

    public readonly externFunctions:Record<string,ConvoScopeFunction>={};

    public readonly components:Record<string,ConvoComponentDef>;

    /**
     * Array of modules that can be imported. The modules are not automatically imported, they have
     * to be imported to take effect.
     */
    public readonly modules:ConvoModule[];

    /**
     * The default capabilities of the conversation. Additional capabilities can be enabled by
     * the first and last message of the conversation as long a disableMessageCapabilities is not
     * true.
     */
    public readonly capabilities:ConvoCapability[];

    /**
     * If true capabilities enabled by message in the conversation will be ignored.
     */
    public readonly disableMessageCapabilities:boolean;

    /**
     * Capabilities that should be enabled by the underlying completion service.
     */
    public readonly serviceCapabilities:ConvoCapability[];

    private readonly disableAutoFlatten:boolean;

    private readonly autoFlattenDelayMs:number;

    public disableTriggers:boolean;

    /**
     * Prevents transforms from being applied
     */
    public disableTransforms:boolean;

    public dynamicFunctionCallback:ConvoScopeFunction|undefined;

    private readonly componentCompletionCallback?:ConvoComponentCompletionHandler;

    /**
     * A callback used to implement rag retrieval.
     */
    private readonly ragCallback?:ConvoRagCallback;

    public getStartOfConversation?:ConvoStartOfConversationCallback;



    /**
     * A function that will be used to output debug values. By default debug information is written
     * to the output of the conversation as comments
     */
    debug?:(...values:any[])=>void;

    public print:ConvoPrintFunction=defaultConvoPrintFunction;

    private readonly defaultOptions:ConversationOptions;

    public readonly defaultVars:Record<string,any>;

    public cache?:ConvoConversationCache[];

    /**
     * If true the flattened version of the conversation will be logged before sending to LLMs.
     * @note Cached responses are not logged. Use `logFlatCached` to log both cached and non-cached
     * flattened conversations.
     */
    public logFlat:boolean;

    /**
     * If true both cached and non-cached versions of the conversation are logged before being set
     * to an LLM
     */
    public logFlatCached:boolean;

    public defaultModel?:string;

    /**
     * Sub conversations
     */
    public readonly subs:Record<string,Conversation>={}

    public constructor(options:ConversationOptions={}){
        const {
            name=defaultConversationName,
            isAgent=false,
            room=new ConvoRoom(),
            userRoles=['user'],
            assistantRoles=['assistant'],
            systemRoles=['system'],
            roleMap={},
            completionService=convoCompletionService.all(),
            converters=convoConversationConverterProvider.all(),
            defaultModel=convoDefaultModelParam.get(),
            capabilities=[],
            serviceCapabilities=[],
            maxAutoCompleteDepth=100,
            trackTime=false,
            trackTokens=false,
            trackModel=false,
            onTokenUsage,
            disableAutoFlatten=false,
            disableTransforms=false,
            autoFlattenDelayMs=30,
            ragCallback,
            debug,
            debugMode,
            disableMessageCapabilities=false,
            initConvo,
            defaultVars,
            onConstructed,
            define,
            onComponentMessages,
            componentCompletionCallback,
            externFunctions,
            components,
            externScopeFunctions,
            getStartOfConversation,
            cache,
            logFlat=false,
            logFlatCached=false,
            usage=createEmptyConvoTokenUsage(),
            beforeCreateExeCtx,
            modules,
            childDepth=0,
            disableTriggers=false,
            inlineHost,
            inlinePrompt,
        }=options;
        this.instanceId=nextInstanceId++;
        this.name=name;
        this.usage=usage;
        this.isAgent=isAgent;
        this.defaultOptions=options;
        this.childDepth=childDepth;
        this.disableTriggers=disableTriggers;
        this.beforeCreateExeCtx=beforeCreateExeCtx;
        this.getStartOfConversation=getStartOfConversation;
        this.inlineHost=inlineHost;
        this.inlinePrompt=inlinePrompt;
        this.cache=typeof cache==='boolean'?(cache?[convoCacheService()]:[]):asArray(cache);
        this.logFlat=logFlat;
        this.logFlatCached=logFlatCached;
        this.defaultVars=defaultVars?defaultVars:{};
        this.userRoles=[...userRoles];
        this.assistantRoles=[...assistantRoles];
        this.systemRoles=[...systemRoles];
        this.roleMap=roleMap;
        if(Array.isArray(completionService) && completionService.length===1){
            this.completionService=completionService[0];
        }else{
            this.completionService=completionService;
        }
        this.converters=converters;
        this.capabilities=[...capabilities];
        this.defaultModel=defaultModel??undefined;
        this.disableMessageCapabilities=disableMessageCapabilities;
        this.serviceCapabilities=serviceCapabilities;
        this.maxAutoCompleteDepth=maxAutoCompleteDepth;
        this._trackTime=new BehaviorSubject<boolean>(trackTime);
        this._trackTokens=new BehaviorSubject<boolean>(trackTokens);
        this._trackModel=new BehaviorSubject<boolean>(trackModel);
        this._onTokenUsage=onTokenUsage;
        this.disableAutoFlatten=disableAutoFlatten;
        this.disableTransforms=disableTransforms;
        this.autoFlattenDelayMs=autoFlattenDelayMs;
        this.componentCompletionCallback=componentCompletionCallback;
        this.ragCallback=ragCallback;
        this.debug=debug;
        if(debugMode){
            this.debugMode=true;
        }

        this.room=room;
        this.room.addConversation(this);

        if(initConvo){
            this.append(initConvo,true);
        }
        if(define){
            this.define(define);
        }

        if(onComponentMessages){
            if(Array.isArray(onComponentMessages)){
                for(const cb of onComponentMessages){
                    this.watchComponentMessages(cb);
                }
            }else{
                this.watchComponentMessages(onComponentMessages);
            }
        }

        this.components={...components};
        this.modules=modules?[...modules]:[];

        if(externFunctions){
            for(const e in externFunctions){
                const f=externFunctions[e];
                if(f){
                    this.implementExternFunction(e,f);
                }
            }
        }

        if(externScopeFunctions){
            for(const e in externScopeFunctions){
                const f=externScopeFunctions[e];
                if(f){
                    this.externFunctions[e]=f;
                }
            }
        }

        onConstructed?.(this);
    }

    public initMessageReady(){
        const last=this.getLastMessage();
        return last?.role===convoRoles.user && containsConvoTag(last.tags,convoTags.init)?true:false;
    }

    public addTask(task:ConvoTask):DisposeCallback{

        this._activeTaskCount.next(this._activeTaskCount.value+1);
        pushBehaviorSubjectAry(this._openTasks,task);
        const removeFromHost=this.inlineHost?.addTask(task);
        let removed=false;
        return ()=>{
            if(removed){
                return;
            }
            removed=true;
            this._activeTaskCount.next(this._activeTaskCount.value-1);
            removeBehaviorSubjectAryValue(this._openTasks,task);
            removeFromHost?.();
        }
    }

    public popTask():void{
        const task=this._openTasks.value[this._openTasks.value.length-1];
        if(task){
            removeBehaviorSubjectAryValue(this._openTasks,task);
            this._activeTaskCount.next(this._activeTaskCount.value-1);
            if(this.inlineHost?._openTasks.value.includes(task)){
                removeBehaviorSubjectAryValue(this.inlineHost._openTasks,task);
                this.inlineHost._activeTaskCount.next(this.inlineHost._activeTaskCount.value-1);
            }
        }
    }

    public watchComponentMessages(callback:ConvoComponentMessagesCallback):Subscription{
        return this._flat.subscribe(flat=>{
            if(!flat){
                return;
            }
            const all=flat.messages.filter(m=>m.component);
            const state:ConvoComponentMessageState={
                last:all[all.length-1],
                all,
                flat,
                convo:this
            }
            if(typeof callback === 'function'){
                callback(state);
            }else{
                callback.next(state);
            }

        })
    }

    private getMessageListCapabilities(msgs:FlatConvoMessage[]):ConvoCapability[]{
        let firstMsg:FlatConvoMessage|undefined;
        let lastMsg:FlatConvoMessage|undefined;
        for(let i=0;i<msgs.length;i++){
            const f=msgs[i];
            if(f && (!f.fn || f.fn.topLevel)){
                firstMsg=f;
                break;
            }
        }
        for(let i=msgs.length-1;i>=0;i--){
            const f=msgs[i];
            if(f && (!f.fn || f.fn.topLevel)){
                lastMsg=f;
                break;
            }
        }
        if(!firstMsg && !lastMsg){
            return []
        }
        if(firstMsg===lastMsg){
            lastMsg=undefined;
        }
        const tags:ConvoTag[]=[];
        if(firstMsg?.tags){
            const t=mapToConvoTags(firstMsg.tags);
            tags.push(...t);
        }
        if(lastMsg?.tags){
            const t=mapToConvoTags(lastMsg.tags);
            tags.push(...t);
        }
        return this.getMessageCapabilities(tags)??[];
    }
    /**
     * Gets the capabilities enabled by the given tags. If disableMessageCapabilities is true
     * undefined is always returned
     */
    private getMessageCapabilities(tags:ConvoTag[]|null|undefined):ConvoCapability[]|undefined{
        if(!tags || this.disableMessageCapabilities){
            return undefined;
        }

        let capList:ConvoCapability[]|undefined;

        for(const tag of tags){
            switch(tag.name){

                case convoTags.capability:
                    if(tag.value){
                        const caps=tag.value.split(',');
                        for(const c of caps){
                            const cap=c.trim();
                            if(isConvoCapability(cap) && !capList?.includes(cap)){
                                if(!capList){
                                    capList=[];
                                }
                                capList.push(cap);
                            }
                        }
                    }
                    break;

                case convoTags.enableVision:
                    if(!capList?.includes('vision')){
                        if(!capList){
                            capList=[]
                        }
                        capList.push('vision');
                    }
                    break;

                case convoTags.enabledVisionFunction:
                    if(!capList?.includes('visionFunction')){
                        if(!capList){
                            capList=[]
                        }
                        capList.push('visionFunction');
                    }
                    break;

            }
        }

        if(!capList){
            return undefined;
        }

        for(const cap of capList){
            this.enableCapability(cap);
        }

        return capList;

    }

    private _isDisposed=false;
    private readonly _disposeToken:CancelToken=new CancelToken();
    public get disposeToken(){return this._disposeToken}
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this.autoFlattenId++;
        this._isDisposed=true;
        this._disposeToken.cancelNow();
        this.room.removeConversation(this);
    }

    private _defaultApiKey:string|null|(()=>string|null)=null;
    public setDefaultApiKey(key:string|null|(()=>string|null)){
        this._defaultApiKey=key;
    }
    public getDefaultApiKey():string|null{
        if(typeof this._defaultApiKey==='function'){
            return this._defaultApiKey();
        }else{
            return this._defaultApiKey;
        }
    }



    private parseCode(code:string):ConvoParsingResult{
        return parseConvoCode(code,{parseMarkdown:this.defaultOptions.parseMarkdown,logErrors:true})
    }

    private readonly enabledCapabilities:ConvoCapability[]=[];
    public enableCapability(cap:ConvoCapability)
    {
        if(this.enabledCapabilities.includes(cap)){
            return;
        }
        this.enabledCapabilities.push(cap);
        switch(cap){
            case 'visionFunction':
                this.define({
                    hidden:true,
                    fn:createConvoVisionFunction()
                },true)
                break;
            case 'vision':
                if(!this.serviceCapabilities.includes("vision")){
                    this.serviceCapabilities.push('vision');
                }
                break;
        }
    }

    public autoUpdateCompletionService()
    {
        if(!this.completionService){
            this.completionService=convoCompletionService.get();
        }
    }

    public createChild(options?:ConversationOptions)
    {
        const convo=new Conversation(this.getCloneOptions(options));

        if(this._defaultApiKey){
            convo.setDefaultApiKey(this._defaultApiKey);
        }

        return convo;
    }

    public getCloneOptions(options?:ConversationOptions):ConversationOptions{
        return {
            ...this.defaultOptions,
            childDepth:this.childDepth+1,
            debug:this.debugToConversation,
            debugMode:this.shouldDebug(),
            beforeCreateExeCtx:this.beforeCreateExeCtx,
            ...options,
            defaultVars:{...this.defaultVars,...options?.defaultVars},
            externScopeFunctions:{...this.externFunctions},
            components:{...this.components},
            modules:[...this.modules],
        }
    }

    /**
     * Creates a new Conversation and appends the messages of this conversation to the newly
     * created conversation.
     */
    public clone({
        inlinePrompt,
        triggerName,
        empty=(inlinePrompt && !inlinePrompt.extend && !inlinePrompt.continue),
        noFunctions,
        systemOnly,
        removeAgents,
        dropLast=inlinePrompt?.dropLast,
        dropUntilContent=inlinePrompt?true:false,
        last=inlinePrompt?.last,
        cloneConvoString,
    }:CloneConversationOptions={},convoOptions?:ConversationOptions):Conversation{
        const cloneOptions=this.getCloneOptions(convoOptions);
        if(inlinePrompt){
            delete cloneOptions.debug;
            cloneOptions.inlinePrompt=inlinePrompt;
            cloneOptions.inlineHost=this;
            cloneOptions.disableTriggers=true;
            cloneOptions.disableAutoFlatten=true;
        }
        const conversation=new Conversation(cloneOptions);
        if(this._defaultApiKey){
            conversation.setDefaultApiKey(this._defaultApiKey);
        }
        let messages=empty?[]:[...this.messages];
        if(inlinePrompt && triggerName){
            this.filterConvoMessagesForTrigger(inlinePrompt,triggerName,messages);
        }
        if(noFunctions){
            messages=messages.filter(m=>!m.fn || m.fn.topLevel);
        }
        if(systemOnly){
            messages=messages.filter(m=>m.role === 'system' || m.fn?.topLevel || m.fn?.name===convoFunctions.getState);
        }
        if(removeAgents){
            messages=messages.filter(m=>m.tags?.some(t=>t.name===convoTags.agentSystem) || (m.fn && this.agents.some(a=>a.name===m.fn?.name)));
            for(const agent of this.agents){
                delete conversation.defaultVars[agent.name];
            }
        }else{
            for(const agent of this.agents){
                conversation.agents.push(agent);
            }
        }

        for(const name in this.importedModules){
            conversation.importedModules[name]=this.importedModules[name] as ConvoModule;
        }

        if(dropUntilContent){
            while(messages.length && !this.isContentMessage(messages[messages.length-1])){
                messages.pop();
            }
        }

        if(dropLast!==undefined){
            messages.splice(messages.length-dropLast,dropLast);
        }

        if(last!==undefined){
            messages.splice(0,messages.length-last);
        }

        if(triggerName){
            messages.push(...requireParseConvoCached(`> define\n${convoFunctions.clearRag}()`));
        }

        conversation.appendMessageObject(messages,{disableAutoFlatten:true,appendCode:cloneConvoString});


        return conversation;
    }


    private filterConvoMessagesForTrigger(
        prompt:InlineConvoPrompt,
        triggerName:string,
        messages:ConvoMessage[],
    ){

        const {
            system,
            functions,
        }=prompt;

        for(let i=0;i<messages.length;i++){
            const msg=messages[i];

            if(!msg){
                messages.splice(i,1);
                i--;
                continue;
            }

            const exclude=getConvoTag(msg.tags,convoTags.excludeFromTriggers);
            const include=getConvoTag(msg.tags,convoTags.includeInTriggers);

            if(
                (
                    (!system && this.isSystemMessage(msg)) ||
                    (!functions && msg.fn && !msg.fn.call && !msg.fn.topLevel) ||
                    (exclude && (exclude.value===undefined || exclude.value===triggerName))
                ) && !(
                    (include && (include.value===undefined || include.value===triggerName))
                )
            ){
                messages.splice(i,1);
                i--;
                continue;
            }


        }
    }

    /**
     * Creates a new Conversation and appends the system messages of this conversation to the newly
     * created conversation.
     */
    public cloneSystem():Conversation{
        return this.clone({systemOnly:true});
    }

    /**
     * Creates a new Conversation and appends the non-function messages of this conversation to the newly
     * created conversation.
     */
    public cloneWithNoFunctions():Conversation{
        return this.clone({noFunctions:true});
    }

    private appendMsgsAry(messages:ConvoMessage[],index=this._messages.length){
        let depth=0;
        let subName:string|undefined;
        let subs:ConvoMessage[]|undefined;
        let endRole:string|undefined;
        let subType:string|undefined;
        let head:ConvoMessage|undefined;
        let imp:{subs:ConvoMessage[],subType:string,head:ConvoMessage,convo:Conversation}[]|undefined;
        for(let i=0;i<messages.length;i++){
            const msg=messages[i];
            if(!msg){continue}

            if(msg.role===endRole){
                depth--;
                if(!depth){
                    const sub=this.room.state.lookup[subName??'']??this.createChild({room:this.room});
                    for(const agent of this.agents){
                        delete sub.externFunctions[agent.name];
                    }

                    if(head){
                        if(!imp){
                            imp=[];
                        }

                        switch(subType){
                            case convoMsgModifiers.agent:
                                imp.push({subs:subs??[],subType:subType,head,convo:sub});
                                break;

                        }
                    }
                    endRole=undefined;
                    subName=undefined;
                    subs=undefined;
                    subType=undefined;
                    head=undefined;
                    continue
                }
            }else if(msg.fn){
                const mod=msg.fn.modifiers?.find(m=>convoScopedModifiers.includes(m as any));
                if(mod){
                    depth++;
                    if(depth===1){
                        subType=mod;
                        endRole=mod+'End';
                        subName=msg.fn.name;
                        subs=[];
                        head=msg;
                        continue;
                    }
                }
            }

            if(subs){
                subs.push(msg);
            }else{
                this._messages.splice(index,0,msg);
                index++;
            }
        }
        if(depth){
            throw new Error(`Sub-conversation not ended - name=${subName}`);
        }

        if(imp){
            for(const i of imp){
                switch(i.subType){
                    case 'agent':
                        this.defineAgent(i.convo,i.head,i.subs);
                }
            }
        }

    }

    private defineAgent(conversation:Conversation,headMsg:ConvoMessage,messages:ConvoMessage[]){
        headMsg={...headMsg};
        if(!headMsg.fn){
            return;
        }

        const hasAgentSystem=this._messages.some(m=>m.tags?.some(t=>t.name===convoTags.agentSystem));
        if(!hasAgentSystem){
            this.append(
                `@${convoTags.agentSystem}\n> system\nYou can use the following agents to assistant the user.\n`+
                '{{getAgentList()}}\n\n'+
                'To send a request to an agent either call the function with the same name as the agent or '+
                'call a more specialized function that starts with the agents name, but DO NOT call both.'
            )
        }

        const agent:ConvoAgentDef={
            name:headMsg.fn.name===this.name?this.name+'_2':headMsg.fn.name,
            description:headMsg.description,
            main:headMsg,
            capabilities:[],
            functions:[]
        }

        if(headMsg.tags){
            for(const tag of headMsg.tags){
                if(tag.name===convoTags.cap && tag.value){
                    agent.capabilities?.push(tag.value);
                }
            }
        }

        headMsg.fn={...headMsg.fn};
        headMsg.fn.modifiers=[...headMsg.fn.modifiers];
        headMsg.fn.local=true;
        aryRemoveItem(headMsg.fn.modifiers,convoMsgModifiers.agent);
        messages.push(headMsg);

        const proxyFn={...headMsg};
        if(proxyFn.fn){
            proxyFn.fn={...proxyFn.fn}
            delete proxyFn.fn.body;
            proxyFn.fn.extern=true;
            proxyFn.fn.local=false;
            this.appendMessageObject(proxyFn);
            this.externFunctions[agent.name]=async (scope:ConvoScope)=>{
                if(!headMsg.fn){
                    return null;
                }
                const clone=conversation.clone();
                let r=await clone.callFunctionAsync(headMsg.fn.name,convoLabeledScopeParamsToObj(scope),{returnOnCalled:true});
                if(!r){
                    return r;
                }
                if(typeof r === 'object'){
                    const keys=Object.keys(r);
                    if(keys.length===1){
                        r=r[keys[0]??''];
                    }
                    if(!r){
                        return r;
                    }
                }
                const sub=clone.onAppend.subscribe(a=>{
                    this.appendAfterCall.push(a.text.replace(/(^|\n)\s*>/g,text=>`\n@cid ${agent.name}\n${text}`));
                    // todo - append
                })
                try{
                    clone.append(convoScript`> user\n${r}`);
                    const completion=await clone.completeAsync();
                    const returnValue=completion.message?.callParams??completion.message?.content;
                    if(typeof returnValue === 'string'){
                        return `${agent.name}'s response:\n<agent-response>\n${returnValue}\n</agent-response>`
                    }else{
                        return returnValue
                    }

                }finally{
                    sub.unsubscribe();
                }
            }
        }

        conversation.appendMessageObject(messages);

        for(const msg of messages){
            if(!msg.fn || msg===headMsg || !msg.fn.modifiers.includes('public')){
                continue;
            }
            // add to description - When call the agent "Max" will handle the execution of the function.
            // create proxy
        }

        // create proxy for any public functions
        this.agents.push(agent);

    }

    private appendAfterCall:string[]=[];

    public readonly agents:ConvoAgentDef[]=[];



    /**
     * Appends new messages to the conversation and by default does not add code to the conversation.
     */
    public appendMessageObject(message:ConvoMessage|ConvoMessage[],{
        disableAutoFlatten,
        appendCode,
        source,
    }:AppendConvoMessageObjOptions={}):void{
        const messages=asArray(message);
        this.appendMsgsAry(messages);

        if(source){
            if(this._beforeAppend.observed){
                source=this.transformMessageBeforeAppend(source);
            }
            this._convo.push(source);
        }else if(appendCode){
            for(const msg of messages){
                source=convoMessageToString(msg);
                if(this._beforeAppend.observed){
                    source=this.transformMessageBeforeAppend(source);
                }
                this._convo.push(source);
            }
        }

        this._onAppend.next({
            text:source??'',
            messages,
        });

        if(!this.disableAutoFlatten && !disableAutoFlatten){
            this.autoFlattenAsync(false);
        }
    }

    private transformMessageBeforeAppend(messages:string):string{
        const append:ConvoAppend={
            text:messages,
            messages:[]
        }

        this._beforeAppend.next(append);

        return append.text;
    }

    public appendDefineVars(vars:Record<string,any>){
        const convo=[`> define`];
        for(const name in vars){
            const value=vars[name];
            if(!isValidConvoIdentifier(name)){
                throw new Error(`Invalid var name - ${name}`);
            }
            convo.push(`${name} = ${value===undefined?undefined:JSON.stringify(value,null,4)}`)
        }
        this.append(convo.join('\n'));
    }

    public appendDefineVar(name:string,value:any){
        return this.appendDefineVars({[name]:value});
    }

    public append(convo:AwaitableConversation<any>,options?:AppendConvoOptions):ConvoParsingResult;
    public append(messages:string|(ConvoMessagePart|string)[],mergeWithPrev?:boolean,throwOnError?:boolean):ConvoParsingResult;
    public append(messages:string|(ConvoMessagePart|string)[],options?:AppendConvoOptions):ConvoParsingResult;
    public append(messages:AwaitableConversation<any>|string|(ConvoMessagePart|string)[],mergeWithPrevOrOptions:boolean|AppendConvoOptions=false,_throwOnError=true):ConvoParsingResult{
        const options=(typeof mergeWithPrevOrOptions === 'object')?mergeWithPrevOrOptions:{mergeWithPrev:mergeWithPrevOrOptions};

        const {
            mergeWithPrev=false,
            throwOnError=_throwOnError,
            disableAutoFlatten,
            addTags,
        }=options;

        if(isAwaitableConversation(messages)){
            const outputOptions=messages.getOutputOptions();
            for(const e in outputOptions.defaultVars){
                const v=outputOptions.defaultVars[e];
                if(v===undefined){
                    continue;
                }
                this.defaultVars[e]=v;
            }
            if(outputOptions.externFunctions){
                for(const name in outputOptions.externFunctions){
                    const fn=outputOptions.externFunctions[name];
                    if(!fn){
                        continue;
                    }
                    this.implementExternFunction(name,fn);
                }
            }
            if(outputOptions.externScopeFunctions){
                for(const name in outputOptions.externScopeFunctions){
                    const fn=outputOptions.externScopeFunctions[name];
                    if(!fn){
                        continue;
                    }
                    this.externFunctions[name]=fn;
                }
            }
            messages=messages.getInput();
        }

        let visibleContent:string|undefined=undefined;
        let hasHidden=false;
        if(Array.isArray(messages)){
            hasHidden=messages.some(m=>(typeof m === 'object')?m.hidden:false);
            if(hasHidden){
                visibleContent=messages.filter(m=>(typeof m === 'string')||!m.hidden).map(m=>(typeof m === 'string')?m:m.content).join('');
                messages=messages.map(m=>(typeof m === 'string')?m:m.content).join('');
            }else{
                messages=messages.map(m=>(typeof m === 'string')?m:m.content).join('');
            }
        }

        if(this._beforeAppend.observed){
            messages=this.transformMessageBeforeAppend(messages);
        }

        const r=this.parseCode(messages);
        if(r.error){
            if(!throwOnError){
                return r;
            }
            throw r.error
        }

        if(options.filePath && r.result){
            for(const m of r.result){
                m[convoMessageSourcePathKey]=options.filePath;
            }
        }

        if(addTags?.length && r.result){
            for(const m of r.result){
                if(m.tags){
                    m.tags.push(...addTags);
                }else{
                    m.tags=[...addTags];
                }
            }
        }

        if(hasHidden){
            messages=visibleContent??'';
        }


        if(messages){
            if(mergeWithPrev && this._convo.length){
                this._convo[this._convo.length-1]+='\n'+messages;
            }else{
                this._convo.push(messages);
            }
        }

        if(r.result){
            this.appendMsgsAry(r.result);
        }

        this._onAppend.next({
            text:messages,
            messages:r.result??[]
        });

        if(!this.disableAutoFlatten && !disableAutoFlatten){
            this.autoFlattenAsync(false);
        }

        return r;
    }

    private autoFlattenId=0;
    private async autoFlattenAsync(skipDelay:boolean){
        const id=++this.autoFlattenId;
        if(this.autoFlattenDelayMs>0 && !skipDelay){
            await delayAsync(this.autoFlattenDelayMs);
            if(this.isDisposed || id!==this.autoFlattenId){
                return undefined;
            }
        }

        return await this.getAutoFlattenPromise(id);

    }

    private autoFlatPromiseRef:{promise:Promise<FlatConvoConversation|undefined>,id:number}|null=null;
    private getAutoFlattenPromise(id:number){
        if(this.autoFlatPromiseRef?.id===id){
            return this.autoFlatPromiseRef.promise;
        }
        const promise=this.setFlattenAsync(id);
        this.autoFlatPromiseRef={
            id,
            promise,
        }
        return promise;
    }

    private async setFlattenAsync(id:number){
        const flat=await this.flattenAsync(undefined,{setCurrent:false});
        if(this.isDisposed || id!==this.autoFlattenId){
            return undefined;
        }
        this.setFlat(flat,false);
        return flat;
    }

    /**
     * Get the flattened version of this Conversation.
     * @param noCache If true the Conversation will not used the current cached version of the
     *                flattening and will be re-flattened.
     */
    public async getLastAutoFlatAsync(noCache=false):Promise<FlatConvoConversation|undefined>
    {
        if(noCache){
            return (await this.autoFlattenAsync(true))??this.flat??undefined;
        }
        return (
            this.flat??
            (await this.getAutoFlattenPromise(this.autoFlattenId))??
            this.flat??
            undefined
        )
    }

    public getLastMessage():ConvoMessage|undefined{
        return this.messages[this.messages.length-1];
    }

    public getLastUserMessage<T extends ConvoMessage|FlatConvoMessage|ConvoCompletionMessage>(messages:(T|null|undefined)[]|null|undefined):T|undefined{
        if(!messages){
            return undefined;
        }
        for(let i=messages.length-1;i>=0;i--){
            const msg=messages[i];
            if(msg && this.isUserMessage(msg)){
                return msg;
            }
        }
        return undefined;
    }

    public getLastUserOrThinkingMessage<T extends ConvoMessage|FlatConvoMessage|ConvoCompletionMessage>(messages:(T|null|undefined)[]|null|undefined):T|undefined{
        if(!messages){
            return undefined;
        }
        for(let i=messages.length-1;i>=0;i--){
            const msg=messages[i];
            if(msg && this.isUserOrThinkingMessage(msg)){
                return msg;
            }
        }
        return undefined;
    }

    public appendUserMessage(message:string,options?:ConvoMessagePrefixOptions){
        this.append(formatConvoMessage('user',message,this.getPrefixTags(options)));
    }

    public appendAssistantMessage(message:string,options?:ConvoMessagePrefixOptions){
        this.append(formatConvoMessage('assistant',message,this.getPrefixTags(options)));
    }

    public appendMessage(role:string,message:string,options?:ConvoMessagePrefixOptions){
        this.append(formatConvoMessage(role,message,this.getPrefixTags(options)));
    }

    public appendDefine(defineCode:string,description?:string):ConvoParsingResult{
        return this.append((description?convoDescriptionToComment(description)+'\n':'')+'> define\n'+defineCode);
    }

    public appendTopLevel(defineCode:string,description?:string):ConvoParsingResult{
        return this.append((description?convoDescriptionToComment(description)+'\n':'')+'> do\n'+defineCode);
    }

    public getVar(nameOrPath:string,defaultValue?:any):any{
        return this._flat.value?.exe?.getVar(nameOrPath,null,defaultValue);
    }

    private getPrefixTags(options?:ConvoMessagePrefixOptions){
        let tags='';
        const msg=options?.msg;
        if(this.trackTime || this.getVar(convoVars.__trackTime)){
            tags+=`@${convoTags.time} ${getConvoDateString()}\n`;
        }
        if(!msg){
            return tags;
        }
        if(options?.includeTokenUsage && (this.trackTokens || this.getVar(convoVars.__trackTokenUsage))){
            tags+=`@${convoTags.tokenUsage} ${convoUsageTokensToString(msg)}\n`;
        }
        if(msg.model && (this.trackModel || this.getVar(convoVars.__trackModel))){
            tags+=`@${convoTags.model} ${msg.model}\n`;
        }
        if(msg.endpoint){
            tags+=`@${convoTags.endpoint} ${msg.endpoint}\n`
        }
        if(msg.format){
            tags+=`@${convoTags.format} ${msg.format}\n`
        }
        if(msg.assignTo){
            tags+=`@${convoTags.assignTo} ${msg.assignTo}\n`
        }
        return tags;
    }

    private readonly modelServiceMap:Record<string,ConvoCompletionServiceAndModel[]>={};
    private readonly endpointModelServiceMap:Record<string,Record<string,ConvoCompletionServiceAndModel[]>>={};


    public async getCompletionServiceAsync(flat:FlatConvoConversation):Promise<ConvoCompletionServiceAndModel|undefined>{
        const services=await getConvoCompletionServicesForModelAsync(flat.responseModel??convoAnyModelName,this.completionService?asArray(this.completionService):[],this.modelServiceMap);
        return services[0];

    }
    private setFlat(flat:FlatConvoConversation,dup=true){
        if(this.isDisposed){
            return;
        }
        this.autoFlattenId++;
        this._flat.next(dup?{...flat}:flat);
    }

    public async callFunctionAsync(
        fn:ConvoFunction|string,
        args:Record<string,any>={},
        options?:ConvoCompletionOptions
    ):Promise<any>{
        const c=await this.tryCompleteAsync(options?.task,{...options,returnOnCalled:true},flat=>{
            if(typeof fn === 'object'){
                flat.exe.loadFunctions([{
                    fn,
                    role:'function'
                }])
            }

            return [{
                callFn:typeof fn==='string'?fn:fn.name,
                callParams:args

            }]
        })

        return c.returnValues?.[0];
    }

    public appendFunctionCall(
        functionName:string,
        args?:Record<string,any>
    ){
        this.append(`@${convoTags.toolId} call_${shortUuid()}\n> call ${functionName}(${
            args===undefined?'':spreadConvoArgs(args,true)
        })`)
    }

    public completeWithFunctionCallAsync(
        name:string,
        args?:Record<string,any>,
        options?:ConvoCompletionOptions
    ):Promise<ConvoCompletion>{
        this.appendFunctionCall(name,args);
        return this.completeAsync(options);
    }

    /**
     * Appends a user message then competes the conversation
     * @param append Optional message to append before submitting
     */
    public completeUserMessageAsync(userMessage:string):Promise<ConvoCompletion>{
        this.appendUserMessage(userMessage);
        return this.completeAsync();
    }

    /**
     * Appends the convo to this conversation and return the completion result. Using completeConvoAsync
     * instead of awaiting the convo has a key difference in the fact that function responses
     * are waited for by default when calling completeConvoAsync.
     */
    public async completeAsync<T>(convo:AwaitableConversation<T>,options?:ConvoCompletionOptions):Promise<T>;

    /**
     * Submits the current conversation and optionally appends messages to the conversation before
     * submitting.
     * @param append Optional message to append before submitting
     */
    public async completeAsync(appendOrOptions?:string|ConvoCompletionOptions):Promise<ConvoCompletion>;


    async completeAsync(appendOrOptions?:string|ConvoCompletionOptions|AwaitableConversation<any>,optionsForAwaitable?:ConvoCompletionOptions):Promise<any>{

        if(isAwaitableConversation(appendOrOptions)){
            this.append(appendOrOptions);
            const completion=await this.completeAsync(optionsForAwaitable);
            return getAssumedConvoCompletionValue(completion);
        }

        if(typeof appendOrOptions === 'string'){
            this.append(appendOrOptions);
            appendOrOptions=undefined;
        }
        const modelInputOutput=appendOrOptions?.modelInputOutput;

        if(appendOrOptions?.append){
            this.append(appendOrOptions.append);
        }

        if(appendOrOptions?.debug){
            console.info('Conversation.completeAsync:\n',appendOrOptions.append)
        }

        const result=await this.tryCompleteAsync(
            appendOrOptions?.task,
            appendOrOptions,
            async flat=>{


                return await this.completeWithServiceAsync(flat,modelInputOutput);
            },
        );

        if(appendOrOptions?.debug){
            console.info(
                'Conversation.completeAsync Result:\n',
                result.messages?(result.messages.length===1?result.messages[0]:result.messages):result
            );
        }

        return result;
    }

    private readonly httpEndpointServices:Record<string,ConvoCompletionService<any,any>>={};
    private getHttpService(endpoint:string):ConvoCompletionService<any,any>{
        return this.httpEndpointServices[endpoint]??(this.httpEndpointServices[endpoint]=
            new HttpConvoCompletionService({endpoint})
        )
    }

    private async completeWithServiceAsync(
        flat:FlatConvoConversation,
        modelInputOutput?:ConvoModelInputOutputPair,
    ):Promise<ConvoCompletionMessage[]>{

        //@@with-service

        const convoEndpoint=flat.exe.getVar(convoVars.__convoEndpoint);

        const serviceAndModel=await getConvoCompletionServiceAsync(
            flat,
            (convoEndpoint?
                [this.getHttpService(convoEndpoint)]
            :this.completionService?
                asArray(this.completionService)
            :
                []
            ),
            true,
            convoEndpoint?
                (this.endpointModelServiceMap[convoEndpoint]??(this.endpointModelServiceMap[convoEndpoint]={})):
                this.modelServiceMap
        )

        const lastMsg=flat.messages[flat.messages.length-1];
        let cacheType=(
            (lastMsg?.tags && (convoTags.cache in lastMsg.tags) && (lastMsg.tags[convoTags.cache]??defaultConvoCacheType))??
            flat.exe.getVar(convoVars.__cache)
        );

        if(this.logFlatCached){
            console.info(getFlattenConversationDisplayString(flat,true));
        }

        let cache=cacheType?this.cache?.find(c=>c.cacheType===cacheType):this.cache?.[0];
        if(!cache && (cacheType===true || cacheType===defaultConvoCacheType)){
            cache=convoCacheService();
        }

        if(cache?.getCachedResponse){
            const cached=await cache.getCachedResponse(flat);
            if(cached){
                return cached;
            }
        }

        if(this.logFlat){
            console.info(getFlattenConversationDisplayString(flat,true));
        }

        if(!serviceAndModel){
            return [];
        }


        this.debug?.('To be completed',flat.messages);
        const triggerName=flat.exe.getVar(convoVars.__trigger);
        if(this.inlineHost){
            const last=this.getLastUserOrThinkingMessage(flat.messages);
            if(last){
                this.inlineHost.append(`> ${convoRoles.thinking}${triggerName?' '+triggerName:''} ${last.role} (${this.inlinePrompt?.header})\n${escapeConvo(getFullFlatConvoMessageContent(last))}`,{disableAutoFlatten:true});
            }
            if(flat.exe.getVar(convoVars.__debugInline)){
                this.inlineHost.appendArgsAsComment('debug thinking',flat.messages,true);
            }
        }

        let configInputResult:ModelConfigurationToInputResult|undefined;
        if(serviceAndModel.model){
            configInputResult=await applyConvoModelConfigurationToInputAsync(serviceAndModel.model,flat,this);
        }

        let messages:ConvoCompletionMessage[];

        const lock=getGlobalConversationLock();
        const release=await lock?.waitOrCancelAsync(this._disposeToken);
        if(lock && !release){
            return []
        }
        try{
            if(modelInputOutput!==undefined){
                messages=requireConvertConvoOutput(
                    modelInputOutput.output,
                    serviceAndModel.service.outputType,
                    modelInputOutput.input,
                    serviceAndModel.service.inputType,
                    this.converters,
                    flat
                );
            }else{
                messages=await completeConvoUsingCompletionServiceAsync(flat,serviceAndModel.service,this.converters);
            }
        }finally{
            release?.();
        }

        this.debug?.('Completion message',messages);


        if(serviceAndModel.model && configInputResult){
            applyConvoModelConfigurationToOutput(serviceAndModel.model,flat,messages,configInputResult);
        }

        if(this.inlineHost){
            this.inlineHost.append(messages.map(m=>`> ${convoRoles.thinking}${triggerName?' '+triggerName:''} ${m.role}\n${escapeConvo(m.content)}`),{disableAutoFlatten:true})
            if(flat.exe.getVar(convoVars.__debugInline)){
                this.inlineHost.appendArgsAsComment('debug thinking response',messages,true);
            }
        }

        if(cache?.cachedResponse){
            await cache.cachedResponse(flat,messages);
        }

        return messages;

    }

    /**
     * Completes the conversation and returns the last message as JSON. It is recommended using
     * `@json` mode with the last message that is appended.
     */
    public async completeJsonAsync(appendOrOptions?:string|ConvoCompletionOptions):Promise<any>{
        const r=await this.completeAsync(appendOrOptions);
        if(r.message?.content===undefined){
            return undefined;
        }
        try{
            return parseConvoJsonMessage(r.message.content);
        }catch{
            return undefined;
        }
    }

    /**
     * Completes the conversation and returns the last message as JSON. It is recommended using
     * `@json` mode with the last message that is appended.
     */
    public async completeJsonSchemeAsync<Z extends ZodTypeAny=ZodType<any>, T=z.infer<Z>>(
        params:Z,
        userMessage:string
    ):Promise<T|undefined>{
        const r=await this.completeAsync(/*convo*/`
            > define
            JsonScheme=${zodSchemeToConvoTypeString(params)}

            @json JsonScheme
            > user
            ${escapeConvoMessageContent(userMessage)}
        `);
        if(r.message?.content===undefined){
            return undefined;
        }
        try{
            return parseConvoJsonMessage(r.message.content);
        }catch{
            return undefined;
        }
    }

    private readonly _onCompletionStart=new Subject<ConvoCompletionStartEvt>();
    /**
     * Occurs at the start of a public completion.
     */
    public get onCompletionStart():Observable<ConvoCompletionStartEvt>{return this._onCompletionStart}

    /**
     * Completes the conversation and returns the last message call params. The last message of the
     * conversation should instruct the LLM to call a function.
     */
    public async callStubFunctionAsync(appendOrOptions?:string|ConvoCompletionOptions):Promise<any>{
        if(appendOrOptions === undefined){
            appendOrOptions={};
        }else if(typeof appendOrOptions === 'string'){
            appendOrOptions={append:appendOrOptions};
        }
        appendOrOptions.returnOnCall=true;
        const r=await this.completeAsync(appendOrOptions);
        return r.message?.callParams;
    }

    private async tryCompleteAsync(
        task:string|undefined,
        additionalOptions:ConvoCompletionOptions|undefined,
        getCompletion:ConvoFlatCompletionCallback,
        autoCompleteDepth=0,
        prevCompletion?:ConvoCompletionMessage[],
        preReturnValues?:any[],
    ):Promise<ConvoCompletion>{

        if(this._isCompleting.value){
            return {
                status:'busy',
                messages:[],
                task:task??defaultConvoTask,
            }
        }else{
            this._isCompleting.next(true);
            try{
                const completionPromise=this._completeAsync(undefined,true,additionalOptions?.usage,task,additionalOptions,getCompletion,autoCompleteDepth,prevCompletion,preReturnValues);
                this._onCompletionStart.next({convo:this,completionPromise,options:additionalOptions,task});
                return await completionPromise;
            }finally{
                this._isCompleting.next(false);
            }
        }
    }

    private async completeParallelAsync(
        flat:FlatConvoConversation,
        options:ConvoCompletionOptions|undefined
    ):Promise<ConvoCompletion|undefined>{

        const messages=flat.parallelMessages;

        if(!messages || messages.length<2){
            return undefined;
        }

        const startIndex=this.messages.indexOf(messages[0] as ConvoMessage);
        if(startIndex===-1){
            return undefined;
        }

        const c=await this.completeParallelMessagesAsync(
            messages,
            flat.messages.slice(flat.messages.length-messages.length).map(m=>m.label),
            startIndex,
            options,
            flat.queueRef?true:false,
        );
        return c;

    }

    public async getModelsAsync(serviceOrId:string|ConvoCompletionService<any,any>):Promise<ConvoModelInfo[]>{
        const service=(typeof serviceOrId === 'string')?asArray(this.completionService)?.find(s=>s.serviceId===serviceOrId):serviceOrId;
        if(!service){
            return [];
        }
        return await getConvoCompletionServiceModelsAsync(service);
    }

    public async getAllModelsAsync():Promise<ConvoModelInfo[]>{
        if(!this.completionService){
            return [];
        }
        const models:ConvoModelInfo[]=[];
        const ary=asArray(this.completionService);
        for(const s of ary){
            const m=await getConvoCompletionServiceModelsAsync(s);
            models.push(...m);
        }
        return models;
    }

    private async completeParallelMessagesAsync(
        messages:ConvoMessage[],
        labels:(string|undefined)[],
        startIndex:number,
        options:ConvoCompletionOptions|undefined,
        inQueue:boolean
    ):Promise<ConvoCompletion|undefined>{
        const all=await Promise.all(messages.map(async (msg,i)=>{
            const clone=this.clone(undefined,{disableAutoFlatten:true});
            clone.messages.splice(startIndex,clone.messages.length);
            if(clone.messages[clone.messages.length-1]?.role===convoRoles.parallel){
                clone.messages.pop();
            }
            clone.appendMsgsAry([msg])
            clone._convo.splice(0,clone._convo.length);
            const cps=asArrayItem(clone.completionService);
            const messages:ConvoCompletionMessage[]=[];
            if(cps){
                clone.completionService={
                    serviceId:cps.serviceId,
                    inputType:cps.inputType,
                    outputType:cps.outputType,
                    disableModelInfoCaching:cps.disableModelInfoCaching,
                    canComplete:(model:string|undefined,flat:FlatConvoConversationBase)=>{
                        return cps.canComplete(model,flat)
                    },
                    completeConvoAsync:async (input:any,flat:FlatConvoConversationBase,ctx)=>{
                        const m=await cps.completeConvoAsync(input,flat,ctx);
                        messages.push(...m);
                        return m;
                    },
                    getModelsAsync:async ()=>{
                        return await cps.getModelsAsync?.();
                    }
                }
            }
            try{
                const completion=await clone.completeAsync(options);
                return {
                    completion,
                    convo:clone.convo,
                    msg,
                }
            }finally{
                clone.dispose();

            }
        }));

        if(!inQueue){
            this.append(`> ${convoRoles.parallelEnd}\n`,{disableAutoFlatten:true})
        }

        for(let i=0;i<all.length;i++){
            const c=all[i];
            if(!c){continue}
            this.append(`> ${convoRoles.insert} after ${c.msg.label??labels[i]}\n\n${c.convo}\n\n> ${convoRoles.insertEnd}\n\n`,{
                disableAutoFlatten:true,
            })
        }

        const defaultC=all[all.length-1]?.completion;

        if(defaultC){
            for(let i=all.length-2;i>=0;i--){
                const c=all[i];
                if(!c){continue}
                defaultC.exe?.consumeVars(c.completion.exe)
            }
        }

        return defaultC;
    }

    private readonly _isCompleting:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isCompletingSubject():ReadonlySubject<boolean>{return this._isCompleting}
    public get isCompleting(){return this._isCompleting.value}

    private async _completeAsync(
        callerExcludeMessages:ConvoMessage[]|undefined,
        isSourceMessage:boolean,
        usage:ConvoTokenUsage|undefined,
        task:string|undefined,
        additionalOptions:ConvoCompletionOptions|undefined,
        getCompletion:ConvoFlatCompletionCallback,
        autoCompleteDepth:number,
        prevCompletion?:ConvoCompletionMessage[],
        preReturnValues?:any[],
        templates?:ConvoMessageTemplate[],
        updateTaskCount=true,
        lastFnCall?:ConvoFnCallInfo,
        appendBeforeReturn:(ConvoMessagePart|string)[]=[],
        completeBeforeReturn:(ConvoPostCompletionMessage|string)[]=[]
    ):Promise<ConvoCompletion>{

        //@@complete

        if(task===undefined){
            task=defaultConvoTask;
        }
        const isDefaultTask=task===defaultConvoTask;

        if(updateTaskCount){
            this._activeTaskCount.next(this.activeTaskCount+1);
        }

        const messageStartIndex=this._messages.length;

        try{
            const append:string[]=[];
            const flat=await this.flattenWithTriggersAsync(()=>this.createConvoExecutionContext(append),{
                setCurrent:false,
                task,
                discardTemplates:!isDefaultTask || templates!==undefined,
                threadFilter:additionalOptions?.threadFilter,
                toolChoice:isSourceMessage?additionalOptions?.toolChoice:undefined,
                excludeMessageSetters:callerExcludeMessages
            });

            let nextCallerExcludeMessages:ConvoMessage[]|undefined;

            if(flat.parallelMessages?.length){
                const parallelResult=await this.completeParallelAsync(flat,additionalOptions);
                if(parallelResult){
                    if(flat.queueRef){
                        this.append(`> ${convoRoles.insert} before ${flat.queueRef.label}\n> ${convoRoles.flush}\n> ${convoRoles.insertEnd}\n`,{disableAutoFlatten:true})
                    }
                    if(!this.disableAutoFlatten && isDefaultTask){
                        this.autoFlattenAsync(false);
                    }
                    if(updateTaskCount){
                        this._activeTaskCount.next(this.activeTaskCount-1);
                    }
                    if(flat.queueRef){
                        return await this._completeAsync(
                            undefined,
                            true,
                            usage,
                            task,
                            additionalOptions,
                            getCompletion,
                            autoCompleteDepth,
                            parallelResult.messages,
                            [],
                            templates,
                            undefined,
                            lastFnCall
                        );
                    }else{
                        return parallelResult;
                    }
                }
            }

            if(flat.templates && !templates){
                templates=flat.templates;
            }
            const exe=flat.exe;
            if(this._isDisposed){
                return {messages:[],status:'disposed',task}
            }

            if(flat.queueRef && isSourceMessage){
                this.append(`> ${convoRoles.insert} before ${flat.queueRef.label}`,{disableAutoFlatten:true,throwOnError:true})
            }

            for(const e in this.unregisteredVars){
                flat.exe.setVar(false,this.unregisteredVars[e],e);
            }

            let ragDoc:ConvoDocumentReference|null|undefined|(ConvoDocumentReference|null|undefined)[];
            let ragMsg:ConvoMessage|undefined;

            const lastFlatMsg=getLastCompletionMessage(flat.messages);
            if( lastFlatMsg &&
                task===defaultConvoTask &&
                flat.ragMode &&
                (this.isUserMessage(lastFlatMsg) || this.isModificationMessage(lastFlatMsg))
            ){
                const ragParams=flat.exe.getVar(convoVars.__ragParams);
                const tol=flat.exe.getVar(convoVars.__ragTol)
                ragDoc=await (this.ragCallback??defaultConvoRagServiceCallback)({
                    params:ragParams && (typeof ragParams === 'object')?ragParams:{},
                    lastMessage:lastFlatMsg,
                    flat,
                    conversation:this,
                    tolerance:(typeof tol === 'number')?tol:defaultConvoRagTol
                });
            }

            if(ragDoc){
                ragMsg=convoRagDocRefToMessage(flat,ragDoc,convoRoles.rag);
                if(ragMsg){
                    flat.messages.push(this.flattenMsg(ragMsg,true,flat.exe));
                    this.applyRagMode(flat.messages,flat.ragMode);
                    this.appendMessageObject(ragMsg,{disableAutoFlatten:true,appendCode:true});
                }
            }

            const lastMsg=this.messages[this.messages.length-1];
            const disableTriggersForLastMsg=getFlatConvoTagBoolean(lastFlatMsg,convoTags.disableTriggers);

            const lastMsgIsFnCall=lastMsg?.fn?.call?true:false;
            let directInvoke=false;
            const completion:ConvoCompletionMessage[]=await (async ()=>{

                if(flat.response){
                    return flat.response;
                }
                if(lastMsg?.fn?.call){
                    if(isDefaultTask){
                        this.setFlat(flat);
                    }
                    return [{
                        callFn:lastMsg.fn.name,
                        callParams:exe.getConvoFunctionArgsValue(lastMsg.fn),
                        tags:{toolId:getConvoTag(lastMsg.tags,convoTags.toolId)?.value??''}
                    }]
                }else if(lastFlatMsg?.eval){
                    if(isDefaultTask){
                        this.setFlat(flat);
                    }
                    return await this.completeUsingEvalAsync(lastFlatMsg,flat);
                }else if(lastFlatMsg?.component==='input'){
                    return await this.completeUsingComponentInputAsync(lastFlatMsg,flat,isDefaultTask)
                }else if(lastMsg?.fn && lastMsg.fn.invoke && !lastMsg?.fn?.call){
                    if(isDefaultTask){
                        this.setFlat(flat);
                    }
                    directInvoke=true;
                    return [{
                        role:'assistant',
                        callFn:lastMsg.fn.name,
                        callParams:[],
                        tags:{[convoTags.toolId]:shortUuid()}
                    }]
                }else{
                    return await getCompletion(flat)
                }
            })()

            if(this._isDisposed){
                return {messages:[],status:'disposed',task};
            }

            let cMsg:ConvoCompletionMessage|undefined=undefined;

            let returnValues:any[]|undefined=undefined;

            let lastResultValue:any=undefined;
            let hasReturnValue=false;
            const transformResults:ConvoCompletionMessage[]=[];

            for(let mi=0;mi<completion.length;mi++){

                const msg=completion[mi];
                if(!msg){
                    continue;
                }


                let includeTokenUsage=(msg.inputTokens || msg.outputTokens || msg.tokenPrice)?true:false;

                if(includeTokenUsage){
                    addConvoUsageTokens(this.usage,msg);
                    if(this._onTokenUsage){
                        this._onTokenUsage(convoPartialUsageTokensToUsage(msg));
                    }
                }

                const tagsCode=msg.tags?convoTagMapToCode(msg.tags,'\n'):'';

                if(msg.format==='json' && msg.content){
                    let json=parseConvoJsonMessage(msg.content,msg.formatIsArray);
                    if(msg.formatIsArray && !Array.isArray(json) && Array.isArray(json?.values)){
                        json=json.values;
                    }
                    msg.content=JSON.stringify(json,null,4)
                }

                if(msg.content){
                    let transformResult:TransformFlatResult|undefined;
                    if(flat.transforms && !msg.format && !transformResults.includes(msg)){
                        transformResult=await this.transformUsingFlatTransformersAsync(flat,msg,getCompletion);
                    }
                    cMsg=msg;
                    if(isDefaultTask && !transformResult?.removeMessage){
                        this.append(`${
                            this.getPrefixTags({includeTokenUsage,msg})
                        }${
                            transformResult?.hideMessage?`@${convoTags.hidden}\n`:''
                        }${
                            tagsCode
                        }> ${
                            this.getReversedMappedRole(msg.role)
                        }\n${
                            escapeConvoMessageContent(msg.content)
                        }\n`);
                    }
                    includeTokenUsage=false;

                    if(transformResult){
                        this.writeTransformResult(transformResult);
                        if(transformResult.transforms.length){
                            transformResults.push(...transformResult.completions);
                            completion.splice(mi+1,0,...transformResult.completions);
                        }
                    }
                }

                if(msg.assignTo){
                    exe.setVarUsingCompletionMessage(true,msg,msg.assignTo);
                }

                if(additionalOptions?.returnOnCall && msg.callFn){
                    cMsg = msg;
                }else if(msg.callFn){
                    let callMessage:ConvoMessage|undefined;
                    if(lastMsgIsFnCall){
                        callMessage=lastMsg;
                        if(!callMessage){
                            throw new Error('Call last message failed')
                        }
                    }else{
                        const callMsg=`${
                            this.getPrefixTags({includeTokenUsage,msg})
                        }${
                            tagsCode
                        }> call ${
                            msg.callFn
                        }(${
                            msg.callParams===undefined?'':spreadConvoArgs(msg.callParams,true)
                        })`
                        const result=isDefaultTask?this.append(callMsg):this.parseCode(callMsg);
                        includeTokenUsage=false;
                        callMessage=result.result?.[0];
                        if(result.result?.length!==1 || !callMessage){
                            throw new ConvoError(
                                'function-call-parse-count',
                                {completion:msg},
                                'failed to parse function call. Exactly 1 function call should have been parsed'
                            );
                        }
                    }
                    exe.clearSharedSetters();
                    if(!callMessage.fn?.call){
                        continue;
                    }
                    const target=this._messages.find(m=>m.fn && !m.fn.call && m.fn?.name===callMessage?.fn?.name);
                    const taskName=exe.getTagValueByName(target,convoTags.taskName);
                    const taskDescription=exe.getTagValueByName(target,convoTags.taskDescription);
                    const disposeTaskDisplay=((taskName || taskDescription)?
                        this.addTask({
                            name:(taskName && taskDescription)?`${taskName} - ${taskDescription}`:(taskName || taskDescription)
                        })
                    :null);

                    let callResult:ConvoExecuteResult|undefined;
                    let callResultValue:any;
                    try{
                        callResult=await exe.executeFunctionResultAsync(callMessage.fn);
                        if(this._isDisposed){
                            return {messages:[],status:'disposed',task}
                        }
                        callResultValue=callResult.valuePromise?(await callResult.valuePromise):callResult.value;
                    }finally{
                        disposeTaskDisplay?.();
                    }
                    const disableAutoComplete=(
                        !isDefaultTask ||
                        exe.getVarEx(convoDisableAutoCompleteName,undefined,callResult.scope,false)===true ||
                        containsConvoTag(target?.tags,convoTags.disableAutoComplete)
                    )
                    if(!returnValues){
                        returnValues=[];
                    }
                    returnValues.push(callResultValue);

                    if(target?.fn){
                        lastFnCall={
                            name:target.fn.name,
                            message:target,
                            fn:target.fn,
                            returnValue:callResultValue
                        };
                    }

                    lastResultValue=(typeof callResultValue === 'function')?undefined:callResultValue;
                    hasReturnValue=true;

                    if(!nextCallerExcludeMessages){
                        nextCallerExcludeMessages=[];
                    }
                    nextCallerExcludeMessages.push(...this.appendFunctionSetters(exe,isDefaultTask,lastResultValue));

                    if(this.appendAfterCall.length){
                        const appendAfter=this.appendAfterCall.join('\n\n');
                        this.appendAfterCall.splice(0,this.appendAfterCall.length);
                        this.append(appendAfter,{disableAutoFlatten:true})
                    }

                    if(disableAutoComplete){
                        lastResultValue=undefined;
                        hasReturnValue=false;
                    }

                    if(isDefaultTask){
                        this.setFlat(flat);
                    }
                    const ac=flat.afterCall?.[msg.callFn];
                    if(ac){
                        completeBeforeReturn.push(...ac);
                    }

                }

                if(includeTokenUsage && isDefaultTask){
                    this.append(`${this.getPrefixTags({includeTokenUsage,msg})}> define\n// token usage placeholder`);
                    includeTokenUsage=false;
                }

            }

            if(prevCompletion){
                completion.unshift(...prevCompletion);
            }
            if(preReturnValues){
                if(returnValues){
                    returnValues.unshift(...preReturnValues);
                }else{
                    returnValues=preReturnValues;
                }
            }

            if(flat.queueRef && isSourceMessage){
                appendBeforeReturn.push(`> ${convoRoles.flush}\n> ${convoRoles.insertEnd}\n`);
            }

            if(append.length){
                if(isDefaultTask){
                    for(const a of (append as string[])){
                        this.append(a);
                    }
                }
            }else if(hasReturnValue && autoCompleteDepth<this.maxAutoCompleteDepth && !(additionalOptions?.returnOnCalled || directInvoke)){
                return await this._completeAsync(
                    nextCallerExcludeMessages,
                    false,
                    undefined,
                    task,
                    additionalOptions,
                    getCompletion,
                    autoCompleteDepth+1,
                    completion,
                    returnValues,
                    templates,
                    undefined,
                    lastFnCall,
                    appendBeforeReturn,
                    completeBeforeReturn
                );
            }

            if(isDefaultTask && templates?.length){
                this.writeTemplates(templates,flat);
            }

            if(appendBeforeReturn.length){
                this.append(appendBeforeReturn,{disableAutoFlatten:true,throwOnError:true});
            }

            if(!this.disableAutoFlatten && isDefaultTask){
                this.autoFlattenAsync(false);
            }


            if(flat.taskTriggers?.[convoTaskTriggers.onResponse]){
                this.startSubTasks(flat,convoTaskTriggers.onResponse,getCompletion,autoCompleteDepth+1,additionalOptions);
            }

            if(completeBeforeReturn.length){
                const parts:string[]=[];
                for(const _cm of completeBeforeReturn){
                    let cm=_cm;
                    let content:string|undefined;
                    if(typeof cm === 'string'){
                        content=cm;
                        cm={}
                    }else if(cm.evalMessage){
                        if(cm.evalMessage.content){
                            content=cm.evalMessage.content;
                        }else if(cm.evalMessage.statement){
                            const flatMsg=this.flattenMsg(cm.evalMessage,false,flat.exe);
                            await flattenMsgAsync(
                                exe,
                                cm.evalMessage.statement,
                                flatMsg,
                                false
                            );
                            content=flatMsg.content;
                        }
                    }
                    if(content){
                        parts.push(`${
                            cm.hidden?`@${convoTags.hidden}\n`:''
                        }${
                            cm.createdAfterCalling?`@${convoTags.createdAfterCalling} ${cm.createdAfterCalling}\n`:''
                        }> ${cm.evalRole??cm.evalMessage?.role??convoRoles.user}\n${escapeConvo(content)}`)
                    }
                }
                this.append(parts,{disableAutoFlatten:true,throwOnError:true});
                this._completeAsync(
                    undefined,
                    false,
                    undefined,
                    task,
                    additionalOptions,
                    getCompletion,
                    autoCompleteDepth+1,
                    undefined,
                    undefined,
                    templates,
                    undefined,
                    undefined,
                    undefined,
                    undefined
                )
            }

            if(flat.queueRef){
                return await this._completeAsync(
                    undefined,
                    true,
                    usage,
                    task,
                    additionalOptions,
                    getCompletion,
                    autoCompleteDepth,
                    completion,
                    returnValues,
                    templates,
                    undefined,
                    lastFnCall
                );
            }

            if( !this.disableTriggers &&
                cMsg &&
                flat.messageTriggers &&
                this.isContentMessage(cMsg) &&
                !getFlatConvoTagBoolean(cMsg,convoTags.disableTriggers) &&
                !disableTriggersForLastMsg)
            {
                await this.evalTriggersAsync(cMsg,flat.messageTriggers,flat,false)
            }

            return {
                status:'complete',
                message:cMsg,
                messages:completion,
                exe,
                returnValues,
                lastFnCall,
                task
            }
        }finally{
            if(usage){
                addConvoUsageTokens(usage,this.getTokenUsage(messageStartIndex));
            }
            if(updateTaskCount){
                this._activeTaskCount.next(this.activeTaskCount-1);
            }
        }
    }

    private async transformUsingFlatTransformersAsync(
        flat:FlatConvoConversation,
        msg:ConvoCompletionMessage,
        getCompletion:ConvoFlatCompletionCallback
    ):Promise<TransformFlatResult|undefined>{
        if(!flat.transforms?.length){
            return undefined;
        }
        let removeMessage=false;
        let hideMessage=false;
        let inputTokens=0;
        let outputTokens=0;
        let tokenPrice=0;

        const transformSelections=flat.transforms.filter(t=>!t.required);
        const selectedTransforms=flat.transforms.filter(t=>t.required);
        if(transformSelections.length){
            const forked=await this.flattenAsync(flat.exe,{
                setCurrent:false,
                initFlatMessages:flat.transformFilterMessages,
                messages:flat.transformFilterMessages?.length?undefined:this.parseCode(/*convo*/`
                    > define
                    TransformId=struct(
                        # Id of the transform to select
                        id:number
                    )

                    > system
                    You are selecting the best transform to apply to user messages. Transforms are
                    used to convert a users message into JSON data that can be used to display
                    custom user interface components.

                    Transform to select from:
                    <transforms>

                        ${transformSelections.map((t,i)=>/*convo*/`
                        <transform>
                            ID: ${i+1}
                            Name: ${t.name}
                            Description:
                            <description>
                                ${t.description??'No description provided'}
                            </description>
                        </transform>
                        `).join('')}

                        <transform>
                            ID: ${transformSelections.length+1}
                            Name: NONE
                            Description:
                            <description>
                                No other transforms match. Do not transform the user message
                            </description>
                        </transform>

                    </transforms>

                    @json TransformId
                    > user
                    ${escapeConvo(msg.content??'')}
                `).result,
                disableTransforms:true,
            });

            const completions=await getCompletion(forked);
            for(const msg of completions){
                inputTokens+=msg.inputTokens??0;
                outputTokens+=msg.outputTokens??0;
                tokenPrice+=msg.tokenPrice??0;
            }
            const lastMsg=completions[completions.length-1];
            try{
                const transformId:{id:number}=parseJson5(lastMsg?.content??'');
                const selected=transformSelections[transformId.id-1];
                if(selected){
                    selectedTransforms.push(selected);
                }
            }catch(ex){
                log.error('Transform filter last message not JSON',ex);
            }
        }

        const transforms=await Promise.all(selectedTransforms.map<Promise<TransformCompletion>>(async transform=>{

            const r=this.parseCode(/*convo*/`
                ${transform.outputType?`@json ${transform.outputType}`:''}
                > user
                ${escapeConvo(msg.content??'')}
            `);
            if(!r.result){
                throw new Error(`Unable to parse transform append message - ${r.error?.message}`);
            }

            let completions:ConvoCompletionMessage[];

            const outputType=transform.outputType?flat.exe.getVar(transform.outputType):undefined;
            if(getConvoStructPropertyCount(outputType)){
                const forked=await this.flattenAsync(flat.exe,{
                    setCurrent:false,
                    initFlatMessages:transform.messages,
                    messages:r.result,
                    disableTransforms:true,
                });
                completions=await getCompletion(forked);
                for(const msg of completions){
                    inputTokens+=msg.inputTokens??0;
                    outputTokens+=msg.outputTokens??0;
                    tokenPrice+=msg.tokenPrice??0;
                }
            }else{
                completions=[{
                    content:'{}',
                    format:'json',
                    role:'assistant',
                    formatTypeName:transform.outputType,
                    inputTokens:0,
                    outputTokens:0,
                    tokenPrice:0
                }]
            }

            const lastMsg=completions[completions.length-1];
            const tags:ConvoTag[]=[{name:convoTags.createdByTransform,value:transform.name}];
            let disableComponent=false;
            let renderOnly=false;
            for(const m of transform.messages){
                if(m.tags){
                    const keep=convoTags.transformKeepSource in m.tags;
                    if(!keep && (convoTags.transformHideSource in m.tags) && evalConvoTransformCondition(lastMsg?.content??'',m.tags[convoTags.transformHideSource])){
                        hideMessage=true;
                    }
                    if(!keep && (convoTags.transformRemoveSource in m.tags)  && evalConvoTransformCondition(lastMsg?.content??'',m.tags[convoTags.transformRemoveSource])){
                        removeMessage=true;
                    }
                    if((convoTags.transformRenderOnly in m.tags)  && evalConvoTransformCondition(lastMsg?.content??'',m.tags[convoTags.transformRenderOnly])){
                        renderOnly=true;
                    }
                    if(convoTags.transformComponentCondition in m.tags){
                        disableComponent=!evalConvoTransformCondition(lastMsg?.content??'',m.tags[convoTags.transformComponentCondition]);
                    }
                    const passTags=getFlatConvoTagValues(convoTags.transformTag,m.tags);
                    for(const t of passTags){
                        const tag=parseConvoTransformTag(t);
                        if(tag){
                            tags.push(tag);
                        }
                    }
                }
            }
            return {
                tags,
                transform,
                completions,
                disableComponent,
                renderOnly,
            }
        }));

        for(const transform of transforms){

            const {disableComponent,tags,completions,renderOnly}=transform;


            if(disableComponent){
                tags.push({name:convoTags.disabled});
            }else if(renderOnly && !containsConvoTag(tags,convoTags.renderOnly)){
                tags.push({name:convoTags.renderOnly});
            }

            for(const m of completions){
                if(tags.length){
                    const mapped=convoTagsToMap(tags,flat.exe);
                    if(!m.tags){
                        m.tags={};
                        for(const e in mapped){
                            if(disableComponent && e===convoTags.component){
                                continue;
                            }
                            m.tags[e]=mapped[e];
                        }
                    }
                }
            }
        }

        const allInputTokens=inputTokens;
        const allOutputTokens=outputTokens;
        const allTokenPrice=tokenPrice;

        const completions:ConvoCompletionMessage[]=[];
        for(let i=transforms.length-1;i>=0;i--){
            const t=transforms[i];
            if(t){
                completions.push(...t.completions);
                for(const msg of t.completions){
                    inputTokens-=msg.inputTokens??0;
                    outputTokens-=msg.outputTokens??0;
                    tokenPrice-=msg.tokenPrice??0;
                }
            }
        }

        return {
            hideMessage,
            removeMessage,
            transforms,
            completions,
            inputTokens,
            outputTokens,
            tokenPrice,
            publicResult:{
                inputTokens:allInputTokens,
                outputTokens:allOutputTokens,
                tokenPrice:allTokenPrice,
                selectedTransforms:transforms.length?transforms.map(t=>t.transform.name):undefined,
            }
        };

    }

    private writeTransformResult(transformResult:TransformFlatResult){

        if(transformResult.inputTokens || transformResult.outputTokens || transformResult.tokenPrice){
            addConvoUsageTokens(this.usage,transformResult);
            if(this._onTokenUsage){
                this._onTokenUsage(convoPartialUsageTokensToUsage(transformResult));
            }
        }
        this.append(
            `@${convoTags.tokenUsage} ${convoUsageTokensToString(transformResult)
            }\n> ${convoRoles.transformResult}\n${
                JSON.stringify(transformResult.publicResult,null,4)
            }\n`
        ,{disableAutoFlatten:true});

        return transformResult;
    }

    private writeTemplates(
        templates:ConvoMessageTemplate[],
        flat:FlatConvoConversation
    ){
        for(let i=0;i<templates.length;i++){
            const tmpl=templates[i];
            if(!tmpl?.watchPath || !tmpl.message.statement?.source){continue}

            const value=flat.exe.getVar(tmpl.watchPath);
            if( value!==tmpl.startValue &&
                (tmpl.matchValue===undefined?
                    true:
                    (value?.toString()??'')===tmpl.matchValue
                )
            ){

                const tags:string[]=[];
                if(tmpl.message.tags){
                    for(let t=0;t<tmpl.message.tags.length;t++){
                        const tag=tmpl.message.tags[t];
                        if(!tag || tag.name===convoTags.template){continue}
                        tags.push(`@${tag.name}${tag.value?' '+tag.value:''}\n`)

                    }
                }

                const tmplMsg=`@${convoTags.sourceTemplate}${
                    tmpl.name?' '+tmpl.name:''
                }\n${
                    tags.join('')
                }${
                    tmpl.message.statement.source
                }`;

                this.append(tmplMsg);
            }

        }
    }

    private startSubTasks(
        flat:FlatConvoConversation,
        trigger:string,
        getCompletion:ConvoFlatCompletionCallback,
        autoCompleteDepth:number,
        additionalOptions:ConvoCompletionOptions|undefined)
    {
        const tasks=flat.taskTriggers?.[trigger];
        if(!tasks?.length){
            return;
        }

        let added=false;
        const remove:ConvoSubTask[]=[];

        const subs=tasks.map<ConvoSubTask>(task=>{
            const promise=this._completeAsync(undefined,false,undefined,task,additionalOptions,getCompletion,autoCompleteDepth);
            const sub:ConvoSubTask={
                name:task,
                promise
            }

            promise.then(()=>{
                if(added){
                    removeBehaviorSubjectAryValue(this._subTasks,sub);
                }else{
                    remove.push(sub);
                }
            })

            return sub;
        });

        pushBehaviorSubjectAryMany(this._subTasks,subs);
        added=true;
        if(remove.length){
            removeBehaviorSubjectAryValueMany(this._subTasks,remove);
        }
    }


    public getReversedMappedRole(role:string|null|undefined):string{
        if(!role){
            return 'user';
        }
        for(const e in this.roleMap){
            if(this.roleMap[e]===role){
                return e;
            }
        }
        return role;
    }

    public getMappedRole(role:string|null|undefined):string{
        if(!role){
            return 'user';
        }
        return this.roleMap[role]??role;
    }

    public createConvoExecutionContext(append:string[]=[]):ConvoExecutionContext{

        this.beforeCreateExeCtx?.(this);

        const flatExe=new ConvoExecutionContext({
            conversation:this,
            convoPipeSink:(value)=>{
                if(!(typeof value === 'string')){
                    value=value?.toString();
                    if(!value?.trim()){
                        return value;
                    }
                }
                append.push(value);
                return value;
            }
        },this);
        flatExe.print=this.print;
        if(this.defaultOptions.allowEvalCode){
            flatExe.setVar(true,convoScopeFunctionEvalJavascript,'evalJavascript');
        }
        for(const e in this.defaultVars){
            flatExe.setVar(true,this.defaultVars[e],e);
        }
        return flatExe;
    }

    public isSystemMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined):boolean{
        return (msg?.role && this.systemRoles.includes(msg.role) && !(msg as any).fn)?true:false;
    }

    public isAssistantMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined):boolean{
        return (msg?.role && this.assistantRoles.includes(msg.role) && !(msg as any).fn)?true:false;
    }

    public isUserMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined):boolean{
        return (msg?.role && (this.userRoles.includes(msg.role) || !(msg.role in convoRoles))&& !(msg as any).fn)?true:false;
    }

    public isModificationMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined):boolean{
        return allConvoMessageModificationAction.includes(msg?.role as any);
    }

    public isUserOrThinkingMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined):boolean{
        return ( msg?.role===convoRoles.thinking || this.isUserMessage(msg));
    }

    public isContentMessage(msg:ConvoMessage|FlatConvoMessage|ConvoCompletionMessage|null|undefined){
        return this.isUserMessage(msg) || this.isAssistantMessage(msg) || this.isSystemMessage(msg);
    }

    private flattenMsg(msg:ConvoMessage,setContent:boolean,exe:ConvoExecutionContext,tagPullFromIndex?:number,tagPullList?:ConvoMessage[]):FlatConvoMessage{

        //@@msgFlat

        let tags=msg.tags;
        if(tagPullFromIndex!==undefined && tagPullList && !getConvoTag(msg.tags,convoTags.disableModifiers)){
            for(;tagPullFromIndex<tagPullList.length;tagPullFromIndex++){
                const pullMsg=tagPullList[tagPullFromIndex];
                if(!pullMsg || getConvoTag(pullMsg.tags,convoTags.disableModifiers)){
                    continue;
                }

                if(!isConvoMessageModificationAction(pullMsg.role)){
                    break;
                }
                if(pullMsg.tags){
                    if(!tags){
                        tags=[];
                    }
                    tags.push(...pullMsg.tags);
                }
            }
        }

        const flat:FlatConvoMessage={
            role:this.getMappedRole(msg.role),
            tags:tags?convoTagsToMap(tags,exe):undefined,
        }

        const cond=getConvoTag(msg.tags,convoTags.condition);
        if(cond){
            setFlatConvoMessageCondition(flat,cond);
            if(flat.tags){
                delete flat.tags[convoTags.condition];
            }
        }

        if(msg.jsonValue){
            setFlatConvoMessageCachedJsonValue(flat,msg.jsonValue);
        }

        if(setContent){
            flat.content=msg.content;
        }

        if(msg.component!==undefined){
            flat.component=msg.component;
        }
        if(msg.sourceId!==undefined){
            flat.sourceId=msg.sourceId;
        }
        if(msg.sourceUrl!==undefined){
            flat.sourceUrl=msg.sourceUrl;
        }
        if(msg.sourceName!==undefined){
            flat.sourceName=msg.sourceName;
        }
        if(msg.isSuggestion!==undefined){
            flat.isSuggestion=msg.isSuggestion;
        }
        if(msg.renderTarget){
            flat.renderTarget=msg.renderTarget;
        }
        if(msg.renderOnly){
            flat.renderOnly=true;
        }
        if(msg.markdown){
            flat.markdown=msg.markdown;
        }
        if(this.isUserMessage(msg)){
            flat.isUser=true;
        }else if(this.isAssistantMessage(msg)){
            flat.isAssistant=true;
        }else if(this.isSystemMessage(msg)){
            flat.isSystem=true;
        }
        if(msg.tid){
            flat.tid=msg.tid;
        }
        if(msg.eval){
            flat.eval=msg.eval;
        }
        if(msg.userId){
            flat.userId=msg.userId;
        }
        if( flat.tags &&
            (convoTags.vision in flat.tags) &&
            flat.tags[convoTags.vision]!=='false'
        ){
            flat.vision=true;
        }
        if(msg.preSpace){
            flat.preSpace=true;
        }
        if(msg.label){
            flat.label=msg.label;
        }
        if(msg.insert){
            flat.insert={...msg.insert};
        }
        return flat;
    }

    private importMessages:ConvoMessage[]=[];

    /**
     * Called when an import message is found
     */
    private async loadImportsAsync(msg:ConvoMessage,exe?:ConvoExecutionContext):Promise<void>
    {
        if(this.importMessages.includes(msg) || !msg.tags){
            return;
        }
        this.importMessages.push(msg);

        const index=Math.max(0,this._messages.indexOf(msg));
        for(const t of msg.tags){
            if(t.name!==convoTags.import || !t.value){
                continue;
            }
            const imported=await this.importAsync(t.value,{sourceFilepath:msg[convoMessageSourcePathKey]},index);
            exe?.loadFunctions(imported,this.externFunctions);
        }
    }

    public async importAsync(name:string,context:ConvoImportContext,index?:number):Promise<ConvoMessage[]>
    {
        const handler=this.defaultOptions.importHandler;

        const modifiers=name.split(' ');
        name=''
        for(let i=0;i<modifiers.length;i++){
            const m=modifiers[i];
            if(m?.startsWith('!')){
                modifiers[i]=m.substring(1);
            }else{
                name=m??'';
                modifiers.splice(i,1);
                i--;
            }

        }
        if(!name){
            throw new Error(`Invalid import - @import ${modifiers.join(' ')}`)
        }

        const imports:ConvoModule[]=[];

        const reg=name.includes('*')?starStringToRegex(name):undefined;
        for(const mod of this.modules){
            if(reg?reg.test(mod.name):mod.name===name){
                imports.push(mod);
            }
        }

        let system:boolean|undefined=false;
        let ignoreContent:boolean|undefined=false;
        if(!imports.length && handler){
            system=modifiers.includes(convoImportModifiers.system);
            ignoreContent=modifiers.includes(convoImportModifiers.ignoreContent);

            const result=await handler({
                ...context,
                name,
                modifiers,
                system,
                ignoreContent,
                sourceDirectory:context?.sourceFilepath?getDirectoryName(context.sourceFilepath):undefined
            });
            if(result){
                if(Array.isArray(result)){
                    imports.push(...result)
                }else{
                    imports.push(result);
                }
            }
        }

        if(!imports.length){
            throw new Error(`Convo import (${name}) not found`)
        }

        const messages:ConvoMessage[]=[];
        for(const i of imports){
            if(!this.importedModules[i.name]){
                messages.push(...this.registerModule(i,{name:i.name,modifiers,system,ignoreContent,},index));
            }
        }
        return messages;
    }

    public readonly importedModules:Record<string,ConvoModule>={};

    private registerModule(module:ConvoModule,importStatement:ConvoImport={
        name:module.name,
        modifiers:[],
        system:false,
        ignoreContent:false,
    },insertIndex?:number){

        if(this.importedModules[module.name]){
            throw new Error(`ConvoModule already registered by name - ${module.name}`);
        }

        this.importedModules[module.name]=module;

        if(module.components){
            for(const name in module.components){
                const comp=module.components[name];
                if(!comp){
                    continue;
                }
                this.components[name]=comp;
            }
        }

        if(module.externFunctions){
            for(const name in module.externFunctions){
                const fn=module.externFunctions[name];
                if(!fn){
                    continue;
                }
                this.implementExternFunction(name,fn);
            }
        }

        if(module.externScopeFunctions){
            for(const name in module.externFunctions){
                const fn=module.externScopeFunctions[name];
                if(!fn){
                    continue;
                }
                this.externFunctions[name]=fn;
            }
        }

        let convo=module.convo??'';

        if(module.type){
            convo=(
                '> define\n'+
                asArray(module.type).map(t=>`${t.name} = ${schemeToConvoTypeString(t.type)}`).join('\n')+
                '\n\n'+
                convo
            );

        }

        if(!convo){
            return [];
        }
        const r=this.parseCode(convo);
        if(r.error){
            throw r.error;
        }

        const {system,ignoreContent}=importStatement;

        if(r.result){
            for(let i=0;i<r.result.length;i++){
                const msg=r.result[i];

                if(!msg){
                    continue;
                }

                if(module.filePath){
                    msg[convoMessageSourcePathKey]=module.filePath;
                }

                if(!system && !ignoreContent){
                    continue;
                }

                if( (ignoreContent && (msg.content!==undefined || msg.statement!==undefined) && msg.role!=='system') ||
                    (system && msg.role!=='system')
                ){
                    r.result.splice(i,1);
                    i--;
                    continue;
                }

            }
            this.appendMsgsAry(r.result,insertIndex);
        }

        return r.result??[];
    }

    public async flattenSourceAsync({
        appendTo,convo,cacheName,options,passExe
    }:FlattenSourceOptions){
        const cached=cacheName?flattenSourceCache[cacheName]:undefined;
        let flat:FlatConvoConversation;
        if(cached){
            flat=cached;
        }else{
            flat=await this.flattenAsync(passExe?appendTo?.exe:undefined,{
                setCurrent:false,
                messages:this.parseCode(convo).result,
                ...options
            });
            if(cacheName){
                flattenSourceCache[cacheName]=flat;
            }
        }
        if(appendTo){
            appendTo.messages.push(...flat.messages);
            appendTo.hiddenSource=(appendTo.hiddenSource?appendTo.hiddenSource+'\n\n':'')+convo;
        }
        return false;
    }

    private async flattenWithTriggersAsync(
        getExe:()=>ConvoExecutionContext,
        options:FlattenConvoOptions={}
    ):Promise<FlatConvoConversation>{
        const flat=await this.flattenAsync(getExe?.(),options);
        const lastFlatMsg=getLastCompletionMessage(flat.messages);
        const disableTriggersForLastMsg=getFlatConvoTagBoolean(lastFlatMsg,convoTags.disableTriggers);

        if( !this.disableTriggers &&
            lastFlatMsg &&
            flat.messageTriggers &&
            this.isContentMessage(lastFlatMsg) &&
            !disableTriggersForLastMsg
        ){
            const startLen=this._messages.length;
            await this.evalTriggersAsync(lastFlatMsg,flat.messageTriggers,flat,true);
            if(this._messages.length!==startLen){
                const updated=await this.flattenAsync(getExe?.(),options);
                if(flat.response){
                    updated.response=flat.response;
                }
                return updated;
            }
        }


        return flat;
    }

    public async flattenAsync(
        exe:ConvoExecutionContext=this.createConvoExecutionContext(),
        {
            task=defaultConvoTask,
            setCurrent=task===defaultConvoTask,
            discardTemplates,
            threadFilter,
            toolChoice,
            messages:messageOverride,
            disableTransforms=this.disableTransforms,
            initFlatMessages,
            messageStartIndex=0,
            flatMessages,
            excludeMessages,
            excludeMessageSetters,
        }:FlattenConvoOptions={}
    ):Promise<FlatConvoConversation>{

        // @@flat

        exe.disableInlinePrompts=true;
        try{
            const isDefaultTask=task===defaultConvoTask;

            const messages:FlatConvoMessage[]=flatMessages??(initFlatMessages?[...initFlatMessages]:[]);
            const edgePairs:{
                flat:FlatConvoMessage;
                msg:ConvoMessage;
                shouldParseMd:boolean;
                setMdVars:boolean;
            }[]=[];
            const mdVarCtx:MdVarCtx={
                indexMap:{},
                vars:{},
                varCount:0,
            };
            exe.setVar(true,mdVarCtx.vars,convoVars.__md);
            let sourceMessages=this._messages;
            if(messageOverride){
                sourceMessages=messageOverride;
            }else if(this.getStartOfConversation){
                const start=this.getStartOfConversation();
                if(Array.isArray(start)){
                    sourceMessages=[...start,...sourceMessages];
                }else if(start){
                    const r=parseConvoCode(start,{logErrors:true});
                    if(r.error){
                        console.error('Dynamic start of conversation parsing failed'+r.error);
                    }else if(r.result){
                        sourceMessages=[...r.result,...sourceMessages];
                    }
                }
            }

            exe.loadFunctions(sourceMessages,this.externFunctions);
            let hasNonDefaultTasks=false;
            let maxTaskMsgCount=-1;
            let taskTriggers:Record<string,string[]>|undefined;
            let templates:ConvoMessageTemplate[]|undefined;
            let componentIndex=0;
            let secondPass=false;
            let queueIndex=0;
            let paraIndex=0;
            let inPara=false;
            let parallelMessages:ConvoMessage[]|undefined;
            let afterCall:Record<string,(ConvoPostCompletionMessage|string)[]>|undefined;
            let messageTriggers:ConvoTrigger[]|undefined;
            const parallelPairs:{msg:ConvoMessage,flat:FlatConvoMessage}[]=[];
            const explicitlyEnabledTransforms:string[]=[];

            messagesLoop: for(let i=messageStartIndex;i<sourceMessages.length;i++){
                const msg=sourceMessages[i];

                if( !msg ||
                    exe.isTagConditionTrueByName(msg,convoTags.disabled,true) ||
                    msg.role===convoRoles.nop ||
                    msg.role===convoRoles.transformResult ||
                    msg.role===convoRoles.thinking ||
                    (msg.cid && msg.cid!==this.name) ||
                    excludeMessages?.includes(msg)
                ){
                    continue;
                }

                let defaultLabel:string|undefined=undefined;
                switch(msg.role){

                    case convoRoles.queue:
                        defaultLabel=`queue-${queueIndex}`;
                        queueIndex++;
                        inPara=false;
                        parallelMessages=undefined;
                        break;

                    case convoRoles.parallel:
                        inPara=true;
                        parallelMessages=[];
                        continue messagesLoop;

                    case convoRoles.parallelEnd:
                        inPara=false;
                        parallelMessages=undefined;
                        continue messagesLoop;

                    default:
                        if(inPara && this.userRoles.includes(msg.role as string) && !msg.fn){
                            defaultLabel=`parallel-${paraIndex}`;
                            paraIndex++;
                            parallelMessages?.push(msg);
                        }
                        break;

                }

                if(secondPassRoles.includes(msg.role)){
                    secondPass=true;
                }

                if(containsConvoTag(msg.tags,convoTags.import) && !this.importMessages.includes(msg)){
                    await this.loadImportsAsync(msg,exe);
                    i--;
                    continue;
                }

                if(msg.role==='user' && !msg.content && !msg.statement){
                    continue;
                }

                const template=getConvoTag(msg.tags,convoTags.template)?.value;
                if(template){
                    if(discardTemplates){
                        continue;
                    }
                    const tmpl=parseConvoMessageTemplate(msg,template);
                    if(!templates){
                        templates=[];
                    }
                    templates.push(tmpl);
                    continue;
                }

                threadFilter=this.getThreadFilter(exe,threadFilter);

                if(threadFilter && !isConvoThreadFilterMatch(threadFilter,msg.tid)){
                    continue;
                }

                const isContentMessage=this.isContentMessage(msg);

                const ac=(isContentMessage || msg.fn) && getConvoTag(msg.tags,convoTags.afterCall)?.value?msg:undefined;
                if(ac){
                    if(!afterCall){
                        afterCall={}
                    }
                    const hidden=containsConvoTag(msg.tags,convoTags.afterCallHide);
                    const role=getConvoTag(msg.tags,convoTags.afterCallRole)?.value;
                    if(ac.fn){
                        const v=getConvoTag(msg.tags,convoTags.afterCall)?.value;
                        if(v){
                            (afterCall[ac.fn.name]??(afterCall[ac.fn.name]=[])).push({
                                content:v,
                                createdAfterCalling:ac.fn.name,
                                evalRole:role,
                                hidden,
                            });
                        }
                    }else{
                        const name=getConvoTag(msg.tags,convoTags.afterCall)?.value;
                        if(name){
                            (afterCall[name]??(afterCall[name]=[])).push({
                                evalMessage:ac,
                                createdAfterCalling:name,
                                evalRole:role,
                                hidden,
                            });
                            continue messagesLoop;
                        }
                    }
                }

                const flat=this.flattenMsg(msg,false,exe,i+1,sourceMessages);
                if(flat.component){
                    flat.componentIndex=componentIndex++;
                }
                if(defaultLabel && !flat.label){
                    flat.label=defaultLabel;
                }
                if(inPara && msg.role!==convoRoles.parallelEnd){
                    flat.parallel=true;
                    parallelPairs.push({msg,flat});
                }


                if(getFlatConvoTagBoolean(flat,convoTags.clear)){
                    const clearSystem=flat.tags?.[convoTags.clear]==='system';
                    for(let i=messages.length-1;i>=0;i--){
                        const m=messages[i];
                        if(!m){
                            continue;
                        }
                        if( (m.isUser || m.isAssistant) &&
                            !getFlatConvoTagBoolean(m,convoTags.noClear) &&
                            (clearSystem?true:!m.isSystem)
                        ){
                            messages.splice(i,1);
                        }
                    }
                }

                const setMdVars=(
                    this.defaultOptions.setMarkdownVars ||
                    containsConvoTag(msg.tags,convoTags.markdownVars)
                );
                const shouldParseMd=(
                    setMdVars ||
                    this.defaultOptions.parseMarkdown ||
                    containsConvoTag(msg.tags,convoTags.markdown)
                )


                const msgTask=getConvoTag(msg.tags,convoTags.task)?.value??defaultConvoTask;
                if(msgTask!==defaultConvoTask){
                    hasNonDefaultTasks=true;
                    flat.task=msgTask;
                    if(isDefaultTask){
                        const trigger=getConvoTag(msg.tags,convoTags.taskTrigger)?.value;
                        if(trigger){
                            if(!taskTriggers){
                                taskTriggers={}
                            }
                            const ary=taskTriggers[trigger]??(taskTriggers[trigger]=[]);
                            if(!ary.includes(msgTask)){
                                ary.push(msgTask);
                            }
                        }
                    }
                }
                if(msgTask===task){
                    const maxTasks=getConvoTag(msg.tags,convoTags.maxTaskMessageCount)?.value;
                    if(maxTasks){
                        maxTaskMsgCount=safeParseNumber(maxTasks,maxTaskMsgCount);
                    }
                }
                if(msg.fn){
                    if(msg.messageTriggers){
                        if(!messageTriggers){
                            messageTriggers=[];
                        }
                        messageTriggers.push(...msg.messageTriggers);
                    }
                    if(msg.tags){
                        for(const t of msg.tags){
                            if(t.name===convoTags.enableTransform && t.value){
                                explicitlyEnabledTransforms.push(...t.value.split(' ').filter(t=>t));
                            }
                        }
                    }
                    if(msg.fn.local || msg.fn.call){
                        continue;
                    }else if(msg.fn.topLevel){
                        const prevVarPrefix=exe.varPrefix;
                        const prefix=excludeMessageSetters?.includes(msg)?'__excluded_setter__':'';
                        if(prefix){
                            exe.varPrefix=prefix;
                        }
                        exe.clearSharedSetters();
                        const r=exe.executeFunction(msg.fn);
                        if(r.valuePromise){
                            await r.valuePromise;
                        }
                        exe.varPrefix=prevVarPrefix;
                        if(exe.sharedSetters.length){
                            const varSetter:FlatConvoMessage={
                                role:msg.role??'define',
                            };
                            varSetter.setVars={};
                            for(const v of exe.sharedSetters){
                                varSetter.setVars[v]=exe.getVar(v);
                            }
                            messages.push(varSetter)
                        }
                        const prev=msg.role==='result'?getLastCalledConvoMessage(sourceMessages,i-1):undefined;
                        if(prev?.fn){
                            flat.role='function';
                            flat.called=prev.fn;
                            flat.calledReturn=exe.getVarEx(prevVarPrefix+convoResultReturnName,undefined,undefined,false);
                            flat.calledParams=exe.getConvoFunctionArgsValue(prev.fn);
                            // if(prev.component){
                            //     flat.component=prev.component;
                            //     flat.componentIndex=componentIndex;
                            // }
                            if(prev.tags){
                                flat.tags=flat.tags?{...convoTagsToMap(prev.tags,exe),...flat.tags}:convoTagsToMap(prev.tags,exe)
                            }
                        }else{
                            continue;
                        }
                    }else{
                        flat.role='function';
                        flat.fn=msg.fn;
                        flat.fnParams=exe.getConvoFunctionArgsScheme(msg.fn);
                    }
                }else if(containsConvoTag(msg.tags,convoTags.edge) && (msg.statement || getConvoTag(msg.tags,convoTags.condition))){
                    flat.edge=true;
                    edgePairs.push({flat,msg:msg,shouldParseMd,setMdVars});

                }else if(msg.statement){
                    await flattenMsgAsync(
                        exe,
                        msg.statement,
                        flat,
                        shouldParseMd
                    );
                }else if(msg.content!==undefined){
                    if(containsConvoTag(msg.tags,convoTags.concat)){
                        const prev=messages[messages.length-1];
                        if(prev?.content!==undefined){
                            const tag=getConvoTag(msg.tags,convoTags.condition);
                            if(tag?.value && !exe.isTagConditionTrue(tag)){
                                continue;
                            }
                            prev.content+='\n\n'+msg.content
                            continue;
                        }
                    }
                    flat.content=msg.content;
                }else{
                    continue;
                }

                if(this.defaultOptions.formatWhitespace && flat.content && !flat.preSpace && flat.role!=='system'){
                    flat.content=formatConvoContentSpace(flat.content);
                }

                messages.push(flat);

                if(!flat.edge){
                    this.applyTagsAndState(flat,messages,explicitlyEnabledTransforms,exe,setMdVars,mdVarCtx);
                }
            }

            let queueRef:ConvoQueueRef|undefined;

            if(secondPass){
                let insertLabel='';
                let insertStartIndex=0;
                let insertAfter=false;
                let hasQueue=false;
                let insertOpen=false;
                for(let i=0;i<messages.length;i++){
                    const msg=messages[i];
                    if(!msg){
                        continue;
                    }
                    switch(msg.role){

                        case convoRoles.insert:

                            if(msg.insert){
                                insertStartIndex=i;
                                insertAfter=!msg.insert.before;
                                insertLabel=msg.insert.label;
                                insertOpen=true;
                            }
                            break;

                        case convoRoles.insertEnd:{
                            for(let b=i-1;b>=0;b--){
                                const bm=messages[b];
                                if(bm?.label==insertLabel){
                                    insertOpen=false;
                                    const removed=messages.splice(insertStartIndex,i-insertStartIndex+1);
                                    removed.pop();
                                    removed.shift();
                                    i-=2;
                                    messages.splice(b+(insertAfter?1:0),0,...removed);
                                    break;
                                }
                            }

                            break;
                        }

                        case convoRoles.queue:
                            hasQueue=true;
                            break;

                    }

                }
                if(insertOpen){
                    for(let b=insertStartIndex-1;b>=0;b--){
                        const bm=messages[b];
                        if(bm?.label==insertLabel){
                            const removed=messages.splice(insertStartIndex,messages.length);
                            removed.shift();
                            messages.splice(b+(insertAfter?1:0),0,...removed);
                        }
                    }
                }
                if(hasQueue){
                    for(let i=0;i<messages.length;i++){
                        const msg=messages[i];
                        if(msg?.role!==convoRoles.queue){
                            continue;
                        }

                        if(messages[i-1]?.role===convoRoles.flush){
                            messages.splice(i-1,2);
                            i-=2;
                        }else{
                            queueRef={
                                label:msg.label??'',
                                index:i,
                            };
                            messages.splice(i,messages.length);
                            inPara=false;
                            parallelMessages=undefined;
                            if(messages[messages.length-1]?.parallel){
                                inPara=true;
                                parallelMessages=[];
                                for(let x=messages.length-1;x>=0;x--){
                                    const xm=messages[x];
                                    if(!xm || !xm.parallel){
                                        break;
                                    }
                                    const match=parallelPairs.find(p=>p.flat===xm);
                                    if(match){
                                        parallelMessages.unshift(match.msg);
                                    }
                                }
                            }
                            break;
                        }

                    }
                }
            }

            for(const pair of edgePairs){
                if(pair.msg.statement){
                    await flattenMsgAsync(exe,pair.msg.statement,pair.flat,pair.shouldParseMd);
                }else{
                    pair.flat.content=pair.msg.content;
                }
                this.applyTagsAndState(pair.flat,messages,explicitlyEnabledTransforms,exe,pair.setMdVars,mdVarCtx);
            }

            const ragMsg=getLastCompletionMessage(messages);
            if(ragMsg?.tags && (convoTags.ragForMsg in ragMsg.tags) && (this.isUserMessage(ragMsg) || this.isModificationMessage(ragMsg))){
                const paths=getFlatConvoTagValues(convoTags.ragForMsg,ragMsg.tags);
                exe.enableRag(paths.length?paths:undefined);
            }

            const ragStr=exe.getVar(convoVars.__rag);
            const ragMode=isConvoRagMode(ragStr)?ragStr:undefined;

            this.applyRagMode(messages,ragMode);

            const msgCaps=this.getMessageListCapabilities(messages);
            let capabilities=[...this.serviceCapabilities,...msgCaps];
            if(!isDefaultTask){
                capabilities=capabilities.filter(c=>c!=='visionFunction');
            }

            if(capabilities.includes('visionFunction') && isDefaultTask){
                const systemMessage=messages.find(m=>m.role==='system');
                const content=exe.getVar(convoVars.__visionServiceSystemMessage,null,defaultConvoVisionSystemMessage);
                if(systemMessage){
                    systemMessage.content=(
                        (systemMessage.content?systemMessage.content+'\n\n':'')+
                        content
                    )
                }else{
                    messages.unshift({
                        role:'system',
                        content
                    })
                }
            }

            if(exe.getVar(convoVars.__formsEnabled)){
                const forms:ConvoForm[]|undefined=exe.getVar(convoVars.__forms);
                if(forms && Array.isArray(forms)){
                    const systemMessage=messages.find(m=>m.role==='system');
                    const content=(
                        `You are helping the user fill out the following form:\n<form>${JSON.stringify(forms[0],null,4)}</form>. Ask the user each question one at a time. After the user answers all of the questions display their answers in markdown format an summarize their responses`
                    )
                    if(systemMessage){
                        systemMessage.content=(
                            (systemMessage.content?systemMessage.content+'\n\n':'')+
                            content
                        )
                    }else{
                        messages.unshift({
                            role:'system',
                            content
                        })
                    }
                }
            }


            const shouldDebug=this.shouldDebug(exe);
            const debug=shouldDebug?(this.debug??this.debugToConversation):undefined;
            if(shouldDebug){
                exe.print=(...args:any[])=>{
                    debug?.(...args);
                    return defaultConvoPrintFunction(...args);
                }
            }

            if(!isDefaultTask || hasNonDefaultTasks){

                if(isDefaultTask){
                    for(let i=0;i<messages.length;i++){
                        const msg=messages[i];
                        if((msg?.task??defaultConvoTask)!==defaultConvoTask){
                            messages.splice(i,1);
                            i--;
                        }
                    }
                }else{
                    const taskMsgs:FlatConvoMessage[]=[];
                    let taskHasSystem=false;
                    let otherMsgCount=0;

                    for(let i=0;i<messages.length;i++){
                        const msg=messages[i];
                        if(!msg){
                            continue;
                        }
                        if(msg.task===task){
                            if(msg.role==='system'){
                                taskHasSystem=true;
                            }
                            taskMsgs.push(msg);
                            messages.splice(i,1);
                            i--;
                        }else if(msg.fn || msg.called){
                            messages.splice(i,1);
                            i--;
                        }else if(msg.role!=='system'){
                            otherMsgCount++;
                        }
                    }

                    if(taskHasSystem){
                        for(let i=0;i<messages.length;i++){
                            const msg=messages[i];
                            if(msg?.role==='system'){
                                messages.splice(i,1);
                                i--;
                            }
                        }
                    }

                    if(maxTaskMsgCount!==-1 && otherMsgCount>maxTaskMsgCount){
                        let index=0;
                        while(otherMsgCount>maxTaskMsgCount && index<messages.length){
                            const msg=messages[index];
                            if(!msg || msg.role==='system'){
                                index++;
                                continue;
                            }
                            messages.splice(index,1);
                            otherMsgCount--;
                        }
                    }
                    for(let i=0;i<taskMsgs.length;i++){
                        const msg=taskMsgs[i];
                        if(msg){
                            messages.push(msg);
                        }
                    }
                }
            }



            if(templates){
                for(let i=0;i<templates.length;i++){
                    const tmpl=templates[i];
                    if(!tmpl || !tmpl.watchPath){continue}

                    tmpl.startValue=exe.getVar(tmpl.watchPath);
                }
            }

            const lastMsg=messages[messages.length-1];
            const toolTag=lastMsg?.tags?.[convoTags.call]||(
                lastMsg?.tags?(convoTags.call in lastMsg.tags)?'required':undefined:undefined
            );


            const lastUserMsg=this.getLastUserMessage(messages);
            let responseEndpoint:string|undefined=exe.getVar(convoVars.__endpoint);
            let userId:string|undefined=exe.getVar(convoVars.__userId);

            let responseModel:string|undefined=exe.getVar(convoVars.__model);
            if(typeof responseModel !== 'string'){
                responseModel=undefined;
            }
            const modelTagValue=lastUserMsg?.tags?.[convoTags.responseModel];
            if(modelTagValue){
                responseModel=modelTagValue;
            }
            if(!responseModel){
                responseModel=this.defaultModel;
            }

            if(typeof responseEndpoint !== 'string'){
                responseEndpoint=undefined;
            }
            if(typeof userId !== 'string'){
                userId=undefined;
            }
            const endpointTagValue=lastUserMsg?.tags?.[convoTags.responseEndpoint];
            if(endpointTagValue){
                responseEndpoint=endpointTagValue;
            }
            const userIdTagValue=lastUserMsg?.tags?.[convoTags.userId];
            if(userIdTagValue){
                userId=userIdTagValue;
            }

            const flat:FlatConvoConversation=deleteUndefined({
                exe,
                vars:exe.getUserSharedVars(),
                messages,
                conversation:this,
                task,
                taskTriggers,
                templates,
                debug,
                capabilities,
                markdownVars:mdVarCtx.vars,
                ragMode,
                toolChoice:toolTag?baseConvoToolChoice.includes(toolTag as any)?toolTag as any:{name:toolTag}:toolChoice,
                ragPrefix:this.defaultOptions.ragPrefix,
                ragSuffix:this.defaultOptions.ragSuffix,
                ragTemplate:this.defaultOptions.ragTemplate,
                responseModel,
                responseEndpoint,
                userId,
                queueRef,
                parallelMessages,
                apiKey:this.getDefaultApiKey()??undefined,
                afterCall,
                messageTriggers
            });
            exe.flat=flat;
            const apiKey=exe.getVar(convoVars.__apiKey);
            if(apiKey){
                flat.apiKey=apiKey;
            }

            let includeInTransforms:FlatConvoMessage[]|undefined;
            for(let i=0;i<messages.length;i++){
                const msg=messages[i];
                if(!msg){continue}

                let removed=false;

                switch(msg.role){

                    case convoRoles.ragPrefix:
                        flat.ragPrefix=msg.content;
                        messages.splice(i,1);
                        removed=true;
                        i--;
                        break;

                    case convoRoles.ragSuffix:
                        flat.ragSuffix=msg.content;
                        messages.splice(i,1);
                        removed=true;
                        i--;
                        break;

                    case convoRoles.ragTemplate:
                        flat.ragTemplate=msg.content;
                        messages.splice(i,1);
                        removed=true;
                        i--;
                        break;

                }

                if(removed){
                    continue;
                }

                if(msg.tags && (convoTags.includeInTransforms in msg.tags)){
                    if(!includeInTransforms){
                        includeInTransforms=[];
                    }
                    includeInTransforms.push(msg);
                }

                if(msg.tags && (convoTags.transform in msg.tags) && !disableTransforms){
                    const transformGroup=msg.tags?.[convoTags.transformGroup]??defaultConvoTransformGroup;
                    messages.splice(i,1);
                    removed=true;
                    i--;

                    if(!flat.transforms){
                        flat.transforms=[];
                    }
                    let transform=flat.transforms.find(t=>t.name===transformGroup);
                    if(!transform){
                        transform={
                            name:transformGroup,
                            messages:[],
                        }
                        flat.transforms.push(transform);
                    }
                    const type=msg.tags?.[convoTags.transform];
                    if(type){
                        transform.outputType=type;
                    }
                    const description=msg.tags?.[convoTags.transformDescription];
                    if(description){
                        if(transform.description){
                            transform.description+='\n\n'+description;
                        }else{
                            transform.description=description;
                        }
                    }
                    if(msg.tags && (convoTags.transformRequired in msg.tags)){
                        transform.required=true;
                    }
                    if(msg.tags && (convoTags.transformOptional in msg.tags)){
                        transform.optional=true;
                    }
                    transform.messages.push(msg);
                }else if(msg.tags && (convoTags.transformFilter in msg.tags)){
                    messages.splice(i,1);
                    removed=true;
                    i--;
                    if(!flat.transformFilterMessages){
                        flat.transformFilterMessages=[];
                    }
                    flat.transformFilterMessages.push(msg);
                }

            }

            if(flat.transforms){
                const scopeEnabled=exe.getVar(convoVars.__explicitlyEnabledTransforms);
                if(Array.isArray(scopeEnabled)){
                    explicitlyEnabledTransforms.push(...scopeEnabled);
                }
                const enableAll=explicitlyEnabledTransforms.includes('all');
                for(let i=0;i<flat.transforms.length;i++){
                    const t=flat.transforms[i];
                    if(!t){
                        continue;
                    }
                    if(t.optional && !enableAll && !explicitlyEnabledTransforms.includes(t.name)){
                        flat.transforms.splice(i,1);
                        i--;
                        continue;
                    }
                    if(includeInTransforms){
                        t.messages.splice(0,0,...includeInTransforms);
                    }
                }

                if(!flat.transforms.length){
                    delete flat.transforms;
                }
            }

            if(disableTransforms){
                delete flat.transforms;
                delete flat.transformFilterMessages;
            }

            if(setCurrent){
                this.setFlat(flat);
            }

            this.mergeConvoFlatContentMessages(flat.messages);

            return flat;
        }finally{
            exe.disableInlinePrompts=false;
        }
    }

    private applyRagMode(messages:FlatConvoMessage[],ragMode:ConvoRagMode|null|undefined){
        if(typeof ragMode === 'number'){
            let ragCount=0;
            for(let i=messages.length-1;i>=0;i--){
                const msg=messages[i];
                if(msg?.role!==convoRoles.rag){
                    continue;
                }
                ragCount++;
                msg.renderOnly=ragCount>ragMode;
            }
        }else{
            const renderOnly=!ragMode;
            for(let i=0;i<messages.length;i++){
                const msg=messages[i];
                if(msg?.role===convoRoles.rag){
                    msg.renderOnly=renderOnly;
                }

            }
        }
    }

    private getThreadFilter(exe:ConvoExecutionContext,defaultFilter?:ConvoThreadFilter):ConvoThreadFilter|undefined
    {
        const tf=exe.getVar(convoVars.__threadFilter);
        if(tf===undefined){
            return defaultFilter;
        }
        if(tf){
            switch(typeof tf){
                case 'string':
                    return {includeThreads:[tf]}
                case 'object':
                    return tf;
                default:
                    throw new Error('__threadFilter should be a string or object of type ConvoThreadFilter');
            }
        }else{
            return undefined;
        }
    }

    private applyTagsAndState(
        flat:FlatConvoMessage,
        allMessages:FlatConvoMessage[],
        explicitlyEnabledComponents:string[],
        exe:ConvoExecutionContext,
        setMdVars:boolean,
        mdVarCtx:MdVarCtx
    ){

        const cond=getFlatConvoMessageCondition(flat);
        if(cond && !exe.isTagConditionTrue(cond)){
            aryRemoveItem(allMessages,flat);
            return;
        }

        const assignTo=flat.tags?.[convoTags.assignTo];
        if(assignTo){
            exe.setVar(
                true,
                getFlatConvoMessageCachedJsonValue(flat)??
                (flat.tags?.[convoTags.format]==='json'?parseJson5(flat.content??''):flat.content),
                assignTo
            );
        }

        if(setMdVars && flat.markdown){
            for(const line of flat.markdown){
                const index=mdVarCtx.indexMap[line.type]??0;
                mdVarCtx.indexMap[line.type]=index+1;
                mdVarCtx.varCount++;
                const mdLine:ConvoMarkdownLine={
                    [convoObjFlag]:'md',
                    line
                }
                mdVarCtx.vars[line.type+index]=mdLine;
                const tagName=getConvoTag(line.tags,'name')?.value;
                if(tagName){
                    mdVarCtx.vars[tagName]=mdLine;
                }

                if(line.nodes){
                    for(const node of line.nodes){

                        if(node.imageUrl){
                            const li=mdVarCtx.indexMap['image']??0;
                            mdVarCtx.indexMap['image']=li+1;
                            mdVarCtx.vars['imageUrl'+li]=node.imageUrl;
                            const key=line.type+index;
                            mdVarCtx.vars[key+'ImageUrl'+li]=node.imageUrl;
                            if(tagName){
                                mdVarCtx.vars[tagName+'ImageUrl']=node.imageUrl;
                            }
                            mdVarCtx.vars['imageText'+li]=node.text??'';
                            mdVarCtx.vars[key+'ImageText'+li]=node.text??'';
                            if(tagName){
                                mdVarCtx.vars[tagName+'ImageText']=node.text??'';
                            }
                        }

                        if(node.link && node.url){
                            const li=mdVarCtx.indexMap['link']??0;
                            mdVarCtx.indexMap['link']=li+1;
                            mdVarCtx.vars['linkUrl'+li]=node.url;
                            const key=line.type+index;
                            mdVarCtx.vars[key+'LinkUrl'+li]=node.url;
                            if(tagName){
                                mdVarCtx.vars[tagName+'LinkUrl']=node.url;
                            }
                            mdVarCtx.vars['linkText'+li]=node.text??'';
                            mdVarCtx.vars[key+'LinkText'+li]=node.text??'';
                            if(tagName){
                                mdVarCtx.vars[tagName+'LinkText']=node.text??'';
                            }
                        }

                    }
                }
            }
        }

        let value:any;
        if(flat.isUser){

            value=exe.getVar(convoVars.__model);
            if(value && (typeof value === 'string')){
                flat.responseModel=value;
            }

            value=exe.getVar(convoVars.__endpoint);
            if(value && (typeof value === 'string')){
                flat.responseEndpoint=value;
            }
        }



        if(!flat.tags){
            return;
        }

        let responseFormat:string|undefined;
        let enabledTransforms:string[]|undefined;
        for(const name in flat.tags){
            switch(name){

                case convoTags.responseFormat:
                    responseFormat=flat.tags[name];
                    break;

                case convoTags.json:
                    responseFormat=flat.tags[name]?'json '+flat.tags[name]:'json';
                    break;

                case convoTags.assign:
                    flat.responseAssignTo=flat.tags[name];
                    break;

                case convoTags.responseModel:
                    flat.responseModel=flat.tags[name];
                    break;

                case convoTags.responseEndpoint:
                    flat.responseEndpoint=flat.tags[name];
                    break;

                case convoTags.enableTransform:{
                    const t=flat.tags[name]?.split(' ');
                    if(t){
                        for(const trans of t){
                            if(trans){
                                if(!enabledTransforms){
                                    enabledTransforms=[];
                                }
                                enabledTransforms.push(trans);
                            }
                        }
                    }
                    break;
                }

                case convoTags.rag:{
                    const ragSources=getFlatConvoTagValues(convoTags.rag,flat.tags);
                    exe.enableRag(ragSources.length?ragSources:undefined)
                    break;
                }

            }
        }
        if(responseFormat){
            this.applyResponseFormat(flat,responseFormat,exe);
        }

        if(enabledTransforms){
            for(const t of enabledTransforms){
                if(!explicitlyEnabledComponents.includes(t)){
                    explicitlyEnabledComponents.push(t);
                }
            }
        }
    }
    private applyResponseFormat(flat:FlatConvoMessage,format:string,exe:ConvoExecutionContext)
    {
        if(!flat.content){
            return;
        }

        const parts=format.trim().split(' ');
        flat.responseFormat=parts[0];

        let typeName=parts[1]??'';

        if( flat.responseFormat==='json' &&
            !typeName &&
            !jsonReg.test(flat.content)
        ){
            appendFlatConvoMessageSuffix(flat,'Respond in JSON format.');
        }

        if(!typeName){
            return;
        }
        const isArray=typeName.endsWith('[]')
        if(isArray){
            typeName=typeName.substring(0,typeName.length-2);
        }

        flat.responseFormatTypeName=typeName;
        flat.responseFormatIsArray=isArray;
    }

    public shouldDebug(exe?:ConvoExecutionContext)
    {
        return (
            this.debugMode ||
            (exe?exe.getVar(convoVars.__debug):this.getVar(convoVars.__debug))
        )?true:false;
    }

    public readonly debugToConversation=(...args:any[])=>{
        this.appendArgsAsComment('debug',args);
    }

    /**
     * Appends arguments as formatted comments to the conversation with the specified role.
     * Used for debugging and logging execution information.
     *
     * @param role - The role to use for the comment message
     * @param args - Arguments to format and append as comments
     */
    public appendArgsAsComment(role:string,args:any[],msgAry=false){
        if(!args.length){
            return;
        }
        const out:string[]=[];
        let last:any;
        for(const v of args){
            if(typeof v === 'string'){
                out.push(v);
            }else{
                try{
                    out.push(JSON.stringify(v,null,msgAry?undefined:4)??'');
                }catch{
                    out.push(v?.toString()??'');
                }
                if(msgAry){
                    last=Array.isArray(v)?v[v.length-1]:undefined;
                }
            }
        }
        if(msgAry && !last){
            last=args[args.length-1];
        }
        if(last && (typeof last.role==='string') && (typeof last.content==='string')){
            out.push(`> ${last.role}\n${last.content}`);
        }
        const comment=convoStringToComment(out.join('\n'));
        this.append(`> ${role}\n${comment}`);
    }

    private readonly definitionItems:ConvoDefItem[]=[];

    public define(items:ConvoDefItem|(ConvoDefItem[]),override?:boolean):ConvoParsingResult|undefined
    {

        let original=true;
        if(!Array.isArray(items)){
            original=false;
            items=[items];
        }

        const startLength=items.length;
        for(let i=0;i<startLength;i++){
            const item=items[i];
            if(!item){continue}

            if(item.types){
                if(original){
                    items=[...items];
                    original=false;
                }
                for(const e in item.types){
                    const type=item.types[e];
                    if(type){
                        items.push({type:{name:e,type:type}})
                    }
                }
            }

            if(item.vars){
                if(original){
                    items=[...items];
                    original=false;
                }
                for(const e in item.vars){
                    items.push({var:{name:e,value:item.vars[e]}})
                }
            }

            if(item.fns){
                if(original){
                    items=[...items];
                    original=false;
                }
                for(const e in item.fns){
                    const fn=item.fns[e];
                    if(typeof fn === 'object'){
                        items.push({fn:{name:e,...fn}})
                    }else if(fn){
                        items.push({fn:{
                            name:e,
                            local:true,
                            callback:fn
                        }})
                    }
                }
            }
        }

        const outParts:(string|ConvoMessagePart)[]=[];
        const push=(content:string,item:ConvoDefItem)=>{
            if(item.hidden){
                outParts.push({hidden:true,content});
            }else{
                outParts.push(content);
            }
        }
        for(let i=0;i<items.length;i++){
            const item=items[i];
            if(!item){
                continue;
            }
            const type=item.type;
            if(!type || (!override && this.getAssignment(type.name))){
                continue
            }

            validateConvoTypeName(type.name);

            const str=schemeToConvoTypeString(type.type);
            if(!str){
                continue;
            }
            push(type.name+'='+str,item);
            push('\n',item);
            this.definitionItems.push({type});
        }

        for(let i=0;i<items.length;i++){
            const item=items[i];
            if(!item){
                continue;
            }
            const v=item.var;
            if(!v || (!override && this.getAssignment(v.name))){
                continue
            }

            validateConvoVarName(v.name);

            push(`${v.name} = ${JSON.stringify(v.value,null,4)}`,item);
            push('\n',item);
            this.definitionItems.push({var:v});
        }

        if(outParts.length){
            outParts.unshift('> define\n')
        }

        for(let i=0;i<items.length;i++){
            const item=items[i];
            if(!item){
                continue;
            }
            const fn=items[i]?.fn;
            if(!fn || (!override && !fn.registerOnly && this.getAssignment(fn.name))){
                continue
            }

            validateConvoFunctionName(fn.name);

            if(outParts.length){
                push('\n',item);
            }
            if(fn.registerOnly){
                if(fn.local===false){
                    throw new ConvoError('invalid-register-only-function',undefined,'Register only functions can only be local');
                }
                this.createFunctionImpl(fn);
            }else{
                const content=this.createFunctionImpl(fn);
                if(!fn.local){
                    push(content,item);
                    push('\n',item);
                }
            }
        }

        return outParts.length?this.append(outParts):undefined;
    }

    public defineType(type:ConvoTypeDef,override?:boolean):ConvoParsingResult|undefined{
        return this.define([{type}],override);
    }

    public defineTypes(types:ConvoTypeDef[],override?:boolean):ConvoParsingResult|undefined{
        return this.define(types.map(type=>({type})),override);
    }

    public defineVar(variable:ConvoVarDef,override?:boolean):ConvoParsingResult|undefined{
        return this.define([{var:variable}],override);

    }

    public defineVars(vars:ConvoVarDef[],override?:boolean):ConvoParsingResult|undefined{
        return this.define(vars.map(v=>({var:v})),override);
    }

    public defineFunction(fn:ConvoFunctionDef,override?:boolean){
        return this.define([{fn}],override);
    }

    public defineFunctions(fns:ConvoFunctionDef[],override?:boolean){
        return this.define(fns.map(fn=>({fn})),override);
    }

    public implementExternFunction(name:string,func:(...param:any[])=>any){
        this.externFunctions[name]=scope=>func(...(scope.paramValues??[]))
    }

    public defineLocalFunctions(funcs:Record<string,(...args:any[])=>any>){
        const keys=Object.keys(funcs);
        this.define(keys.map<ConvoDefItem>(name=>({
            hidden:true,
            fn:{
                local:true,
                name,
                callback:funcs[name]
            }
        })))
    }

    private createFunctionImpl(fnDef:ConvoFunctionDef):string{
        const params=fnDef.paramsType??fnDef.paramsJsonScheme;
        const fnSig=(
            (fnDef.disableAutoComplete?`@${convoTags.disableAutoComplete}\n`:'')+
            (fnDef.description?convoDescriptionToComment(fnDef.description)+'\n':'')+
            (params?schemeToConvoTypeString(params,`>${fnDef.local?' local':(fnDef.callback || fnDef.scopeCallback)?' extern':''} `+fnDef.name):`>${fnDef.local?' local':''} ${fnDef.name}()`)
        );

        if(fnDef.returnScheme && !this.definitionItems.some(t=>t.type===fnDef.returnScheme)){
            this.defineType(fnDef.returnScheme);
        }

        if(fnDef.body){
            if(fnDef.registerOnly){
                throw new ConvoError('invalid-register-only-function',undefined,'Register only function are not allowed to define a body')
            }
            const returnType=fnDef.returnScheme?.name??fnDef.returnTypeName;
            return `${fnSig} ->${returnType?' '+returnType:''} (\n${fnDef.body}\n)`;
        }else{
            let scopeFn:ConvoScopeFunction|undefined=undefined;
            if(fnDef.scopeCallback){
                scopeFn=fnDef.scopeCallback;
            }else if(fnDef.callback){
                const callback=fnDef.callback;
                if(fnDef.paramsJsonScheme || fnDef.paramsType){
                    scopeFn=(scope)=>{
                        return callback(convoLabeledScopeParamsToObj(scope));
                    }
                }else{
                    scopeFn=(scope)=>{
                        return (callback as any)(...(scope.paramValues??[]));
                    }
                }
            }
            if(scopeFn){
                this.externFunctions[fnDef.name]=scopeFn;
            }
            return fnSig;
        }
    }

    public getAssignment(name:string,excludePreAssigned=false):ConvoMessageAndOptStatement|undefined{
        return (
            this._getAssignment(name,this._messages)??
            (excludePreAssigned?undefined:this._getAssignment(name,this.preAssignMessages))
        )
    }

    private _getAssignment(name:string,messages:ConvoMessage[]):ConvoMessageAndOptStatement|undefined{
        for(let i=messages.length-1;i>-1;i--){
            const message=messages[i];
            if(!message?.fn){continue}

            if(message.fn.topLevel){
                if(!message.fn.body){
                    continue;
                }
                for(let b=0;b<message.fn.body.length;b++){
                    const statement=message.fn.body[b];
                    if(!statement){continue}

                    if(statement.set===name && !statement.setPath){
                        return {message,statement}
                    }
                }
            }else{
                if(!message.fn.call && message.fn.name===name){
                    return {message};
                }
            }
        }
        return undefined;
    }


    private preAssignMessages:ConvoMessage[]=[];
    /**
     * Used to mark variables, types and function as assigned before actually appending the code.
     */
    public preAssign(convoCode:string){
        const r=this.parseCode(convoCode);
        if(r.error){
            throw new Error(r.error.message);
        }
        if(r.result){
            for(const m of r.result){
                this.preAssignMessages.push(m);
            }
        }
    }

    /**
     * Returns the sum of all token usage tags
     */
    public getTokenUsage(fromIndex=0):ConvoTokenUsage
    {
        const usage:ConvoTokenUsage={
            inputTokens:0,
            outputTokens:0,
            tokenPrice:0,
        }
        for(let i=fromIndex;i<this._messages.length;i++){
            const msg=this._messages[i];
            if(!msg){continue}
            const ut=getConvoTag(msg.tags,convoTags.tokenUsage);
            if(!ut?.value){
                continue;
            }
            addConvoUsageTokens(usage,ut.value);

        }
        return usage;
    }

    private readonly onComponentSubmission=new Subject<ConvoComponentSubmissionWithIndex>();
    public submitComponentData(submission:ConvoComponentSubmissionWithIndex)
    {
        this.onComponentSubmission.next(submission);
    }

    private async completeUsingComponentInputAsync(
        message:FlatConvoMessage,
        flat:FlatConvoConversation,
        isDefaultTask:boolean,
    ):Promise<ConvoCompletionMessage[]>{

        const component=getConvoMessageComponent(message);
        if(!component){
            if(isDefaultTask){
                this.setFlat(flat);
            }
            return [];
        }

        message.componentActive=true;
        if(isDefaultTask){
            this.setFlat(flat);
        }

        return new Promise<ConvoCompletionMessage[]>((resolve,reject)=>{
            let sub:Subscription|undefined;
            let submitted=false;
            const ctx:ConvoComponentCompletionCtx={
                message,
                flat,
                component,
                convo:this,
                submit:(submission)=>{
                    submitted=true;
                    sub?.unsubscribe();
                    message.componentActive=false;
                    if(isDefaultTask){
                        this.setFlat(flat);
                    }
                    if(submission.data!==undefined){
                        try{
                            const dataMsgs:ConvoCompletionMessage[]=[{
                                role:'user',
                                content:JSON.stringify(submission.data,createJsonRefReplacer()),
                                format:'json'
                            }]
                            if(submission.messages){
                                dataMsgs.unshift(...submission.messages);
                            }
                            resolve(dataMsgs);
                        }catch(ex){
                            reject(ex);
                        }
                    }else if(submission.messages){
                        resolve(submission.messages)
                    }else {
                        resolve([]);
                    }
                }
            };

            sub=this.onComponentSubmission.subscribe(s=>{
                if(s.componentIndex===message.componentIndex){
                    ctx.submit(s);
                }
            })

            try{
                this.componentCompletionCallback?.(ctx);
            }catch(ex){
                reject(ex);
            }finally{
                if(submitted){
                    sub.unsubscribe();
                }
            }

        })
    }

    private async completeUsingEvalAsync(
        message:FlatConvoMessage,
        flat:FlatConvoConversation,
    ):Promise<ConvoCompletionMessage[]>{
        if(!this.defaultOptions.allowEvalCode){
            return []
        }
        const result=await evalConvoMessageAsCodeAsync(message,flat);

        const isObj=result && (typeof result === 'object');
        return [{
            role:message.role,
            content:isObj?JSON.stringify(result??null,createJsonRefReplacer()):(result?.toString()??''),
            format:isObj?'json':undefined
        }]
    }

    /**
     * Appends output returned from an LLM
     */
    public async appendModelOutputAsync(modelInputOutput:ConvoModelInputOutputPair){
        return await this.completeAsync({modelInputOutput});
    }

    /**
     * Converts the conversation into input for its target LLM.
     */
    public async toModelInputAsync(flat?:FlatConvoConversation):Promise<any>
    {

        if(!flat){
            flat=await this.flattenAsync();
        }

        const service=await this.getCompletionServiceAsync(flat);
        if(!service){
            return undefined;
        }
        if(service.service.relayConvertConvoToInputAsync){
            return await service.service.relayConvertConvoToInputAsync(flat);
        }else{
            const conversion=convertConvoInput(flat,service.service.inputType,this.converters);
            return conversion.result;
        }
    }
    /**
     * Converts the conversation into input for its target LLM as a string.
     */
    public async toModelInputStringAsync(flat?:FlatConvoConversation):Promise<string>
    {
        const value=await this.toModelInputAsync(flat);
        if(!value){
            return '';
        }

        if(typeof value === 'string'){
            return value;
        }

        return JSON.stringify(value,createJsonRefReplacer(),4);
    }

    public addUsage(usage:Partial<ConvoTokenUsage>){
        addConvoUsageTokens(this.usage,usage);
        if(this._onTokenUsage){
            this._onTokenUsage(convoPartialUsageTokensToUsage(usage));
        }
    }

    public getDebuggingImportCode(){
        const source:string[]=[];
        for(const name in this.importedModules){
            const mod=this.importedModules[name];
            if(!mod){
                continue;
            }
            const m={...mod};
            delete m.convo;
            source.push(`> define\n${getConvoDebugLabelComment(`import ${name}`)}\n\nmoduleInfo=${JSON.stringify(m,debugReplacer,4)}\n\n${mod.convo??''}\n\n\n\n\n`)
        }
        return source.join('')+'\n\n\n\n\n';
    }

    public getDebuggingModulesCode(){
        const source:string[]=[];
        source.push(`> define\n${getConvoDebugLabelComment('registered modules')}\n\nregisteredModules=${JSON.stringify(this.modules.map(mod=>({
            name:mod.name,
            imported:this.importedModules[mod.name]?true:false,
            convoLength:mod.convo?.length??0,
            componentCount:getObjKeyCount(mod.components),
            functionCount:getObjKeyCount(mod.externFunctions)+getObjKeyCount(mod.externScopeFunctions),
            typeCount:getObjKeyCount(mod.typeSchemes),
        })),null,4)}\n\n\n\n\n`)
        for(const mod of this.modules){
            if(!mod){
                continue;
            }
            const m={
                imported:this.importedModules[mod.name]?true:false,
                ...mod
            };
            delete m.convo;
            source.push(`> define\n${getConvoDebugLabelComment(`module ${mod.name}`)}\n\nmoduleInfo=${JSON.stringify(m,debugReplacer,4)}\n\n${mod.convo??''}\n\n\n\n\n`)
        }
        return source.join('')+'\n\n\n\n\n';
    }

    private async evalTriggersAsync(message:FlatConvoMessage|ConvoCompletionMessage,triggers:ConvoTrigger[],flat:FlatConvoConversation,isUser:boolean){
        try{
            for(const trigger of triggers){
                if(trigger.role!==message.role || (trigger.condition && !flat.exe.isTagConditionTrue({name:'condition',statement:trigger.condition}))){
                    continue;
                }
                const fnMsg=this._messages.find(m=>m.fn?.name===trigger.fnName && !m.fn.call);
                if(!fnMsg?.fn){
                    continue;
                }

                flat.exe.setVar(true,fnMsg.fn.name,convoVars.__trigger);

                flat.exe.clearSharedSetters();

                const evt:ConvoMessageTriggerEvent={
                    message,
                    trigger,
                    content:message.content??'',
                    isUser,
                    isAssistant:!isUser
                }
                const r=await flat.exe.executeFunctionAsync(fnMsg.fn,evt);

                this.appendFunctionSetters(flat.exe,true,undefined,convoRoles.thinkingResult,false,true);
                flat.exe.setVar(true,undefined,convoVars.__trigger);

                if(r===false){
                    break;
                }

            }
        }catch(ex){
            console.error('Trigger failed',ex);
            this.debugToConversation('Trigger failed',getErrorMessage(ex))
        }
    }

    public appendModification(modification:ConvoMessageModification,content:string,flat?:FlatConvoConversation)
    {
        const msg:ConvoMessage={
            role:modification,
            content,
        }
        if(flat){
            flat.messages.push(this.flattenMsg(msg,true,flat.exe));
            this.mergeConvoFlatContentMessages(flat.messages);
        }
        this.appendMessageObject(msg,{disableAutoFlatten:true,appendCode:true});
    }

    public appendResponse(content:string,flat:FlatConvoConversation)
    {
        const r=parseConvoCode(content,{logErrors:true});
        if(r.error){
            throw new Error(`Invalid response message - ${r.error.message}`);
        }
        if(!r.result){
            return;
        }
        if(flat.response){
            throw new Error('Response has already been set');
        }
        const flatMessages=r.result.map(m=>this.flattenMsg(m,true,flat.exe));
        flat.response=flatMessages.map(convertFlatConvoMessageToCompletionMessage);
        flat.messages.push(...flatMessages);
        this.mergeConvoFlatContentMessages(flat.messages);
    }

    private appendFunctionSetters(exe:ConvoExecutionContext,isDefaultTask:boolean,lastResultValue:any,role='result',writeReturn=true,skipEmpty=false):ConvoMessage[]{
        const lines:string[]=[`${role==='result'?'':'\n'}${this.getPrefixTags()}> ${role}`];
        let lastSharedVar:string|undefined;
        if(exe.sharedSetters.length){
            setter:for(let i=0;i<exe.sharedSetters.length;i++){
                const s=exe.sharedSetters[i];
                if(!s){
                    continue;
                }
                const sTerm=s+'.';
                for(let ci=0;ci<exe.sharedSetters.length;ci++){
                    if(ci===i){
                        continue;
                    }
                    const c=exe.sharedSetters[ci];
                    if(c===s || sTerm.startsWith(c as string)){
                        continue setter;
                    }
                }
                lastSharedVar=s;
                lines.push(`${s}=${JSON.stringify(getValueByPath(exe.sharedVars,s),null,4)}`)
            }
        }

        if(writeReturn){
            const lastValue=lastSharedVar?getValueByPath(exe.sharedVars,lastSharedVar):undefined;
            if(lastSharedVar && lastValue && lastResultValue===lastValue){
                lines.push(`${convoResultReturnName}=${lastSharedVar}`)
            }else if( (typeof lastResultValue === 'string') &&
                lastResultValue.length>50 &&
                lastResultValue.includes('\n') &&
                !lastResultValue.includes('---')
            ){
                lines.push(`${convoResultReturnName}=---\n${lastResultValue}\n---`)
            }else{
                lines.push(`${convoResultReturnName}=${JSON.stringify(lastResultValue,null,4)}`)
            }
        }

        if(isDefaultTask && (lines.length>1 || !skipEmpty)){
            lines.push('');
            return this.append(lines.join('\n'),true)?.result??[];
        }else{
            return [];
        }
    }

    public findMessage(options:FindConvoMessageOptions):ConvoMessage|undefined{
        return findConvoMessage(this._messages,options);
    }

    /**
     * Merges "replace", "append" and "prepend" messages with their corresponding content messages.
     * This function processes a list of flat conversation messages and applies content modification
     * operations (replace, append, prepend) to their target content messages.
     *
     * @param messages - Array of flat conversation messages to process in-place
     */
    private mergeConvoFlatContentMessages(messages:FlatConvoMessage[]){


        let lastContentMessage:FlatConvoMessage|undefined;
        let lastContentMessageI=0;

        for(let i=0;i<messages.length;i++){
            let msg=messages[i];
            if(!msg){continue}

            if(isConvoMessageModification(msg.role)){
                if(this.isAssistantMessage(lastContentMessage)){
                    msg.role=this.userRoles[0]??convoRoles.user;
                    msg.content=getFullFlatConvoMessageContent(msg);
                }else{
                    messages.splice(i,1);
                    i--;
                    if(!lastContentMessage){
                        continue;
                    }
                    lastContentMessage={...lastContentMessage};
                    messages[lastContentMessageI]=lastContentMessage;

                    switch(msg.role){
                        case convoRoles.replace:
                            lastContentMessage.content=msg.content;
                            break;
                        case convoRoles.replaceForModel:
                            lastContentMessage.modelContent=msg.content;
                            break;
                        case convoRoles.prepend:
                            lastContentMessage.content=`${msg.content}\n\n${lastContentMessage.content}`;
                            break;
                        case convoRoles.append:
                            lastContentMessage.content=`${lastContentMessage.content}\n\n${msg.content}`;
                            break;
                        case convoRoles.prefix:
                            lastContentMessage.prefix=`${lastContentMessage.prefix?`${lastContentMessage.prefix}\n\n`:''}${msg.content}`;
                            break;
                        case convoRoles.suffix:
                            lastContentMessage.suffix=`${lastContentMessage.suffix?`${lastContentMessage.suffix}\n\n`:''}${msg.content}`;
                            break;
                    }
                    continue;
                }

            }

            if(msg.content!==undefined && !(msg.tags && (convoTags.disableModifiers in msg.tags))){
                lastContentMessage=msg;
                lastContentMessageI=i;
            }

        }
    }
}

const debugReplacer=(key:string,value:any)=>{
    if(isClassInstanceObject(value)){
        const name=Object.getPrototypeOf(value)?.constructor?.name;
        return `[[${name||value}]]`
    }else{
        return value;
    }
}

const flattenMsgAsync=async (
    exe:ConvoExecutionContext,
    statement:ConvoStatement,
    flat:FlatConvoMessage,
    parseMd:boolean
)=>{
    const r=exe.executeStatement(statement);
    let value:any;
    if(r.valuePromise){
        value=await r.valuePromise;
    }else{
        value=r.value;
    }
    if(typeof value === 'string'){
        flat.content=value.trim();
    }else{
        flat.content=(value?.toString()??'').trim();
    }
    if(parseMd && !flat.markdown){
        const r=parseMarkdown(flat.content??'',{parseTags:true});
        if(r.result){
            flat.markdown=r.result;
        }
    }
}

interface MdVarCtx
{
    indexMap:Record<string,number>;
    vars:Record<string,ConvoMarkdownLine|string>;
    varCount:number;
}


const jsonReg=/json/i;

const secondPassRoles:(string|undefined)[]=[
    convoRoles.insert,
    convoRoles.insertEnd,
    convoRoles.queue,
    convoRoles.flush,
]



interface TransformFlatResult
{
    hideMessage:boolean;
    removeMessage:boolean;
    transforms:TransformCompletion[];
    completions:ConvoCompletionMessage[];
    inputTokens:number;
    outputTokens:number;
    tokenPrice:number;
    publicResult:ConvoTransformResult;
}

interface TransformCompletion
{
    tags:ConvoTag[];
    completions:ConvoCompletionMessage[];
    transform:FlatConvoTransform;
    disableComponent:boolean;
    renderOnly:boolean;
}

const flattenSourceCache:Record<string,FlatConvoConversation>={};
interface FlattenSourceOptions{
    convo:string;
    appendTo?:FlatConvoConversation;
    cacheName?:string;
    options?:FlattenConvoOptions;
    passExe?:boolean;
}

interface ModelConfigurationToInputResult
{
    jsonMode:boolean;
    lastMsg?:FlatConvoMessage;
    hasFunctions:boolean;
}
