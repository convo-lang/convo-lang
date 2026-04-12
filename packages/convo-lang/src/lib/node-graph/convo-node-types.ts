import { PromiseResultType, PromiseResultTypeVoid } from "../result-type.js";

/**
 * A unique node within a collection or graph of nodes
 */
export interface ConvoNode
{

    /**
     * Absolute file system like path that starts with a (/). `path` should be unique in a 
     * collection or graph of nodes and should be treated as a unique id.
     */
    path:string;

    /**
     * An option human friendly name
     */
    displayName?:string;

    /**
     * name of the node
     */
    name?:string;

    /**
     * Optional date and time the node was created
     */
    created?:string;

    /**
     * Optional date and time that time the node was modified
     */
    modified?:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional instructions on how to use the node
     */
    instructions?:string;

    /**
     * An arbitrary type
     */
    type:string;

    /**
     * Arbitrary data
     */
    data:any;
}

/**
 * A ConvoNode will all but its path being optional
 */
export type ConvoNodeUpdate=Pick<ConvoNode,'path'>&Partial<Omit<ConvoNode,'path'>>;

/**
 * Connects nodes within a graph. Edges are used to connect related data an also to manage permissions.
 * For example, many systems will define users as a node and managed their access to other resources / nodes
 * using the grant properties of the edge.
 */
export interface ConvoNodeEdge
{
    /**
     * Unique id of the edge. Preferably a UUID.
     */
    id:string;

    /**
     * An option human friendly name
     */
    displayName?:string;

    /**
     * name of the edge
     */
    name?:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional date and time the edge was created
     */
    created?:string;

    /**
     * Optional date and time that time the edge was modified
     */
    modified?:string;

    /**
     * An arbitrary type
     */
    type:string;

    /**
     * Path of the node the edge is connecting from
     */
    from:string;

    /**
     * Path of the node the edge is connecting from
     */
    to:string;

    /**
     * Optional instructions on how to use the edge
     */
    instructions?:string;

    /**
     * Permissions to grant the `from` node to the `to` node.
     * When evaluating permissions for a node, the node and all of its ancestors in its path
     * are checked. This allows granting permissions to a directory and the permission cascading
     * down to child nodes.
     */
    grant?:ConvoNodePermissionType;
}

export interface ConvoNodeEdgeUpdate
{
    id:string;

    /**
     * Updated displayName. If null displayName will be unset.
     */
    displayName?:string;

    /**
     * Updated description. If null description will be unset.
     */
    description?:string;

    /**
     * Updated instructions. If null instructions will be unset.
     */
    instructions?:string;

    /**
     * Updated grant. If null grant will be unset.
     */
    grant?:ConvoNodePermissionType|null;

}

/**
 * An embedding pointing to a node that can be used to search for the node
 */
export interface ConvoNodeEmbedding
{
    /**
     * Unique id of the embedding. Preferably a UUID.
     */
    id:string;

    /**
     * The property the embedding is being applied to. In most cases this will be "data"
     */
    prop:string;


    /**
     * Optional display name
     */
    name?:string;

    /**
     * An arbitrary type
     */
    type?:string;

    /**
     * Path of the node the embedding points to
     */
    path:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional date and time the embedding was created
     */
    created?:string;

    /**
     * Optional date and time that time the embedding was modified
     */
    modified?:string;

    /**
     * Optional instructions on how the data of the pointed to node should be processed to 
     * generate the embedding.
     */
    instructions?:string;

    /**
     * Embedding vector data. The actual data type of the vector is specific to the datastore the
     * embedding is stored in. It is often a long number array of some type.
     */
    vector?:any;

}

export interface ConvoNodeEmbeddingUpdate{
    /**
     * Id of the embedding to update
     */
    id:string;

    /**
     * Updated vector generation instructions. If null the instructions of the embedding will be unset.
     */
    instructions?:string|null;

    /**
     * If true the vector of the embedding should be regenerated.
     */
    generateVector?:boolean;
}

export type ConvoNodeKey=keyof ConvoNode;

export type ConvoNodeKeyOrAll=ConvoNodeKey|'*';

/**
 * Falsy values are treated as "*"
 */
export type ConvoNodeKeySelection=ConvoNodeKeyOrAll|null|undefined|(ConvoNodeKeyOrAll|null|undefined)[]

export interface ConvoNodeSelector
{
    keys?:ConvoNodeKey|'*';
}

export interface ConvoEmbeddingQuery
{
    type?:string;
    text:string;
    tolerance?:number;
}

/**
 * The allowed query condition operators.
 * - `=` Equals
 * - `!=` Not equals
 * - `>` More than
 * - `<` Less than
 * - `>=` More than equal to
 * - `<=` Less than equal to
 * - `like` A like or wildcard case sensitive comparison. `%` is the wildcard character.
 * - `like` A like or wildcard case insensitive comparison. `%` is the wildcard character.
 */
export type ConvoNodeConditionOp='='|'!='|'>'|'<'|'>='|'<='|'like'|'ilike';

export interface ConvoNodePropertyCondition
{
    /**
     * Path of property to test condition against. Paths can includes dots for accessing nested values
     * in the data property.
     */
    prop:string;

    /**
     * The condition operator to evaluate
     */
    op:ConvoNodeConditionOp;

    /**
     * The value to compare against
     */
    value:any;
}

export enum ConvoNodePermissionType{
    none=0,
    read=4,
    write=2,
    execute=1,

     // Combinations
    readWrite=read|write, // 6
    readExecute=read|execute, // 5
    writeExecute=write|execute, // 3
    readWriteExecute=read|write|execute, // 7
}


/**
 * Represents a single step in a node query. The first step is ran against the full store of nodes.
 * A query step run in 2 phases, the first phase filters out nodes and the second phase selects
 * nodes to more to by selecting connected edges.
 * 
 * Evaluation Order:
 * - Filter by path
 * - Filter by condition
 * - Filter based on permissions
 * - Filter based on embedding
 * - Select next nodes to move to using edge conditions
 */
export interface ConvoNodeQueryStep
{

    /**
     * Full path of node to select or a wildcard path that will select all nodes start match the while card.
     * @evalOrder 1
     */
    path?:string;

    /**
     * Conditions to best tested against the node. If multiple conditions are given they are "or"ed
     * together by default.
     * @evalOrder 2
     */
    condition?:ConvoNodePropertyCondition|ConvoNodePropertyCondition[];

    /**
     * If true and multiple conditions are given the are "and"ed together.
     * @evalOrder 2
     */
    andConditions?:boolean;

    /**
     * Path of node where permissions are evaluated. If undefined the permissionFrom value of the
     * parent query of the step will be used.
     * @evalOrder 3
     */
    permissionFrom?:string;

    /**
     * Permission type required. If undefined the permissionRequired type of the parent query of
     * the step will be used.
     * @evalOrder 3
     */
    permissionRequired?:ConvoNodePermissionType;

    /**
     * an embedding to filter by.
     * @evalOrder 4
     */
    embedding?:ConvoEmbeddingQuery;

    /**
     * Selects the next node or nodes to move to. By default the first matching edge is moved to.
     * `fork` can be used to control how many nodes will be moved to. String values will be treated
     * as type equal to comparisons equivalent to {prop:"type",op:"=",value:moveStringValue}. A string
     * value of "*" will select any edge 
     * @evalOrder 5
     */
    move?:string|ConvoNodePropertyCondition|(string|ConvoNodePropertyCondition)[];

    /**
     * Controls the number of matching nodes to move to. A value of "*" will cause all matching nodes
     * to be moved to. If undefined and a move value is defined the first move match will be used,
     * If undefined and no move value is defined not nodes will be moved to. If "*" and no moved value
     * is given all connecting nodes will be moved to.
     * @evalOrder 5
     */
    fork?:'*'|number;

}

export interface ConvoNodeQuery
{
    /**
     * The keys of the returned nodes to return. If a falsy value is given all properties are returned.
     */
    keys?:ConvoNodeKeySelection;

    /**
     * The steps to evaluate to select nodes.
     */
    steps:ConvoNodeQueryStep[];

    /**
     * Max number of nodes to return
     * @default 20
     */
    limit?:number;

    /**
     * Token used to resume querying from.
     */
    nextToken?:string;

    /**
     * Path of node where permissions are evaluated. It is common to use the path of a user node.
     */
    permissionFrom?:string;

    /**
     * Permission type that will be required for every step in the query. Required permission type
     * can also be applied per step for more granular control.
     */
    permissionRequired?:ConvoNodePermissionType;
}

export interface ConvoNodeQueryResult
{
    
    /**
     * The matching nodes
     */
    nodes:Partial<ConvoNode>[];

    /**
     * A token that can be passed to the next query to resume scanning from. If no nodes remain
     * nextToken will be undefined.
     */
    nextToken?:string;
}


export interface InsertConvoNodeOptions
{

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the node being insert.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface InsertConvoNodeEdgeOptions
{

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to both the `to` and `from` paths of the edge being insert.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface InsertConvoNodeEmbeddingOptions
{
    /**
     * If undefined and the vector of the provided embedding is undefined the vector will be
     * generated.
     */
    generateVector?:boolean;

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the embedding being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface ConvoNodeEdgeQuery
{
    /**
     * Id to match
     */
    id?:string;

    /**
     * From path to match
     */
    from?:string;
    
    /**
     * to path to match
     */
    to?:string;

    /**
     * type to match
     */
    type?:string;

    /**
     * name to match
     */
    name?:string;

    /**
     * Max number of edges to return
     * @default 50
     */
    limit?:string;

    /**
     * Number of edges to skip
     */
    offset?:number;

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have read permission
     * to both the `to` and `from` of selected edges. If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface ConvoNodeEmbeddingQuery
{
    /**
     * Id to match
     */
    id?:string;

    /**
     * Path to match
     */
    path?:string;

    /**
     * type to match
     */
    type?:string;

    /**
     * name to match
     */
    name?:string;

    /**
     * prop to match
     */
    prop?:string;

    /**
     * Max number of edges to return
     * @default 50
     */
    limit?:string;

    /**
     * Number of edges to skip
     */
    offset?:number;

    /**
     * If true the vector property of the embedding will be returned. By Default the vector will not
     * be returned to save bandwidth.
     */
    includeVector?:boolean

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have read permission
     * to the `path` of selected embeddings. If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

/**
 * Stores nodes retrieves nodes.
 */
export interface ConvoNodeStore
{
    /**
     * Queries the store for nodes
     */
    queryNodesAsync(query:ConvoNodeQuery):PromiseResultType<ConvoNodeQueryResult>;

    /**
     * Convenience function for calling `queryNodesAsync({steps:[{path,permissionFrom}]})`
     */
    getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult>;

    /**
     * Checks if the node at `fromPath` has the given permission `type` to the node at the `toPath`.
     */
    checkNodePermissionAsync(fromPath:string,toPath:string,type:ConvoNodePermissionType):PromiseResultTypeVoid;

    /**
     * Inserts a new node
     */
    insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>;

    /**
     * Updates a node. If `permissionFrom` is provided the give path must have write access to the
     * path of the node being updated.
     */
    updateNodeAsync(node:ConvoNodeUpdate,permissionFrom?:string):PromiseResultTypeVoid;

    /**
     * Deletes a node by path. If `permissionFrom` is provided the give path must have write access to the
     * path of the node being deleted.
     */
    deleteNodeAsync(path:string,permissionFrom?:string):PromiseResultTypeVoid;



    /**
     * Returns matching edges
     */
    queryEdgesAsync(query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdge[]>;

    /**
     * Convenience function for calling `queryEdgesAsync({id,permissionFrom,limit:1})`
     */
    getEdgeByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEdge|undefined>;

    /**
     * Inserts a new edge
     */
    insertEdgeAsync(edge:Omit<ConvoNodeEdge,'id'>,options?:InsertConvoNodeEdgeOptions):PromiseResultType<ConvoNodeEdge>;

    /**
     * Updates an edge. If `permissionFrom` is provided the give path must have write access
     * to either the `to` or `from` path of the edge being updated.
     */
    updatingEdgeAsync(update:ConvoNodeEdgeUpdate,permissionFrom?:string):PromiseResultTypeVoid;

    /**
     * Deletes an edge by id. If `permissionFrom` is provided the give path must have write access
     * to either the `to` or `from` path of the edge being deleted.
     */
    deleteEdgeAsync(id:string,permissionFrom?:string):PromiseResultTypeVoid;



    /**
     * Returns all matching embeddings. By default the vector of the embedding will not be returned
     * unless `query.includeVector` is true.
     */
    queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Convenience function for calling `queryEmbeddingsAsync({id,permissionFrom,limit:1})`
     */
    getEmbeddingByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEmbedding|undefined>;

    /**
     * Inserts an embedding and returns its id. The embedding property will not be returned.
     */
    insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,'id'>,options:InsertConvoNodeEmbeddingOptions):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Updates an embedding. If `permissionFrom` is provided the give path must have write access to the
     * path of the embedding being updated.
     */
    updatingEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,permissionFrom?:string):PromiseResultTypeVoid;

    /**
     * Deletes an embedding by id. If `permissionFrom` is provided the give path must have write access to the
     * path of the embedding being deleted.
     */
    deleteEmbeddingAsync(id:string,permissionFrom?:string):PromiseResultTypeVoid;
}