import { XmlNode } from "@iyio/common";
import { Conversation } from "./Conversation";
import { ConversationUiCtrl } from "./ConversationUiCtrl";
import { ConvoCompletionOptions, ConvoMessagePrefixOptions, FlatConvoConversation, FlatConvoMessage } from "./convo-types";

export const convoPromptImagePropKey=Symbol('convoPromptImagePropKey');

export type ConvoEditorMode='code'|'vars'|'flat'|'tree'|'model';

export type ConvoPromptMediaPurpose='preview'|'prompt';

/**
 * true - enables markdown for assistant messages
 * false - disables markdown for all messages
 * assistant - enables markdown for assistant messages
 * user - enables markdown for user messages
 * all - enables markdown for all messages
 */
export type ConvoMarkdownEnableState=boolean|'user'|'assistant'|'all';

export interface ConvoPromptMedia
{
    url?:string;
    getUrl?:(purpose:ConvoPromptMediaPurpose)=>string;
    data?:any;
    [convoPromptImagePropKey]?:()=>string;
}

export interface ConvoDataStore
{
    loadConvo?(id:string):string|undefined|Promise<string|undefined>;

    saveConvo?(id:string,convo:string):void|Promise<void>;

    deleteConvo?(id:string):void|Promise<void>;
}


/**
 * null - use default renderer
 * undefined - use default renderer
 * false - do not render message
 */
export type ConvoMessageRenderResult=RenderedConvoMessage|null|undefined|false;
/**
 * Used to return a convo message.
 */
export type ConvoMessageRenderer=(message:FlatConvoMessage,index:number,ctrl:ConversationUiCtrl)=>ConvoMessageRenderResult;

export type RenderedConvoMessagePosition='before'|'replace'|'after'
export interface RenderedConvoMessage
{
    role?:string;
    content?:string;
    component?:any;
    /**
     * @default 'replace'
     */
    position?:RenderedConvoMessagePosition;
}

export interface ConvoComponentRendererContext
{
    id:string;
    ctrl:ConversationUiCtrl;
    convo:Conversation;
    flat:FlatConvoConversation;
    message:FlatConvoMessage;
    isUser:boolean;
    index:number;
    className?:string;
    rowClassName?:string;
}

export type ConvoComponentRenderFunction=(
    component:ConvoMessageComponent,
    renderCtx:ConvoComponentRendererContext
)=>any;

export interface ConvoComponentRendererWithOptions
{
    /**
     * Convo script to be injected into the prompt the component is being used with
     */
    convo?:string;
    doNotRenderInRow?:boolean;
    render:ConvoComponentRenderFunction;
}

export type ConvoComponentRenderer=ConvoComponentRenderFunction|ConvoComponentRendererWithOptions;


export type ConvoMessageComponent=XmlNode&{isJson?:boolean};

export type ConvoRagRenderer=(msg:FlatConvoMessage,ctrl:ConversationUiCtrl)=>any;

export interface ConvoUiMessageAppendEvt
{
    isCommand:boolean;
    message:string;
}

export interface ConvoUiAppendTrigger
{
    /**
     * If role is defined the `append` prop is appended as a content message using the role.
     * Otherwise append is appended as raw convo.
     */
    role?:string;

    /**
     * The content or raw convo to append.
     */
    append?:string;

    /**
     * Options used when a role is provided.
     */
    options?:ConvoMessagePrefixOptions;

    /**
     * If true or an object the appended message should trigger the completions process.
     */
    complete?:boolean|ConvoCompletionOptions;

    /**
     * If true and no role is provided the appended content will be merged with the previous message.
     */
    mergeWithPrev?:boolean;

    /**
     * Call if an error occurs
     */
    errorCallback?:(error:any)=>void;
}
