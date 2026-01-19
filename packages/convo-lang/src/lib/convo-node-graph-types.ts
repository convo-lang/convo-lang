import { ConvoMessage, ConvoStatement, FlatConvoMessage } from "./convo-types.js";

export type ConvoNodeGraphState='ready'|'running'|'stopped';

export interface ConvoRuntimeNodeInfo
{
    /**
     * Id of the node
     */
    nodeId:string;

    /**
     * Input passed to the node
     */
    input?:any;

}

export interface ConvoNodeDescription
{
    /**
     * Id of the node
     */
    nodeId:string;

    /**
     * A description of what the node does. This description can be used by LLMs to select the
     * appropriate next node.
     */
    description:string;

    /**
     * Controls the number of node contexts to include in the context of the node.
     */
    contextDepth:number;

    /**
     * Name of type the input for the node must be. If the received input for the node does not
     * match the type an attempt to transform the input to the proper type will be made using
     * an LLM.
     */
    inputType?:string;

    /**
     * If true multiple routes from the node can be taken after executing the node.
     */
    allowFork?:boolean;

    /**
     * The routes that can taken after executing the node. By default only one route will be taken
     * unless fork is set to true.
     */
    routes?:ConvoNodeRoute[];

    /**
     * Name of a function to directly invoke instead of using llm to eval
     */
    directInvoke?:string;
}

export interface ConvoNodeRoute
{
    /**
     * Id of the node to goto
     */
    toNodeId:string;

    /**
     * A natural language conditions to evaluate using an llm to test if the route should be used.
     */
    nlCondition?:string;

    /**
     * Statements to evaluate to test if the route should be used.
     */
    condition?:ConvoStatement[];

    /**
     * If true graph execution should be exited
     */
    exit?:boolean;

    /**
     * If true the next route should automatically be selected based on node descriptions.
     * If an the nodes will be limited to the nodes in the array.
     */
    auto?:boolean|string[];
    /**
     * If true the next defined node should be moved to if the route condition is true
     */
    next?:boolean;

    /**
     * If true the node is a from route and will have it's toNodeId updated at runtime
     */
    from?:boolean;
}

export interface ConvoNodeExtendedDescription extends ConvoNodeDescription
{
    messages:FlatConvoMessage[];
    sourceMessages:ConvoMessage[];
    convo:string;
}

export interface ConvoNodeGraph
{
    nodes:ConvoNodeExtendedDescription[];

    entry:ConvoNodeExtendedDescription|undefined;

}


export interface ConvoNodeGraphSource
{
    nodeDescriptions?:ConvoNodeDescription[];

    messages:FlatConvoMessage[];
}
