import { PromiseResultType, PromiseResultTypeVoid } from "../result-type.js";

/**
 * A unique node within a collection or graph of nodes.
 * 
 * Path rules:
 * - `path` is an absolute file system like path that starts with `/`
 * - trailing slashes are removed during normalization except for `/`
 * - duplicate slashes are converted to a single slash during normalization
 * - paths are case-sensitive
 * - `.` and `..` are not allowed
 * - `/` is a valid node path
 * - a node may exist without its parent path existing
 */
export interface ConvoNode
{

    /**
     * Absolute file system like path that starts with a (/). `path` should be unique in a
     * collection or graph of nodes and should be treated as a unique id.
     * 
     * Path rules:
     * - trailing slashes are removed during normalization except for `/`
     * - duplicate slashes are converted to a single slash during normalization
     * - paths are case-sensitive
     * - `.` and `..` are not allowed
     */
    path:string;

    /**
     * An optional human friendly name
     */
    displayName?:string;

    /**
     * Name of the node
     */
    name?:string;

    /**
     * Optional date and time the node was created
     */
    created?:string;

    /**
     * Optional date and time the node was modified
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
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Arbitrary data
     */
    data:any;
}

/**
 * A node update where `path` is required, optional fields may be updated or unset with `null`,
 * `name` and `type` are immutable, and `data` is replaced as a whole.
 */
export interface ConvoNodeUpdate
{
    /**
     * Path of the node to update
     */
    path:string;

    /**
     * Updated displayName. If null displayName will be unset.
     */
    displayName?:string|null;

    /**
     * Updated modified date and time. If null modified will be unset.
     */
    modified?:string|null;

    /**
     * Updated description. If null description will be unset.
     */
    description?:string|null;

    /**
     * Updated instructions. If null instructions will be unset.
     */
    instructions?:string|null;

    /**
     * Updated data. Data is replaced as a whole.
     */
    data?:any;
}

/**
 * Connects nodes within a graph. Edges are used to connect related data and also to manage permissions.
 * For example, many systems will define users as a node and manage their access to other resources / nodes
 * using the grant properties of the edge.
 * 
 * Edge behavior:
 * - edges are bi-directional when querying and traversing
 * - edges are directional when evaluating permissions
 */
export interface ConvoNodeEdge
{
    /**
     * Unique id of the edge. Preferably a UUID.
     */
    id:string;

    /**
     * An optional human friendly name
     */
    displayName?:string;

    /**
     * Name of the edge
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
     * Optional date and time the edge was modified
     */
    modified?:string;

    /**
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Path of the node the edge is connecting from.
     * Must reference an existing node path.
     */
    from:string;

    /**
     * Path of the node the edge is connecting to.
     * Must reference an existing node path.
     */
    to:string;

    /**
     * Optional instructions on how to use the edge
     */
    instructions?:string;

    /**
     * Permissions to grant the `from` node to the `to` node.
     * 
     * Permission evaluation rules:
     * - permission is directional from `from` to `to`
     * - when checking if `fromPath` has permission to `toPath`, only `toPath` and its ancestors are checked
     * - grants from multiple matching edges are unioned using bitwise OR
     * - `none` may be stored on an edge but has the same effect as being undefined
     * - write does not imply read
     */
    grant?:ConvoNodePermissionType;
}

/**
 * An edge update where `id` is required, optional fields may be updated or unset with `null`,
 * and `name`, `type`, `from`, and `to` are immutable.
 */
export interface ConvoNodeEdgeUpdate
{
    /**
     * Id of the edge to update
     */
    id:string;

    /**
     * Updated displayName. If null displayName will be unset.
     */
    displayName?:string|null;

    /**
     * Updated modified date and time. If null modified will be unset.
     */
    modified?:string|null;

    /**
     * Updated description. If null description will be unset.
     */
    description?:string|null;

    /**
     * Updated instructions. If null instructions will be unset.
     */
    instructions?:string|null;

    /**
     * Updated grant. If null grant will be unset.
     */
    grant?:ConvoNodePermissionType|null;

}

/**
 * An embedding pointing to a node that can be used to search for the node.
 * A node may not have multiple embeddings with the same `prop` and `type`.
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
     * Optional name
     */
    name?:string;

    /**
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Path of the node the embedding points to.
     * Must reference an existing node path.
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
     * Optional date and time the embedding was modified
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

/**
 * An embedding update where `id` is required, optional fields may be updated or unset with `null`,
 * and `name`, `type`, `prop`, `path`, `created`, and `vector` are immutable through this update type.
 * `vector` regeneration may be requested asynchronously using `generateVector`.
 */
export interface ConvoNodeEmbeddingUpdate{
    /**
     * Id of the embedding to update
     */
    id:string;

    /**
     * Updated modified date and time. If null modified will be unset.
     */
    modified?:string|null;

    /**
     * Updated description. If null description will be unset.
     */
    description?:string|null;

    /**
     * Updated vector generation instructions. If null the instructions of the embedding will be unset.
     */
    instructions?:string|null;

    /**
     * If true the vector of the embedding should be regenerated asynchronously.
     */
    generateVector?:boolean;
}

export type ConvoNodeKey=keyof ConvoNode;

export type ConvoNodeKeyOrAll=ConvoNodeKey|'*';

/**
 * `null` and `undefined` are treated as "*"
 */
export type ConvoNodeKeySelection=ConvoNodeKeyOrAll|null|undefined|(ConvoNodeKeyOrAll|null|undefined)[]

type ConvoNodeQueryKeysToSelection<T extends ConvoNodeKeySelection> =
    T extends null|undefined ? keyof ConvoNode :
    T extends '*' ? keyof ConvoNode :
    T extends keyof ConvoNode ? T :
    T extends (infer U)[] ?
        ('*' extends U ? keyof ConvoNode : Exclude<U, null|undefined|'*'> & keyof ConvoNode) :
    keyof ConvoNode;

export interface ConvoEmbeddingSearch
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
 * - `ilike` A like or wildcard case insensitive comparison. `%` is the wildcard character.
 */
export type ConvoNodeConditionOp='='|'!='|'>'|'<'|'>='|'<='|'like'|'ilike';

export interface ConvoNodePropertyCondition
{
    /**
     * The property of the target object to evaluate the condition against.
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

export interface ConvoNodeOrderBy
{
    /**
     * The property of the node to order by. Nested properties in `data` may be accessed using dot notation.
     */
    prop:string;

    /**
     * Sort direction.
     * @default "asc"
     */
    direction?:'asc'|'desc';
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
 * Represents a single step in a node query. The first step is run against the full store of nodes.
 * A query step runs in 2 phases: the first phase filters nodes and the second phase selects
 * nodes to move to by selecting connected edges.
 * 
 * Step semantics:
 * - path and conditions are only applied to the current node set before traversal
 * - permissions defined on a step are checked for current set of nodes
 * - embedding filters are applied to the current set of nodes
 * - edge filtering is evaluated against edges
 * - traversed and final nodes are deduplicated
 * 
 * Evaluation Order:
 * - Filter by path
 * - Filter by condition
 * - Filter based on step permissions
 * - Filter based on embedding
 * - Select next nodes to move to using edge conditions
 */
export interface ConvoNodeQueryStep
{

    /**
     * Full path of node to select or a wildcard path that will select all nodes matching the wildcard.
     * 
     * Wildcard path rules:
     * - the wildcard character is `*`
     * - only one wildcard character may be used
     * - the wildcard matches all characters including directory separators
     * - the wildcard may only appear at the end of a path immediately after a `/` directory separator
     * - examples of valid wildcard paths: `/users/*`, `/a/b/*`
     * - examples of invalid wildcard paths: `*`, `/users*`, `/a/*\/b`, `/a/**`
     * 
     * @evalOrder 1
     */
    path?:string;

    /**
     * Conditions to be tested against the current node. If multiple conditions are given they are "or"ed
     * together by default.
     * @evalOrder 2
     */
    condition?:ConvoNodePropertyCondition|ConvoNodePropertyCondition[];

    /**
     * If true and multiple conditions are given they are "and"ed together.
     * @evalOrder 2
     */
    andConditions?:boolean;

    /**
     * Path of node where permissions are evaluated for the current nodes of this step.
     * @evalOrder 3
     */
    permissionFrom?:string;

    /**
     * Permission type required for the current nodes of this step.
     * @evalOrder 3
     */
    permissionRequired?:ConvoNodePermissionType;

    /**
     * An embedding to filter by.
     * @evalOrder 4
     */
    embedding?:ConvoEmbeddingSearch;

    /**
     * Selects the next node or nodes to move to by selecting connected edges.
     * String values will be treated as type equal comparisons equivalent to
     * `{prop:"type",op:"=",value:edgeStringValue}`.
     * 
     * Edge conditions are evaluated against edge properties. If multiple edge conditions are given
     * they are "or"ed together by default.
     * @evalOrder 5
     */
    edge?:string|ConvoNodePropertyCondition|(string|ConvoNodePropertyCondition)[];

    /**
     * If true and multiple edge conditions are given they are "and"ed together.
     * @evalOrder 5
     */
    andEdgeConditions?:boolean;

    /**
     * Controls the max number of matching destination nodes to move through after destination nodes
     * have been deduplicated. If undefined all matching nodes will be traversed.
     * @evalOrder 5
     */
    edgeLimit?:number;

}

export interface ConvoNodeQuery<TKeys extends ConvoNodeKeySelection=undefined>
{
    /**
     * The keys of the returned nodes to return. If a falsy value is given all properties are returned.
     * If `keys` is an array and `'*'` is present anywhere in the array all properties are returned.
     */
    keys?:TKeys;

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
     * Token used to resume querying from. Tokens are stable across concurrent writes.
     * Node queries use cursor based pagination because traversal may involve multiple trips
     * to and from the datastore and cursor based iteration allows for optimization.
     */
    nextToken?:string;

    /**
     * Path of node where permissions are evaluated on the final set of nodes resulting from traversal.
     * It is common to use the path of a user node.
     */
    permissionFrom?:string;

    /**
     * Permission type required for the final set of nodes resulting from traversal. Required permission type
     * can also be applied per step for more granular control.
     */
    permissionRequired?:ConvoNodePermissionType;

    /**
     * Order returned nodes by one or more node properties. Any property of a node may be used,
     * including nested properties in the `data` property.
     */
    orderBy?:ConvoNodeOrderBy|ConvoNodeOrderBy[];
}

export interface ConvoNodeQueryResult<T extends keyof ConvoNode>
{
    
    /**
     * The matching nodes
     */
    nodes:Pick<ConvoNode,T>[];

    /**
     * A token that can be passed to the next query to resume scanning from. If no nodes remain
     * nextToken will be undefined.
     */
    nextToken?:string;
}

export interface ConvoNodeEmbeddingQueryResult
{
    /**
     * Returned embeddings
     */
    embeddings:ConvoNodeEmbedding[];

    /**
     * Total number of embeddings
     */
    total:number;
}

export interface ConvoNodeEdgeQueryResult
{
    /**
     * Returned edges
     */
    edges:ConvoNodeEdge[];

    /**
     * Total number of edges
     */
    total:number;
}


export interface InsertConvoNodeOptions
{

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the node being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface InsertConvoNodeEdgeOptions
{

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to both the `to` and `from` paths of the edge being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface InsertConvoNodeEmbeddingOptions
{
    /**
     * If undefined and the vector of the provided embedding is undefined the vector will be
     * generated asynchronously.
     */
    generateVector?:boolean;

    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the embedding being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface UpdateConvoNodeOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the node being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface DeleteConvoNodeOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the node being deleted.
     * If undefined permissions are not evaluated.
     * 
     * Deleting a node also deletes all edges connected to the node and all embeddings pointing to the node.
     */
    permissionFrom?:string;
}

export interface UpdateConvoNodeEdgeOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access
     * to either the `to` or `from` path of the edge being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface DeleteConvoNodeEdgeOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access
     * to either the `to` or `from` path of the edge being deleted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface UpdateConvoNodeEmbeddingOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the embedding being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface DeleteConvoNodeEmbeddingOptions
{
    /**
     * Path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the embedding being deleted.
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
     * To path to match
     */
    to?:string;

    /**
     * Type to match
     */
    type?:string;

    /**
     * Name to match
     */
    name?:string;

    /**
     * Max number of edges to return
     * @default 50
     */
    limit?:number;

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
     * Type to match
     */
    type?:string;

    /**
     * Name to match
     */
    name?:string;

    /**
     * Prop to match
     */
    prop?:string;

    /**
     * Max number of embeddings to return
     * @default 50
     */
    limit?:number;

    /**
     * Number of embeddings to skip
     */
    offset?:number;

    /**
     * If true the vector property of the embedding will be returned. By default the vector will not
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
 * Stores and retrieves nodes.
 */
export interface ConvoNodeStore
{
    /**
     * Queries the store for nodes
     */
    queryNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(query:ConvoNodeQuery<TKeys>):PromiseResultType<ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<TKeys>>>;

    /**
     * Convenience function for calling `queryNodesAsync({steps:[{path}],permissionFrom})`
     */
    getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>>;

    /**
     * Checks if the node at `fromPath` has the given permission `type` to the node at `toPath`.
     */
    checkNodePermissionAsync(fromPath:string,toPath:string,type:ConvoNodePermissionType):PromiseResultTypeVoid;

    /**
     * Inserts a new node
     */
    insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>;

    /**
     * Updates a node. `name` and `type` are immutable.
     */
    updateNodeAsync(node:ConvoNodeUpdate,options?:UpdateConvoNodeOptions):PromiseResultTypeVoid;

    /**
     * Deletes a node by path.
     * Deleting a node also deletes all edges connected to the node and all embeddings pointing to the node.
     */
    deleteNodeAsync(path:string,options?:DeleteConvoNodeOptions):PromiseResultTypeVoid;



    /**
     * Returns matching edges
     */
    queryEdgesAsync(query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>;

    /**
     * Convenience function for calling `queryEdgesAsync({id,permissionFrom,limit:1})`
     */
    getEdgeByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEdge|undefined>;

    /**
     * Inserts a new edge. `type` is immutable after insert.
     * `from` and `to` must reference existing nodes.
     */
    insertEdgeAsync(edge:Omit<ConvoNodeEdge,'id'>,options?:InsertConvoNodeEdgeOptions):PromiseResultType<ConvoNodeEdge>;

    /**
     * Updates an edge. `name`, `type`, `from`, and `to` are immutable.
     */
    updateEdgeAsync(update:ConvoNodeEdgeUpdate,options?:UpdateConvoNodeEdgeOptions):PromiseResultTypeVoid;

    /**
     * Deletes an edge by id.
     */
    deleteEdgeAsync(id:string,options?:DeleteConvoNodeEdgeOptions):PromiseResultTypeVoid;



    /**
     * Returns all matching embeddings. By default the vector of the embedding will not be returned
     * unless `query.includeVector` is true.
     */
    queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbeddingQueryResult>;

    /**
     * Convenience function for calling `queryEmbeddingsAsync({id,permissionFrom,limit:1})`
     */
    getEmbeddingByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEmbedding|undefined>;

    /**
     * Inserts an embedding and returns the inserted embedding. By default the vector property will not
     * be returned to save bandwidth. `type` is immutable after insert and `path` must reference an existing node.
     */
    insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,'id'>,options?:InsertConvoNodeEmbeddingOptions):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Updates an embedding. `name`, `type`, `prop`, `path`, `created`, and `vector` are immutable through
     * this update type.
     */
    updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options?:UpdateConvoNodeEmbeddingOptions):PromiseResultTypeVoid;

    /**
     * Deletes an embedding by id.
     */
    deleteEmbeddingAsync(id:string,options?:DeleteConvoNodeEmbeddingOptions):PromiseResultTypeVoid;
}
