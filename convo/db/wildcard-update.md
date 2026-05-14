# Wildcard Query Path Update Guide

ConvoDb query step paths now use unix-glob-like wildcard behavior.

This change only affects the `path` property of `ConvoNodeQueryStep` and helper methods that internally query by path, such as `getNodesByPathAsync`.

Stored node paths and all other path fields remain literal normalized paths and must not contain wildcards.

## What changed

### Previous behavior

Previously, `*` was recursive when used in query paths.

``` txt
/users/*
```

matched:

``` txt
/users/a
/users/a/b
/users/a/b/c
```

### New behavior

`*` is now non-recursive and only matches within a single path segment.

``` txt
/users/*
```

matches:

``` txt
/users/a
/users/b
```

but does not match:

``` txt
/users/a/b
```

A new recursive wildcard, `**`, has been added.

``` txt
/users/**
```

matches:

``` txt
/users
/users/a
/users/a/b
/users/a/b/c
```

## Wildcard rules

Query path globs follow these rules:

- Matching is case-sensitive
- Matching is against the full normalized node path
- `*` matches zero or more characters within a single path segment
- `*` does not match `/`
- `**` matches zero or more complete path segments
- `**` may span `/`
- `*` and `**` are the only supported wildcard tokens
- Wildcard tokens cannot be escaped
- `.` and `..` path segments are not allowed
- Duplicate slashes are normalized to a single slash
- Trailing slashes are removed during normalization except for `/`

## Migration table

| Old query path | Old meaning | New equivalent |
| --- | --- | --- |
| `/users/*` | All descendants under `/users` | `/users/**` |
| `/docs/*` | All descendants under `/docs` | `/docs/**` |
| `/a/b/*` | All descendants under `/a/b` | `/a/b/**` |
| `/users/*/posts` | Not previously supported as a segment glob | `/users/*/posts` |
| `/users/*/posts/*` | Not previously supported as a segment glob | `/users/*/posts/*` |
| `/users/**/posts/*` | Not previously supported | `/users/**/posts/*` |

## Common updates

### Recursive descendant queries

If your existing query was intended to match all descendants recursively, replace the trailing `*` with `**`.

Before:

``` ts
await db.queryNodesAsync({
    steps:[
        {path:'/users/*'}
    ]
});
```

After:

``` ts
await db.queryNodesAsync({
    steps:[
        {path:'/users/**'}
    ]
});
```

### Direct child queries

If your query should only match direct children, keep using `*`.

``` ts
await db.queryNodesAsync({
    steps:[
        {path:'/users/*'}
    ]
});
```

This now matches direct children only:

``` txt
/users/alice
/users/bob
```

It no longer matches nested descendants:

``` txt
/users/alice/profile
/users/bob/settings/theme
```

### Matching a recursive subtree including the base node

Use `**` when the base node should also match.

``` ts
await db.queryNodesAsync({
    steps:[
        {path:'/users/**'}
    ]
});
```

This matches:

``` txt
/users
/users/alice
/users/alice/profile
```

### Matching nested structures

`**` can be used in the middle of a path.

``` ts
await db.queryNodesAsync({
    steps:[
        {path:'/users/**/posts/*'}
    ]
});
```

This matches:

``` txt
/users/posts/1
/users/alice/posts/1
/users/alice/archive/posts/1
```

## What to search for

Review query step paths that use `*`, especially trailing wildcards.

Look for patterns like:

``` txt
path:'/.../*'
path:"/.../*"
{path:`/.../*`}
getNodesByPathAsync('/.../*')
getNodeByPathAsync('/.../*')
requireNodeByPathAsync('/.../*')
```

If the old query expected recursive results, change `*` to `**`.

## Compatibility notes

- This change only affects `ConvoNodeQueryStep.path`
- Condition operators such as `like` and `ilike` are not changed
- Edge paths, embedding paths, blob paths, permission paths, and stored node paths are not glob paths
- Stored node paths still cannot contain `*`
