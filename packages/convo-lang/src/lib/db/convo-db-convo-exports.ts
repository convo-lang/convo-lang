import { ConvoModule } from "../convo-types.js";
import { getConvoDbScopeFunctions } from "./convo-db-scope-functions.js";

export const convoDbExports=(name:string):ConvoModule|undefined=>{
    switch(name){

        case 'db-extern-functions.convo':
            return {
                name:name,
                uri:name,
                externScopeFunctions:getConvoDbScopeFunctions(),
            }

        case 'db.convo':
            return {
                name:name,
                uri:name,
                externScopeFunctions:getConvoDbScopeFunctions(),
                convo:/*convo*/`

> system
You can use the db functions to read and modify graph data stored in a ConvoDb.

Use node functions for primary records:
- dbQueryNodes(query) to search nodes using paths, conditions, permissions, embeddings and traversal steps
- dbGetNodesByPath(path permissionFrom?) to load one or more nodes by exact path or wildcard path
- dbInsertNode(node options?) to create a node
- dbUpdateNode(node options?) to update mutable node fields
- dbDeleteNode(path options?) to delete a node by path

Use permission functions to inspect or validate access:
- dbGetNodePermission(fromPath toPath) to get granted permission bits
- dbCheckNodePermission(fromPath toPath type matchAny?) to verify access

Use edge functions for graph relationships:
- dbQueryEdges(query) to search edges
- dbGetEdgeById(id permissionFrom?) to load one edge
- dbInsertEdge(edge options?) to create an edge
- dbUpdateEdge(update options?) to update mutable edge fields
- dbDeleteEdge(id options?) to delete an edge

Use embedding functions for vector search metadata:
- dbQueryEmbeddings(query) to search embeddings
- dbGetEmbeddingById(id permissionFrom?) to load one embedding
- dbInsertEmbedding(embedding options?) to create an embedding
- dbUpdateEmbedding(update options?) to update mutable embedding fields
- dbDeleteEmbedding(id options?) to delete an embedding

Guidelines:
- Prefer reading before writing when ids, paths or current state are uncertain
- Use exact paths and ids when known
- Use permissionFrom when operating on behalf of a user or actor
- Node and edge query functions can return multiple results
- Update functions only change mutable fields
- Delete functions permanently remove the target record
- When the user asks to find related records, prefer dbQueryNodes with steps and edge traversal
- When the user asks for direct lookup, prefer dbGetNodesByPath, dbGetEdgeById or dbGetEmbeddingById

> define
# A unique node within a collection or graph of nodes.
ConvoNode=struct(

    # Normalized absolute file system like path that starts with a (/). \`path\` should be unique in a
    # collection or graph of nodes and should be treated as a unique id.
    #
    # Path rules:
    # - trailing slashes are removed during normalization except for \`/\`
    # - duplicate slashes are converted to a single slash during normalization
    # - paths are case-sensitive
    # - \`.\` and \`..\` are not allowed
    # - \`*\` is not allowed in stored node paths
    path:string

    # An optional human friendly name
    displayName?:string

    # Stable name of the node. Immutable after insert.
    name?:string

    # Optional ISO-8601 date and time the node was created. Immutable after insert.
    created?:string

    # Optional ISO-8601 date and time the node was modified
    modified?:string

    # Optional description
    description?:string

    # Optional instructions on how to use the node.
    instructions?:string

    # An arbitrary type. Immutable after insert.
    type:string

    # Arbitrary data
    data:any
)

# Connects nodes within a graph. Edges are used to connect related data and also to manage permissions.
# For example, many systems will define users as a node and manage their access to other resources / nodes
# using the grant properties of the edge.
#
# Edge behavior:
# - node query step traversal direction is controlled by \`ConvoNodeQueryStep.edgeDirection\`
# - raw edge queries are directional and match \`from\` and \`to\` by equality
# - edges are directional when evaluating permissions
ConvoNodeEdge=struct(

    # Unique id of the edge. Preferably a UUID.
    id:string

    # An optional human friendly name
    displayName?:string

    # Stable name of the edge. Immutable after insert.
    name?:string

    # Optional description
    description?:string

    # Optional ISO-8601 date and time the edge was created. Immutable after insert.
    created?:string

    # Optional ISO-8601 date and time the edge was modified
    modified?:string

    # An arbitrary type. Immutable after insert.
    type:string

    # Normalized path of the node the edge is connecting from.
    # Must reference an existing node path.
    from:string

    # Normalized path of the node the edge is connecting to.
    # Must reference an existing node path.
    to:string

    # Optional instructions on how to use the edge
    instructions?:string

    # Permissions to grant the \`from\` node to the \`to\` node.
    #
    # Permission evaluation rules:
    # - permission is directional from \`from\` to \`to\`
    # - when checking if \`fromPath\` has permission to \`toPath\`, only direct edges with \`edge.from===fromPath\`
    #   are checked
    # - only matching edges whose \`edge.to\` equals \`toPath\` or an ancestor of \`toPath\` are considered
    # - grants from multiple matching edges are unioned using bitwise OR
    # - \`none\` may be stored on an edge but has the same effect as being undefined
    # - write does not imply read
    grant?:int
)

# An embedding pointing to a node that can be used to search for the node.
# A node may not have multiple embeddings with the same \`prop\` and \`type\`.
ConvoNodeEmbedding=struct(

    # Unique id of the embedding. Preferably a UUID.
    id:string

    # The property the embedding is being applied to. In most cases this will be "data".
    # Immutable after insert.
    prop:string

    # Stable name of the embedding. Immutable after insert.
    name?:string

    # An arbitrary type. Immutable after insert.
    type:string

    # Normalized path of the node the embedding points to.
    # Must reference an existing node path.
    path:string

    # Optional description
    description?:string

    # Optional ISO-8601 date and time the embedding was created. Immutable after insert.
    created?:string

    # Optional ISO-8601 date and time the embedding was modified
    modified?:string

    # Optional instructions on how the data of the pointed to node should be processed to
    # generate the embedding. Instructions are evaluated as raw Convo-Lang and the response is
    # used a the value to generate embeddings from. The instructions convo will have access to
    # 3 predefined variables: node, embedding and value. The value variable will contain the
    # value of the property of the node pointed to by the embedding.
    instructions?:string

    # Embedding vector data. The actual data type of the vector is specific to the datastore the
    # embedding is stored in and is intentionally opaque at this interface layer.
    vector?:any
)

# An embedding search definition used to filter nodes by semantic similarity
ConvoEmbeddingSearch=struct(
    # Optional embedding type to match
    type?:string

    # Input text used to generate or compare the embedding search
    text:string

    # Optional similarity tolerance
    tolerance?:number
)

# A condition that compares a target property to a value
ConvoNodePropertyCondition=struct(
    # The property of the target object to evaluate. Dot notation may be used for nested properties
    target:string

    # The comparison operator
    op:enum("=" "!=" ">" "<" ">=" "<=" "in" "all-in" "any-in" "contains" "contains-all" "contains-any" "like" "ilike")

    # The value to compare against
    value:any
)

# A grouped boolean condition containing nested conditions
ConvoNodeGroupCondition=struct(
    # Boolean operator used to combine nested conditions
    groupOp:enum("and" "or")

    # Nested conditions. Values may be property conditions or grouped conditions
    conditions:array(any)
)

# Defines how query results should be ordered
ConvoNodeOrderBy=struct(
    # Property to order by. Dot notation may be used for nested properties
    prop:string

    # Sort direction
    direction?:enum("asc" "desc")
)

# Represents a single traversal and filtering step in a node query
ConvoNodeQueryStep=struct(
    # Exact normalized path or supported wildcard path to filter current nodes by
    path?:string

    # Condition applied to the current nodes before traversal
    condition?:any

    # Path permissions are evaluated from for the current nodes of this step
    permissionFrom?:string

    # Required permission type for the current nodes of this step
    permissionRequired?:int

    # Embedding search used to filter the current nodes
    embedding?:ConvoEmbeddingSearch

    # Edge filter used to select connected nodes for traversal
    edge?:any

    # Direction edges are traversed in
    edgeDirection?:enum("forward" "reverse" "bi")

    # Maximum number of destination nodes to traverse after deduplication
    edgeLimit?:number
)

# Query definition used to select nodes from the database
ConvoNodeQuery=struct(
    # Keys of node properties to return. Use "*" or omit for all properties
    keys?:any

    # Steps to evaluate during traversal
    steps:array(ConvoNodeQueryStep)

    # Maximum number of nodes to return
    limit?:number

    # If true all scanned nodes are returned instead of only final traversal results
    returnAllScanned?:boolean

    # Number of items read from the backing datastore at a time
    readBatchSize?:number

    # Number of nodes to skip
    skip?:number

    # Token used to resume querying
    nextToken?:string

    # Path permissions are evaluated from on the final result set
    permissionFrom?:string

    # Required permission type for the final result set
    permissionRequired?:int

    # Ordering applied to returned nodes
    orderBy?:any
)

# Options for inserting a node
InsertConvoNodeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# A node update payload
ConvoNodeUpdate=struct(
    # Path of the node to update
    path:string

    # Updated display name
    displayName?:string

    # Updated modified timestamp
    modified?:string

    # Updated description
    description?:string

    # Updated instructions
    instructions?:string

    # Replacement data value
    data?:any
)

# Options for updating a node
UpdateConvoNodeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Options for deleting a node
DeleteConvoNodeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Raw query definition for selecting edges
ConvoNodeEdgeQuery=struct(
    # Edge id to match
    id?:string

    # From path to match
    from?:string

    # To path to match
    to?:string

    # Edge type to match
    type?:string

    # Edge name to match
    name?:string

    # Maximum number of edges to return
    limit?:number

    # Number of edges to skip
    offset?:number

    # Path permissions are evaluated from
    permissionFrom?:string

    # If true the total number of matching edges should be returned
    includeTotal?:boolean
)

# Options for inserting an edge
InsertConvoNodeEdgeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# An edge update payload
ConvoNodeEdgeUpdate=struct(
    # Id of the edge to update
    id:string

    # Updated display name
    displayName?:string

    # Updated modified timestamp
    modified?:string

    # Updated description
    description?:string

    # Updated instructions
    instructions?:string

    # Updated granted permission value
    grant?:int
)

# Options for updating an edge
UpdateConvoNodeEdgeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Options for deleting an edge
DeleteConvoNodeEdgeOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Raw query definition for selecting embeddings
ConvoNodeEmbeddingQuery=struct(
    # Embedding id to match
    id?:string

    # Node path to match
    path?:string

    # Embedding type to match
    type?:string

    # Embedding name to match
    name?:string

    # Embedding property to match
    prop?:string

    # Maximum number of embeddings to return
    limit?:number

    # Number of embeddings to skip
    offset?:number

    # If true the embedding vector should be returned
    includeVector?:boolean

    # Path permissions are evaluated from
    permissionFrom?:string

    # If true the total number of matching embeddings should be returned
    includeTotal?:boolean
)

# Options for inserting an embedding
InsertConvoNodeEmbeddingOptions=struct(
    # If true the embedding vector should be generated asynchronously
    generateVector?:boolean

    # Path permissions are evaluated from
    permissionFrom?:string
)

# An embedding update payload
ConvoNodeEmbeddingUpdate=struct(
    # Id of the embedding to update
    id:string

    # Updated modified timestamp
    modified?:string

    # Updated description
    description?:string

    # Updated instructions
    instructions?:string

    # If true the embedding vector should be regenerated asynchronously
    generateVector?:boolean
)

# Options for updating an embedding
UpdateConvoNodeEmbeddingOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Options for deleting an embedding
DeleteConvoNodeEmbeddingOptions=struct(
    # Path permissions are evaluated from
    permissionFrom?:string
)

# Queries the database for nodes
> extern dbQueryNodes(query:ConvoNodeQuery)

# Returns nodes matching a path. A wildcard path ending with /* can return multiple nodes
> extern dbGetNodesByPath(
    path:string
    permissionFrom?:string
)

# Returns the permissions granted from one node to another
> extern dbGetNodePermission(
    fromPath:string
    toPath:string
)

# Checks if one node has permission to another
> extern dbCheckNodePermission(
    fromPath:string
    toPath:string
    type:int
    matchAny?:boolean
)

# Inserts a new node
> extern dbInsertNode(
    node:ConvoNode
    options?:InsertConvoNodeOptions
)

# Updates a node
> extern dbUpdateNode(
    node:ConvoNodeUpdate
    options?:UpdateConvoNodeOptions
)

# Deletes a node by path
> extern dbDeleteNode(
    path:string
    options?:DeleteConvoNodeOptions
)

# Returns matching edges
> extern dbQueryEdges(query:ConvoNodeEdgeQuery)

# Returns an edge by id
> extern dbGetEdgeById(
    id:string
    permissionFrom?:string
)

# Inserts a new edge
> extern dbInsertEdge(
    edge:ConvoNodeEdge
    options?:InsertConvoNodeEdgeOptions
)

# Updates an edge
> extern dbUpdateEdge(
    update:ConvoNodeEdgeUpdate
    options?:UpdateConvoNodeEdgeOptions
)

# Deletes an edge by id
> extern dbDeleteEdge(
    id:string
    options?:DeleteConvoNodeEdgeOptions
)

# Returns matching embeddings
> extern dbQueryEmbeddings(query:ConvoNodeEmbeddingQuery)

# Returns an embedding by id
> extern dbGetEmbeddingById(
    id:string
    permissionFrom?:string
)

# Inserts a new embedding
> extern dbInsertEmbedding(
    embedding:ConvoNodeEmbedding
    options?:InsertConvoNodeEmbeddingOptions
)

# Updates an embedding
> extern dbUpdateEmbedding(
    update:ConvoNodeEmbeddingUpdate
    options?:UpdateConvoNodeEmbeddingOptions
)

# Deletes an embedding by id
> extern dbDeleteEmbedding(
    id:string
    options?:DeleteConvoNodeEmbeddingOptions
)


                `.trim(),
            }


        default: return undefined;

    }
}
