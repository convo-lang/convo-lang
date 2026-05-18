# ConvoDb Overview

ConvoDb is a graph-capable, path-based database interface for building AI agents, memory systems, RAG pipelines, workflow engines, authentication flows, tool registries, and other agentic applications.

It combines:

- hierarchical node paths
- graph edges
- path-based permissions
- semantic embeddings
- blob storage
- executable stored functions
- authentication helpers
- portable storage adapters
- React query hooks
- CLI and HTTP-friendly command execution

ConvoDb is designed so the same application logic can run in memory, in the browser, over HTTP, on local files, SQLite, Postgres, or layered combinations of adapters.

---

## Core idea

ConvoDb stores application state as nodes addressed by normalized file-system-style paths.

Examples:

```txt
/users/alex
/agents/researcher
/workspaces/acme/docs/spec
/workspaces/acme/uploads/report-q1
/tools/web-search
/usr/guest
```

Paths make it easy to organize data, query subtrees, and grant permissions at meaningful boundaries.

A typical AI application can store:

- users and identities
- conversations and messages
- agent memory
- documents and extracted markdown
- uploaded files and metadata
- tools and callable functions
- workflows and tasks
- permissions
- embeddings for semantic search

---

## Imports

Adapters are usually imported from `@convo-lang/db` or runtime-specific packages:

```ts
import { InMemoryConvoDb } from '@convo-lang/db';
```

Core interfaces and types are imported from `@convo-lang/convo-lang`:

```ts
import {
    ConvoDb,
    ConvoDbInstanceMap,
    ConvoNodePermissionType,
} from '@convo-lang/convo-lang';
```

React hooks are imported from `@convo-lang/convo-lang-react`:

```ts
import {
    useConvoDbQuery,
    useConvoNodeAtPath,
    useConvoNodesAtPath,
} from '@convo-lang/convo-lang-react';
```

---

## Create a database

```ts
import { InMemoryConvoDb } from '@convo-lang/db';

const db=new InMemoryConvoDb({
    name:'default',
});
```

Every database has a `dbName`. Names are used by auth tokens, HTTP routes, CLI commands, and multi-database maps.

---

## Nodes

A node is the main stored object.

A node has:

- `path`
- `type`
- optional metadata such as `displayName` or `description`
- arbitrary `data`

```ts
await db.insertNodeAsync({
    path:'/users/alex',
    type:'user',
    displayName:'Alex',
    data:{
        email:'alex@example.com',
        tier:'pro',
    },
});
```

Use nodes for structured data, metadata, extracted text, markdown, source code, tasks, tools, memories, and documents.

Node paths must be exact normalized paths and cannot contain wildcards.

---

## Edges

Edges connect nodes and make ConvoDb graph-capable.

```ts
await db.insertEdgeAsync({
    type:'uses-tool',
    from:'/agents/researcher',
    to:'/tools/web-search',
});
```

Use edges for:

- relationships
- workflow dependencies
- tool access
- membership
- permission grants
- graph traversal

Edge `from` and `to` paths must be exact paths and cannot contain wildcards.

---

## Blobs

Blobs store binary data or original source files.

Use blobs for:

- images
- videos
- audio
- PDFs
- spreadsheets
- word-processing documents
- uploaded source files

Use nodes for metadata and extracted text.

A common pattern is to store a metadata node and blob at the same path:

```ts
await db.insertNodeAsync({
    path:'/uploads/report-q1',
    type:'uploaded-file',
    data:{
        fileName:'report-q1.xlsx',
        contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        status:'uploaded',
    },
});

await db.writeBlobAsync(
    '/uploads/report-q1',
    spreadsheetBlob,
);
```

Read a blob:

```ts
const blob=await db.openBlobAsync('/uploads/report-q1');
```

Delete a blob by writing `null`:

```ts
await db.writeBlobAsync('/uploads/report-q1',null);
```

---

## Embeddings

Embeddings attach vector-searchable semantic representations to nodes.

```ts
await db.insertNodeAsync({
    path:'/docs/refund-policy',
    type:'doc',
    data:{
        title:'Refund Policy',
        markdown:'Customers may request a refund within 30 days...',
    },
});

await db.insertEmbeddingAsync({
    path:'/docs/refund-policy',
    prop:'data.markdown',
    type:'text',
});
```

Query nodes using semantic search:

```ts
const r=await db.queryNodesAsync({
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
```

For RAG ingestion, store the original file as a blob, extract markdown into a node, then create embeddings from the markdown node.

---

## Paths and wildcards

ConvoDb paths are normalized and file-system-like.

Rules:

- paths start with `/`
- duplicate slashes are normalized
- trailing slashes are removed except for `/`
- paths are case-sensitive
- `.` and `..` are not allowed
- stored node paths cannot contain `*`
- blob paths cannot contain `*`
- edge endpoints cannot contain `*`

Stored paths are exact:

```ts
await db.insertNodeAsync({
    path:'/users/alex',
    type:'user',
    data:{},
});
```

Query step paths can use globs:

```txt
/users/*
/users/**
/users/**/posts/*
```

Glob behavior:

- `*` matches within one path segment
- `**` matches zero or more complete path segments
- `**` must be its own path segment

Examples:

```txt
/users/* matches /users/alex
/users/* does not match /users/alex/profile

/users/** matches /users, /users/alex, and /users/alex/profile
```

`like` and `ilike` conditions can use `*` anywhere in the value:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            condition:{
                target:'path',
                op:'ilike',
                value:'*/docs/*roadmap*',
            },
        },
    ],
});
```

---

## Querying nodes

Queries are made of one or more `steps`.

Simple path query:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/users/*',
        },
    ],
});
```

Exact path query:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/users/alex',
        },
    ],
});
```

Recursive subtree query:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/workspaces/acme/**',
        },
    ],
});
```

Condition query:

```ts
const r=await db.queryNodesAsync({
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
```

Ordering:

```ts
const r=await db.queryNodesAsync({
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
```

Selected keys:

```ts
const r=await db.queryNodesAsync({
    keys:['path','type','data'],
    steps:[
        {
            path:'/agents/*',
        },
    ],
});
```

Pagination:

```ts
const firstPage=await db.queryNodesAsync({
    steps:[
        {
            path:'/docs/*',
        },
    ],
    limit:20,
});

if(firstPage.success && firstPage.result.nextToken){
    const secondPage=await db.queryNodesAsync({
        steps:[
            {
                path:'/docs/*',
            },
        ],
        limit:20,
        nextToken:firstPage.result.nextToken,
    });
}
```

Convenience helpers:

```ts
const nodes=await db.getNodesByPathAsync('/docs/*');
const node=await db.getNodeByPathAsync('/docs/spec');
```

---

## Traversing edges

A query step can traverse edges after selecting nodes.

Forward traversal:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/agents/researcher',
            edge:'uses-tool',
            edgeDirection:'forward',
        },
    ],
});
```

Reverse traversal:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/tools/web-search',
            edge:'uses-tool',
            edgeDirection:'reverse',
        },
    ],
});
```

Multi-step traversal:

```ts
const r=await db.queryNodesAsync({
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
```

---

## Permissions

Permissions are represented by edges with a `grant` value.

```ts
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';

await db.insertEdgeAsync({
    type:'grant',
    from:'/users/alex',
    to:'/workspaces/acme',
    grant:ConvoNodePermissionType.readWrite,
});
```

Permission grants apply to descendant paths.

A grant to:

```txt
/workspaces/acme
```

can allow access to:

```txt
/workspaces/acme/docs/spec
/workspaces/acme/uploads/report-q1
/workspaces/acme/tasks/task-1
```

Check permission directly:

```ts
const permission=await db.getNodePermissionAsync(
    '/users/alex',
    '/workspaces/acme/docs/spec',
);
```

Enforce permission during reads:

```ts
const docs=await db.queryNodesAsync({
    steps:[
        {
            path:'/workspaces/acme/docs/*',
        },
    ],
    permissionFrom:'/users/alex',
    permissionRequired:ConvoNodePermissionType.read,
});
```

Enforce permission during writes:

```ts
await db.insertNodeAsync(
    {
        path:'/workspaces/acme/docs/new-doc',
        type:'doc',
        data:{
            title:'New Doc',
        },
    },
    {
        permissionFrom:'/users/alex',
    },
);
```

Blob operations use the same permission model:

```ts
await db.writeBlobAsync(
    '/workspaces/acme/uploads/report-q1',
    fileBlob,
    '/users/alex',
);

const file=await db.openBlobAsync(
    '/workspaces/acme/uploads/report-q1',
    '/users/alex',
);
```

Do not grant to wildcard paths. Grant to exact subtree roots.

---

## Permission boundaries

A permission boundary wraps a database and forces all calls to use one identity path.

```ts
const aliceDb=db.auth.createBoundary('/users/alice');
```

Caller-supplied `permissionFrom` values are overwritten:

```ts
const docs=await aliceDb.queryNodesAsync({
    permissionFrom:'/users/bob',
    steps:[
        {
            path:'/docs/*',
        },
    ],
});
```

Boundaries are useful for:

- HTTP APIs
- browser clients
- tenant isolation
- user-scoped apps
- agent sandboxes

A boundary:

- applies read permission to queries and blob reads
- applies write permission to mutations and blob writes
- applies execute permission to function calls
- prevents spoofing another identity
- rejects raw `driverCmd` commands

---

## Authentication

Every ConvoDb has an auth manager:

```ts
db.auth
```

Auth is database-backed. The auth manager calls stored functions such as:

```txt
/bin/init-auth
/bin/create-user
/bin/sign-in-email-password
```

These functions are provided by `@convo-lang/db-functions`.

Initialize auth:

```ts
await db.callFunctionAsync('/bin/init-auth',{
    override:false,
});
```

Create a user:

```ts
const created=await db.callFunctionReturnNodeAsync('/bin/create-user',{
    password:'correct horse battery staple',
    claims:{
        email:'alex@example.com',
        name:'Alex',
    },
});
```

Sign in:

```ts
const signIn=await db.auth.signInEmailPasswordAsync({
    email:'alex@example.com',
    password:'correct horse battery staple',
});
```

A successful sign-in returns JWT data containing:

- user id
- database name
- identity paths
- claims
- JWT string

HTTP database routes can verify the JWT and create a permission boundary for the identity.

Guest remote callers use:

```txt
/usr/guest
```

Grant permissions to `/usr/guest` for public access.

---

## Stored functions

ConvoDb can store executable functions inside nodes.

A function node uses:

- `data.isExecutable=true`
- `data.function`

Example:

```ts
await db.insertNodeAsync({
    path:'/tools/add',
    type:'tool',
    data:{
        isExecutable:true,
        function:{
            format:'javascript',
            effects:'pure',
            main:`
                const handler=(args)=>{
                    return args.a+args.b;
                };
            `,
        },
    },
});
```

Call it in a query:

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/tools/add',
            call:{
                args:{
                    a:2,
                    b:3,
                },
            },
        },
    ],
});
```

Or use convenience APIs:

```ts
const value=await db.callFunctionAsync('/tools/add',{
    a:2,
    b:3,
});
```

Supported formats include:

- `javascript` / `js`
- `convo`
- `uri`

Supported effect levels include:

- `pure`
- `readOnly`
- `readWrite`

Stored functions are useful for:

- tools
- auth flows
- workflow actions
- computed query results
- reusable database behavior

With permission boundaries, executing a function requires execute permission.

---

## Commands

ConvoDb supports serializable command objects.

This is useful for HTTP APIs, agent tools, remote execution, and batching.

Single command:

```ts
const result=await db.executeCommandAsync({
    queryNodes:{
        query:{
            steps:[
                {
                    path:'/docs/*',
                },
            ],
        },
    },
});
```

Multiple commands:

```ts
const result=await db.executeCommandsAsync([
    {
        insertNode:{
            node:{
                path:'/agents/planner',
                type:'agent',
                data:{},
            },
        },
    },
    {
        queryNodes:{
            query:{
                steps:[
                    {
                        path:'/agents/*',
                    },
                ],
            },
        },
    },
]);
```

Blob commands include:

- `hasBlob`
- `openBlob`
- `writeBlob`

Permission boundaries reject raw driver commands.

---

## Streaming

For large scans, stream nodes instead of loading all results at once.

```ts
for await(const item of db.streamNodesAsync({
    steps:[
        {
            path:'/docs/*',
        },
    ],
})){
    if(item.type==='error'){
        console.error(item.error);
        break;
    }

    if(item.type==='node'){
        console.log(item.node.path);
    }
}
```

Streaming is useful for:

- ingestion
- indexing
- migrations
- background processing
- live UI updates

Blob content is streamed through `openBlobAsync`.

---

## React hooks

ConvoDb React hooks simplify querying and watching node data.

```ts
import {
    useConvoDbQuery,
    useConvoNodeAtPath,
    useConvoNodesAtPath,
} from '@convo-lang/convo-lang-react';
```

Use `useConvoDbQuery` for full query control:

```tsx
const result=useConvoDbQuery({
    steps:[
        {
            path:'/users/*',
            condition:{
                target:'data.tier',
                op:'=',
                value:'pro',
            },
        },
    ],
});
```

Use `useConvoNodeAtPath` for one path:

```tsx
const result=useConvoNodeAtPath('/users/alex');
```

Use `useConvoNodesAtPath` for path-based lists:

```tsx
const result=useConvoNodesAtPath('/workspaces/acme/tasks/*',{
    type:'task',
    condition:{
        target:'data.status',
        op:'=',
        value:'open',
    },
    watch:true,
});
```

Hook result states include:

- `disabled`
- `loading`
- `loaded`
- `streaming`
- `error`

---

## Adapters

ConvoDb separates the high-level `ConvoDb` interface from the low-level `ConvoDbDriver`.

This lets adapters share query traversal, permissions, auth boundaries, command execution, blob permission checks, and function helpers while customizing persistence.

Common adapters include:

- `InMemoryConvoDb`
- `LocalStorageConvoDb`
- `IndexDbConvoDb`
- `NodeFsConvoDb`
- `BunSqliteConvoDb`
- `NodeSqliteConvoDb`
- `BunPostgresConvoDb`
- `HttpConvoDb`
- `LayeredConvoDb`

Example:

```ts
import { InMemoryConvoDb } from '@convo-lang/db';

const db=new InMemoryConvoDb({
    name:'default',
});
```

Layered storage routes paths to different databases:

```ts
import {
    InMemoryConvoDb,
    HttpConvoDb,
    LayeredConvoDb,
} from '@convo-lang/db';

const cacheDb=new InMemoryConvoDb({
    name:'cache',
});

const remoteDb=new HttpConvoDb({
    name:'remote',
    baseUrl:'https://api.example.com/convo-db',
});

const db=new LayeredConvoDb({
    name:'default',
    layers:[
        {
            path:'/cache/*',
            db:cacheDb,
        },
        {
            path:'/shared/*',
            db:remoteDb,
        },
    ],
});
```

---

## CLI

The Convo CLI can query databases, call stored functions, execute commands, and load function files.

Define a database:

```sh
convo --db-map 'default:sqlite:./data/example.db'
```

Query by path:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --query-db 'default:/docs/*'
```

Query with JSON5:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --query-db '{dbName:"default",steps:[{path:"/docs/*"}]}'
```

Call a function:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --call-db-function 'default:/bin/sign-in-email-password' \
    --call-db-function-args '{email:"alex@example.com",password:"correct horse battery staple"}'
```

Load reusable DB functions:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function "default:/bin:node_modules/@convo-lang/db-functions/src/functions/bin/*" \
    --load-db-function-drop-export
```

---

## Common modeling patterns

Use meaningful namespaces:

```txt
/users/alex
/workspaces/acme
/workspaces/acme/docs/spec
/agents/researcher/memory/semantic/product-facts
/tools/web-search
```

Use nodes for:

- structured data
- metadata
- extracted text
- markdown
- source code
- tool definitions

Use blobs for:

- binary media
- original uploaded files
- PDFs
- spreadsheets
- word-processing documents

Use shared paths for blob metadata:

```txt
/uploads/design-mockup
```

where both the node and blob use `/uploads/design-mockup`.

Grant permissions high in the tree:

```txt
/workspaces/acme
```

instead of granting every descendant individually.

Use paths for hierarchy and edges for relationships.

---

## Minimal end-to-end example

```ts
import { InMemoryConvoDb } from '@convo-lang/db';
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';

const db=new InMemoryConvoDb({
    name:'default',
});

await db.insertNodeAsync({
    path:'/users/alex',
    type:'user',
    data:{
        role:'admin',
    },
});

await db.insertNodeAsync({
    path:'/workspaces/acme',
    type:'workspace',
    data:{
        name:'Acme Workspace',
    },
});

await db.insertNodeAsync({
    path:'/workspaces/acme/docs/spec',
    type:'doc',
    data:{
        title:'System Spec',
        body:'Product requirements and architecture notes.',
    },
});

await db.insertEdgeAsync({
    type:'grant',
    from:'/users/alex',
    to:'/workspaces/acme',
    grant:ConvoNodePermissionType.readWrite,
});

const docs=await db.queryNodesAsync({
    steps:[
        {
            path:'/workspaces/acme/docs/*',
        },
    ],
    permissionFrom:'/users/alex',
    permissionRequired:ConvoNodePermissionType.read,
});

if(docs.success){
    console.log(docs.result.nodes);
}
```

---

## Mental model

ConvoDb is best understood as a portable, path-addressed graph database interface for agent applications.

Use:

- **nodes** for data
- **paths** for hierarchy and namespaces
- **edges** for relationships and grants
- **permissions** for identity-scoped access
- **blobs** for binary/source files
- **embeddings** for semantic retrieval
- **stored functions** for executable tools and workflows
- **adapters** for different storage backends

This gives AI systems one consistent model for memory, retrieval, files, permissions, auth, graph traversal, and callable behavior across local, browser, server, and remote environments.
