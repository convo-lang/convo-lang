import { CancelToken, Scope } from "@iyio/common";
import { ZodType } from "zod";
import { PromiseOrResultType, PromiseResultType, PromiseResultTypeVoid, StatusCode } from "../result-type.js";

/**
 * A unique node within a collection or graph of nodes.
 * 
 * Path rules:
 * - `path` is a normalized absolute file system like path that starts with `/`
 * - trailing slashes are removed during normalization except for `/`
 * - duplicate slashes are converted to a single slash during normalization
 * - paths are case-sensitive
 * - `.` and `..` are not allowed
 * - `*` is not allowed in stored node paths
 * - `/` is a valid node path
 * - a node may exist without its parent path existing
 */
export interface ConvoNode
{

    /**
     * Normalized absolute file system like path that starts with a (/). `path` should be unique in a
     * collection or graph of nodes and should be treated as a unique id.
     * 
     * Path rules:
     * - trailing slashes are removed during normalization except for `/`
     * - duplicate slashes are converted to a single slash during normalization
     * - paths are case-sensitive
     * - `.` and `..` are not allowed
     * - `*` is not allowed in stored node paths
     */
    path:string;

    /**
     * An optional human friendly name
     */
    displayName?:string;

    /**
     * Stable name of the node. Immutable after insert.
     */
    name?:string;

    /**
     * Optional ISO-8601 date and time the node was created. Immutable after insert.
     */
    created?:string;

    /**
     * Optional ISO-8601 date and time the node was modified
     */
    modified?:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional instructions on how to use the node.
     */
    instructions?:string;

    /**
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Arbitrary object data
     */
    data:Record<string,any>;
}

/**
 * A node update where `path` is required, optional fields may be updated or unset with `null`,
 * `name`, `type`, and `created` are immutable, and `data` is replaced as a whole by default.
 * 
 * Update semantics:
 * - omitted or `undefined` properties are treated as no update
 * - properties documented as unsettable may be unset by assigning `null`
 * - `data` is replaced as a whole and `null` is a valid replacement value unless `mergeData` is used
 */
export interface ConvoNodeUpdate
{
    /**
     * Normalized absolute path of the node to update
     */
    path:string;

    /**
     * Updated displayName. If null displayName will be unset.
     */
    displayName?:string|null;

    /**
     * Updated ISO-8601 modified date and time. If null modified will be unset.
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
     * Updated data object. If null data will be to an empty object.
     * By default data replaces the existing data as a whole. When `UpdateConvoNodeOptions.mergeData`
     * is true the provided data is shallow merged with the existing data instead.
     */
    data?:Record<string,any>|null;
}

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
     * Stable name of the edge. Immutable after insert.
     */
    name?:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional ISO-8601 date and time the edge was created. Immutable after insert.
     */
    created?:string;

    /**
     * Optional ISO-8601 date and time the edge was modified
     */
    modified?:string;

    /**
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Normalized path of the node the edge is connecting from.
     * Must reference an existing node path.
     */
    from:string;

    /**
     * Normalized path of the node the edge is connecting to.
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
     * - when checking if `fromPath` has permission to `toPath`, only direct edges with `edge.from===fromPath`
     *   are checked
     * - only matching edges whose `edge.to` equals `toPath` or an ancestor of `toPath` are considered
     * - grants from multiple matching edges are unioned using bitwise OR
     * - `none` may be stored on an edge but has the same effect as being undefined
     * - write does not imply read
     */
    grant?:ConvoNodePermissionType;
}

/**
 * An edge update where `id` is required, optional fields may be updated or unset with `null`,
 * and `name`, `type`, `from`, `to`, and `created` are immutable.
 * 
 * Update semantics:
 * - omitted or `undefined` properties are treated as no update
 * - properties documented as unsettable may be unset by assigning `null`
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
     * Updated ISO-8601 modified date and time. If null modified will be unset.
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
     * The property the embedding is being applied to. In most cases this will be "data".
     * Immutable after insert.
     */
    prop:string;


    /**
     * Stable name of the embedding. Immutable after insert.
     */
    name?:string;

    /**
     * An arbitrary type. Immutable after insert.
     */
    type:string;

    /**
     * Normalized path of the node the embedding points to.
     * Must reference an existing node path.
     */
    path:string;

    /**
     * Optional description
     */
    description?:string;

    /**
     * Optional ISO-8601 date and time the embedding was created. Immutable after insert.
     */
    created?:string;

    /**
     * Optional ISO-8601 date and time the embedding was modified
     */
    modified?:string;

    /**
     * Optional instructions on how the data of the pointed to node should be processed to
     * generate the embedding. Instructions are evaluated as raw Convo-Lang and the response is
     * used a the value to generate embeddings from. The instructions convo will have access to
     * 3 predefined variables: node, embedding and value. The value variable will contain the 
     * value of the property of the node pointed to by the embedding.
     */
    instructions?:string;

    /**
     * Embedding vector data. The actual data type of the vector is specific to the datastore the
     * embedding is stored in and is intentionally opaque at this interface layer.
     */
    vector?:any;

}

/**
 * An embedding update where `id` is required, optional fields may be updated or unset with `null`,
 * and `name`, `type`, `prop`, `path`, `created`, and `vector` are immutable through this update type.
 * `vector` regeneration may be requested asynchronously using `generateVector`.
 * 
 * Update semantics:
 * - omitted or `undefined` properties are treated as no update
 * - properties documented as unsettable may be unset by assigning `null`
 */
export interface ConvoNodeEmbeddingUpdate{
    /**
     * Id of the embedding to update
     */
    id:string;

    /**
     * Updated ISO-8601 modified date and time. If null modified will be unset.
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

export type ConvoNodeQueryKeysToSelection<T extends ConvoNodeKeySelection> =
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
 * Array of all node condition operators
 */
export const allConvoNodeConditionOps=[
    '=','!=','>','<','>=','<=',
    'in','all-in','any-in',
    'contains','contains-all','contains-any',
    'like','ilike'
] as const;

/**
 * The allowed query condition operators.
 * Condition operators are evaluated with the target queried entity on the left of the operator
 * and supplied value on the right: `node.path like /user/jeff/*`.
 *
 * Comparison semantics:
 * - databases should make a best effort to coerce types when evaluating comparisons
 *
 * - `=` Target equal to value
 * - `!=` Target not equal to value
 * - `>` Target greater than value
 * - `<` Target less than value
 * - `>=` Target greater than or equal to value
 * - `<=` Target less than or equal to value
 * - `in` Target in value where value is an array
 * - `all-in` Target and value are arrays and value contains all the items in target
 * - `any-in` Target and value are arrays and value contains any of the items in target
 * - `contains` Target is an array and value is in the array
 * - `contains-all` Target and value are arrays and target contains all the items in value 
 * - `contains-any` Target and value are arrays and target contains any of the items in value 
 * - `like` A case sensitive wildcard comparison. `*` is the wildcard character.
 * - `ilike` A case insensitive wildcard comparison. `*` is the wildcard character.
 * 
 * Array operator rules:
 * - `in` returns false if `value` is not an array
 * - `all-in`, `any-in`, `contains-all`, and `contains-any` return false if either target or value is not an array
 * - `contains` returns false if the target is not an array
 * 
 * Wildcard comparison rules:
 * - `*` matches any sequence of characters
 * - the wildcard can not be escaped
 * - matching is against the full pattern, similar to SQL `LIKE`
 * - for substring style matching the caller should include leading and trailing `*`
 */
export type ConvoNodeConditionOp=typeof allConvoNodeConditionOps[number];


export interface ConvoNodePropertyCondition
{
    /**
     * The property of the target object to evaluate the condition against.
     * Nested properties may be accessed using dot notation, including nested properties in `data`.
     */
    target:string;

    /**
     * The condition operator to evaluate
     */
    op:ConvoNodeConditionOp;

    /**
     * The value to compare against
     */
    value:any;
}

/**
 * Array of all node condition group operators.
 */
export const allConvoNodeGroupConditionOps=['and','or'] as const;

/**
 * The allowed condition group operators.
 * - `and` All nested conditions must match
 * - `or` At least one nested condition must match
 * 
 * Empty group rules:
 * - empty groups return false
 */
export type ConvoNodeGroupConditionOp=typeof allConvoNodeGroupConditionOps[number];

/**
 * Groups node conditions to control nested boolean logic.
 * This allows callers to explicitly combine conditions using `and` and `or`.
 * 
 * Group rules:
 * - `conditions` may contain property conditions and nested group conditions
 * - groups may be nested to any depth
 * - empty groups return false
 */
export interface ConvoNodeGroupCondition
{
    /**
     * Boolean operator used to combine `conditions`.
     */
    groupOp:ConvoNodeGroupConditionOp;

    /**
     * Conditions to evaluate as part of the group.
     */
    conditions:ConvoNodeCondition[];
}

/**
 * A node condition that may be either a property condition or a grouped condition.
 */
export type ConvoNodeCondition=ConvoNodePropertyCondition|ConvoNodeGroupCondition;

/**
 * Type guard that returns true if the given condition is a property condition.
 */
export const isConvoNodePropertyCondition=(condition:ConvoNodeCondition):condition is ConvoNodePropertyCondition=>'op' in condition;

/**
 * Type guard that returns true if the given condition is a grouped condition.
 */
export const isConvoNodeGroupCondition=(condition:ConvoNodeCondition):condition is ConvoNodeGroupCondition=>'groupOp' in condition;

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

export enum ConvoNodePermissionType
{
    none=0,
    read=4,
    write=2,
    execute=1,

     // Combinations
    readWrite=read|write, // 6
    readExecute=read|execute, // 5
    writeExecute=write|execute, // 3
    readWriteExecute=read|write|execute, // 7
    all=readWriteExecute // 7
}

export type ConvoNodeEdgeDirection='forward'|'reverse'|'bi';

export const allConvoStepStages=['path','condition','permissions','embedding','call','edge'] as const;

export type ConvoStepStage=typeof allConvoStepStages[number];

export interface ConvoNodeWatchCondition extends Pick<ConvoNodeQueryStep,'path'|'condition'>
{
    /**
     * Base set of node paths that that watched nodes must be in
     */
    baseNodePaths?:string[];

    /**
     * If true the condition uses a wildcard. The path will have its * removed from the end for
     * non allocation comparisons during path checking.
     */
    wildcardPath?:boolean;
}

/**
 * Represents a single step in a node query. The first step is run against the full database of nodes.
 * A query step runs in 2 phases: the first phase filters nodes and the second phase selects
 * nodes to move to by selecting connected edges.
 * 
 * Step semantics:
 * - path and conditions are only applied to the current node set before traversal
 * - permissions defined on a step are checked for current set of nodes
 * - embedding filters are applied to the current set of nodes
 * - edge filtering is evaluated against edges
 * - edge traversal direction is controlled by `edgeDirection`
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
     * Full normalized path of node to select or a wildcard path that will select all nodes matching the wildcard.
     * 
     * Wildcard path rules:
     * - the wildcard character is `*`
     * - only one wildcard character may be used
     * - the wildcard matches all characters including directory separators
     * - the wildcard may only appear at the end of a path immediately after a `/` directory separator
     * - the non-wildcard portion of the path follows the same normalization rules as stored node paths
     * - `/users/*` matches `/users/a` and `/users/a/b`
     * - `/users/*` does not match `/users`
     * - examples of valid wildcard paths: `/users/*`, `/a/b/*`
     * - examples of invalid wildcard paths: `*`, `/users*`, `/a/*\/b`, `/a/**`
     * 
     * @stepStage 1 - path
     */
    path?:string;

    /**
     * Conditions to be tested against the current node.
     * Use `ConvoNodeGroupCondition` to explicitly combine nested conditions with `and` and `or`.
     * @stepStage 2 - condition
     */
    condition?:ConvoNodeCondition;

    /**
     * Normalized path of node where permissions are evaluated for the current nodes of this step.
     * @stepStage 3 - permissions
     */
    permissionFrom?:string;

    /**
     * Permission type required for the current nodes of this step. If undefined ConvoNodePermissionType.all
     * will be used.
     * @stepStage 3 - permissions
     */
    permissionRequired?:ConvoNodePermissionType;

    /**
     * An embedding to filter by.
     * @stepStage 4 - embedding
     */
    embedding?:ConvoEmbeddingSearch;

    /**
     * Triggers a function call of the currently selected nodes. Executing functions can return values
     * as nodes return by the query and can select node paths for navigation.
     * @stepStage 5 - function
     */
    call?:ConvoDbFunctionCall;

    /**
     * Selects the next node or nodes to move to by selecting connected edges.
     * A string value will be treated as type equal comparisons equivalent to
     * `{target:"type",op:"=",value:edgeStringValue}`.
     * 
     * Edge conditions are evaluated against edge properties and may use grouped conditions
     * to express nested `and` and `or` logic.
     * 
     * Traversal direction is controlled by `edgeDirection`.
     * @stepStage 6 - edge
     */
    edge?:string|ConvoNodeCondition;

    /**
     * Controls the direction in which edges are used to select destination nodes.
     * - `forward` traverses edges where the current node matches `edge.from` and selects `edge.to`
     * - `reverse` traverses edges where the current node matches `edge.to` and selects `edge.from`
     * - `bi` traverses in both directions
     * 
     * @default "bi"
     * @stepStage 6 - edge
     */
    edgeDirection?:ConvoNodeEdgeDirection;

    /**
     * Controls the max number of matching destination nodes to move through after destination nodes
     * have been deduplicated. If undefined all matching nodes will be traversed.
     * @stepStage 6 - edge
     */
    edgeLimit?:number;

}

/**
 * Represents the request to execute a node
 */
export interface ConvoDbFunctionCall
{
    /**
     * Arguments to pass to the target function
     */
    args?:Record<string,any>;
}

/**
 * Describes the effect a function has on a database or external state.
 * - `pure`: Execution does not read or write from the database or external sources, has no side effects and only relies on the arguments passed to it. Data define on the node of the function is allowed to be read.
 * - `readOnly`: Execution may read from the database or external sources but does not modify its state.
 * - `readWrite`: Execution may both read from and write to the database or external sources.
 */
export type ConvoDbFunctionEffects='pure'|'readOnly'|'readWrite'

/**
 * A executable function stored in the data of a ConvoNode. A ConvoDbFunction is defined by setting
 * the `function` and `isExecutable` data properties of a ConvoNode. The `function` data property
 * should be an object that implements `ConvoDbFunction` interface and `isExecutable` should be set to true.
 */
export interface ConvoDbFunction
{
    /**
     * The format the function is stored in. Common formats include:
     * - `convo`: Convo-Lang stored as a string
     * - `js`: Javascript stored as string
     * - `uri`: URI of a referenced function. Referenced functions are often defined by plugins.
     * 
     * ## Format Details
     *
     * ### convo
     * Functions stored as Convo-Lang can return data in 1 of 3 ways:
     * 1. Define a user message to be responded to by an LLM. The LLM will respond with 1 of the following results
     *   - text content
     *   - JSON value
     *   - Function call result
     * 2. Define the last message of the source as a `> do` message and set the `__return` global variable to desired return value.
     *
     * Convo functions can manipulate the traversal path buy directly mutating the ctx.paths array.
     * Convo functions will return a single node with a path set to `/null` and data set to `{value:__RESULT_VALUE__}`
     */
    format:string;

    /**
     * Describes the effect the function has on the database or external state.
     * - `pure`: No database access or side effects. Data define on the node of the function is allowed to be read.
     * - `readOnly`: May read from, but not write to, the database or external sources.
     * - `readWrite`: May both read and write to the database or external sources.
     */
    effects:ConvoDbFunctionEffects;

    /**
     * The schema of the arguments to pass to the function written as a Convo-Lang struct.
     *
     * @example
     * ``` convo
     * struct(
     *     # Name of user
     *     name:string
     *     
     *     # Age of user
     *     age:number
     * )
     * ```
     */
    argsType?:string;

    /**
     * The `argsType` property per-parsed
     */
    argsTypeParsed?:ParsedConvoDbFunctionArgsType;

    /**
     * The content of the function. In most cases this will be source code stored as a string or a
     * URI that points to a function outside of the database such as a function defined by a plugin.
     */
    main:any;

    /**
     * A cached compilation of main. For example, for Convo-Lang this will be the parsing result
     * from `parseConvoCode`
     */
    mainCompiled?:CompliedConvoDbFunction

}

/**
 * A cached compilation of the main source of a ConvoDbFunction. 
 */
export interface CompliedConvoDbFunction
{
    /**
     * A hash of the main source code. Can be used to verify the source code used for compilation
     * has not changed.
     */
    sourceHash:string;

    /**
     * Compilation result
     */
    compiled:any;

    /**
     * A runtime cached implementation function
     */
    [convoDbRuntimeCacheKey]?:ConvoDbFunctionImplementation;
}


/**
 * The parsed `argsType` of a ConvoDbFunction 
 */
export interface ParsedConvoDbFunctionArgsType
{
    /**
     * A hash of the main source code. Can be used to verify the source code used for compilation
     * has not changed.
     */
    sourceHash:string;

    /**
     * Parsed args struct
     */
    parsedArgs:Record<string,any>;

    /**
     * A runtime cached version of `parsedArgs` converted into a ZodType
     */
    [convoDbRuntimeCacheKey]?:ZodType;
}
export const convoDbRuntimeCacheKey=Symbol('convoDbRunCacheKey');

/**
 * A context object passed to ConvoDbFunctions
 */
export interface ConvoDbFunctionExecutionContext<TArgs extends Record<string,any>=Record<string,any>>
{
    /**
     * Arguments passed to the function
     */
    args:TArgs;

    /**
     * The function being executed
     */
    function:ConvoDbFunction;

    /**
     * The node function is defined on
     */
    node:ConvoNode;

    keys:ConvoNodeKeySelection;

    /**
     * The effects the function is allowed
     */
    effects:ConvoDbFunctionEffects;

    /**
     * The current paths of the current query. `paths` are allowed to be modified. This allows
     * functions to control query traversal.
     */
    paths:string[];

    /**
     * The query being executed
     */
    query:ConvoNodeQuery;

    /**
     * The current step of the query
     */
    step:ConvoNodeQueryStep;

    /**
     * The database executing the query and function
     */
    db:ConvoDb;

    argsTypeParsed?:ParsedConvoDbFunctionArgsType;

    mainCompiled:CompliedConvoDbFunction;

    /**
     * Can be used by functions to support result pagination. Functions should set the value
     * of `fnNextToken` as they enumerate and emit values.
     */
    nextToken:string|undefined;

    cancel:CancelToken;


}

export type PartialNode=Pick<ConvoNode,'path'> & Omit<ConvoNode,'path'>;
export interface ConvoDbFunctionResult{
    node?:PartialNode;
    nodes?:PartialNode[];
    stream?:AsyncIterable<PartialNode>;
}
export type ConvoDbFunctionImplementation=(ctx:ConvoDbFunctionExecutionContext)=>PromiseOrResultType<ConvoDbFunctionResult>;

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
     * If true changes to the final set of nodes will be watched and updates to the nodes will be
     * continuously streamed by the query. This property only has an effect when used with
     * `ConvoDb.streamNodesAsync`. Enabling watch will also disable the default limit but if an 
     * explicit limit is set it will be honored. After then initial set of selected nodes are returned
     * the stream will return stream items with type type set to 'node-update' or 'node-delete'.
     *
     * Step limitations:
     * When enabling watching the last step of a query can only use the `path` and `condition`
     * properties. This restriction is to allow efficient event by disabling operations that require
     * complex lookups or awaiting async results.
     */
    watch?:boolean;

    /**
     * Max number of nodes to return. This value may be exceeded since node queries select and return
     * nodes in batches.
     * @default 20
     */
    limit?:number;

    /**
     * If true all scanned nodes will be returned, not just the final nodes at the end of traversal.
     */
    returnAllScanned?:boolean;

    /**
     * The number of items read from the backing datastore at a time. By default this value is
     * determined by the backing datastore and should be left undefined unless you know what you are doing.
     */
    readBatchSize?:number;

    /**
     * Can be used to skip pass a number of nodes. In almost all cases you want to use nextToken 
     * instead. When using skip all skipped nodes are still traversed leading to poor performance.
     */
    skip?:number;

    /**
     * Token used to resume querying from. Tokens are stable across concurrent writes.
     * Node queries use cursor based pagination because traversal may involve multiple trips
     * to and from the datastore and cursor based iteration allows for optimization.
     */
    nextToken?:string;

    /**
     * Normalized path of node where permissions are evaluated on the final set of nodes resulting from traversal.
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

    /**
     * Arbitrary metadata the can be passed to the query.
     */
    metadata?:Record<string,any>;
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

/**
 * An item within a stream of ConvoNodes returned by `ConvoDb.streamNodesAsync`
 */
export type ConvoNodeStreamItem<T extends keyof ConvoNode>={
    type:'node'|'node-insert'|'node-update'|'node-delete';
    node:Pick<ConvoNode,T>;
}|{
    /**
     * Indicates all items in the current buffer have been sent / flushed
     */
    type:'flush',  
}|{
    /**
     * Used to keep connections alive.
     */
    type:'ping',  
}|{
    /**
     * Sent after all initial nodes of a query have been sent and the query start watching for changes.
     */
    type:'watch-start',    
}|{
    type:'error';
    error:string;
    statusCode:StatusCode;
}

export type ConvoNodeStreamItemType=ConvoNodeStreamItem<keyof ConvoNode>['type'];

export interface ConvoNodeEmbeddingQueryResult
{
    /**
     * Returned embeddings
     */
    embeddings:ConvoNodeEmbedding[];

    /**
     * Total number of embeddings that can be selected by the given query ignoring offset and limit
     */
    total?:number;
}

export interface ConvoNodeEdgeQueryResult
{
    /**
     * Returned edges
     */
    edges:ConvoNodeEdge[];

    /**
     * Total number of edges that can be selected by the given query ignoring offset and limit
     */
    total?:number;
}

export interface InsertConvoNodeOptions
{

    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the node being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface InsertConvoNodeEdgeOptions
{

    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to the `from` path of the edge and read or write permission to the `to` path of the edge
     * being inserted.
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
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write
     * permission to `path` of the embedding being inserted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface UpdateConvoNodeOptions
{
    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the node being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;

    /**
     * If true data passed to a node will be merged with the existing data instead of fully replacing it.
     * The merge is shallow and only applies when `node.data` is provided.
     */
    mergeData?:boolean;
}

export interface DeleteConvoNodeOptions
{
    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
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
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access
     * to the `from` path of the edge and read or write access to the `to` path of the edge being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface DeleteConvoNodeEdgeOptions
{
    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access
     * to the `from` path of the edge and read or write access to the `to` path of the edge being deleted.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface UpdateConvoNodeEmbeddingOptions
{
    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
     * path of the embedding being updated.
     * If undefined permissions are not evaluated.
     */
    permissionFrom?:string;
}

export interface DeleteConvoNodeEmbeddingOptions
{
    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have write access to the
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
     * From path to match by equality
     */
    from?:string;
    
    /**
     * To path to match by equality
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
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have read permission
     * to both the `to` and `from` of selected edges. If undefined permissions are not evaluated.
     */
    permissionFrom?:string;

    /**
     * If true the total number of edges that that match the query ignoring limit and offset should
     * be returned.
     */
    includeTotal?:boolean;
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
    includeVector?:boolean;

    /**
     * Normalized path of node where permissions are evaluated. The `permissionFrom` path must have read permission
     * to the `path` of selected embeddings. If undefined permissions are not evaluated.
     */
    permissionFrom?:string;

    /**
     * If true the total number of embeddings that that match the query ignoring limit and offset should
     * be returned.
     */
    includeTotal?:boolean;
}

/**
 * An export of a ConvoDb's data
 */
export interface ConvoDbExport
{
    nodes:ConvoNode[];
    edges:ConvoNodeEdge[];
    embeddings:ConvoNodeEmbedding[];
}

export type ConvoDbFactory=(scope:Scope)=>ConvoDb;

/**
 * Stores and retrieves nodes.
 */
export interface ConvoDb
{
    /**
     * Queries the database for nodes
     */
    queryNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(query:ConvoNodeQuery<TKeys>):PromiseResultType<ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<TKeys>>>;

    /**
     * Queries the database for nodes and returns the nodes as an async iterable stream
     */
    streamNodesAsync<TKeys extends ConvoNodeKeySelection=undefined>(query:ConvoNodeQuery<TKeys>,cancel?:CancelToken):AsyncIterableIterator<ConvoNodeStreamItem<ConvoNodeQueryKeysToSelection<TKeys>>>;

    /**
     * Convenience function for calling `queryNodesAsync({steps:[{path}],permissionFrom})`.
     * `path` may be an exact path or a supported wildcard path.
     */
    getNodesByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>>;

    /**
     * Convenience function for calling `queryNodesAsync({steps:[{path}],limit:1,permissionFrom})`.
     * `path` may be an exact path or a supported wildcard path. Returns undefined when the
     * target node is not found.
     */
    getNodeByPathAsync(path:string,permissionFrom?:string):PromiseResultType<ConvoNode|undefined>;

    /**
     * Returns the permissions granted from the node at `fromPath` to the node at `toPath`.
     * @see {@link checkNodePermissionAsync} for more details.
     */
    getNodePermissionAsync(fromPath:string,toPath:string):PromiseResultType<ConvoNodePermissionType>;

    /**
     * Checks if the node at `fromPath` has the given permission `type` to the node at `toPath`.
     * If permission is denied an error result with a status code of 401 will be returned.
     * Permission checking is evaluated using direct grant edges where `edge.from===fromPath`
     * and `edge.to` equals `toPath` or an ancestor of `toPath`.
     * If `matchAny` is true, permission is granted if any bit in `type` is present in the
     * found permission. Otherwise all bits in `type` must be present.
     */
    checkNodePermissionAsync(fromPath:string,toPath:string,type:ConvoNodePermissionType,matchAny?:boolean):PromiseResultTypeVoid;

    /**
     * Inserts a new node
     */
    insertNodeAsync(node:ConvoNode,options?:InsertConvoNodeOptions):PromiseResultType<ConvoNode>;

    /**
     * Updates a node. `name`, `type`, and `created` are immutable.
     * By default `data` replaces the existing data as a whole. If `options.mergeData` is true,
     * provided `data` is shallow merged with the existing data instead.
     */
    updateNodeAsync(node:ConvoNodeUpdate,options?:UpdateConvoNodeOptions):PromiseResultTypeVoid;

    /**
     * Deletes a node by path.
     * Deleting a node also deletes all edges connected to the node and all embeddings pointing to the node.
     */
    deleteNodeAsync(path:string,options?:DeleteConvoNodeOptions):PromiseResultTypeVoid;

    /**
     * Returns matching edges. Raw edge queries are directional and match `from` and `to` by equality.
     */
    queryEdgesAsync(query:ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>;

    /**
     * Convenience function for calling `queryEdgesAsync({id,permissionFrom,limit:1})`
     */
    getEdgeByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEdge>;

    /**
     * Inserts a new edge and returns the inserted edge. The database generates the edge id.
     * `name`, `type`, and `created` are immutable after insert.
     * `from` and `to` must reference existing nodes.
     */
    insertEdgeAsync(edge:Omit<ConvoNodeEdge,'id'>,options?:InsertConvoNodeEdgeOptions):PromiseResultType<ConvoNodeEdge>;

    /**
     * Updates an edge. `name`, `type`, `from`, `to`, and `created` are immutable.
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
    getEmbeddingByIdAsync(id:string,permissionFrom?:string):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Inserts an embedding and returns the inserted embedding. The database generates the embedding id.
     * By default the vector property will not be returned to save bandwidth.
     * `name`, `type`, `prop`, `path`, and `created` are immutable after insert and `path` must reference an existing node.
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

    /**
     * Calls one of the functions of this interface based on the action of the command
     * @param command The command to execute
     */
    executeCommandAsync<TKeys extends ConvoNodeKeySelection='*'>(command:ConvoDbCommand<TKeys>,permissionFromOverride?:string):PromiseResultType<ConvoDbCommandResult<TKeys>>;

    /**
     * Calls an array of the functions of this interface based on the action of the command
     * @param commands The commands to execute
     * @param permissionFromOverride A permissionFrom path that will override the permissionFrom of
     *                               any of the given commands. Commonly used to enforce permissions
     *                               of external clients such as a REST API using JWTs to authenticate
     *                               users.
     */
    executeCommandsAsync(commands:ConvoDbCommand<any>[],permissionFromOverride?:string):PromiseResultType<ConvoDbCommandResult<any>[]>;

    /**
     * DB Driver
     */
    readonly _driver:ConvoDbDriver;
}


/**
 * Value returned by ConvoDbDriver select functions
 */
export interface ConvoDbDriverPathsResult extends ConvoDbDriverNextToken
{
    /**
     * Paths selected
     */
    paths:string[];
}

export interface ConvoDbDriverNextToken
{
    /**
     * Token passed and returned by various ConvoDbDriver functions. When undefined it does not
     * mean there are no more items to select. Some ConvoDbDrivers do not use nextTokens
     */
    nextToken?:string;
}

/**
 * ConvoDbDrivers handle direct underlying database access. Db drivers do not handle authentication
 * or other higher level ConvoDb logic. All parameters passed to drivers will already be validated.
 */
export interface ConvoDbDriver
{
    /**
     * Returns edges whose `from` path is contained in `fromPathsIn` and whose `to` path is contained
     * in `toPathsIn`.
     *
     * This is primarily used by the base implementation to evaluate permissions by loading grant
     * edges between known path sets.
     *
     * Implementation requirements:
     * - if `keys` is `"*"`, all edge properties should be returned
     * - otherwise only the requested properties should be returned when practical
     * - matching is by exact equality on `from` and `to`
     * - if `hasGrant` is true, only edges with a defined non-`none` grant should be returned
     * - returned paths should be normalized
     *
     * @param keys The edge properties to return, similar to a SQL select column list.
     * @param fromPathsIn Allowed `edge.from` values.
     * @param toPathsIn Allowed `edge.to` values.
     * @param hasGrant If true, require `grant` to be defined and not `ConvoNodePermissionType.none`.
     */
    selectEdgesByPathsAsync(keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>;

    /**
     * Returns nodes whose `path` is contained in `paths`.
     *
     * This is used during the flush phase of query traversal after the base class has already
     * determined the final ordered path list to load.
     *
     * Implementation requirements:
     * - if `keys` is `"*"`, all node properties should be returned
     * - otherwise only the requested properties should be returned when practical
     * - only nodes whose path is in `paths` should be returned
     * - returned node paths should be normalized
     * - results should respect the supplied `orderBy`
     *
     * @param keys The node properties to return, similar to a SQL select column list.
     * @param paths Exact node paths to load.
     * @param orderBy Ordering to apply to returned nodes.
     */
    selectNodesByPathsAsync(keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>;

    /**
     * Selects node paths matching a query step path filter.
     *
     * This method is called during traversal stage 1 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, search across the full node store
     * - otherwise only return matches whose path is within `currentNodePaths`
     * - support exact paths and valid wildcard paths as defined by `ConvoNodeQueryStep.path`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The path portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     * @param nextToken The next token returned by the previous call. Not all drivers will return a next token when there are more paths to return.
     */
    selectNodePathsForPathAsync(step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>;

    /**
     * Selects node paths matching a query step property or grouped condition filter.
     *
     * This method is called during traversal stage 2 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, evaluate against the full node store
     * - otherwise only evaluate nodes whose path is within `currentNodePaths`
     * - condition semantics should match the documented `ConvoNodeCondition` rules
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The condition portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     * @param nextToken The next token returned by the previous call. Not all drivers will return a next token when there are more paths to return.
     */
    selectNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>;

    /**
     * Selects node paths that satisfy a permission check for the current query step.
     *
     * This method is called during traversal stage 3 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, evaluate permissions across the full node store
     * - otherwise only evaluate nodes whose path is within `currentNodePaths`
     * - determine whether `step.permissionFrom` has `step.permissionRequired` for each candidate node
     * - permission semantics should match `checkNodePermissionAsync`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The permission portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     * @param nextToken The next token returned by the previous call. Not all drivers will return a next token when there are more paths to return.
     */
    selectNodePathsForPermissionAsync(step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>;

    /**
     * Selects node paths matching an embedding search filter for the current query step.
     *
     * This method is called during traversal stage 4 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, search across the full node store
     * - otherwise only return matches whose path is within `currentNodePaths`
     * - embedding search semantics should match the supplied `ConvoEmbeddingSearch`
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The embedding portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     * @param nextToken The next token returned by the previous call. Not all drivers will return a next token when there are more paths to return.
     */
    selectNodePathsForEmbeddingAsync(step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>;

    /**
     * Selects destination node paths by traversing edges from the current query step.
     *
     * This method is called during traversal stage 5 and may be invoked repeatedly with increasing
     * offsets until fewer than `limit` results are returned.
     *
     * Implementation requirements:
     * - if `currentNodePaths` is `null`, traversal starts from the full node set
     * - otherwise only traverse from the supplied current nodes
     * - edge filtering semantics should match `ConvoNodeQueryStep.edge`
     * - traversal direction should match `edgeDirection`
     * - destination node paths should be deduplicated
     * - if `edgeLimit` is defined it limits destination nodes after deduplication
     * - return normalized node paths
     * - apply `orderBy`, `limit`, and `offset`
     *
     * @param step The edge traversal portion of the current query step.
     * @param currentNodePaths Current candidate node paths, or `null` for all nodes.
     * @param orderBy Ordering to apply to destination nodes.
     * @param limit Max number of paths to return for this batch.
     * @param offset Offset for paged scanning within this traversal stage.
     * @param nextToken The next token returned by the previous call. Not all drivers will return a next token when there are more paths to return.
     */
    selectEdgeNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>;

    /**
     * Inserts a node into the backing store.
     *
     * The base class validates normalization and permissions before calling this method.
     * Implementations should enforce any remaining datastore-specific constraints.
     *
     * @param node Node to insert. `node.data` is always a `Record<string,any>`.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    insertNodeAsync(node:ConvoNode,options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>;

    /**
     * Updates an existing node in the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * The base class also applies documented node update semantics for `data` before forwarding
     * to this method:
     * - if `update.data===null`, it is converted to `{}`
     * - if `options?.mergeData` is true and `update.data` is provided, the base class shallow merges
     *   `update.data` into the current node `data`
     *
     * Extending classes do not need to implement `data` merge behavior and may treat `update.data`
     * as the final replacement value when it is present.
     *
     * Implementations should apply any remaining documented update semantics and enforce immutable fields.
     *
     * @param node Node update payload after base-class preprocessing.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    updateNodeAsync(node:ConvoNodeUpdate,options:Omit<UpdateConvoNodeOptions,'permissionFrom'|'mergeData'>|undefined):PromiseResultTypeVoid;

    /**
     * Deletes a node from the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should also delete all connected edges and embeddings pointing to the node.
     *
     * @param path Normalized path of the node to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    deleteNodeAsync(path:string,options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Inserts an edge into the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should generate the edge id and enforce immutable field rules for future updates.
     *
     * @param edge Edge to insert without an id.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    insertEdgeAsync(edge:Omit<ConvoNodeEdge,"id">,options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>;

    /**
     * Updates an existing edge in the backing store.
     *
     * The base class loads the current edge and validates permissions before calling this method.
     * Implementations should apply documented update semantics and enforce immutable fields.
     *
     * @param update Edge update payload.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    updateEdgeAsync(update:ConvoNodeEdgeUpdate,options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Deletes an edge from the backing store.
     *
     * The base class loads the current edge and validates permissions before calling this method.
     *
     * @param id Id of the edge to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    deleteEdgeAsync(id:string,options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Inserts an embedding into the backing store.
     *
     * The base class validates path normalization and permissions before calling this method.
     * Implementations should generate the embedding id and handle vector generation behavior as needed.
     *
     * @param embedding Embedding to insert without an id.
     * @param options Insert options with `permissionFrom` removed because permission checks were already handled.
     */
    insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,"id">,options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>;

    /**
     * Deletes an embedding from the backing store.
     *
     * The base class loads the current embedding and validates permissions before calling this method.
     *
     * @param id Id of the embedding to delete.
     * @param options Delete options with `permissionFrom` removed because permission checks were already handled.
     */
    deleteEmbeddingAsync(id:string,options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Updates an existing embedding in the backing store.
     *
     * The base class loads the current embedding and validates permissions before calling this method.
     * Implementations should apply documented update semantics and enforce immutable fields.
     *
     * @param update Embedding update payload.
     * @param options Update options with `permissionFrom` removed because permission checks were already handled.
     */
    updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options:Omit<UpdateConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid;

    /**
     * Returns a set of edges based on a ConvoNodeEdgeQuery
     */
    queryEdgesAsync(query:ConvoNodeEdgeQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEdgeQueryResult&ConvoDbDriverNextToken>;

    /**
     * Returns a set of embeddings based on a ConvoNodeEmbeddingQuery
     */
    queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEmbeddingQueryResult&ConvoDbDriverNextToken>;
}

/**
 * All ConvoDbDriver functions that are allowed to be called.
 */
export const convoDbDriverFunctions=[
    'selectEdgesByPathsAsync',
    'selectNodesByPathsAsync',
    'selectNodePathsForPathAsync',
    'selectNodePathsForConditionAsync',
    'selectNodePathsForPermissionAsync',
    'selectNodePathsForEmbeddingAsync',
    'selectEdgeNodePathsForConditionAsync',
    'insertNodeAsync',
    'updateNodeAsync',
    'deleteNodeAsync',
    'insertEdgeAsync',
    'updateEdgeAsync',
    'deleteEdgeAsync',
    'insertEmbeddingAsync',
    'deleteEmbeddingAsync',
    'updateEmbeddingAsync',
    'queryEdgesAsync',
    'queryEmbeddingsAsync',
] satisfies (keyof ConvoDbDriver)[];

/**
 * A callable function of the ConvoDbDriver interface
 */
export type ConvoDbDriverFunction=typeof convoDbDriverFunctions[number];

/**
 * Represents a call to a ConvoDbDriver
 */
export interface ConvoDbDriverCommand<FN extends ConvoDbDriverFunction=ConvoDbDriverFunction>
{
    fn:FN;
    args:Parameters<ConvoDbDriver[FN]>;
}

/**
 * ConvoDbCommands represent function calls to the ConvoDb interface.
 *
 * Exactly one property should be defined per command object.
 * Each property maps to a ConvoDb method and contains the arguments
 * that would be passed to that method.
 */
export interface ConvoDbCommand<TKeys extends ConvoNodeKeySelection='*'>
{
    /**
     * Calls `ConvoDb.queryNodesAsync`
     */
    queryNodes?:ConvoDbActionQueryNodes<TKeys>;

    /**
     * Calls `ConvoDb.getNodesByPathAsync`
     */
    getNodesByPath?:ConvoDbActionGetNodesByPath;

    /**
     * Calls `ConvoDb.getNodePermissionAsync`
     */
    getNodePermission?:ConvoDbActionGetNodePermission;

    /**
     * Calls `ConvoDb.checkNodePermissionAsync`
     */
    checkNodePermission?:ConvoDbActionCheckNodePermission;

    /**
     * Calls `ConvoDb.insertNodeAsync`
     */
    insertNode?:ConvoDbActionInsertNode;

    /**
     * Calls `ConvoDb.updateNodeAsync`
     */
    updateNode?:ConvoDbActionUpdateNode;

    /**
     * Calls `ConvoDb.deleteNodeAsync`
     */
    deleteNode?:ConvoDbActionDeleteNode;

    /**
     * Calls `ConvoDb.queryEdgesAsync`
     */
    queryEdges?:ConvoDbActionQueryEdges;

    /**
     * Calls `ConvoDb.getEdgeByIdAsync`
     */
    getEdgeById?:ConvoDbActionGetEdgeById;

    /**
     * Calls `ConvoDb.insertEdgeAsync`
     */
    insertEdge?:ConvoDbActionInsertEdge;

    /**
     * Calls `ConvoDb.updateEdgeAsync`
     */
    updateEdge?:ConvoDbActionUpdateEdge;

    /**
     * Calls `ConvoDb.deleteEdgeAsync`
     */
    deleteEdge?:ConvoDbActionDeleteEdge;

    /**
     * Calls `ConvoDb.queryEmbeddingsAsync`
     */
    queryEmbeddings?:ConvoDbActionQueryEmbeddings;

    /**
     * Calls `ConvoDb.getEmbeddingByIdAsync`
     */
    getEmbeddingById?:ConvoDbActionGetEmbeddingById;

    /**
     * Calls `ConvoDb.insertEmbeddingAsync`
     */
    insertEmbedding?:ConvoDbActionInsertEmbedding;

    /**
     * Calls `ConvoDb.updateEmbeddingAsync`
     */
    updateEmbedding?:ConvoDbActionUpdateEmbedding;

    /**
     * Calls `ConvoDb.deleteEmbeddingAsync`
     */
    deleteEmbedding?:ConvoDbActionDeleteEmbedding;

    /**
     * Calls `ConvoDb._driver[fn]`
     */
    driverCmd?:ConvoDbDriverCommand;
}

/**
 * Arguments for `ConvoDb.queryNodesAsync`
 */
export interface ConvoDbActionQueryNodes<TKeys extends ConvoNodeKeySelection='*'>
{
    /**
     * Node query definition
     */
    query:ConvoNodeQuery<TKeys>;
}

/**
 * Arguments for `ConvoDb.getNodesByPathAsync`
 */
export interface ConvoDbActionGetNodesByPath
{
    /**
     * Exact node path or supported wildcard path
     */
    path:string;

    /**
     * Optional permission source path
     */
    permissionFrom?:string;
}

/**
 * Arguments for `ConvoDb.getNodePermissionAsync`
 */
export interface ConvoDbActionGetNodePermission
{
    /**
     * Path permissions are granted from
     */
    fromPath:string;

    /**
     * Path permissions are granted to
     */
    toPath:string;
}

/**
 * Arguments for `ConvoDb.checkNodePermissionAsync`
 */
export interface ConvoDbActionCheckNodePermission
{
    /**
     * Path permissions are checked from
     */
    fromPath:string;

    /**
     * Path permissions are checked to
     */
    toPath:string;

    /**
     * Required permission type
     */
    type:ConvoNodePermissionType;

    /**
     * If true any permission bit match will pass
     */
    matchAny?:boolean;
}

/**
 * Arguments for `ConvoDb.insertNodeAsync`
 */
export interface ConvoDbActionInsertNode
{
    /**
     * Node to insert
     */
    node:ConvoNode;

    /**
     * Optional insert options
     */
    options?:InsertConvoNodeOptions;
}

/**
 * Arguments for `ConvoDb.updateNodeAsync`
 */
export interface ConvoDbActionUpdateNode
{
    /**
     * Node update payload
     */
    node:ConvoNodeUpdate;

    /**
     * Optional update options
     */
    options?:UpdateConvoNodeOptions;
}

/**
 * Arguments for `ConvoDb.deleteNodeAsync`
 */
export interface ConvoDbActionDeleteNode
{
    /**
     * Path of the node to delete
     */
    path:string;

    /**
     * Optional delete options
     */
    options?:DeleteConvoNodeOptions;
}

/**
 * Arguments for `ConvoDb.queryEdgesAsync`
 */
export interface ConvoDbActionQueryEdges
{
    /**
     * Edge query definition
     */
    query:ConvoNodeEdgeQuery;
}

/**
 * Arguments for `ConvoDb.getEdgeByIdAsync`
 */
export interface ConvoDbActionGetEdgeById
{
    /**
     * Edge id
     */
    id:string;

    /**
     * Optional permission source path
     */
    permissionFrom?:string;
}

/**
 * Arguments for `ConvoDb.insertEdgeAsync`
 */
export interface ConvoDbActionInsertEdge
{
    /**
     * Edge to insert without id
     */
    edge:Omit<ConvoNodeEdge,'id'>;

    /**
     * Optional insert options
     */
    options?:InsertConvoNodeEdgeOptions;
}

/**
 * Arguments for `ConvoDb.updateEdgeAsync`
 */
export interface ConvoDbActionUpdateEdge
{
    /**
     * Edge update payload
     */
    update:ConvoNodeEdgeUpdate;

    /**
     * Optional update options
     */
    options?:UpdateConvoNodeEdgeOptions;
}

/**
 * Arguments for `ConvoDb.deleteEdgeAsync`
 */
export interface ConvoDbActionDeleteEdge
{
    /**
     * Edge id
     */
    id:string;

    /**
     * Optional delete options
     */
    options?:DeleteConvoNodeEdgeOptions;
}

/**
 * Arguments for `ConvoDb.queryEmbeddingsAsync`
 */
export interface ConvoDbActionQueryEmbeddings
{
    /**
     * Embedding query definition
     */
    query:ConvoNodeEmbeddingQuery;
}

/**
 * Arguments for `ConvoDb.getEmbeddingByIdAsync`
 */
export interface ConvoDbActionGetEmbeddingById
{
    /**
     * Embedding id
     */
    id:string;

    /**
     * Optional permission source path
     */
    permissionFrom?:string;
}

/**
 * Arguments for `ConvoDb.insertEmbeddingAsync`
 */
export interface ConvoDbActionInsertEmbedding
{
    /**
     * Embedding to insert without id
     */
    embedding:Omit<ConvoNodeEmbedding,'id'>;

    /**
     * Optional insert options
     */
    options?:InsertConvoNodeEmbeddingOptions;
}

/**
 * Arguments for `ConvoDb.updateEmbeddingAsync`
 */
export interface ConvoDbActionUpdateEmbedding
{
    /**
     * Embedding update payload
     */
    update:ConvoNodeEmbeddingUpdate;

    /**
     * Optional update options
     */
    options?:UpdateConvoNodeEmbeddingOptions;
}

/**
 * Arguments for `ConvoDb.deleteEmbeddingAsync`
 */
export interface ConvoDbActionDeleteEmbedding
{
    /**
     * Embedding id
     */
    id:string;

    /**
     * Optional delete options
     */
    options?:DeleteConvoNodeEmbeddingOptions;
}

/**
 * Result values for `ConvoDbCommand`.
 *
 * Property names mirror `ConvoDbCommand`.
 * Exactly one property should typically be defined per result object.
 *
 * Result mapping rules:
 * - properties map to the unwrapped successful result type of the corresponding `ConvoDb` method
 * - methods returning `PromiseResultTypeVoid` map to `true`
 * - `checkNodePermissionAsync` maps to `boolean`
 */
export interface ConvoDbCommandResult<TKeys extends ConvoNodeKeySelection='*'>
{
    /**
     * Result of `ConvoDb.queryNodesAsync`
     */
    queryNodes?:ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<TKeys>>;

    /**
     * Result of `ConvoDb.getNodesByPathAsync`
     */
    getNodesByPath?:ConvoNodeQueryResult<keyof ConvoNode>;

    /**
     * Result of `ConvoDb.getNodePermissionAsync`
     */
    getNodePermission?:ConvoNodePermissionType;

    /**
     * Result of `ConvoDb.checkNodePermissionAsync`
     */
    checkNodePermission?:boolean;

    /**
     * Result of `ConvoDb.insertNodeAsync`
     */
    insertNode?:ConvoNode;

    /**
     * Result of `ConvoDb.updateNodeAsync`
     */
    updateNode?:true;

    /**
     * Result of `ConvoDb.deleteNodeAsync`
     */
    deleteNode?:true;

    /**
     * Result of `ConvoDb.queryEdgesAsync`
     */
    queryEdges?:ConvoNodeEdgeQueryResult;

    /**
     * Result of `ConvoDb.getEdgeByIdAsync`
     */
    getEdgeById?:ConvoNodeEdge;

    /**
     * Result of `ConvoDb.insertEdgeAsync`
     */
    insertEdge?:ConvoNodeEdge;

    /**
     * Result of `ConvoDb.updateEdgeAsync`
     */
    updateEdge?:true;

    /**
     * Result of `ConvoDb.deleteEdgeAsync`
     */
    deleteEdge?:true;

    /**
     * Result of `ConvoDb.queryEmbeddingsAsync`
     */
    queryEmbeddings?:ConvoNodeEmbeddingQueryResult;

    /**
     * Result of `ConvoDb.getEmbeddingByIdAsync`
     */
    getEmbeddingById?:ConvoNodeEmbedding;

    /**
     * Result of `ConvoDb.insertEmbeddingAsync`
     */
    insertEmbedding?:ConvoNodeEmbedding;

    /**
     * Result of `ConvoDb.updateEmbeddingAsync`
     */
    updateEmbedding?:true;

    /**
     * Result of `ConvoDb.deleteEmbeddingAsync`
     */
    deleteEmbedding?:true;

    /**
     * Result of `ConvoDb._driver[fn]`
     */
    driverCmd?:any;
}

/**
 * Maps names to functions that return ConvoDbs. Each function in the map should return
 * the same cached db after called the first name. There is one exception to the caching rule.
 * '*' should return a new database every time called.
 */
export type ConvoDbMap=Record<string,()=>ConvoDb>;