import { AnyFunction, CancelToken, DisposeCallback, ReadonlySubject, aryRemoveItem, asArray, createJsonRefReplacer, delayAsync, parseMarkdown, pushBehaviorSubjectAry, pushBehaviorSubjectAryMany, removeBehaviorSubjectAryValue, removeBehaviorSubjectAryValueMany, safeParseNumber, shortUuid } from "@iyio/common";
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { ZodType, ZodTypeAny, z } from "zod";
import { ConvoError } from "./ConvoError";
import { ConvoExecutionContext } from "./ConvoExecutionContext";
import { evalConvoMessageAsCodeAsync } from "./convo-eval";
import { getGlobalConversationLock } from "./convo-lang-lock";
import { addConvoUsageTokens, completeConvoUsingCompletionServiceAsync, containsConvoTag, convertConvoInput, convoDescriptionToComment, convoDisableAutoCompleteName, convoFunctions, convoImportModifiers, convoLabeledScopeParamsToObj, convoMessageToString, convoPartialUsageTokensToUsage, convoRagDocRefToMessage, convoResultReturnName, convoRoles, convoStringToComment, convoTagMapToCode, convoTags, convoTagsToMap, convoTaskTriggers, convoUsageTokensToString, convoVars, createEmptyConvoTokenUsage, defaultConvoCacheType, defaultConvoPrintFunction, defaultConvoRagTol, defaultConvoTask, defaultConvoVisionSystemMessage, escapeConvoMessageContent, formatConvoContentSpace, formatConvoMessage, getConvoDateString, getConvoMessageComponent, getConvoTag, getFlatConvoTag, getFlattenConversationDisplayString, getLastCompletionMessage, getLastConvoMessageWithRole, isConvoThreadFilterMatch, mapToConvoTags, parseConvoJsonMessage, parseConvoMessageTemplate, spreadConvoArgs, trimParallelConvo, validateConvoFunctionName, validateConvoTypeName, validateConvoVarName } from "./convo-lib";
import { parseConvoCode } from "./convo-parser";
import { AppendConvoMessageObjOptions, AppendConvoOptions, CloneConversationOptions, ConvoAppend, ConvoCapability, ConvoCompletion, ConvoCompletionMessage, ConvoCompletionOptions, ConvoCompletionService, ConvoComponentCompletionCtx, ConvoComponentCompletionHandler, ConvoComponentMessageState, ConvoComponentMessagesCallback, ConvoComponentSubmissionWithIndex, ConvoConversationCache, ConvoConversationConverter, ConvoDefItem, ConvoDocumentReference, ConvoFlatCompletionCallback, ConvoFnCallInfo, ConvoFunction, ConvoFunctionDef, ConvoImportHandler, ConvoMarkdownLine, ConvoMessage, ConvoMessageAndOptStatement, ConvoMessagePart, ConvoMessagePrefixOptions, ConvoMessageTemplate, ConvoParsingResult, ConvoPrintFunction, ConvoQueueRef, ConvoRagCallback, ConvoRagMode, ConvoScopeFunction, ConvoStartOfConversationCallback, ConvoStatement, ConvoSubTask, ConvoTag, ConvoTask, ConvoThreadFilter, ConvoTokenUsage, ConvoTypeDef, ConvoVarDef, FlatConvoConversation, FlatConvoConversationBase, FlatConvoMessage, FlattenConvoOptions, baseConvoToolChoice, convoObjFlag, isConvoCapability, isConvoRagMode } from "./convo-types";
import { convoTypeToJsonScheme, schemeToConvoTypeString, zodSchemeToConvoTypeString } from "./convo-zod";
import { convoCacheService, convoCompletionService, convoConversationConverterProvider } from "./convo.deps";
import { createConvoVisionFunction } from "./createConvoVisionFunction";
import { convoScopeFunctionEvalJavascript } from "./scope-functions/convoScopeFunctionEvalJavascript";

export interface ConversationOptions
{
    userRoles?:string[];
    assistantRoles?:string[];
    systemRoles?:string[];
    roleMap?:Record<string,string>;
    completionService?:ConvoCompletionService<any,any>;
    converters?:ConvoConversationConverter<any,any>[];
    serviceCapabilities?:ConvoCapability[];
    capabilities?:ConvoCapability[];
    disableMessageCapabilities?:boolean;
    maxAutoCompleteDepth?:number;
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

    formatWhitespace?:boolean;

    externFunctions?:Record<string,AnyFunction>;

    externScopeFunctions?:Record<string,ConvoScopeFunction>;

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
}

export class Conversation
{
    private _convo:string[]=[];
    public get convo(){return this._convo.join('\n\n')}
    public getConvoStrings(){
        return [...this._convo];
    }

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
     */
    public readonly unregisteredVars:Record<string,any>={};

    public userRoles:string[];
    public assistantRoles:string[];
    public systemRoles:string[];
    public roleMap:Record<string,string>

    private completionService?:ConvoCompletionService<any,any>;

    private converters:ConvoConversationConverter<any,any>[];

    public maxAutoCompleteDepth:number;

    public readonly externFunctions:Record<string,ConvoScopeFunction>={};

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

    public constructor(options:ConversationOptions={}){
        const {
            userRoles=['user'],
            assistantRoles=['assistant'],
            systemRoles=['system'],
            roleMap={},
            completionService=convoCompletionService.get(),
            converters=convoConversationConverterProvider.all(),
            capabilities=[],
            serviceCapabilities=[],
            maxAutoCompleteDepth=10,
            trackTime=false,
            trackTokens=false,
            trackModel=false,
            onTokenUsage,
            disableAutoFlatten=false,
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
            externScopeFunctions,
            getStartOfConversation,
            cache,
            logFlat=false,
            logFlatCached=false,
            usage=createEmptyConvoTokenUsage(),
        }=options;
        this.usage=usage;
        this.defaultOptions=options;
        this.getStartOfConversation=getStartOfConversation;
        this.cache=typeof cache==='boolean'?(cache?[convoCacheService()]:[]):asArray(cache);
        this.logFlat=logFlat;
        this.logFlatCached=logFlatCached;
        this.defaultVars=defaultVars?defaultVars:{};
        this.userRoles=[...userRoles];
        this.assistantRoles=[...assistantRoles];
        this.systemRoles=[...systemRoles];
        this.roleMap=roleMap;
        this.completionService=completionService;
        this.converters=converters;
        this.capabilities=[...capabilities];
        this.disableMessageCapabilities=disableMessageCapabilities;
        this.serviceCapabilities=serviceCapabilities;
        this.maxAutoCompleteDepth=maxAutoCompleteDepth;
        this._trackTime=new BehaviorSubject<boolean>(trackTime);
        this._trackTokens=new BehaviorSubject<boolean>(trackTokens);
        this._trackModel=new BehaviorSubject<boolean>(trackModel);
        this._onTokenUsage=onTokenUsage;
        this.disableAutoFlatten=disableAutoFlatten;
        this.autoFlattenDelayMs=autoFlattenDelayMs;
        this.componentCompletionCallback=componentCompletionCallback;
        this.ragCallback=ragCallback;
        this.debug=debug;
        if(debugMode){
            this.debugMode=true;
        }
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

    public addTask(task:ConvoTask):DisposeCallback{

        this._activeTaskCount.next(this._activeTaskCount.value+1);
        pushBehaviorSubjectAry(this._openTasks,task);
        let removed=false;
        return ()=>{
            if(removed){
                return;
            }
            removed=true;
            this._activeTaskCount.next(this._activeTaskCount.value-1);
            removeBehaviorSubjectAryValue(this._openTasks,task);
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
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this.autoFlattenId++;
        this._isDisposed=true;
        this._disposeToken.cancelNow();
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
        return parseConvoCode(code,{parseMarkdown:this.defaultOptions.parseMarkdown})
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
            debug:this.debugToConversation,
            debugMode:this.shouldDebug(),
            ...options,
            defaultVars:{...this.defaultVars,...options?.defaultVars},
            externFunctions:{...this.externFunctions,...options?.externFunctions},
        }
    }

    /**
     * Creates a new Conversation and appends the messages of this conversation to the newly
     * created conversation.
     */
    public clone(options?:CloneConversationOptions,convoOptions?:ConversationOptions):Conversation{
        const conversation=new Conversation(this.getCloneOptions(convoOptions));
        if(this._defaultApiKey){
            conversation.setDefaultApiKey(this._defaultApiKey);
        }
        let messages=this.messages;
        if (options?.noFunctions) {
            messages=messages.filter(m=>!m.fn || m.fn.topLevel);
        }
        if (options?.systemOnly) {
            messages=messages.filter(m=>m.role === 'system' || m.fn?.topLevel || m.fn?.name===convoFunctions.getState);
        }
        conversation.appendMessageObject(messages,{disableAutoFlatten:true,appendCode:options?.cloneConvoString});
        return conversation;
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

    /**
     * Appends new messages to the conversation and by default does not add code to the conversation.
     */
    public appendMessageObject(message:ConvoMessage|ConvoMessage[],{
        disableAutoFlatten,
        appendCode
    }:AppendConvoMessageObjOptions={}):void{
        const messages=asArray(message);
        this._messages.push(...messages);

        if(appendCode){
            for(const msg of messages){
                let messages=convoMessageToString(msg);
                if(this._beforeAppend.observed){
                    messages=this.transformMessageBeforeAppend(messages);
                }
                this._convo.push(messages);
            }
        }

        this._onAppend.next({
            text:'',
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

    public append(messages:string|(ConvoMessagePart|string)[],mergeWithPrev?:boolean,throwOnError?:boolean):ConvoParsingResult;
    public append(messages:string|(ConvoMessagePart|string)[],options?:AppendConvoOptions):ConvoParsingResult;
    public append(messages:string|(ConvoMessagePart|string)[],mergeWithPrevOrOptions:boolean|AppendConvoOptions=false,_throwOnError=true):ConvoParsingResult{
        const options=(typeof mergeWithPrevOrOptions === 'object')?mergeWithPrevOrOptions:{mergeWithPrev:mergeWithPrevOrOptions};

        const {
            mergeWithPrev=false,
            throwOnError=_throwOnError,
            disableAutoFlatten,
        }=options;

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
            for(const m of r.result){
                this._messages.push(m);
            }
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
            tags+=`@${convoTags.assign} ${msg.assignTo}\n`
        }
        return tags;
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
        const c=await this.tryCompleteAsync(options?.task,options,flat=>{

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
     * Submits the current conversation and optionally appends messages to the conversation before
     * submitting.
     * @param append Optional message to append before submitting
     */
    public async completeAsync(appendOrOptions?:string|ConvoCompletionOptions):Promise<ConvoCompletion>{
        if(typeof appendOrOptions === 'string'){
            this.append(appendOrOptions);
            appendOrOptions=undefined;
        }

        if(appendOrOptions?.append){
            this.append(appendOrOptions.append);
        }

        const completionService=this.completionService;

        if(appendOrOptions?.debug){
            console.info('Conversation.completeAsync:\n',appendOrOptions.append)
        }

        const result=await this.tryCompleteAsync(
            appendOrOptions?.task,
            appendOrOptions,
            flat=>this.completeWithServiceAsync(flat,completionService),
        );

        if(appendOrOptions?.debug){
            console.info(
                'Conversation.completeAsync Result:\n',
                result.messages?(result.messages.length===1?result.messages[0]:result.messages):result
            );
        }

        return result;
    }

    private async completeWithServiceAsync(
        flat:FlatConvoConversation,
        completionService:ConvoCompletionService<any,any>|undefined
    ):Promise<ConvoCompletionMessage[]>{

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

        if(!completionService){
            return [];
        }

        let messages:ConvoCompletionMessage[];

        const lock=getGlobalConversationLock();
        const release=await lock?.waitOrCancelAsync(this._disposeToken);
        if(lock && !release){
            return []
        }
        try{
            messages=await completeConvoUsingCompletionServiceAsync(flat,completionService,this.converters);
        }finally{
            release?.();
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
                return await this._completeAsync(true,additionalOptions?.usage,task,additionalOptions,getCompletion,autoCompleteDepth,prevCompletion,preReturnValues);
            }finally{
                this._isCompleting.next(false);
            }
        }
    }

    private async tryCompleteParallelAsync(
        options:ConvoCompletionOptions|undefined
    ):Promise<ConvoCompletion|undefined>{
        const last=this.messages[this.messages.length-1];

        if(last?.parallel){
            let pCount=1;
            for(let i=this.messages.length-2;i>=0;i--){
                const msg=this.messages[i];
                if(!msg?.parallel){
                    break;
                }
                pCount++;
            }

            if(pCount>1){
                const messages=this.messages.slice(this.messages.length-pCount);
                const c=await this.completeParallelMessagesAsync(messages,options);
                if(c){
                    return c;
                }

            }

        }

        return undefined;
    }

    private async completeParallelMessagesAsync(
        messages:ConvoMessage[],
        options:ConvoCompletionOptions|undefined
    ):Promise<ConvoCompletion|undefined>{
        const all=await Promise.all(messages.map(async (msg,i)=>{
            const clone=this.clone(undefined,{disableAutoFlatten:true});
            while(clone.messages[clone.messages.length-1]?.parallel){
                clone.messages.pop();
            }
            const msgCount=clone._messages.length;
            clone._messages.push(msg);
            clone._convo.splice(0,clone._convo.length);
            const cps=clone.completionService;
            const messages:ConvoCompletionMessage[]=[];
            if(cps){
                clone.completionService={
                    inputType:cps.inputType,
                    outputType:cps.outputType,
                    canComplete:(model:string|undefined,flat:FlatConvoConversationBase)=>{
                        return cps.canComplete(model,flat)
                    },
                    completeConvoAsync:async (input:any,flat:FlatConvoConversationBase)=>{
                        const m=await cps.completeConvoAsync(input,flat);
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
                    messages:clone.messages.slice(msgCount),
                    convo:clone.convo,
                    msg,
                }
            }finally{
                clone.dispose();

            }
        }));

        while(this.messages[this.messages.length-1]?.parallel){
            this.messages.pop();
        }
        const convo=this.convo;
        this._convo.splice(1,this._convo.length-1);
        const trim=trimParallelConvo(convo);
        this._convo[0]=trim.convo;

        for(let i=0;i<all.length;i++){
            const c=all[i];
            if(!c){continue}
            this.append((trim.messages[i]??'')+'\n\n'+c.convo,{
                disableAutoFlatten:true,
            })
        }

        return all[all.length-1]?.completion;
    }

    private readonly _isCompleting:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isCompletingSubject():ReadonlySubject<boolean>{return this._isCompleting}
    public get isCompleting(){return this._isCompleting.value}

    private async _completeAsync(
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
        lastFnCall?:ConvoFnCallInfo
    ):Promise<ConvoCompletion>{

        if(task===undefined){
            task=defaultConvoTask;
        }
        const isDefaultTask=task===defaultConvoTask;

        if(updateTaskCount){
            this._activeTaskCount.next(this.activeTaskCount+1);
        }

        const messageStartIndex=this._messages.length;

        const parallelResult=await this.tryCompleteParallelAsync(additionalOptions);
        if(parallelResult){
            if(!this.disableAutoFlatten && isDefaultTask){
                this.autoFlattenAsync(false);
            }
            if(updateTaskCount){
                this._activeTaskCount.next(this.activeTaskCount-1);
            }
            return parallelResult;
        }

        try{
            const append:string[]=[];
            const flatExe=this.createConvoExecutionContext(append);
            const flat=await this.flattenAsync(flatExe,{
                setCurrent:false,
                task,
                discardTemplates:!isDefaultTask || templates!==undefined,
                threadFilter:additionalOptions?.threadFilter,
                toolChoice:isSourceMessage?additionalOptions?.toolChoice:undefined,
            });

            if(flat.templates && !templates){
                templates=flat.templates;
            }
            const exe=flat.exe;
            if(this._isDisposed){
                return {messages:[],status:'disposed',task}
            }

            if(flat.queueRef && isSourceMessage){
                this.append(`> ${convoRoles.insertStart} ${flat.queueRef.label}`,{disableAutoFlatten:true,throwOnError:true})
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
                this.ragCallback &&
                lastFlatMsg?.role===convoRoles.user
            ){
                const ragParams=flat.exe.getVar(convoVars.__ragParams);
                const tol=flat.exe.getVar(convoVars.__ragTol)
                ragDoc=await this.ragCallback({
                    params:ragParams && (typeof ragParams === 'object')?ragParams:{},
                    lastMessage:lastFlatMsg,
                    flat,
                    conversation:this,
                    tolerance:(typeof tol === 'number')?tol:defaultConvoRagTol
                });
            }

            if(ragDoc){
                ragMsg=convoRagDocRefToMessage(ragDoc,convoRoles.rag);
                if(ragMsg){
                    flat.messages.push(this.flattenMsg(ragMsg,true));
                    this.applyRagMode(flat.messages,flat.ragMode);
                    this.appendMessageObject(ragMsg,{disableAutoFlatten:true,appendCode:true});
                }
            }

            const lastMsg=this.messages[this.messages.length-1];
            const lastMsgIsFnCall=lastMsg?.fn?.call?true:false;
            let directInvoke=false;
            const completion:ConvoCompletionMessage[]=await (async ()=>{

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

            for(const msg of completion){

                let includeTokenUsage=(msg.inputTokens || msg.outputTokens || msg.tokenPrice)?true:false;

                if(includeTokenUsage){
                    addConvoUsageTokens(this.usage,msg);
                    if(this._onTokenUsage){
                        this._onTokenUsage(convoPartialUsageTokensToUsage(msg));
                    }
                }

                const tagsCode=msg.tags?convoTagMapToCode(msg.tags,'\n'):'';

                if(msg.format==='json' && msg.content){
                    let json=parseConvoJsonMessage(msg.content);
                    if(msg.formatIsArray && !Array.isArray(json) && Array.isArray(json.values)){
                        json=json.values;
                    }
                    msg.content=JSON.stringify(json,null,4)
                }

                if(msg.content){
                    cMsg=msg;
                    if(isDefaultTask){
                        this.append(`${this.getPrefixTags({includeTokenUsage,msg})}${tagsCode}> ${this.getReversedMappedRole(msg.role)}\n${escapeConvoMessageContent(msg.content)}\n`);
                    }
                    includeTokenUsage=false;
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
                    const callResult=await exe.executeFunctionResultAsync(callMessage.fn);
                    if(this._isDisposed){
                        return {messages:[],status:'disposed',task}
                    }
                    const callResultValue=callResult.valuePromise?(await callResult.valuePromise):callResult.value;
                    const target=this._messages.find(m=>m.fn && !m.fn.call && m.fn?.name===callMessage?.fn?.name);
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

                    const lines:string[]=[`${this.getPrefixTags()}> result`];
                    let lastSharedVar:string|undefined;
                    if(exe.sharedSetters){
                        for(const s of exe.sharedSetters){
                            lastSharedVar=s;
                            lines.push(`${s}=${JSON.stringify(exe.sharedVars[s],null,4)}`)
                        }
                    }

                    if(lastSharedVar && exe.sharedVars[lastSharedVar] && lastResultValue===exe.sharedVars[lastSharedVar]){
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
                    lines.push('');
                    if(isDefaultTask){
                        this.append(lines.join('\n'),true);
                    }

                    if(disableAutoComplete){
                        lastResultValue=undefined;
                    }

                    if(isDefaultTask){
                        this.setFlat(flat);
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

            if(append.length){
                if(isDefaultTask){
                    for(const a of (append as string[])){
                        this.append(a);
                    }
                }
            }else if(lastResultValue!==undefined && autoCompleteDepth<this.maxAutoCompleteDepth && !(additionalOptions?.returnOnCalled || directInvoke)){
                return await this._completeAsync(false,undefined,task,additionalOptions,getCompletion,autoCompleteDepth+1,completion,returnValues,templates,undefined,lastFnCall);
            }

            if(isDefaultTask && templates?.length){
                this.writeTemplates(templates,flat);
            }

            if(flat.queueRef && isSourceMessage){
                this.append(`> ${convoRoles.flushed}\n> ${convoRoles.insertEnd}`,{disableAutoFlatten:true,throwOnError:true});
            }

            if(!this.disableAutoFlatten && isDefaultTask){
                this.autoFlattenAsync(false);
            }


            if(flat.taskTriggers?.[convoTaskTriggers.onResponse]){
                this.startSubTasks(flat,convoTaskTriggers.onResponse,getCompletion,autoCompleteDepth+1,additionalOptions);
            }

            if(flat.queueRef && isSourceMessage){
                return await this._completeAsync(
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
            const promise=this._completeAsync(false,undefined,task,additionalOptions,getCompletion,autoCompleteDepth);
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
        })
        flatExe.print=this.print;
        if(this.defaultOptions.allowEvalCode){
            flatExe.setVar(true,convoScopeFunctionEvalJavascript,'evalJavascript');
        }
        for(const e in this.defaultVars){
            flatExe.setVar(true,this.defaultVars[e],e);
        }
        return flatExe;
    }

    private flattenMsg(msg:ConvoMessage,setContent:boolean):FlatConvoMessage{
        const flat:FlatConvoMessage={
            role:this.getMappedRole(msg.role),
            tags:msg.tags?convoTagsToMap(msg.tags):undefined,
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
        if(this.userRoles.includes(flat.role) && !msg.fn){
            flat.isUser=true;
        }
        if(this.assistantRoles.includes(flat.role) && !msg.fn){
            flat.isAssistant=true;
        }
        if(this.systemRoles.includes(flat.role) && !msg.fn){
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
        if(msg.parallel){
            flat.parallel=true;
        }
        if(msg.label){
            flat.label=msg.label;
        }
        return flat;
    }

    private importMessages:ConvoMessage[]=[];

    private async loadImportsAsync(msg:ConvoMessage):Promise<void>
    {
        if(this.importMessages.includes(msg) || !msg.tags){
            return;
        }
        const handler=this.defaultOptions.importHandler;
        if(!handler){
            throw new Error('No conversation import handler defined');
        }
        this.importMessages.push(msg);

        const index=Math.max(0,this._messages.indexOf(msg));
        for(const t of msg.tags){
            if(t.name!==convoTags.import || !t.value){
                continue;
            }

            await this.importAsync(t.value,index);
        }
    }

    public async importAsync(name:string,index?:number):Promise<ConvoMessage[]>
    {
        const handler=this.defaultOptions.importHandler;
        if(!handler){
            throw new Error('No conversation import handler defined');
        }

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
        const system=modifiers.includes(convoImportModifiers.system);
        const ignoreContent=modifiers.includes(convoImportModifiers.ignoreContent);

        const result=await handler({
            name,
            modifiers,
            system,
            ignoreContent,
        });
        if(!result){
            throw new Error(`Convo import (${name}) not found`)
        }
        let convo=result.convo??'';

        if(result.type){
            convo=(
                '> define\n'+
                asArray(result.type).map(t=>`${t.name} = ${schemeToConvoTypeString(t.type)}`).join('\n')+
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

        if(r.result){
            if(system || ignoreContent){
                for(let i=0;i<r.result.length;i++){
                    const msg=r.result[i];
                    if( !msg ||
                        (ignoreContent && (msg.content!==undefined || msg.statement!==undefined) && msg.role!=='system') ||
                        (system && msg.role!=='system')
                    ){
                        r.result.splice(i,1);
                        i--;
                        continue;
                    }

                }
            }
            this._messages.splice(index??this._messages.length,0,...r.result);
        }

        return r.result??[];
    }

    public async flattenAsync(
        exe:ConvoExecutionContext=this.createConvoExecutionContext(),
        {
            task=defaultConvoTask,
            setCurrent=task===defaultConvoTask,
            discardTemplates,
            threadFilter,
            toolChoice,
        }:FlattenConvoOptions={}
    ):Promise<FlatConvoConversation>{

        const isDefaultTask=task===defaultConvoTask;

        const messages:FlatConvoMessage[]=[];
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
        if(this.getStartOfConversation){
            const start=this.getStartOfConversation();
            if(Array.isArray(start)){
                sourceMessages=[...start,...sourceMessages];
            }else if(start){
                const r=parseConvoCode(start);
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

        for(let i=0;i<sourceMessages.length;i++){
            const msg=sourceMessages[i];

            if(!msg){
                continue;
            }

            if(secondPassRoles.includes(msg.role)){
                secondPass=true;
            }

            if(containsConvoTag(msg.tags,convoTags.import) && !this.importMessages.includes(msg)){
                await this.loadImportsAsync(msg);
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

            const flat=this.flattenMsg(msg,false);
            if(flat.component){
                flat.componentIndex=componentIndex++;
            }

            if(getFlatConvoTag(flat,convoTags.clear)){
                const clearSystem=flat.tags?.[convoTags.clear]==='system';
                for(let i=messages.length-1;i>=0;i--){
                    const m=messages[i];
                    if(!m){
                        continue;
                    }
                    if( (m.isUser || m.isAssistant) &&
                        !getFlatConvoTag(m,convoTags.noClear) &&
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
                if(msg.fn.local || msg.fn.call){
                    continue;
                }else if(msg.fn.topLevel){
                    exe.clearSharedSetters();
                    const r=exe.executeFunction(msg.fn);
                    if(r.valuePromise){
                        await r.valuePromise;
                    }
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
                    const prev=sourceMessages[i-1];
                    if(msg.role==='result' && prev?.fn?.call){
                        flat.role='function';
                        flat.called=prev.fn;
                        flat.calledReturn=exe.getVarEx(convoResultReturnName,undefined,undefined,false);
                        flat.calledParams=exe.getConvoFunctionArgsValue(prev.fn);
                        if(prev.tags){
                            flat.tags=flat.tags?{...convoTagsToMap(prev.tags),...flat.tags}:convoTagsToMap(prev.tags)
                        }
                    }else{
                        continue;
                    }
                }else{
                    flat.role='function';
                    flat.fn=msg.fn;
                    flat.fnParams=exe.getConvoFunctionArgsScheme(msg.fn);
                }
            }else if(containsConvoTag(msg.tags,convoTags.edge)){
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
                        if(tag?.value && !this.isTagConditionTrue(exe,tag.value)){
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
                this.applyTagsAndState(msg,flat,messages,exe,setMdVars,mdVarCtx);
            }
        }

        let queueRef:ConvoQueueRef|undefined;

        if(secondPass){
            let insertLabel='';
            let insertStartIndex=0;
            let hasQueue=false;
            let insertOpen=false;
            for(let i=0;i<messages.length;i++){
                const msg=messages[i];
                if(!msg){
                    continue;
                }
                switch(msg.role){

                    case convoRoles.insertStart:
                        insertStartIndex=i;
                        insertLabel=msg.content??'';
                        insertOpen=true;
                        break;

                    case convoRoles.insertEnd:{
                        for(let b=i-1;b>=0;b--){
                            const bm=messages[b];
                            if(bm?.label==insertLabel){
                                insertOpen=false;
                                const removed=messages.splice(insertStartIndex,i-insertStartIndex+1);
                                removed.pop();
                                removed.shift();
                                messages.splice(b,0,...removed);
                                i-=2;
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
                        messages.splice(b,0,...removed);
                    }
                }
            }
            if(hasQueue){
                for(let i=0;i<messages.length;i++){
                    const msg=messages[i];
                    if(msg?.role!==convoRoles.queue){
                        continue;
                    }

                    if(messages[i-1]?.role===convoRoles.flushed){
                        messages.splice(i-1,2);
                        i-=2;
                    }else{
                        queueRef={
                            label:msg.label??'',
                            index:i,
                        };
                        messages.splice(i,messages.length);
                        break;
                    }

                }
            }
        }

        for(const pair of edgePairs){
            if(pair.msg.statement){
                await flattenMsgAsync(exe,pair.msg.statement,pair.flat,pair.shouldParseMd);
            }
            this.applyTagsAndState(pair.msg,pair.flat,messages,exe,pair.setMdVars,mdVarCtx);
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


        let responseModel:string|undefined=exe.getVar(convoVars.__model);
        let responseEndpoint:string|undefined=exe.getVar(convoVars.__endpoint);
        let userId:string|undefined=exe.getVar(convoVars.__userId);
        if(typeof responseModel !== 'string'){
            responseModel=undefined;
        }
        if(typeof responseEndpoint !== 'string'){
            responseEndpoint=undefined;
        }
        if(typeof userId !== 'string'){
            userId=undefined;
        }
        const lastUserMsg=getLastConvoMessageWithRole(messages,'user');
        const modelTagValue=lastUserMsg?.tags?.[convoTags.responseModel];
        if(modelTagValue){
            responseModel=modelTagValue;
        }
        const endpointTagValue=lastUserMsg?.tags?.[convoTags.responseEndpoint];
        if(endpointTagValue){
            responseModel=endpointTagValue;
        }
        const userIdTagValue=lastUserMsg?.tags?.[convoTags.userId];
        if(userIdTagValue){
            userId=userIdTagValue;
        }

        const flat:FlatConvoConversation={
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
            responseModel,
            responseEndpoint,
            userId,
            queueRef,
            apiKey:this.getDefaultApiKey()??undefined,
        }

        for(let i=0;i<messages.length;i++){
            const msg=messages[i];
            if(!msg){continue}

            switch(msg.role){

                case convoRoles.ragPrefix:
                    flat.ragPrefix=msg.content;
                    messages.splice(i,1);
                    i--;
                    break;

                case convoRoles.ragSuffix:
                    flat.ragSuffix=msg.content;
                    messages.splice(i,1);
                    i--;
                    break;

            }

        }

        if(setCurrent){
            this.setFlat(flat);
        }

        return flat;
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

    private isTagConditionTrue(exe:ConvoExecutionContext,tagValue:string,startIndex=0):boolean{
        const not=tagValue.startsWith('!');
        if(not){
            tagValue=tagValue.substring(1).trim();
        }
        const parts=tagValue.split(/\s+/);
        if(startIndex){
            parts.splice(0,startIndex);
        }
        if(parts.length<1){
            return false;
        }
        let value=exe.getVar(parts[0]??'');
        if(not){
            value=!value;
        }
        if(parts.length===1){
            return value?true:false;
        }
        let v2:any;
        if(parts.length>2){
            parts.shift();
            v2=parts.join(' ');
        }else{
            v2=parts[1];
        }
        return value?.toString()===v2;

    }

    private applyTagsAndState(
        msg:ConvoMessage,
        flat:FlatConvoMessage,
        allMessages:FlatConvoMessage[],
        exe:ConvoExecutionContext,
        setMdVars:boolean,
        mdVarCtx:MdVarCtx
    ){
        if(msg.assignTo){
            exe.setVar(true,msg.jsonValue??flat.content,msg.assignTo);
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



        if(!msg.tags){
            return;
        }
        let responseFormat:string|undefined;
        for(const tag of msg.tags){
            switch(tag.name){

                case convoTags.responseFormat:
                    responseFormat=tag.value;
                    break;

                case convoTags.json:
                    responseFormat=tag.value?'json '+tag.value:'json';
                    break;

                case convoTags.responseAssign:
                    flat.responseAssignTo=tag.value;
                    break;

                case convoTags.responseModel:
                    flat.responseModel=tag.value;
                    break;

                case convoTags.responseEndpoint:
                    flat.responseEndpoint=tag.value;
                    break;

                case convoTags.condition:
                    if(!tag.value || !this.isTagConditionTrue(exe,tag.value)){
                        aryRemoveItem(allMessages,flat);
                    }
                    break;

            }
        }
        if(responseFormat){
            this.applyResponseFormat(msg,flat,responseFormat,exe);
        }
    }
    private applyResponseFormat(msg:ConvoMessage,flat:FlatConvoMessage,format:string,exe:ConvoExecutionContext)
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
            if(!flat.suffix){
                flat.suffix='';
            }
            flat.suffix+='\n\nRespond in JSON format.'
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

        if(flat.responseFormat!=='json'){
            return;
        }

        if(!flat.suffix){
            flat.suffix='';
        }

        const type=exe.getVar(typeName);

        let scheme=convoTypeToJsonScheme(type);

        if(!scheme){
            throw new ConvoError('invalid-message-response-scheme',{message:msg},`${typeName} does not point to a convo type object `);
        }

        if(isArray){
            scheme={
                type:'object',
                required:['values'],
                properties:{
                    values:{
                        type:'array',
                        items:scheme
                    }
                }
            }
        }

        flat.suffix+=`\n\nReturn an object that conforms to the JSON Schema below.\n:${
            JSON.stringify(scheme)
        }`;



    }

    public shouldDebug(exe?:ConvoExecutionContext)
    {
        return (
            this.debugMode ||
            (exe?exe.getVar(convoVars.__debug):this.getVar(convoVars.__debug))
        )?true:false;
    }

    public readonly debugToConversation=(...args:any[])=>{
        if(!args.length){
                return;
            }
            const out:string[]=[];
            for(const v of args){
                if(typeof v === 'string'){
                    out.push(v);
                }else{
                    try{
                        out.push(JSON.stringify(v,null,4)??'');
                    }catch{
                        out.push(v?.toString()??'');
                    }
                }
            }
            const debugComment=convoStringToComment(out.join('\n'));
            this.append(`> debug\n${debugComment}`);
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
                push(this.createFunctionImpl(fn),item);
                push('\n',item);
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

    public toModelFormat(flat:FlatConvoConversation):any
    {
        if(!this.completionService){
            return undefined;
        }
        return convertConvoInput(flat,this.completionService.inputType,this.converters);
    }

    public toModelFormatStr(flat:FlatConvoConversation):string
    {
        const value=this.toModelFormat(flat);
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
    convoRoles.insertStart,
    convoRoles.insertEnd,
    convoRoles.queue,
    convoRoles.flushed,
]
