# @convo-lang/db-functions

Reusable ConvoDb function nodes for Convo-Lang applications.

This package contains database-backed functions that can be loaded into a `ConvoDb` and executed through normal ConvoDb function calls. They are intended to provide common utility behavior for agents, tools, workflows, authentication, and command-style database operations.

## Usage

Functions are usually loaded into a database with the Convo CLI.

```sh
convo \
    --db-map 'default:sqlite:./data/example.db' \
    --load-db-function "default:/bin:node_modules/@convo-lang/db-functions/src/functions/bin/*" \
    --load-db-function-drop-export
```

This loads the package functions into the default database under `/bin`.

## Available functions

The package currently defines the following functions.

| Function | Default path | Effects | Description |
|---|---|---|---|
| `init-auth` | `/bin/init-auth` | `readWrite` | Initializes authentication secrets used for JWT signing and password hashing. |
| `create-user` | `/bin/create-user` | `readWrite` | Creates a user sign-in node under `/usr/{id}` using an email claim and password. |
| `sign-in-email-password` | `/bin/sign-in-email-password` | `readOnly` | Signs in a user by email and password and returns a JWT result node. |

The default paths assume the functions are loaded under `/bin`. If you load them under another namespace, replace `/bin` with your chosen path.

## Authentication functions

### `init-auth`

Initializes the auth secrets node used by the other auth functions.

This function creates or updates the internal auth secrets node with:

- a JWT signing secret
- a password salt

Arguments:

```ts
{
    override?:boolean;
}
```

If `override` is `true`, existing secrets are replaced. Otherwise missing secrets are created and existing values are preserved.

Example:

```ts
const result=await db.callFunctionAsync('/bin/init-auth',{
    override:false,
});

if(result.success){
    console.log(result.result);
}
```

You should run this before using `create-user` or `sign-in-email-password`.

### `create-user`

Creates a new email/password user sign-in record.

The function:

- requires `claims.email`
- rejects duplicate email addresses
- hashes the supplied password
- creates a user node under `/usr/{id}`
- stores sign-in data on the created node
- adds `/usr/{id}` to `identityPaths`

Arguments:

```ts
{
    password:string;
    claims:{
        email:string;
        [key:string]:any;
    };
    identityPaths?:string[];
    [key:string]:any;
}
```

Example:

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

The returned node is the created user sign-in node.

### `sign-in-email-password`

Signs in a user using an email address and password.

The function:

- looks up a `/usr/*` node with `type:'user-sign-in'`
- verifies the password hash
- signs a JWT with the database name included
- returns a result node with `type:'sign-in-jwt'`

Arguments:

```ts
{
    email:string;
    password:string;
}
```

Example:

```ts
const result=await db.callFunctionAsync('/bin/sign-in-email-password',{
    email:'alex@example.com',
    password:'correct horse battery staple',
});

if(result.success){
    console.log(result.result);
}
```

A successful sign-in returns JWT data. Invalid credentials return an authentication error.

## Calling a function

After loading functions into a database, call them through ConvoDb like any other stored function node.

```ts
const result=await db.queryNodesAsync({
    steps:[
        {
            path:'/bin/sign-in-email-password',
            call:{
                args:{
                    email:'alex@example.com',
                    password:'correct horse battery staple',
                },
            },
        },
    ],
});

if(result.success){
    console.log(result.result.nodes);
}
```

For simple value-returning functions, you can also use the convenience helper:

```ts
const value=await db.callFunctionAsync(
    '/bin/sign-in-email-password',
    {
        email:'alex@example.com',
        password:'correct horse battery staple',
    },
);
```

## Function node model

Loaded functions are stored as normal ConvoDb nodes. A function node defines executable behavior using:

```ts
{
    data:{
        isExecutable:true,
        function:{
            format:'javascript',
            effects:'pure',
            argsType:'...',
            main:'...',
        },
    },
}
```

Because functions are normal nodes, they can be:

- queried by path
- organized in namespaces
- connected with edges
- protected with permissions
- executed during query traversal

## Common install location

A common convention is to load utility functions under `/bin`:

```txt
/bin/init-auth
/bin/create-user
/bin/sign-in-email-password
```

Applications can choose any destination path that fits their database layout.

## Development

When adding a new function to this package:

1. Add the function source under `src/functions`.
2. Export or structure it so the Convo CLI loader can discover it.
3. Include an argument schema when the function accepts input.
4. Set the narrowest valid function effect:
    - `pure`
    - `readOnly`
    - `readWrite`
5. Prefer small, composable functions that are useful as agent tools.

## Related documentation

- ConvoDb docs: `../../docs/convo-db.md`
- Convo-Lang package: `@convo-lang/convo-lang`
- Database adapters: `@convo-lang/db`
