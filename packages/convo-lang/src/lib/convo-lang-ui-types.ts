import { XmlNode } from "@iyio/common";
import { Conversation } from "./Conversation";
import { ConversationUiCtrl } from "./ConversationUiCtrl";
import { FlatConvoConversation, FlatConvoMessage } from "./convo-types";

export const convoPromptImagePropKey=Symbol('convoPromptImagePropKey');

export type ConvoEditorMode='code'|'vars'|'flat'|'tree'|'model';

export type ConvoPromptMediaPurpose='preview'|'prompt';

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
    doNotRenderInRow?:boolean;
    render:ConvoComponentRenderFunction;
}

export type ConvoComponentRenderer=ConvoComponentRenderFunction|ConvoComponentRendererWithOptions;


export type ConvoMessageComponent=XmlNode;

export type ConvoRagRenderer=(msg:FlatConvoMessage,ctrl:ConversationUiCtrl)=>any;

export interface ConvoUiMessageAppendEvt
{
    isCommand:boolean;
    message:string;
}
