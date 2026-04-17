# ConvoDb HTTP API Client Guide

ConvoDb can be accessed over HTTP using a small set of JSON endpoints.

This API is designed for simple client applications with minimal dependencies. In many cases you can use it directly with the built-in `fetch` API and avoid adding a dedicated SDK.

This guide covers:

- how the HTTP API is organized
- the core entity types
- how to query, stream, and perform CRUD operations
- how to batch commands using the command endpoint
- JavaScript helper code for calling the API with `fetch`

---

## Base URL

Examples in this guide assume your Convo-Lang server is available at a base URL such as:

```txt
https://api.example.com
```

If your API is hosted under a prefix, include that prefix in your base URL.

Example:

```txt
https://api.example.com/convo
```

---

## Database names

All ConvoDb routes include a `:dbName` route parameter:

```txt
/db/:dbName/...
```

This selects which database to use.

A Convo-Lang API server can expose any number of ConvoDb instances under different names. It is standard practice to use `default` as the default database name.

Examples:

```txt
/db/default/query
/db/default/node/users/alex
/db/workspace-a/query
/db/archive/stream
```

---

## Design goals

The HTTP API is meant for simple clients.

Key ideas:

- use plain JSON requests and responses
- use `fetch` for most operations
- use server-sent events for streaming node results
- use command batching when you want multiple operations in one request
- use convenience CRUD routes when you want direct, readable endpoints

The standard CRUD routes are provided for convenience. The `POST /db/:dbName` command endpoint can perform the same operations while also allowing batch execution.

---

## Core entity types

These are the main types you work with over HTTP.

### `ConvoNode`

A stored object identified by a unique normalized path.

```ts
type ConvoNode={
    path:string;
    displayName?:string;
    name?:string;
    created?:string;
    modified?:string;
    description?:string;
    instructions?:string;
    type:string;
    data:Record<string,any>;
}
```

Example:

```json
{
    "path":"/users/alex",
    "type":"user",
    "displayName":"Alex",
    "data":{
        "email":"alex@example.com",
        "tier":"pro"
    }
}
```

---

### `ConvoNodeUpdate`

Used to update a node.

```ts
type ConvoNodeUpdate={
    path:string;
    displayName?:string|null;
    modified?:string|null;
    description?:string|null;
    instructions?:string|null;
    data?:Record<string,any>|null;
}
```

Notes:

- `path` is required
- omitted fields are not changed
- fields documented as nullable may be unset with `null`
- `data` replaces the existing `data` object unless merge behavior is enabled by the server-side update options

---

### `ConvoNodeEdge`

Represents a relationship between two nodes.

```ts
type ConvoNodeEdge={
    id:string;
    displayName?:string;
    name?:string;
    description?:string;
    created?:string;
    modified?:string;
    type:string;
    from:string;
    to:string;
    instructions?:string;
    grant?:ConvoNodePermissionType;
}
```

Example:

```json
{
    "id":"edge-123",
    "type":"uses-tool",
    "from":"/agents/researcher",
    "to":"/tools/web-search"
}
```

---

### `ConvoNodeEdgeUpdate`

Used to update an edge.

```ts
type ConvoNodeEdgeUpdate={
    id:string;
    displayName?:string|null;
    modified?:string|null;
    description?:string|null;
    instructions?:string|null;
    grant?:ConvoNodePermissionType|null;
}
```

---

### `ConvoNodeEmbedding`

Represents an embedding associated with a node.

```ts
type ConvoNodeEmbedding={
    id:string;
    prop:string;
    name?:string;
    type:string;
    path:string;
    description?:string;
    created?:string;
    modified?:string;
    instructions?:string;
    vector?:any;
}
```

Example:

```json
{
    "id":"emb-123",
    "path":"/docs/faq/refunds",
    "prop":"data.body",
    "type":"text"
}
```

---

### `ConvoNodeEmbeddingUpdate`

Used to update embedding metadata and optionally request vector regeneration.

```ts
type ConvoNodeEmbeddingUpdate={
    id:string;
    modified?:string|null;
    description?:string|null;
    instructions?:string|null;
    generateVector?:boolean;
}
```

---

### `ConvoNodePermissionType`

Permissions are bitwise flags.

```ts
enum ConvoNodePermissionType
{
    none=0,
    read=4,
    write=2,
    execute=1,
    readWrite=6,
    readExecute=5,
    writeExecute=3,
    readWriteExecute=7,
    all=7
}
```

Common values:

- `4` = read
- `2` = write
- `1` = execute
- `6` = readWrite
- `7` = all

---

## Query-related types

### `ConvoNodeConditionOp`

Supported condition operators:

```ts
type ConvoNodeConditionOp=
    '='|'!='|'>'|'<'|'>='|'<='|
    'in'|'all-in'|'any-in'|
    'contains'|'contains-all'|'contains-any'|
    'like'|'ilike';
```

---

### `ConvoNodePropertyCondition`

```ts
type ConvoNodePropertyCondition={
    target:string;
    op:ConvoNodeConditionOp;
    value:any;
}
```

Example:

```json
{
    "target":"data.status",
    "op":"=",
    "value":"open"
}
```

---

### `ConvoNodeGroupCondition`

```ts
type ConvoNodeGroupCondition={
    groupOp:"and"|"or";
    conditions:ConvoNodeCondition[];
}
```

---

### `ConvoNodeCondition`

```ts
type ConvoNodeCondition=
    ConvoNodePropertyCondition|
    ConvoNodeGroupCondition;
```

---

### `ConvoEmbeddingSearch`

```ts
type ConvoEmbeddingSearch={
    type?:string;
    text:string;
    tolerance?:number;
}
```

---

### `ConvoNodeQueryStep`

A query is made of one or more steps.

```ts
type ConvoNodeQueryStep={
    path?:string;
    condition?:ConvoNodeCondition;
    permissionFrom?:string;
    permissionRequired?:ConvoNodePermissionType;
    embedding?:ConvoEmbeddingSearch;
    edge?:string|ConvoNodeCondition;
    edgeDirection?:'forward'|'reverse'|'bi';
    edgeLimit?:number;
}
```

---

### `ConvoNodeOrderBy`

```ts
type ConvoNodeOrderBy={
    prop:string;
    direction?:'asc'|'desc';
}
```

---

### `ConvoNodeQuery`

```ts
type ConvoNodeQuery={
    keys?:string[]|'*'|null;
    steps:ConvoNodeQueryStep[];
    limit?:number;
    returnAllScanned?:boolean;
    readBatchSize?:number;
    skip?:number;
    nextToken?:string;
    permissionFrom?:string;
    permissionRequired?:ConvoNodePermissionType;
    orderBy?:ConvoNodeOrderBy|ConvoNodeOrderBy[];
}
```

Notes:

- `steps` is required
- `keys` can be omitted to return full nodes
- `permissionFrom` and `permissionRequired` can be applied to final results
- use `nextToken` for cursor-based pagination

---

### `ConvoNodeQueryResult`

```ts
type ConvoNodeQueryResult={
    nodes:ConvoNode[];
    nextToken?:string;
}
```

---

### `ConvoNodeStreamItem`

Streaming results return server-sent events containing one item at a time.

```ts
type ConvoNodeStreamItem=
    |{
        type:'node';
        node:ConvoNode;
    }
    |{
        type:'error';
        error:string;
        statusCode:number;
    };
```

---

## Command types

The batch command endpoint accepts `ConvoDbCommand[]` and returns `ConvoDbCommandResult<any>[]`.

Each command object should define exactly one action.

### `ConvoDbCommand`

```ts
type ConvoDbCommand={
    queryNodes?:{query:ConvoNodeQuery};
    getNodesByPath?:{path:string;permissionFrom?:string};
    getNodePermission?:{fromPath:string;toPath:string};
    checkNodePermission?:{
        fromPath:string;
        toPath:string;
        type:number;
        matchAny?:boolean;
    };
    insertNode?:{
        node:ConvoNode;
        options?:{permissionFrom?:string};
    };
    updateNode?:{
        node:ConvoNodeUpdate;
        options?:{permissionFrom?:string;mergeData?:boolean};
    };
    deleteNode?:{
        path:string;
        options?:{permissionFrom?:string};
    };
    queryEdges?:{
        query:{
            id?:string;
            from?:string;
            to?:string;
            type?:string;
            name?:string;
            limit?:number;
            offset?:number;
            permissionFrom?:string;
            includeTotal?:boolean;
        };
    };
    getEdgeById?:{id:string;permissionFrom?:string};
    insertEdge?:{
        edge:Omit<ConvoNodeEdge,'id'>;
        options?:{permissionFrom?:string};
    };
    updateEdge?:{
        update:ConvoNodeEdgeUpdate;
        options?:{permissionFrom?:string};
    };
    deleteEdge?:{
        id:string;
        options?:{permissionFrom?:string};
    };
    queryEmbeddings?:{
        query:{
            id?:string;
            path?:string;
            type?:string;
            name?:string;
            prop?:string;
            limit?:number;
            offset?:number;
            includeVector?:boolean;
            permissionFrom?:string;
            includeTotal?:boolean;
        };
    };
    getEmbeddingById?:{id:string;permissionFrom?:string};
    insertEmbedding?:{
        embedding:Omit<ConvoNodeEmbedding,'id'>;
        options?:{generateVector?:boolean;permissionFrom?:string};
    };
    updateEmbedding?:{
        update:ConvoNodeEmbeddingUpdate;
        options?:{permissionFrom?:string};
    };
    deleteEmbedding?:{
        id:string;
        options?:{permissionFrom?:string};
    };
}
```

---

### `ConvoDbCommandResult`

Each result object mirrors the command shape.

```ts
type ConvoDbCommandResult={
    queryNodes?:ConvoNodeQueryResult;
    getNodesByPath?:ConvoNodeQueryResult;
    getNodePermission?:number;
    checkNodePermission?:boolean;
    insertNode?:ConvoNode;
    updateNode?:true;
    deleteNode?:true;
    queryEdges?:{
        edges:ConvoNodeEdge[];
        total?:number;
    };
    getEdgeById?:ConvoNodeEdge;
    insertEdge?:ConvoNodeEdge;
    updateEdge?:true;
    deleteEdge?:true;
    queryEmbeddings?:{
        embeddings:ConvoNodeEmbedding[];
        total?:number;
    };
    getEmbeddingById?:ConvoNodeEmbedding;
    insertEmbedding?:ConvoNodeEmbedding;
    updateEmbedding?:true;
    deleteEmbedding?:true;
}
```

---

## OpenAPI-like endpoint reference

This section is intentionally lightweight and human-readable.

---

### `POST /db/:dbName`

Execute multiple commands in one request.

#### Request body

```ts
ConvoDbCommand[]
```

#### Response body

```ts
ConvoDbCommandResult<any>[]
```

#### Notes

- supports batching
- can perform queries, inserts, updates, deletes, and permission checks
- preferred when you want to minimize request count

#### Example

```http
POST /db/default
Content-Type: application/json
```

```json
[
    {
        "insertNode":{
            "node":{
                "path":"/users/alex",
                "type":"user",
                "data":{
                    "tier":"pro"
                }
            }
        }
    },
    {
        "queryNodes":{
            "query":{
                "steps":[
                    {
                        "path":"/users/*"
                    }
                ]
            }
        }
    }
]
```

---

### `POST /db/:dbName/query`

Execute a node query.

#### Request body

```ts
ConvoNodeQuery
```

#### Response body

```ts
ConvoNodeQueryResult
```

#### Notes

- use for normal non-streaming node queries
- supports path filters, conditions, embeddings, traversal, permissions, pagination, and ordering

---

### `POST /db/:dbName/stream`

Execute a node query and stream results as server-sent events.

#### Request body

```ts
ConvoNodeQuery
```

#### Response body

Server-sent events where each event data payload is a:

```ts
ConvoNodeStreamItem
```

#### SSE event shape

The server emits events named `node`.

Each event `data` is JSON:

```json
{
    "type":"node",
    "node":{
        "path":"/docs/a",
        "type":"doc",
        "data":{}
    }
}
```

Or an error item:

```json
{
    "type":"error",
    "error":"Database not found by name",
    "statusCode":404
}
```

---

## Standard CRUD routes

These routes are convenience APIs for common operations.

The `POST /db/:dbName` command endpoint can also perform all of these actions.

---

### `GET /db/:dbName/node/:path{.*}`

Return a node by path.

Use the actual path of the node without escaping slashes.

#### Notes

- the path is placed directly in the URL path
- in practice this looks like `/db/default/node/users/alex` for the node path `/users/alex`
- if your client constructs URLs manually, remove the leading slash from the stored node path before appending

#### Response body

For exact paths, the response contains a `ConvoNodeQueryResult`.

Example request path:

```txt
GET /db/default/node/users/alex
```

---

### `POST /db/:dbName/node`

Insert a node.

#### Request body

```ts
{
    node:ConvoNode;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

```ts
ConvoNode
```

---

### `PATCH /db/:dbName/node`

Update a node.

#### Request body

```ts
{
    node:ConvoNodeUpdate;
    options?:{
        permissionFrom?:string;
        mergeData?:boolean;
    };
}
```

#### Response body

`null`

---

### `DELETE /db/:dbName/node`

Delete a node.

#### Request body

```ts
{
    path:string;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

`null`

---

### `GET /db/:dbName/edge/:id`

Return an edge by id.

#### Response body

```ts
ConvoNodeEdge
```

---

### `POST /db/:dbName/edge`

Insert an edge.

#### Request body

```ts
{
    edge:Omit<ConvoNodeEdge,'id'>;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

```ts
ConvoNodeEdge
```

---

### `PATCH /db/:dbName/edge`

Update an edge.

#### Request body

```ts
{
    update:ConvoNodeEdgeUpdate;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

`null`

---

### `DELETE /db/:dbName/edge`

Delete an edge.

#### Request body

```ts
{
    id:string;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

`null`

---

### `GET /db/:dbName/embedding/:id`

Return an embedding by id.

#### Response body

```ts
ConvoNodeEmbedding
```

---

### `POST /db/:dbName/embedding`

Insert an embedding.

#### Request body

```ts
{
    embedding:Omit<ConvoNodeEmbedding,'id'>;
    options?:{
        generateVector?:boolean;
        permissionFrom?:string;
    };
}
```

#### Response body

```ts
ConvoNodeEmbedding
```

---

### `PATCH /db/:dbName/embedding`

Update an embedding.

#### Request body

```ts
{
    update:ConvoNodeEmbeddingUpdate;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

`null`

---

### `DELETE /db/:dbName/embedding`

Delete an embedding.

#### Request body

```ts
{
    id:string;
    options?:{
        permissionFrom?:string;
    };
}
```

#### Response body

`null`

---

## Error handling

Most routes return JSON responses.

When an operation fails, the server returns an HTTP error status and a JSON error body.

A minimal client should:

- check `response.ok`
- attempt to parse the response body as JSON
- throw or return a structured error

Example helper:

```js
async function readJsonOrThrow(response)
{
    const text=await response.text();
    const data=text?JSON.parse(text):null;

    if(!response.ok){
        const error=new Error(
            typeof data==='string'?
                data
            :
                data?.message || `Request failed with status ${response.status}`
        );
        error.status=response.status;
        error.data=data;
        throw error;
    }

    return data;
}
```

---

## Minimal JavaScript client helper

This helper uses only `fetch`.

```js
export function createConvoDbHttpClient({
    baseUrl,
    dbName='default',
    headers,
}={})
{
    const getUrl=(path)=>`${baseUrl}/db/${encodeURIComponent(dbName)}${path}`;

    const requestJson=async (path,method,body)=>{
        const response=await fetch(getUrl(path),{
            method,
            headers:{
                'Content-Type':'application/json',
                ...headers,
            },
            body:body===undefined?undefined:JSON.stringify(body),
        });

        const text=await response.text();
        const data=text?JSON.parse(text):null;

        if(!response.ok){
            const error=new Error(
                typeof data==='string'?
                    data
                :
                    data?.message || `HTTP ${response.status}`
            );
            error.status=response.status;
            error.data=data;
            throw error;
        }

        return data;
    };

    return {
        executeCommands(commands){
            return requestJson('', 'POST', commands);
        },

        query(query){
            return requestJson('/query', 'POST', query);
        },

        getNode(path){
            const cleanPath=path.startsWith('/')?path.slice(1):path;
            return requestJson(`/node/${cleanPath}`, 'GET');
        },

        insertNode(node,options){
            return requestJson('/node', 'POST', {node,options});
        },

        updateNode(node,options){
            return requestJson('/node', 'PATCH', {node,options});
        },

        deleteNode(path,options){
            return requestJson('/node', 'DELETE', {path,options});
        },

        getEdge(id){
            return requestJson(`/edge/${encodeURIComponent(id)}`, 'GET');
        },

        insertEdge(edge,options){
            return requestJson('/edge', 'POST', {edge,options});
        },

        updateEdge(update,options){
            return requestJson('/edge', 'PATCH', {update,options});
        },

        deleteEdge(id,options){
            return requestJson('/edge', 'DELETE', {id,options});
        },

        getEmbedding(id){
            return requestJson(`/embedding/${encodeURIComponent(id)}`, 'GET');
        },

        insertEmbedding(embedding,options){
            return requestJson('/embedding', 'POST', {embedding,options});
        },

        updateEmbedding(update,options){
            return requestJson('/embedding', 'PATCH', {update,options});
        },

        deleteEmbedding(id,options){
            return requestJson('/embedding', 'DELETE', {id,options});
        },
    };
}
```

Example usage:

```js
const db=createConvoDbHttpClient({
    baseUrl:'https://api.example.com',
    dbName:'default',
});
```

---

## Basic query examples

### Query nodes by path

```js
const db=createConvoDbHttpClient({
    baseUrl:'https://api.example.com',
});

const result=await db.query({
    steps:[
        {
            path:'/users/*',
        },
    ],
});

console.log(result.nodes);
```

---

### Query with a condition

```js
const result=await db.query({
    steps:[
        {
            path:'/tasks/*',
            condition:{
                target:'data.status',
                op:'=',
                value:'open',
            },
        },
    ],
});

console.log(result.nodes);
```

---

### Query with ordering

```js
const result=await db.query({
    steps:[
        {
            path:'/docs/*',
        },
    ],
    orderBy:{
        prop:'path',
        direction:'asc',
    },
});

console.log(result.nodes);
```

---

### Query selected keys

```js
const result=await db.query({
    keys:['path','type','data'],
    steps:[
        {
            path:'/agents/*',
        },
    ],
});

console.log(result.nodes);
```

---

### Query with pagination

```js
const firstPage=await db.query({
    steps:[
        {
            path:'/docs/*',
        },
    ],
    limit:20,
});

console.log(firstPage.nodes);

if(firstPage.nextToken){
    const secondPage=await db.query({
        steps:[
            {
                path:'/docs/*',
            },
        ],
        limit:20,
        nextToken:firstPage.nextToken,
    });

    console.log(secondPage.nodes);
}
```

---

## CRUD examples

### Insert a node

```js
const created=await db.insertNode({
    path:'/users/alex',
    type:'user',
    displayName:'Alex',
    data:{
        email:'alex@example.com',
        tier:'pro',
    },
});

console.log(created);
```

---

### Get a node by path

```js
const result=await db.getNode('/users/alex');
console.log(result.nodes[0]);
```

Because the node route returns a query-style result for exact node paths, read the node from `result.nodes[0]`.

---

### Update a node

```js
await db.updateNode(
    {
        path:'/users/alex',
        displayName:'Alex Johnson',
        data:{
            email:'alex@example.com',
            tier:'team',
        },
    },
    {
        mergeData:false,
    }
);
```

---

### Delete a node

```js
await db.deleteNode('/users/alex');
```

---

### Insert an edge

```js
const edge=await db.insertEdge({
    type:'uses-tool',
    from:'/agents/researcher',
    to:'/tools/web-search',
    description:'Research agent may use web search',
});

console.log(edge.id);
```

---

### Get an edge by id

```js
const edge=await db.getEdge('edge-123');
console.log(edge);
```

---

### Update an edge

```js
await db.updateEdge({
    id:'edge-123',
    description:'Updated edge description',
});
```

---

### Delete an edge

```js
await db.deleteEdge('edge-123');
```

---

### Insert an embedding

```js
const embedding=await db.insertEmbedding({
    path:'/docs/faq/refunds',
    prop:'data.body',
    type:'text',
    description:'Refund policy body embedding',
});

console.log(embedding);
```

---

### Get an embedding by id

```js
const embedding=await db.getEmbedding('emb-123');
console.log(embedding);
```

---

### Update an embedding

```js
await db.updateEmbedding({
    id:'emb-123',
    description:'Updated embedding description',
    generateVector:true,
});
```

---

### Delete an embedding

```js
await db.deleteEmbedding('emb-123');
```

---

## Permissions in requests

Many operations support an options object with `permissionFrom`.

This tells the server which node path should be used for permission evaluation.

Example:

```js
await db.insertNode(
    {
        path:'/workspaces/acme/docs/spec',
        type:'doc',
        data:{
            title:'Spec',
        },
    },
    {
        permissionFrom:'/users/alex',
    }
);
```

Query example with permission filtering:

```js
const docs=await db.query({
    steps:[
        {
            path:'/workspaces/acme/docs/*',
        },
    ],
    permissionFrom:'/users/alex',
    permissionRequired:4,
});

console.log(docs.nodes);
```

You can also use named enum values in your own app code:

```js
const ConvoNodePermissionType={
    none:0,
    read:4,
    write:2,
    execute:1,
    readWrite:6,
    readExecute:5,
    writeExecute:3,
    readWriteExecute:7,
    all:7,
};
```

---

## Graph traversal examples

### Traverse from an agent to its tools

```js
const result=await db.query({
    steps:[
        {
            path:'/agents/researcher',
            edge:'uses-tool',
            edgeDirection:'forward',
        },
    ],
});

console.log(result.nodes);
```

---

### Reverse traversal

```js
const result=await db.query({
    steps:[
        {
            path:'/tools/web-search',
            edge:'uses-tool',
            edgeDirection:'reverse',
        },
    ],
});

console.log(result.nodes);
```

---

### Multi-step traversal

```js
const result=await db.query({
    steps:[
        {
            path:'/users/alex',
            edge:'member-of',
            edgeDirection:'forward',
        },
        {
            edge:'contains',
            edgeDirection:'forward',
        },
    ],
});

console.log(result.nodes);
```

---

## Embedding query example

```js
const result=await db.query({
    steps:[
        {
            path:'/docs/*',
            embedding:{
                text:'How do refunds work?',
                type:'text',
            },
        },
    ],
});

console.log(result.nodes);
```

---

## Batch command examples

The command endpoint is the most flexible HTTP API.

Use it when you want to:

- reduce round trips
- bundle related operations
- expose a simple action-oriented interface to a thin client
- execute mixed operations in order

### Execute multiple commands in one request

```js
const results=await db.executeCommands([
    {
        insertNode:{
            node:{
                path:'/agents/planner',
                type:'agent',
                data:{
                    role:'planner',
                },
            },
        },
    },
    {
        insertNode:{
            node:{
                path:'/tools/calendar',
                type:'tool',
                data:{
                    provider:'internal',
                },
            },
        },
    },
    {
        insertEdge:{
            edge:{
                type:'uses-tool',
                from:'/agents/planner',
                to:'/tools/calendar',
            },
        },
    },
    {
        queryNodes:{
            query:{
                steps:[
                    {
                        path:'/agents/planner',
                        edge:'uses-tool',
                        edgeDirection:'forward',
                    },
                ],
            },
        },
    },
]);

console.log(results);
```

---

### Query nodes through the command endpoint

```js
const results=await db.executeCommands([
    {
        queryNodes:{
            query:{
                steps:[
                    {
                        path:'/docs/*',
                    },
                ],
                limit:10,
            },
        },
    },
]);

const queryResult=results[0].queryNodes;
console.log(queryResult.nodes);
```

---

### Check permissions through the command endpoint

```js
const results=await db.executeCommands([
    {
        checkNodePermission:{
            fromPath:'/users/alex',
            toPath:'/workspaces/acme/docs/spec',
            type:4,
        },
    },
]);

console.log(results[0].checkNodePermission);
```

---

## Raw `fetch` examples

If you do not want a wrapper client, call the endpoints directly.

### Raw query request

```js
const response=await fetch('https://api.example.com/db/default/query',{
    method:'POST',
    headers:{
        'Content-Type':'application/json',
    },
    body:JSON.stringify({
        steps:[
            {
                path:'/users/*',
            },
        ],
    }),
});

const result=await response.json();

if(!response.ok){
    throw new Error(JSON.stringify(result));
}

console.log(result.nodes);
```

---

### Raw batch command request

```js
const response=await fetch('https://api.example.com/db/default',{
    method:'POST',
    headers:{
        'Content-Type':'application/json',
    },
    body:JSON.stringify([
        {
            insertNode:{
                node:{
                    path:'/users/alex',
                    type:'user',
                    data:{
                        tier:'pro',
                    },
                },
            },
        },
        {
            getNodesByPath:{
                path:'/users/alex',
            },
        },
    ]),
});

const result=await response.json();

if(!response.ok){
    throw new Error(JSON.stringify(result));
}

console.log(result);
```

---

## Streaming with server-sent events

The stream endpoint returns server-sent events containing `ConvoNodeStreamItem` payloads.

Because standard `EventSource` only supports `GET`, a minimal browser client typically needs either:

- a custom fetch-based SSE reader, or
- a small helper library that supports SSE over `POST`

Since this guide is dependency-light, here is a fetch-based example.

### Fetch-based SSE reader for `POST /db/:dbName/stream`

```js
export async function streamConvoNodes({
    baseUrl,
    dbName='default',
    query,
    headers,
    onItem,
})
{
    const response=await fetch(`${baseUrl}/db/${encodeURIComponent(dbName)}/stream`,{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            ...headers,
        },
        body:JSON.stringify(query),
    });

    if(!response.ok){
        const text=await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    if(!response.body){
        throw new Error('ReadableStream not supported by this environment');
    }

    const reader=response.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';

    while(true){
        const {done,value}=await reader.read();

        if(done){
            break;
        }

        buffer+=decoder.decode(value,{stream:true});

        let boundaryIndex;
        while((boundaryIndex=buffer.indexOf('\n\n'))>=0){
            const rawEvent=buffer.slice(0,boundaryIndex);
            buffer=buffer.slice(boundaryIndex+2);

            const lines=rawEvent.split(/\r?\n/);
            let eventName='message';
            const dataLines=[];

            for(const line of lines){
                if(line.startsWith('event:')){
                    eventName=line.slice(6).trim();
                }else if(line.startsWith('data:')){
                    dataLines.push(line.slice(5).trim());
                }
            }

            if(eventName==='node' && dataLines.length){
                const item=JSON.parse(dataLines.join('\n'));
                await onItem?.(item);
            }
        }
    }
}
```

Example usage:

```js
await streamConvoNodes({
    baseUrl:'https://api.example.com',
    dbName:'default',
    query:{
        steps:[
            {
                path:'/docs/*',
            },
        ],
    },
    onItem(item){
        if(item.type==='error'){
            console.error('stream error',item);
            return;
        }

        console.log('node',item.node.path);
    },
});
```

---

## Suggested client patterns

### Use CRUD routes when:

- you are building a small app
- you want clear one-endpoint-per-action code
- you only need simple reads and writes

### Use `POST /db/:dbName` when:

- you want fewer network round trips
- you want to batch operations
- you want a single generic client method
- you are building agent or tool style interactions around structured commands

### Use `POST /db/:dbName/stream` when:

- the result set may be large
- you want progressive processing
- you want to start rendering or handling nodes before the full query finishes

---

## Practical notes

### Node paths in URLs

For `GET /db/:dbName/node/:path{.*}` use the actual node path without escaping slashes.

Stored path:

```txt
/users/alex
```

Request URL:

```txt
/db/default/node/users/alex
```

A simple helper is:

```js
function toNodeRoutePath(path)
{
    return path.startsWith('/')?path.slice(1):path;
}
```

---

### Prefer command batching for chatty clients

If your UI performs several related actions in a row, batching them through `POST /db/:dbName` can reduce latency and simplify orchestration.

---

### Keep clients thin

Because the API is JSON-first, most apps only need:

- a base URL
- a db name
- a small `fetch` wrapper
- optional auth headers
- optional streaming helper code

---

## End-to-end example

```js
const db=createConvoDbHttpClient({
    baseUrl:'https://api.example.com',
    dbName:'default',
    headers:{
        Authorization:'Bearer YOUR_TOKEN',
    },
});

await db.insertNode({
    path:'/users/alex',
    type:'user',
    data:{
        role:'admin',
    },
});

await db.insertNode({
    path:'/workspaces/acme',
    type:'workspace',
    data:{
        name:'Acme Workspace',
    },
});

await db.insertNode({
    path:'/workspaces/acme/docs/spec',
    type:'doc',
    data:{
        title:'System Spec',
        body:'Architecture notes and requirements',
    },
});

await db.insertEdge({
    type:'grant',
    from:'/users/alex',
    to:'/workspaces/acme',
    grant:6,
});

const docs=await db.query({
    steps:[
        {
            path:'/workspaces/acme/docs/*',
        },
    ],
    permissionFrom:'/users/alex',
    permissionRequired:4,
});

console.log(docs.nodes);
```

---

## Summary

ConvoDb’s HTTP API gives you a dependency-light way to work with nodes, edges, embeddings, graph traversal, permissions, batching, and streaming.

For most client applications:

- use `fetch`
- use `POST /db/:dbName/query` for normal node queries
- use CRUD routes for simple direct operations
- use `POST /db/:dbName` for batching and advanced command execution
- use `POST /db/:dbName/stream` for progressive node processing

This makes ConvoDb a good fit for browser apps, lightweight frontends, utility scripts, and small services that want a simple graph-capable API without a large client dependency.
