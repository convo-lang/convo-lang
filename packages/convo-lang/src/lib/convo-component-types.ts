import { XmlNode } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ZodType } from "zod";
import { Conversation } from "./Conversation.js";
import type { ConversationUiCtrl } from "./ConversationUiCtrl.js";
import { ConvoCompletionMessage, FlatConvoConversation, FlatConvoMessage } from "./convo-types.js";

export interface ConvoComponentDef
{
    /**
     * Name of the component
     */
    name:string;
    description?:string;
    renderer?:ConvoComponentRenderer;
    propsScheme?:ZodType;
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
    component:ConvoComponent,
    renderCtx:ConvoComponentRendererContext
)=>any;

export interface ConvoComponentRendererWithOptions
{
    /**
     * Convo script to be injected into the prompt the component is being used with
     */
    convo?:string;// todo - replace with import
    doNotRenderInRow?:boolean;
    render:ConvoComponentRenderFunction;
}

export type ConvoComponentRenderer=ConvoComponentRenderFunction|ConvoComponentRendererWithOptions;


export interface ConvoComponent extends XmlNode{
    isJson?:boolean;// todo - remove prop and always use xml
};


export interface ConvoComponentMessageState
{
    last?:FlatConvoMessage;
    all:FlatConvoMessage[];
    flat:FlatConvoConversation;
    convo:Conversation;
}

export type ConvoComponentMessagesCallback=((state:ConvoComponentMessageState)=>void)|BehaviorSubject<ConvoComponentMessageState|null>;

export interface ConvoComponentCompletionCtx
{
    message:FlatConvoMessage;
    flat:FlatConvoConversation;
    convo:Conversation;
    component:ConvoComponent;
    submit:(submission:ConvoComponentSubmission)=>void;
}
export type ConvoComponentCompletionHandler=(ctx:ConvoComponentCompletionCtx)=>void;

export interface ConvoComponentSubmission
{
    data?:any;
    messages?:ConvoCompletionMessage[];
}

export interface ConvoComponentSubmissionWithIndex extends ConvoComponentSubmission
{
    componentIndex:number;
}
