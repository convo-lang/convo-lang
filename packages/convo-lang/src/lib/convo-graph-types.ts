import { CancelToken, CodeParsingResult, Point } from "@iyio/common";
import { BehaviorSubject, Observable } from "rxjs";
import { ZodType } from "zod";
import { Conversation, ConversationOptions } from "./Conversation";
import type { ConvoGraphCtrl } from "./ConvoGraphCtrl";
import { ConvoMessage } from "./convo-types";

export const allConvoGraphEntityTypeAry=['node','edge','input','source','traverser'] as const;
export type ConvoGraphEntityType=typeof allConvoGraphEntityTypeAry[number];
export const isConvoGraphEntityType=(value:any):value is ConvoGraphEntityType=>(allConvoGraphEntityTypeAry.includes(value));

export interface ConvoGraphEntities
{
    node?:ConvoNode;
    edge?:ConvoEdge;
    input?:ConvoInputTemplate;
    source?:ConvoSourceNode;
    traverser?:ConvoTraverser;
}

export type ConvoGraphEntityRef=ConvoGraphEntities & {
    id:string;
} & ({
    type:"node";
    entity:ConvoNode;
}|{
    type:"edge";
    entity:ConvoEdge;
}|{
    type:"input";
    entity:ConvoInputTemplate;
}|{
    type:"source";
    entity:ConvoSourceNode;
}|{
    type:"traverser";
    entity:ConvoTraverser;
})

export type ConvoGraphSelection=ConvoGraphEntityRef & {
    multi:ConvoGraphEntityRef[];
}

export type ConvoGraphEntityAny=ConvoNode|ConvoEdge|ConvoInputTemplate|ConvoSourceNode|ConvoTraverser;


export interface ConvoGraph
{
    id:string;
    name?:string;
    nodes:ConvoNode[];
    edges:ConvoEdge[];
}

export interface ConvoGraphDb
{
    nodes:ConvoNode[];
    edges:ConvoEdge[];
    traversers:ConvoTraverser[];
    inputs:ConvoInputTemplate[];
    sourceNodes:ConvoSourceNode[];
    metadata?:Record<string,any>;
}

export interface ConvoNodeTypeMetadata
{
    /**
     * The name of the type
     */
    name:string;
}

export interface ConvoNode
{
    /**
     * Unique id of the node
     */
    id:string;

    /**
     * A key to reference the node by
     */
    key?:string;

    /**
     * A display name for the node
     */
    name?:string;

    /**
     * A description of what the node does.
     */
    description?:string;

    /**
     * Shared convo script that is prefixed to each step of the node
     */
    sharedConvo?:string;

    /**
     * A set of steps the node will execute to generate an output
     */
    steps:ConvoNodeStep[];


    /**
     * If true auto input transforming is disabled. When input is passed to  node and the input
     * does not conform to the input type of the node a input transform step will be added to the
     * start of the node. When `disableAutoTransform` is set to true the auto generated input
     * transform step will not be added.
     */
    disableAutoTransform?:boolean;

    /**
     * Compiled metadata based on the convo scripts of the node
     */
    metadata?:ConvoNodeMetadata;

    /**
     * The var name in global scope that will be given to the userData of the node at run time. If
     * null userData will not be defined in the global scope.
     * @default "userData"
     */
    userDataVarName?:string|null;

    /**
     * User data that can be used for any purpose.
     */
    userData?:Record<string,any>;

    x?:number;
    y?:number;
}

export interface ConvoNodeStep
{
    name?:string;

    /**
     * The convo script for the step
     */
    convo:string;

    /**
     * If true the step will reset the node conversation before executing
     */
    resetConvo?:boolean;
}

export interface ConvoNodeExecCtx extends ConvoMetadataAndTypeMap
{

    /**
     * Node steps paired with a conversation for execution
     */
    steps:ConvoNodeExecCtxStep[];

    /**
     * Variable defaults passed to the conversations
     */
    defaultVars:Record<string,any>;

    convo:Conversation;

    convoOptions?:ConversationOptions;

    node:ConvoNode;
}

export interface ConvoNodeExecCtxStep
{
    nodeStep:ConvoNodeStep;
}

export interface ConvoNodeOutput extends ConvoNodeTypeMetadata
{
    /**
     * The name of the output function. fnName can be used by edges to match to specific output
     * functions
     */
    fnName?:string;
}

export interface ConvoNodeMetadata
{
    /**
     * The input type of the node. If not defined the input type is `any`
     */
    inputType?:ConvoNodeTypeMetadata;

    outputTypes?:ConvoNodeOutput[];
}

export interface ConvoMetadataAndTypeMap
{
    /**
     * Maps types defined by ConvoNodeMetadata to zod objects.
     */
    typeMap:Record<string,ZodType<any>>;

    /**
     * metadata related to a ConvoNode
     */
    metadata:ConvoNodeMetadata;

    sharedVars:Record<string,any>;
}

/**
 * Connects the output of a node to the input of another node.
 */
export interface ConvoEdge
{

    /**
     * A display name for the edge
     */
    name?:string;

    /**
     * A description of why the edge connects it nodes
     */
    description?:string;

    /**
     * Unique id of the edge
     */
    id:string;

    /**
     * The node id or key that the from side of the edge connects to.
     */
    from:string;

    /**
     * If defined the "from" node of the the edge must product an output that is generated by a
     * function with a name that matches `fromFn`.
     */
    fromFn?:string;

    /**
     * If defined the output from the "from" node of the the edge must product an output that of a
     * type that matches `fromType`.
     */
    fromType?:string;

    /**
     * The node id or key that the "to" side of the edge connects to.
     */
    to:string;

    /**
     * A convo script that can be used to filter. The condition script will not be completed only
     * flatted and checked for a variable named isMatch. If isMatch is true the condition node
     * will be connected to it target node.
     */
    conditionConvo?:string;

    /**
     * Defines conditions for pausing the traversal of a traverser crossing the edge.
     */
    pause?:ConvoTraversalPause;

    /**
     * A dot path used to select a sub-property of the input to pass to the to destination
     */
    selectPath?:string;

    /**
     * If true the edge should loop over its payload if the payload is an array
     */
    loop?:boolean;

    /**
     * A dot path used to select a sub-property looped items
     */
    loopSelectPath?:string;

    x?:number;
    y?:number;

    /**
     * Extra points to be drawn between the edge and its from node.
     */
    fromPoints?:Point[];

    /**
     * Extra points to be drawn between the edge and its to node.
     */
    toPoints?:Point[];

    /**
     * The var name in global scope that will be given to the userData of the edge at run time. If
     * null userData will not be defined in the global scope.
     * @default "userData"
     */
    userDataVarName?:string|null;

    /**
     * User data that can be used for any purpose.
     */
    userData?:Record<string,any>;
}

export interface ConvoEdgePattern
{
    /**
     * Id of the from node to match
     */
    from:string;

    /**
     * Matches they payload type produced by the from node
     */
    fromType?:string;

    /**
     * Name of the function that produced the payload
     */
    fromFn?:string;

    /**
     * Input value that for dynamic condition checking
     */
    input?:any;

    /**
     * A Workflow object to insert into the condition checking
     */
    workflow?:Record<string,any>;
}

/**
 * Defines conditions for pausing the traversal of a traverser crossing an edge. If empty traversal
 * can be resumed by any user and may be paused indefinitely.
 */
export interface ConvoTraversalPause
{
    /**
     * A delay in milliseconds to delay traversing to the next node. The delay is applied after
     * checking the condition of the edge.
     */
    delayMs?:number;

    /**
     * If true approval from a user is required before allow the traverser to continue
     */
    approvalRequired?:boolean;
}

/**
 * `paused` - Execution is paused due to a ConvoTraversalPause object being assigned to the traverser.
 *
 * `ready` - The traverser is ready to execute a node
 *
 * `transforming-input` - The traverser is transforming input according to the input type of the node the traverser is on.
 *
 * `invoking` - The traverser is executing the invoke script of the node it is on.
 *
 * `invoked` - The traverser has executed a node and is ready to traverse the next edge.
 *
 * `stopped` - The traverser has reached the end of its node path and is stopped and can not resume.
 *
 * `failed` - The traverser has ran into an error and can not resume.
 */
export type ConvoNodeExeState=(
    'paused'|
    'ready'|
    'invoking'|
    'invoked'|
    'stopped'|
    'failed'
);

export interface ConvoTraverser
{
    /**
     * A unique id for the traverser
     */
    id:string;

    /**
     * The current execution state of the traverser
     */
    exeState:ConvoNodeExeState;

    /**
     * The index of the current step of the current node the traverser is on
     */
    currentStepIndex:number;

    /**
     * Defines the conditions for pausing the traverser.
     */
    pause?:ConvoTraversalPause;

    /**
     * A timestamp when to resume traversal after being paused.
     */
    resumeAt?:number;

    /**
     * Shared state of the traverser. Nodes can store data in the state object.
     */
    state:Record<string,any>;

    /**
     * Stores the input and output of nodes as the traverser travels
     */
    payload?:any;

    /**
     * Address of the node the traverser is currently at either executing or waiting to execute.
     * When execution is paused the traverser will move to its next node then wait to execute.
     */
    address?:string;

    /**
     * Ids of the edges the traverser has traveled
     */
    path?:string[];

    /**
     * The id of the node the traverser started at
     */
    startingNodeId?:string;

    /**
     * Id of the current node the traverser is on.
     */
    currentNodeId?:string;

    /**
     * An error message describing what caused the traverser to fail
     */
    errorMessage?:string;

    /**
     * An optional name for the traverser
     */
    name?:string;

    /**
     * An optional user id to associate with the traverser.
     */
    userId?:string;

    /**
     * An optional user group id to associate with the traverser.
     */
    userGroupId?:string;

    /**
     * User data that can be used for any purpose.
     */
    userData?:Record<string,any>;

    /**
     * If true the traverser should be saved after changes
     */
    saveToStore?:boolean;

    /**
     * If defined the traverser will control the browser path
     */
    controlPath?:string;

    x?:number;
    y?:number;
}

export interface CreateConvoTraverserOptions
{
    defaults?:Partial<ConvoTraverser>|((
        edge:ConvoEdge,
        options:CreateConvoTraverserOptions|undefined,
        payload:any,
        state:Record<string,any>|undefined,
        saveToStore:boolean
    )=>Partial<ConvoTraverser>);
    initTraverser?:(tv:ConvoTraverser)=>void|Promise<void>;
}

export interface StartConvoTraversalOptions
{
    createTvOptions?:CreateConvoTraverserOptions;

    /**
     * The edge where the traverser will start. If edge is a string it is converted to an edge
     * with a `to` value of the string value.
     */
    edge?:ConvoEdge|string;

    /**
     * Predefined array of traverser that skips edges
     */
    traversers?:ConvoTraverser[];

    /**
     * Used to match and existing edge in the graph store
     */
    edgePattern?:ConvoEdgePattern;

    payload?:any;

    state?:Record<string,any>;

    /**
     * If true the traversers created will be saved to the graph store
     */
    saveToStore?:boolean;

    /**
     * A cancelation token that can be used to stop the traversal of the traverser and all forked
     * traversers
     */
    cancel?:CancelToken;
}

/**
 * An interface that defines common properties for node input
 */
export interface ConvoCommonNodeInput
{
    /**
     * A short chunk of text that can be used to pass any information. For example if the input
     * was a book `text` would be a summary of the book.
     */
    text:string;

    /**
     * The full source of the content. For example if the input was a book `source` would be the
     * full content of the book.
     */
    source?:string;

    title?:string;

    sourceId?:string;

    sourceUrl?:string;

    type?:string;
}

export type ConvoGraphMonitorEventType=(
    'other'|
    'traverser-created'|
    'start-traversal'|
    'traversal-failed'|
    'edge-crossed'|
    'start-exe'|
    'start-invoke'|
    'execute-step'|
    'exe-complete'|
    'traversal-stopped'|
    'convo-result'|
    'auto-transformer-created'
)

export interface ConvoGraphMonitorEvent
{
    type:ConvoGraphMonitorEventType;
    text:string;
    node?:ConvoNode;
    traverser?:ConvoTraverser;
    step?:ConvoNodeStep;
    stepIndex?:number;
    edge?:ConvoEdge;
    data?:any;
    pause?:ConvoTraversalPause;
    time:number;
}

export type ConvoEdgeSide='to'|'from';

export interface ConvoGraphStoreEvt
{
    node?:ConvoNode;
    nodeId?:string;
    edge?:ConvoEdge;
    sourceNode?:ConvoSourceNode;
    edgeId?:string;
    traverser?:ConvoTraverser;
    traverserId?:string;
}

export interface IHasConvoGraph
{
    graph:ConvoGraph;
}

export interface IHasConvoGraphDb
{
    db:ConvoGraphDb;
}

/**
 * Stores data for a single ConvoGraph
 */
export interface ConvoGraphStore
{

    readonly graphId:string;

    get onDbChange():Observable<ConvoGraphStoreEvt>;

    /**
     * If the store support tracking changes it should save all unsaved changes
     */
    saveChangesAsync():Promise<void>;

    getNodeAsync(idOrKey:string):Promise<ConvoNode|undefined>;

    putNodeAsync(graph:ConvoNode):Promise<void>;

    deleteNodeAsync(id:string):Promise<void>;

    getNextNodeId():string;


    getNodeEdgesAsync(nodeId:string,side:ConvoEdgeSide):Promise<ConvoEdge[]>;


    getEdgeAsync(id:string):Promise<ConvoEdge|undefined>;

    putEdgeAsync(graph:ConvoEdge):Promise<void>;

    deleteEdgeAsync(id:string):Promise<void>;

    getNextEdgeId():string;


    getTraverserAsync(id:string,storeSuffix?:string):Promise<ConvoTraverser|undefined>;

    putTraverserAsync(traverser:ConvoTraverser):Promise<void>;

    deleteTraverserAsync(id:string,storeSuffix?:string):Promise<void>;

    getNextTraverserId():string;

    loadTraverserProxiesAsync?(traverser:ConvoTraverser,loadKeys?:string[]):Promise<void>;

    putTraverserProxiesAsync?(traverser:ConvoTraverser):Promise<void>;


    getSourceNodesAsync():Promise<ConvoSourceNode[]>;

    getSourceNodeAsync(id:string):Promise<ConvoSourceNode|undefined>;

    putSourceNodeAsync(SourceNode:ConvoSourceNode):Promise<void>;

    deleteSourceNodeAsync(id:string):Promise<void>;

    getNextSourceNodeId():string;

    getNextInputId():string;
}


export interface ConvoInputTemplate{
    id:string;

    /**
     * A key to reference the input node by
     */
    key?:string;
    name?:string;
    value:string;
    isJson?:boolean;
    x?:number;
    y?:number;
    to?:string;

    /**
     * User data that can be used for any purpose.
     */
    userData?:Record<string,any>;
}

export interface ConvoTraverserGroup
{
    traversers:BehaviorSubject<ConvoTraverser[]>;
    saveToStore:boolean;
    createTvOptions?:CreateConvoTraverserOptions;
    cancel:CancelToken;
}


/**
 * Represents a convo source file
 */
export interface ConvoSourceNode
{
    id:string;

    name?:string;

    /**
     * Source convo lang content
     */
    source:string;

    type?:string;

    shared?:boolean;

    x?:number;
    y?:number;

    /**
     * User data that can be used for any purpose.
     */
    userData?:Record<string,any>;
}

export interface ConvoGraphParsingData
{
    db:ConvoGraphDb;
    messages:ConvoMessage[];
}

export type ConvoGraphParsingResult=CodeParsingResult<ConvoGraphParsingData>;

export const allConvoGraphMsgTypeAry=['node','step','edge','input','source','graph'] as const;
export type ConvoGraphMsgType=typeof allConvoGraphMsgTypeAry[number];
export const isConvoGraphMsgType=(value:any):value is ConvoGraphMsgType=>(allConvoGraphMsgTypeAry.includes(value));



export interface ConvoStateVarProxy
{
    path:string;
    readonly?:boolean;
}

export type ConvoStateVarProxyMap=Record<string,ConvoStateVarProxy|string>;

export type ConvoGraphBeforeNextCallback=(tv:ConvoTraverser,group:ConvoTraverserGroup|undefined,ctrl:ConvoGraphCtrl)=>boolean|Promise<boolean>;
