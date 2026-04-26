# ConvoDb

ConvoDb is a graph-capable, path-based database interface for building AI agents, tools, memory systems, knowledge stores, workflow engines, authentication flows, and other agentic systems.

It gives you a consistent way to work with:

- **Nodes** for storing entities, documents, tools, users, tasks, memory, and structured data
- **Edges** for relationships, workflows, permissions, and graph traversal
- **Embeddings** for semantic search and retrieval
- **Stored functions** for executing behavior directly from nodes during queries
- **Path-based permissions** for simple but powerful access control
- **Authentication helpers and permission boundaries** for JWT-backed remote access and identity-scoped database proxies
- **Reusable database functions** through `@convo-lang/db-functions`
- **Portable adapters** so the same ConvoDb code can run in memory, in the browser, over HTTP, on the file system, or on SQL backends
- **A driver-backed architecture** that separates high-level ConvoDb behavior from low-level datastore access
- **React hooks** for querying and watching node data from React components using `useConvoDbQuery`, `useConvoNodeAtPath`, and `useConvoNodesAtPath`

Adapters are imported from:

```ts
import { InMemoryConvoDb, BunPostgresConvoDb } from '@convo-lang/db';
```

The `ConvoDb` interface and core types are imported from:

```ts
import {
    ConvoDb,
    ConvoDbAuthManager,
    ConvoDbInstanceMap,
    ConvoDbPermissionBoundary,
} from '@convo-lang/convo-lang';
```

React hooks can be imported from:

```ts
import { useConvoDbQuery, useConvoNodeAtPath, useConvoNodesAtPath } from '@convo-lang/convo-lang-react';
```

---

## Why ConvoDb is useful for AI agents

AI agents usually need more than a plain key-value store.

They often need to:

- store conversations, memory, tasks, and plans
- connect related things together
- search by meaning, not just exact match
- scope access per user, agent, workspace, or tool
- authenticate users or agents and constrain remote database access
- run stored tools or behaviors as part of graph traversal
- move between local, browser, and server storage without changing application logic

ConvoDb is designed for those patterns.

A single system can use it to store:

- **agent memory**
- **tool definitions**
- **user profiles**
- **documents**
- **task graphs**
- **execution history**
- **permissions**
- **vector embeddings**
- **callable functions**
- **authentication records**

---

## Core concepts

### Nodes

A node is the main stored object.

A node has:

- a unique `path`
- a `type`
- arbitrary `data`
- optional metadata like `name`, `description`, and timestamps

Node paths are exact stored paths. They cannot contain wildcard characters.

Example:

```ts
const userNode={
    path:'/users/alex',
    type:'user',
    displayName:'Alex',
    data:{
        email:'alex@example.com',
        tier:'pro',
    },
};
```

You can use nodes for things like:

- users
- agents
- memories
- documents
- tools
- jobs
- tasks
- organizations
- workspaces
- sign-in records

---

### Edges

Edges connect nodes.

They are useful for:

- relationships
- traversal
- workflow links
- permission grants

Edge `from` and `to` values must be exact normalized node paths. They cannot contain wildcard characters.

Example uses:

- user owns workspace
- agent can access tool
- task depends on another task
- memory belongs to session
- user has permission to project subtree

---

### Embeddings

Embeddings let you attach searchable semantic vectors to nodes.

This is especially useful for AI systems that need:

- retrieval-augmented generation
- semantic memory lookup
- document similarity search
- contextual recall

Embeddings point to a node and usually reference a property like `data`.

---

### Stored functions

ConvoDb can also store executable functions on nodes and invoke them during queries.

This is useful for:

- building tool nodes that can be executed by agents
- returning computed results alongside normal graph traversal
- encapsulating reusable behavior inside the database
- mixing static data, relationships, and executable logic in one model
- implementing auth and account flows as database-backed functions

Function execution is covered in more detail near the end of this document.

---

### Authentication and permission boundaries

ConvoDb includes an auth helper, `ConvoDbAuthManager`, on every `ConvoDb` instance.

Auth is intentionally database-backed. The auth manager does not implement sign-in logic directly. Instead, it calls stored database functions such as `/bin/sign-in-email-password`.

A successful sign-in returns a JWT that contains:

- the database name
- a user id
- identity paths the token can act as
- additional claims

For remote APIs, a verified JWT can be converted into a `ConvoDbPermissionBoundary`. A permission boundary wraps a database and forces every call to use a fixed identity path as `permissionFrom`.

This lets public or remote callers use normal ConvoDb APIs while preventing them from spoofing another identity.

---

## ConvoDb and ConvoDbDriver

ConvoDb uses a dedicated `ConvoDbDriver` architecture.

At a high level:

- **`ConvoDb`** is the main application-facing interface
- **`ConvoDbDriver`** is the low-level datastore-facing interface used internally by adapters

This separation makes the system easier to reason about and easier to implement across different backends.

### What `ConvoDb` does

`ConvoDb` handles higher-level behavior such as:

- auth helper access through `auth`
- path normalization and validation
- query orchestration and traversal
- permission checks
- permission boundary creation
- watch and stream behavior
- command execution
- stored function convenience calls
- embedding-related higher-level workflows
- convenience methods like `getNodesByPathAsync` and `getNodeByPathAsync`

### What `ConvoDbDriver` does

`ConvoDbDriver` handles direct communication with the underlying datastore.

That includes low-level operations such as:

- selecting node paths during query execution
- loading nodes by exact path sets
- loading permission edges by path combinations
- inserting, updating, and deleting nodes
- inserting, updating, and deleting edges
- inserting, updating, and deleting embeddings
- direct edge queries
- direct embedding queries

This means adapters can share the same high-level ConvoDb behavior while customizing only the low-level persistence layer.

### Why this is useful

This driver split improves portability and reuse.

For example:

- an in-memory adapter can implement only storage behavior
- a SQLite adapter can focus on SQL execution
- a Postgres adapter can focus on relational persistence
- an HTTP adapter can proxy supported operations cleanly
- shared query traversal, permissions, auth boundaries, and function helpers can stay in one place

In practice, this makes adapter implementations cleaner and keeps application behavior more consistent across backends.

---

## Database names and instance maps

Every `ConvoDb` has a `dbName`.

Database names are used by:

- JWT auth tokens
- HTTP database routes
- CLI database commands
- named database maps
- multi-database applications

```ts
import { InMemoryConvoDb } from '@convo-lang/db';

const db=new InMemoryConvoDb({
    name:'default',
});
```

### `ConvoDbInstanceMap`

`ConvoDbInstanceMap` wraps a `ConvoDbMap` and provides named database lookup.

```ts
import { ConvoDbInstanceMap } from '@convo-lang/convo-lang';
import { getConvoDbMapFromStrings } from '@convo-lang/db/db-map.js';

const mapResult=getConvoDbMapFromStrings([
    'default:sqlite:./data/default.db',
    'cache:mem',
]);

if(!mapResult.success){
    throw new Error(mapResult.error);
}

const dbMap=new ConvoDbInstanceMap(mapResult.result);

const defaultDb=dbMap.getDb('default');
const cacheDb=dbMap.getDb('cache');
```

A `ConvoDbMap` maps names to functions that receive the requested name and return a database:

```ts
type ConvoDbMap=Record<string,(name:string)=>ConvoDb>;
```

If a `'*'` entry exists, it can be used as a fallback factory for unknown database names.

---

## File-system style paths

One of ConvoDb’s most important ideas is that every node has a normalized path that behaves like a file-system path.

Examples:

- `/users/alex`
- `/users/alex/memories/memory-001`
- `/agents/researcher`
- `/workspaces/acme/docs/roadmap`
- `/orgs/acme/projects/p1/tasks/task-42`

This makes your data feel like a structured namespace instead of a flat table.

### Path rules

ConvoDb paths are normalized and follow file-system-like rules:

- paths start with `/`
- trailing slashes are removed except for `/`
- duplicate slashes are normalized
- paths are case-sensitive
- `.` and `..` are not allowed
- stored node paths cannot contain `*`
- edge `from` and `to` paths cannot contain `*`
- query step paths can be exact absolute paths or supported trailing wildcard paths like `/users/*`
- condition values for `like` and `ilike` may use `*` anywhere in the pattern
- wildcard matching is supported in queries like `/users/*`

### Wildcard rules

Wildcards have different rules depending on where they are used.

#### Stored data cannot use wildcards

Do not use `*` in stored identifiers:

```ts
// !INVALID: node paths cannot contain wildcards
await db.insertNodeAsync({
    path:'/users/*',
    type:'user',
    data:{},
});

// !INVALID: edge endpoints cannot contain wildcards
await db.insertEdgeAsync({
    type:'member-of',
    from:'/users/*',
    to:'/workspaces/acme',
});
```

Use exact paths instead:

```ts
await db.insertNodeAsync({
    path:'/users/alex',
    type:'user',
    data:{},
});

await db.insertEdgeAsync({
    type:'member-of',
    from:'/users/alex',
    to:'/workspaces/acme',
});
```

#### Query step paths only support trailing wildcards

The `path` property of `ConvoNodeQueryStep` may be:

- an exact absolute path such as `/users/alex`
- a path ending in one wildcard segment such as `/users/*`

The wildcard may only appear at the end of the path, immediately after a `/`.

Valid query step paths:

```txt
/users/alex
/users/*
/workspaces/acme/docs/*
```

!INVALID query step paths:

```txt
*
/users*
/users/*/profile
/users/**
```

#### `like` and `ilike` condition values can use wildcards anywhere

The only place `*` can be used freely is in the `value` of a condition that uses the `like` or `ilike` operator.

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            condition:{
                target:'path',
                op:'like',
                value:'*/docs/*spec*',
            },
        },
    ],
});
```

This flexible wildcard behavior only applies to `like` and `ilike` condition values. It does not apply to node paths, edge endpoints, or query step paths.

---

## Filesystem-style permissions

Path-based organization makes permissions much easier to reason about.

Instead of building a totally custom ACL system from scratch, you can grant permissions from one node to another node path or subtree ancestor using edges.

### Permission model

Permissions are represented using edges with the `grant` property.

Permission is directional:

```txt
from -> to
```

If you grant access to:

```txt
/workspaces/acme
```

that permission can apply to descendant nodes such as:

```txt
/workspaces/acme/docs/spec
/workspaces/acme/tasks/task-1
/workspaces/acme/agents/researcher
```

So a single permission edge can cover an entire subtree.

This is a lot like file-system permissions or mounted directory access in Unix-style systems.

### Example permission model

- user node: `/users/alex`
- workspace node: `/workspaces/acme`
- document node: `/workspaces/acme/docs/spec`

Grant read/write access from the user to the workspace root, and that grant can be used when checking access to deeper paths.

This makes it easy to express:

- user can read a workspace
- agent can write into a memory subtree
- tool runner can execute against a tool namespace
- tenant-scoped access to a whole branch of data

### Permission types

ConvoDb supports bitwise permissions:

- `read`
- `write`
- `execute`

And combinations like:

- `readWrite`
- `readExecute`
- `writeExecute`
- `all`

### Grant a user read/write access to a workspace

```ts
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';

await db.insertEdgeAsync({
    type:'grant',
    from:'/users/alex',
    to:'/workspaces/acme',
    grant:ConvoNodePermissionType.readWrite,
});
```

### Check permissions directly

```ts
const permission=await db.getNodePermissionAsync(
    '/users/alex',
    '/workspaces/acme/docs/spec',
);

if(permission.success){
    console.log(permission.result);
}
```

### Enforce permissions during reads

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

### Enforce permissions during writes

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

---

## Permission boundaries

`ConvoDbPermissionBoundary` wraps an existing `ConvoDb` and forces all public calls to use a fixed identity path.

Create one through `db.auth.createBoundary(identityPath)`:

```ts
const aliceDb=db.auth.createBoundary('/users/alice');
```

The returned object implements `ConvoDb`, but all calls are scoped to `/users/alice`.

For example, this caller-supplied `permissionFrom` is ignored and replaced by `/users/alice`:

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

### What boundaries protect

A permission boundary:

- overwrites `permissionFrom` on reads and writes
- applies read permission to query steps
- applies execute permission when query steps call functions
- applies write checks for node, edge, and embedding mutations
- prevents external callers from crossing identity boundaries in permission helpers
- rejects raw `driverCmd` commands

This is especially useful for:

- HTTP APIs
- browser clients
- multi-user apps
- agent sandboxes
- tenant-scoped tools

### Bypassing a boundary

`createBoundary` accepts a second argument, `byPass`.

```ts
const scopedDb=db.auth.createBoundary('/users/alice');
const rawDb=db.auth.createBoundary('/users/alice',true);
```

When `byPass` is true, the original database is returned. This should only be used in trusted internal code.

---

## Authentication

ConvoDb auth is based on stored database functions and JWT permission boundaries.

### Auth manager

Every `ConvoDb` exposes:

```ts
db.auth
```

The auth manager stores the current JWT in memory and, when available, local storage.

```ts
const jwt=db.auth.jwt;

db.auth.jwtSubject.subscribe(jwt=>{
    console.log('JWT changed',jwt);
});
```

### Email/password sign-in

If the auth functions from `@convo-lang/db-functions` have been loaded under `/bin`, sign in with:

```ts
const signIn=await db.auth.signInEmailPasswordAsync({
    email:'alex@example.com',
    password:'correct horse battery staple',
});

if(signIn.success){
    console.log(signIn.result.jwt);
}
```

The returned JWT contains:

```ts
{
    id:string;
    dbName:string;
    identityPaths:string[];
    claims:Record<string,any>;
    jwt:string;
}
```

### HTTP auth

`HttpConvoCompletionService` implements `ConvoDb` and uses `db.auth.jwt` automatically.

When a JWT is set, HTTP DB requests include:

```txt
Authorization: Bearer <jwt>
```

On the server, Hono routes verify the JWT, check that the token belongs to the requested database name, pick the first `identityPaths` entry, and wrap the target database in a permission boundary.

### Guest access

If a remote DB request has no valid JWT, the Hono DB routes use a guest token identity:

```txt
/usr/guest
```

Grant permissions to `/usr/guest` if you want unauthenticated callers to access public data.

### Disabling API DB auth

The CLI API server and Hono route setup can disable database auth for trusted environments.

CLI:

```sh
convo \
    --api \
    --db-map 'default:sqlite:./data/example.db' \
    --disable-api-db-auth
```

Programmatic Hono route setup:

```ts
getConvoHonoRoutes({
    dbMap,
    disableDbAuth:true,
});
```

Only disable DB auth for trusted internal servers.

---

## Reusable database functions

The `@convo-lang/db-functions` package contains reusable function nodes for ConvoDb applications.

It currently includes auth-related functions:

| Function | Default path | Effects | Description |
|---|---|---|---|
| `init-auth` | `/bin/init-auth` | `readWrite` | Initializes JWT and password hashing secrets. |
| `create-user` | `/bin/create-user` | `readWrite` | Creates a user sign-in node under `/usr/{id}` using an email claim and password. |
| `sign-in-email-password` | `/bin/sign-in-email-password` | `readOnly` | Signs in a user by email and password and returns a JWT result node. |

### Loading db functions with the CLI

Functions are usually loaded into a database with the Convo CLI.

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function "default:/bin:node_modules/@convo-lang/db-functions/src/functions/bin/*" \
    --load-db-function-drop-export
```

This loads the package functions into the default database under `/bin`.

The load tuple format is:

```txt
dbName:path:source
```

Examples:

```sh
# Load a single function
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function 'default:/bin/my-tool:./functions/my-tool.ts'

# Load all .ts and .js files from a directory, non-recursively
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function 'default:/bin:./functions/*'
```

By default, functions are bundled with:

```sh
bun build "$dbFunctionSrcFilePath"
```

You can customize the bundle command:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function 'default:/bin/my-tool:./functions/my-tool.ts' \
    --db-function-bundle-command 'bun build "$dbFunctionSrcFilePath" --minify'
```

Use `--load-db-function-drop-export` when the generated bundled output ends with exports that should not be included in the stored JavaScript body.

### Initializing auth

Before creating users or signing in, initialize auth secrets:

```ts
const result=await db.callFunctionAsync('/bin/init-auth',{
    override:false,
});

if(result.success){
    console.log(result.result);
}
```

The function creates or updates:

```txt
/secrets/auth-secrets
```

with:

- `data.jwt`
- `data.passwordSalt`

If `override` is true, existing secrets are replaced.

### Creating a user

Create a new email/password sign-in record:

```ts
const result=await db.queryNodesAsync({
    steps:[
        {
            path:'/bin/create-user',
            call:{
                args:{
                    password:'correct horse battery staple',
                    claims:{
                        email:'alex@example.com',
                        name:'Alex',
                    },
                },
            },
        },
    ],
});

if(result.success){
    console.log(result.result.nodes[0]);
}
```

The function:

- requires `claims.email`
- rejects duplicate email addresses
- hashes the supplied password
- creates a user node under `/usr/{id}`
- stores sign-in data on the created node
- adds `/usr/{id}` to `identityPaths`

### Signing in

```ts
const result=await db.callFunctionAsync('/bin/sign-in-email-password',{
    email:'alex@example.com',
    password:'correct horse battery staple',
});

if(result.success){
    console.log(result.result);
}
```

A successful sign-in returns JWT data. Invalid credentials return a 401 result.

---

## Installation and imports

### Core interface and types

```ts
import {
    ConvoDb,
    ConvoDbAuthManager,
    ConvoDbInstanceMap,
    ConvoDbPermissionBoundary,
    ConvoNodePermissionType,
} from '@convo-lang/convo-lang';
```

### Auth schemas and types

```ts
import {
    ConvoEmailPasswordSignRequestSchema,
    ConvoSignInJwtSchema,
    ConvoSignInJwt,
} from '@convo-lang/convo-lang';
```

### Adapters

```ts
import {
    InMemoryConvoDb,
} from '@convo-lang/db';
```

### React hooks

```ts
import {
    useConvoDbQuery,
    useConvoNodeAtPath,
    useConvoNodesAtPath,
} from '@convo-lang/convo-lang-react';
```

---

## Quick start

### Create a database

```ts
import { InMemoryConvoDb } from '@convo-lang/db';

const db=new InMemoryConvoDb({
    name:'default',
});
```

### Insert some nodes

```ts
await db.insertNodeAsync({
    path:'/users/alex',
    type:'user',
    displayName:'Alex',
    data:{
        role:'developer',
    },
});

await db.insertNodeAsync({
    path:'/airports/jfk',
    type:'airport',
    displayName:'JFK Airport',
    data:{
        city:'New York',
    },
});

await db.insertNodeAsync({
    path:'/trips/alex-jfk',
    type:'trip',
    displayName:'Trip to JFK',
    data:{
        status:'planning',
        origin:'/users/alex/home',
        destination:'/airports/jfk',
    },
});
```

### Query nodes by path

Use wildcards only at the end of query step paths.

```ts
const trips=await db.getNodesByPathAsync('/trips/*');

if(trips.success){
    console.log(trips.result.nodes);
}
```

### Get a single node by path

```ts
const trip=await db.getNodeByPathAsync('/trips/alex-jfk');

if(trip.success){
    console.log(trip.result);
}
```

---

## Common use cases for agentic systems

### 1. Agent memory

Store short-term and long-term memory by path:

```txt
/agents/researcher/memory/working/task-1
/agents/researcher/memory/episodic/2026-01-10
/agents/researcher/memory/semantic/product-facts
```

Benefits:

- easy namespace separation
- simple cleanup by subtree
- permission scoping per agent

---

### 2. Multi-tenant AI workspaces

Organize each tenant under a root path:

```txt
/tenants/acme
/tenants/acme/users/alex
/tenants/acme/docs/handbook
/tenants/acme/agents/support-bot
```

Grant a user or agent access at `/tenants/acme` and let that flow down the subtree.

---

### 3. Tool registries

Store tool definitions as nodes:

```txt
/tools/web-search
/tools/calculator
/tools/sql-query
```

Then connect agents to allowed tools with edges.

---

### 4. Workflow and task graphs

Represent tasks and dependencies with nodes and edges:

```txt
/workflows/onboarding
/workflows/onboarding/tasks/create-account
/workflows/onboarding/tasks/send-email
```

Use edges to model:

- depends on
- blocks
- completes
- owned by

---

### 5. RAG and semantic retrieval

Store documents and embeddings:

```txt
/docs/product/overview
/docs/product/faq
/docs/product/pricing
```

Create embeddings for each document node and query semantically.

---

### 6. Conversation and session state

```txt
/sessions/session-001
/sessions/session-001/messages/msg-1
/sessions/session-001/messages/msg-2
/sessions/session-001/summary
```

Useful for:

- chat agents
- orchestrators
- copilots
- long-running workflows

---

### 7. Auth-backed applications

```txt
/usr/{id}
/secrets/auth-secrets
/bin/init-auth
/bin/create-user
/bin/sign-in-email-password
```

Useful for:

- browser clients
- authenticated HTTP APIs
- multi-user dashboards
- tenant-aware agent systems

---

## Working with nodes

### Insert a node

Node paths must be exact normalized paths and cannot contain wildcards.

```ts
await db.insertNodeAsync({
    path:'/agents/researcher',
    type:'agent',
    displayName:'Research Agent',
    data:{
        model:'gpt-style-model',
        goal:'Find and summarize information',
    },
});
```

### Update a node

`data` is replaced as a whole when updated by default.

```ts
await db.updateNodeAsync({
    path:'/agents/researcher',
    displayName:'Research Agent v2',
    data:{
        model:'gpt-style-model',
        goal:'Find, rank, and summarize information',
    },
});
```

You can request shallow merge behavior through update options:

```ts
await db.updateNodeAsync(
    {
        path:'/agents/researcher',
        data:{
            status:'active',
        },
    },
    {
        mergeData:true,
    },
);
```

### Delete a node

Deleting a node also deletes:

- connected edges
- embeddings pointing to the node

```ts
await db.deleteNodeAsync('/agents/researcher');
```

### Get one node by exact path

```ts
const agent=await db.getNodeByPathAsync('/agents/researcher');

if(agent.success){
    console.log(agent.result);
}
```

---

## Querying nodes

ConvoDb supports traversal-based queries.

A query is made of one or more `steps`. Each step can filter nodes and optionally traverse edges to move to connected nodes.

The `path` property of a query step may be either an exact absolute path or a path ending with a wildcard. The wildcard may only appear at the end of the query step path.

### Simple path query

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/users/*',
        },
    ],
});
```

### Exact path query

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/users/alex',
        },
    ],
});
```

### Invalid path wildcard query

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            // !INVALID: wildcard is not at the end of the path
            path:'/users/*/profile',
        },
    ],
});
```

### Query by condition

```ts
const r=await db.queryNodesAsync({
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

### Query with ordering

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

### Return only selected keys

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

### Pagination

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

---

## Conditions

Conditions can target top-level properties or nested properties in `data`.

Example:

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

Supported operator categories include:

- equality and comparison: `=`, `!=`, `>`, `<`, `>=`, `<=`
- array operators: `in`, `all-in`, `any-in`, `contains`, `contains-all`, `contains-any`
- wildcard string operators: `like`, `ilike`

### Wildcards in `like` and `ilike`

When a condition uses `like` or `ilike`, the condition `value` may contain `*` anywhere in the string.

This is the only place where ConvoDb wildcards can be used freely in the middle of a string.

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

This wildcard behavior does not apply to:

- `ConvoNode.path`
- `ConvoNodeEdge.from`
- `ConvoNodeEdge.to`
- `ConvoNodeQueryStep.path`

### Grouped conditions

```ts
const r=await db.queryNodesAsync({
    steps:[
        {
            path:'/tasks/*',
            condition:{
                groupOp:'and',
                conditions:[
                    {
                        target:'data.status',
                        op:'=',
                        value:'open',
                    },
                    {
                        target:'data.priority',
                        op:'>=',
                        value:3,
                    },
                ],
            },
        },
    ],
});
```

---

## Traversing relationships with edges

Edges turn ConvoDb into a graph-aware database.

Edge endpoints are stored as exact paths. Do not use wildcards in `from` or `to`.

### Insert an edge

```ts
await db.insertEdgeAsync({
    type:'uses-tool',
    from:'/agents/researcher',
    to:'/tools/web-search',
    description:'Research agent can use web search',
});
```

### Query edges directly

```ts
const edgeResult=await db.queryEdgesAsync({
    from:'/agents/researcher',
    type:'uses-tool',
});
```

### Traverse from one node to connected nodes

Start from an agent and move to its tools:

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

### Reverse traversal

Find agents that can use a tool:

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

### Multi-step traversal

From a user to their workspace to its documents:

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

Permissions are represented using edges with the `grant` property.

Permission edges also use exact paths for `from` and `to`. A permission grant to `/workspaces/acme` can apply to descendants when checking permission, but the stored edge still points to the exact path `/workspaces/acme`, not `/workspaces/acme/*`.

### Grant a user read/write access to a workspace

```ts
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';

await db.insertEdgeAsync({
    type:'grant',
    from:'/users/alex',
    to:'/workspaces/acme',
    grant:ConvoNodePermissionType.readWrite,
});
```

### Check permissions directly

```ts
const permission=await db.getNodePermissionAsync(
    '/users/alex',
    '/workspaces/acme/docs/spec',
);

if(permission.success){
    console.log(permission.result);
}
```

### Enforce permissions during reads

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

### Enforce permissions during writes

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

### Why path-based permissions are easier

With path roots, you usually grant at a meaningful boundary:

- `/tenants/acme`
- `/workspaces/acme`
- `/agents/researcher/memory`
- `/tools`

That means fewer permission records and simpler reasoning.

Instead of granting access document-by-document, you can often grant once at the subtree root.

---

## Embeddings and semantic search

Embeddings attach vector-searchable representations to nodes.

### Insert a document node

```ts
await db.insertNodeAsync({
    path:'/docs/faq/refunds',
    type:'doc',
    data:{
        title:'Refund Policy',
        body:'Customers may request a refund within 30 days...',
    },
});
```

### Insert an embedding

```ts
await db.insertEmbeddingAsync({
    path:'/docs/faq/refunds',
    prop:'data.body',
    type:'text',
});
```

### Query embeddings directly

```ts
const embeddings=await db.queryEmbeddingsAsync({
    path:'/docs/faq/refunds',
});
```

### Semantic node lookup in a query step

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

### Embedding instructions

Embeddings can include instructions describing how to transform source data before generating the vector.

This is useful when you want to:

- combine title and body
- summarize a large object
- embed only selected fields
- normalize noisy content before indexing

---

## Streaming query results

For larger scans, stream nodes instead of loading them all at once.

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

Useful for:

- long-running ingestion
- batch processing
- agent maintenance jobs
- offline indexing
- migration tasks
- live UI updates

---

## React hooks

ConvoDb includes React hooks for querying node data from components without manually managing async loading, pagination, and live watch state.

They can be imported from:

```ts
import { useConvoDbQuery, useConvoNodeAtPath, useConvoNodesAtPath } from '@convo-lang/convo-lang-react';
```

These hooks are useful for:

- loading nodes directly into React components
- subscribing to live changes using query watch mode
- building searchable lists
- rendering path-based views
- handling paginated query flows

### `useConvoDbQuery`

`useConvoDbQuery` executes a `ConvoNodeQuery` and returns React state describing loading, error, loaded, or streaming status.

Signature:

```ts
useConvoDbQuery(query,options)
```

#### Query argument

The first argument is a `ConvoNodeQuery` or `null` / `undefined`.

If the query is `null` or `undefined`, the hook can be disabled automatically.

Example query shape:

```ts
{
    keys:['path','type','data'],
    steps:[
        {
            path:'/docs/*',
        },
    ],
    watch:true,
}
```

#### `UseConvoDbOptions`

The second argument is an optional options object with the following properties:

- `disabled?:boolean`
    - Disables or pauses the query
    - Defaults to `true` when no query is provided
- `refresh?:number`
    - Changing this value forces the hook to rerun the query
- `db?:ConvoDb`
    - Explicit database instance to use
    - If omitted, the configured instance from `convoDbService` is used
- `stream?:boolean`
    - If `true`, results are returned incrementally as chunks are received
    - Automatically enabled when `watch` is true
- `watch?:boolean`
    - Provides a default `watch` value for the query paired with the hook
    - If enabled, the hook can continue receiving live updates
- `debounceMs?:number`
    - Debounce delay in milliseconds before starting the query
    - Useful for user-driven input such as search fields
- `type?:string`
    - Adds a node `type` filter when used with path hooks such as `useConvoNodeAtPath` and `useConvoNodesAtPath`
    - Useful when a path or wildcard path may contain multiple node types
- `condition?:ConvoNodeCondition`
    - Adds a node condition filter when used with path hooks such as `useConvoNodeAtPath` and `useConvoNodesAtPath`
    - Useful for filtering by top-level properties or nested `data` properties without writing a full `ConvoNodeQuery`

#### Returned state

The hook returns a discriminated union with shared properties and state-specific properties.

Shared properties:

- `nodes`
    - All currently selected nodes
- `node`
    - First node in `nodes`
- `lastNode`
    - Last node in `nodes`
- `query`
    - The query currently being used
- `watch`
    - Indicates whether watch mode is enabled

Possible `state` values:

- `disabled`
- `loading`
- `loaded`
- `streaming`
- `error`

Additional state-specific fields include:

- `db`
    - Present when a database is available
- `result`
    - Present in the `loaded` state and contains the raw `ConvoNodeQueryResult`
- `next()`
    - Present in `loaded` and `streaming` states and can be used to request the next page or next batch cycle
- `watchingChanges`
    - Present in the `streaming` state and becomes `true` once the initial stream finishes and live watching begins
- `error`
    - Present in the `error` state
- `statusCode`
    - Present in the `error` state

#### Example using `useConvoDbQuery`

```tsx
import { useConvoDbQuery } from '@convo-lang/convo-lang-react';

export function ProUsersList()
{

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
        orderBy:{
            prop:'path',
            direction:'asc',
        },
    });

    if(result.state==='disabled' || result.state==='loading'){
        return <div>Loading users...</div>;
    }

    if(result.state==='error'){
        return <div>Error: {result.error}</div>;
    }

    return (
        <div>
            <h3>Pro Users</h3>
            <ul>
                {result.nodes.map(node=>(
                    <li key={node.path}>
                        {node.path}
                    </li>
                ))}
            </ul>

            {(result.state==='loaded' && result.result.nextToken) && (
                <button onClick={result.next}>
                    Load more
                </button>
            )}
        </div>
    );
}
```

### `useConvoNodeAtPath` and `useConvoNodesAtPath`

`useConvoNodeAtPath` and `useConvoNodesAtPath` are convenience hooks for path-based lookup.

They are useful when you want to select nodes by exact path or wildcard path without writing the full `ConvoNodeQuery` object yourself.

Conceptually, `useConvoNodesAtPath(path,options)` is shorthand for:

```ts
useConvoDbQuery({steps:[{path}]},options)
```

`useConvoNodeAtPath` follows the same path-based pattern but is intended for reading a single node.

Signatures:

```ts
useConvoNodeAtPath(path,options)
useConvoNodesAtPath(path,options)
```

#### Arguments

- `path:string`
    - Exact normalized path or a supported ending wildcard path such as `/docs/*`
    - Wildcards may only appear at the end of the path
- `options?:UseConvoDbOptions`
    - The same options supported by `useConvoDbQuery`
    - `type` and `condition` are especially useful with path hooks because they add common filtering without requiring a full query object

Prefer `useConvoNodeAtPath` or `useConvoNodesAtPath` with `type` and `condition` when you only need path-based lookup plus simple filtering. Reach for `useConvoDbQuery` when you need the full query model, such as multi-step traversal, edge traversal, embeddings, ordering, permissions, or custom selected keys.

#### Example using `useConvoNodeAtPath` with `type`

```tsx
import { useConvoNodeAtPath } from '@convo-lang/convo-lang-react';

export function UserProfile()
{
    const result=useConvoNodeAtPath('/users/*',{
        type:'subscriber',
    });

    if(result.state==='disabled' || result.state==='loading'){
        return <div>Loading user...</div>;
    }

    if(result.state==='error'){
        return <div>Error: {result.error}</div>;
    }

    if(!result.node){
        return <div>User not found or not subscribe</div>;
    }

    return (
        <div>
            <h3>{result.node.displayName??result.node.path}</h3>
            <pre>{JSON.stringify(result.node.data,null,4)}</pre>
        </div>
    );
}
```

#### Example using `useConvoNodesAtPath` with `type` and `condition`

```tsx
import { useConvoNodesAtPath } from '@convo-lang/convo-lang-react';

export function OpenTasksList()
{
    const result=useConvoNodesAtPath('/workspaces/acme/tasks/*',{
        type:'task',
        condition:{
            target:'data.status',
            op:'=',
            value:'open',
        },
        watch:true,
        stream:true,
    });

    if(result.state==='disabled' || result.state==='loading'){
        return <div>Loading tasks...</div>;
    }

    if(result.state==='error'){
        return <div>Error: {result.error}</div>;
    }

    return (
        <div>
            <h3>Open Tasks</h3>

            {result.state==='streaming' && !result.watchingChanges && (
                <div>Streaming initial results...</div>
            )}

            {result.state==='streaming' && result.watchingChanges && (
                <div>Watching for changes...</div>
            )}

            <ul>
                {result.nodes.map(node=>(
                    <li key={node.path}>
                        {node.displayName??node.path}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

### When to use each hook

Use `useConvoDbQuery` when:

- you need full query control
- you want conditions, traversal, ordering, permissions, or embeddings
- you want selected keys or multi-step queries

Use `useConvoNodeAtPath` when:

- you need one exact-path node
- you want a concise hook call for detail views
- you want to guard the lookup by `type`
- you want a simple `condition` without writing a full query

Use `useConvoNodesAtPath` when:

- you only need exact-path or wildcard-path lookup
- you want the shortest and clearest hook call for path-based lists
- you want to filter by `type` or a single `condition`
- you do not need the full capabilities of `useConvoDbQuery`

---

## Command-based execution

ConvoDb also supports command objects, which can be useful when:

- sending DB instructions over HTTP
- building agent tools around structured actions
- serializing operations
- proxying remote databases

Commands target the `ConvoDb` interface, and supported low-level driver calls can also be proxied when needed by adapters such as HTTP-backed implementations.

When commands pass through a permission boundary, the boundary applies the caller identity and rejects `driverCmd`.

### Execute one command

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

### Execute multiple commands

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

This pattern is especially useful for remote and tool-driven agent architectures.

---

## CLI database operations

The Convo CLI can work directly with ConvoDb instances defined by `--db-map`.

*note - query objects passed to the CLI are parsed using the JSON5 syntax which is a relaxed version of JSON*

### Define databases

```sh
convo --db-map 'default:sqlite:./data/example.db'
```

Multiple mappings can be passed:

```sh
convo \
    --db-map 'default:sqlite:./data/default.db' \
    --db-map 'cache:mem'
```

### Query a database

Short path form:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --query-db 'default:/docs/*'
```

JSON query form:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --query-db '{dbName:"default",steps:[{path:"/docs/*"}]}'
```

The CLI follows `nextToken` and prints all returned nodes.

### Call a database function

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --call-db-function 'default:/bin/sign-in-email-password' \
    --call-db-function-args '{email:"alex@example.com",password:"correct horse battery staple"}'
```

### Execute database commands

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --execute-db-commands '{dbName:"default",commands:[{queryNodes:{query:{steps:[{path:"/docs/*"}]}}}]}'
```

### Output formatting

Use `--json-format` to control `JSON.stringify` indentation:

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --query-db 'default:/docs/*' \
    --json-format 2
```

---

## Adapters

A major benefit of ConvoDb is that your application can target the `ConvoDb` interface while storage is handled by interchangeable adapters.

This means your agent logic can stay mostly the same while storage changes depending on environment or scale.

Adapters are imported from:

```ts
import {
    BaseConvoDb,
    InMemoryConvoDb,
    LocalStorageConvoDb,
    HttpConvoDb,
} from '@convo-lang/db';
```

### Why adapters matter

Different agent systems need different storage setups:

- local prototyping
- browser-only apps
- persistent desktop apps
- server-backed APIs
- SQL production systems
- layered hybrid systems

With adapters, you can switch storage without redesigning your domain model.

Because adapters build on a dedicated `ConvoDbDriver`, high-level behavior can stay shared while low-level persistence stays backend-specific.

---

## Current adapters

### `BaseConvoDb`

A base adapter that simplifies building new adapters.

Use this when you want to implement a custom backend while reusing the shared traversal, permissions, validation, command execution, streaming, auth manager, and embedding behavior.

Best for:

- custom storage engines
- internal platform adapters
- adapting proprietary databases

---

### `InMemoryConvoDb`

Stores everything in memory.

Its in-memory persistence is implemented behind the shared ConvoDb/ConvoDbDriver split.

Best for:

- testing
- unit tests
- demos
- prototypes
- ephemeral agent runs

---

### `BaseSqliteConvoDb`

An abstract SQLite adapter that makes it easier to create SQLite-based adapters by delegating low-level sqlite operations through the driver-backed architecture.

Best for:

- embedded apps
- desktop tools
- local dev environments
- lightweight persistent stores

---

### `BunSqliteConvoDb`

A SQLite adapter using Bun’s SQLite implementation.

Best for:

- Bun-based apps
- local persistence
- fast dev setups

---

### `BasePostgresConvoDb`

An abstract Postgres adapter that makes it easier to create Postgres adapters by only implementing a query function.

Best for:

- server backends
- production APIs
- scalable relational persistence

---

### `BunPostgresConvoDb`

A Postgres adapter using Bun’s Postgres implementation.

Best for:

- Bun servers
- cloud-hosted APIs
- multi-user production systems

---

### `HttpConvoCompletionService` (An HTTP database proxy)

HTTP-backed database access can proxy normal ConvoDb calls to a remote server.

Best for:

- client/server architectures
- browser apps
- remote agent workers
- service boundaries
- centralized data access

---

### `LocalStorageConvoDb`

Stores data in browser local storage.

Best for:

- small browser apps
- local demos
- offline-capable prototypes
- simple single-user tools

---

### `IndexDbConvoDb`

Stores data in IndexedDB in the browser.

Best for:

- larger browser datasets
- offline-first apps
- local AI assistants
- client-side memory stores

---

### `FsConvoDb`

Uses the local file system for storage.

Best for:

- developer tools
- CLI workflows
- local-first systems
- inspectable data layouts

---

### `LayeredConvoDb`

Lets you layer multiple adapters together and route requests based on path rules.

This works similarly to Unix file-system mounts.

For example:

- `/cache/*` in memory
- `/browser/*` in IndexedDB
- `/shared/*` over HTTP
- `/archive/*` on disk

Best for:

- hybrid storage architectures
- caching layers
- multi-environment apps
- path-routed storage strategies

---

## Example adapter usage patterns

### Local prototype

```ts
import { InMemoryConvoDb } from '@convo-lang/db';

const db=new InMemoryConvoDb({
    name:'default',
});
```

### Browser app

```ts
import { IndexDbConvoDb } from '@convo-lang/db';

const db=new IndexDbConvoDb({
    name:'browser',
});
```

### Remote API client

```ts
import { HttpConvoCompletionService } from '@convo-lang/convo-lang';

const db=new HttpConvoCompletionService({
    endpoint:'https://api.example.com/convo-lang',
    dbName:'default',
});
```

### Hybrid layered storage

Use fast local storage for temporary memory and remote storage for shared data.

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
            path:'/agents/*',
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

## How ConvoDb helps build agent systems

### Memory architecture

Use path namespaces to separate memory types:

```txt
/agents/planner/memory/working
/agents/planner/memory/episodic
/agents/planner/memory/semantic
```

### Tool access control

Grant tools by path and edge relationships:

```txt
/tools/web-search
/tools/code-runner
/tools/calendar
```

### Multi-agent coordination

Store agents under:

```txt
/agents/researcher
/agents/planner
/agents/executor
```

Use edges to model:

- delegates-to
- depends-on
- reports-to
- uses-tool

### Human + agent collaboration

Put users and agents into the same graph:

```txt
/users/alex
/agents/support
/workspaces/acme
```

Then connect them with edges and shared path permissions.

---

## Recommended modeling patterns

### Use paths as stable namespaces

Good:

```txt
/users/alex
/users/alex/preferences
/users/alex/memory/profile
```

Less ideal:

```txt
/item-1
/item-2
/item-3
```

Hierarchical paths make reasoning, querying, and permissions much easier.

Do not use wildcard characters in stored paths. Wildcards are for query step path suffixes and `like` / `ilike` condition values only.

### Keep `type` meaningful

Examples:

- `user`
- `agent`
- `doc`
- `task`
- `workspace`
- `memory`
- `tool`

### Store domain data in `data`

Use top-level fields for cross-cutting metadata and `data` for application content.

### Grant permissions high in the tree when appropriate

Prefer granting at:

```txt
/workspaces/acme
```

instead of individually at:

```txt
/workspaces/acme/docs/doc-1
/workspaces/acme/docs/doc-2
/workspaces/acme/docs/doc-3
```

Do not grant to wildcard paths like `/workspaces/acme/*`. Permission edges should point to exact paths, and descendant checks are handled by ConvoDb permission evaluation.

### Use edges for relationships, not only nesting

Paths model hierarchy.
Edges model relationships.

You often want both.

Example:

- path says a task lives under a workflow
- edge says it depends on another task


---

## Stored function execution

ConvoDb can execute functions stored inside nodes as part of a query.

This allows you to treat nodes not only as data records, but also as callable tools or behaviors that participate in graph traversal.

At a high level:

- a function is stored in `node.data.function`
- the node must also set `node.data.isExecutable=true`
- queries can select one or more function nodes and execute them with a `call` step
- functions can emit returned nodes, computed values, or streamed results

This is especially useful for:

- tool nodes used by agents
- workflow actions stored in the graph
- dynamic result generation during traversal
- mixing static graph structure with executable behavior
- reusable auth and utility functions

### How function calling fits into queries

Function execution is part of the normal query step flow.

A query step may include `call` to execute the currently selected nodes as functions.

Conceptually, the step flow is:

1. filter nodes by path
2. filter by condition
3. apply step permissions
4. apply embedding filtering
5. execute functions with `call`
6. traverse edges if `edge` is also defined

That means function execution can happen in the middle of a larger traversal pipeline.

Example shape:

```ts
const result=await db.queryNodesAsync({
    steps:[
        {
            path:'/tools/weather',
            call:{
                args:{
                    city:'Seattle',
                },
            },
        },
    ],
});
```

### Function call convenience APIs

`ConvoDb` includes helper methods for common function call patterns.

```ts
const value=await db.callFunctionAsync('/tools/echo',{
    message:'hello',
});
```

Available helpers:

```ts
db.callFunctionAsync(path,args,permissionFrom?)
db.callFunctionReturnValueAsync(path,args,permissionFrom?)
db.callFunctionReturnNodeAsync(path,args,permissionFrom?)
db.callFunctionWithSchemaAsync(inputSchema,outputSchema,path,args,permissionFrom?)
```

Use `queryNodesAsync` directly when a function can return multiple nodes or stream results.

### Schema-validated function calls

`callFunctionWithSchemaAsync` validates input and output with Zod schemas.

```ts
import { z } from 'zod';

const result=await db.callFunctionWithSchemaAsync(
    z.object({
        a:z.number(),
        b:z.number(),
    }),
    z.object({
        value:z.number(),
    }),
    '/tools/add',
    {
        a:2,
        b:3,
    },
);
```

### Defining a function node

A callable function is stored on a normal node.

Example:

```ts
await db.insertNodeAsync({
    path:'/tools/echo',
    type:'tool',
    data:{
        isExecutable:true,
        function:{
            format:'javascript',
            effects:'pure',
            main:`
                const handler=(args)=>{
                    return {
                        echoed:args.message,
                    };
                };
            `,
        },
    },
});
```

The node still behaves like a normal node in ConvoDb, which means you can:

- query it by path
- relate it with edges
- protect it with permissions
- organize it under namespaces such as `/tools/*`

### Supported function formats

ConvoDb supports several function formats:

- `convo`
    - function logic written in Convo-Lang
- `javascript` or `js`
    - function logic written as JavaScript source
- `uri`
    - a referenced function resolved by the runtime

This allows a database to mix inline scripted behavior with externally provided implementations.

### Function effects

Functions declare their expected effect level using `effects`.

Available effect levels are:

- `pure`
    - no database or external side effects
- `readOnly`
    - may read but not write
- `readWrite`
    - may read and write

These effect declarations help communicate intended behavior and can be used by runtimes and tools to reason about safety.

### Passing arguments

Arguments are passed through the query step’s `call.args` property.

Example:

```ts
const result=await db.queryNodesAsync({
    steps:[
        {
            path:'/tools/echo',
            call:{
                args:{
                    message:'hello',
                },
            },
        },
    ],
});
```

Functions can also define an `argsType` schema so inputs can be validated before execution.

At a high level, this gives you a way to describe expected function arguments directly on the stored function definition.

### Return behavior

Functions can return data as nodes.

A common pattern is to return a value that gets wrapped as a result node with:

- `path:'/null'`
- `type:'function-result'`
- `data.value` containing the returned value

Functions may also return:

- one node
- multiple nodes
- a stream of nodes

This makes function execution fit naturally into ConvoDb’s node-oriented query model.

### JavaScript function handlers

For JavaScript functions, ConvoDb supports several high-level handler styles.

Common entry points include:

- `handler`
    - returns a plain value that becomes a result node
- `nodeHandler`
    - returns one node or multiple nodes
- `resultHandler`
    - returns a result object so the function can control success and failure
- `streamHandler`
    - returns an async stream of nodes

This gives JavaScript-backed tools flexibility depending on whether they want to behave like a simple function, a node generator, or a streaming producer.

### Convo functions

Functions stored with `format:'convo'` are written in Convo-Lang.

These can be useful when you want to keep agent-oriented logic in the same language ecosystem as conversations and prompts.

At a high level, Convo functions can produce a return value or a response that is converted into a function result node.

### URI functions

Functions stored with `format:'uri'` allow the actual implementation to live outside the database.

This is useful when:

- implementations are provided by plugins
- sensitive logic should not be stored inline
- you want stable references to runtime-registered tools

### Streaming function results

Stored functions can also stream nodes over time.

This is useful for:

- incremental tool output
- long-running tasks
- chunked generation
- agent workflows that want to emit progress-like results

Because function execution integrates with query streaming, the caller can consume results as they are produced.

### Permissions and execution

Function nodes still participate in ConvoDb permission checks.

In practice, execution is typically controlled using execute permissions, allowing you to model which users, agents, or other nodes are allowed to run which stored tools.

When using permission boundaries, query steps with `call` require execute permission for the boundary identity.

This makes it possible to build:

- per-agent tool access
- per-user callable workflows
- tenant-scoped execution boundaries

### Example: tool stored as a node

```ts
await db.insertNodeAsync({
    path:'/tools/add',
    type:'tool',
    data:{
        isExecutable:true,
        function:{
            format:'javascript',
            effects:'pure',
            argsType:`
                struct(
                    a:number
                    b:number
                )
            `,
            main:`
                const handler=(args)=>{
                    return args.a+args.b;
                };
            `,
        },
    },
});

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

if(r.success){
    console.log(r.result.nodes);
}
```

### Example: call during traversal

Because `call` is a query step feature, it can be mixed with graph traversal.

For example, you could:

- start at an agent node
- traverse to allowed tool nodes
- execute a selected tool
- continue traversal through related result or workflow nodes

This is one of the features that makes ConvoDb useful for agentic systems where data, permissions, auth, and behavior all live in the same graph-oriented model.

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
        body:'This workspace contains product requirements and architecture notes.',
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

## Minimal auth setup example

This example assumes `@convo-lang/db-functions` has been loaded under `/bin`.

```ts
import { InMemoryConvoDb } from '@convo-lang/db';
import { ConvoNodePermissionType } from '@convo-lang/convo-lang';

const db=new InMemoryConvoDb({
    name:'default',
});

await db.callFunctionAsync('/bin/init-auth',{
    override:false,
});

const created=await db.callFunctionReturnNodeAsync('/bin/create-user',{
    password:'correct horse battery staple',
    claims:{
        email:'alex@example.com',
        name:'Alex',
    },
});

if(!created.success){
    throw new Error(created.error);
}

const signIn=await db.auth.signInEmailPasswordAsync({
    email:'alex@example.com',
    password:'correct horse battery staple',
});

if(!signIn.success){
    throw new Error(signIn.error);
}

const userPath=signIn.result.identityPaths[0];

await db.insertNodeAsync({
    path:'/docs/public',
    type:'doc',
    data:{
        title:'Public doc',
    },
});

await db.insertEdgeAsync({
    type:'grant',
    from:userPath,
    to:'/docs/public',
    grant:ConvoNodePermissionType.read,
});

const userDb=db.auth.createBoundary(userPath);

const docs=await userDb.queryNodesAsync({
    steps:[
        {
            path:'/docs/*',
        },
    ],
});

if(docs.success){
    console.log(docs.result.nodes);
}
```

---

## Summary

ConvoDb is a strong fit for developers building:

- AI agents
- agent memory systems
- RAG pipelines
- workflow engines
- multi-tenant AI apps
- browser-based copilots
- local-first AI tools
- graph-shaped knowledge systems
- authenticated agent tools and remote database APIs

Its biggest strengths are:

- **path-based organization**
- **filesystem-style permission modeling**
- **permission boundaries for identity-scoped access**
- **JWT auth helper integration**
- **graph traversal with edges**
- **semantic retrieval through embeddings**
- **stored function execution**
- **reusable database functions**
- **portable storage through adapters**
- **shared high-level behavior with backend-specific drivers**
- **React integration through query hooks**
- **CLI support for loading functions, querying DBs, calling functions, and executing commands**

If you build agentic systems that need structure, memory, retrieval, access control, authentication, and callable behavior, ConvoDb gives you one model that can span local, browser, server, and remote environments.

---

## Imports recap

```ts
import {
    ConvoDb,
    ConvoDbAuthManager,
    ConvoDbInstanceMap,
    ConvoDbPermissionBoundary,
    ConvoEmailPasswordSignRequestSchema,
    ConvoNodePermissionType,
    ConvoSignInJwt,
    ConvoSignInJwtSchema,
} from '@convo-lang/convo-lang';

import {
    useConvoDbQuery,
    useConvoNodeAtPath,
    useConvoNodesAtPath,
} from '@convo-lang/convo-lang-react';

import {
    BaseConvoDb,
    InMemoryConvoDb,
    BaseSqliteConvoDb,
    BunSqliteConvoDb,
    BasePostgresConvoDb,
    BunPostgresConvoDb,
    HttpConvoDb,
    LocalStorageConvoDb,
    IndexDbConvoDb,
    FsConvoDb,
    LayeredConvoDb,
} from '@convo-lang/db';
```
