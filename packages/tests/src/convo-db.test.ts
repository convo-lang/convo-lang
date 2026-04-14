import { ConvoNodePermissionType, HttpConvoCompletionService, type ConvoNode, type ConvoNodeEdge, type ConvoNodeEmbedding } from "@convo-lang/convo-lang";
import { BunSqliteConvoDb } from "@convo-lang/db/BunSqliteConvoDb.js";
import { InMemoryConvoDb } from "@convo-lang/db/InMemoryConvoDb.js";
import { NodeSQLiteConvoDb } from "@convo-lang/db/NodeSQLiteConvoDb.js";
import { uuid } from "@iyio/common";
import { expect, test } from "bun:test";

type Type='bun'|'node'|'mem'|'http';
const type:Type='bun' as Type;

const createStore=()=>(
    type==='http'?
        new HttpConvoCompletionService({endpoint:"http://localhost:7222/api/convo-lang",dbName:uuid()})
    :type==='bun'?
        new BunSqliteConvoDb({})
    :type==='node'?
        new NodeSQLiteConvoDb({})
    :
        new InMemoryConvoDb({})
);

const createNode=(path:string,overrides:Partial<ConvoNode>={}):ConvoNode=>({
    path,
    type:'test-node',
    data:{value:path},
    ...overrides,
});

const createEdge=(from:string,to:string,overrides:Partial<Omit<ConvoNodeEdge,'id'>>={}):Omit<ConvoNodeEdge,'id'>=>({
    type:'test-edge',
    from,
    to,
    ...overrides,
});

const createEmbedding=(path:string,overrides:Partial<Omit<ConvoNodeEmbedding,'id'>>={}):Omit<ConvoNodeEmbedding,'id'>=>({
    path,
    prop:'data',
    type:'test-embedding',
    ...overrides,
});

const collectStreamAsync=async <T>(iter:AsyncIterable<T>):Promise<T[]>=>{
    const items:T[]=[];
    for await(const item of iter){
        items.push(item);
    }
    return items;
};

test("queryNodesAsync returns validation error for invalid query",async ()=>{
    const store=createStore();

    const result=await store.queryNodesAsync({
        steps:[
            {
                path:'relative/path',
            }
        ]
    });


    expect(result.success).toBe(false);
    if(result.success){
        throw new Error('expected failure');
    }
    expect(result.statusCode).toBe(400);
});

test("queryNodesAsync returns invalid token parse error",async ()=>{
    const store=createStore();

    const result=await store.queryNodesAsync({
        steps:[],
        nextToken:'not-json',
    });

    expect(result.success).toBe(false);
    if(result.success){
        throw new Error('expected failure');
    }
    expect(result.statusCode).toBe(400);
    expect(result.error).toContain('Invalid token format');
});

test("queryNodesAsync returns invalid token schema error",async ()=>{
    const store=createStore();

    const result=await store.queryNodesAsync({
        steps:[],
        nextToken:JSON.stringify({
            bad:true,
        }),
    });

    expect(result.success).toBe(false);
    if(result.success){
        throw new Error('expected failure');
    }
    expect(result.statusCode).toBe(400);
});

test("queryNodesAsync returns invalid token path error",async ()=>{
    const store=createStore();

    const result=await store.queryNodesAsync({
        steps:[],
        nextToken:JSON.stringify({
            step:0,
            stepStage:'path',
            returnedCount:0,
            scanCount:0,
            paths:['bad-path'],
        }),
    });

    expect(result.success).toBe(false);
    if(result.success){
        throw new Error('expected failure');
    }
    expect(result.statusCode).toBe(400);
    expect(result.error).toContain('Invalid path');
});

test("streamNodesAsync returns stored error from token state",async ()=>{
    const store=createStore();

    const items=await collectStreamAsync(
        store.streamNodesAsync({
            steps:[],
            nextToken:JSON.stringify({
                step:0,
                stepStage:'path',
                returnedCount:0,
                scanCount:0,
                paths:[],
                error:'stored failure',
                errorCode:409,
            }),
        })
    );

    expect(items).toEqual([
        {
            type:'error',
            error:'stored failure',
            statusCode:409,
        }
    ]);
});

test("insertNodeAsync and getNodesByPathAsync work for exact path and wildcard path",async ()=>{
    const store=createStore();

    expect((await store.insertNodeAsync(createNode('/users'))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/users/a',{displayName:'A'}))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/users/a/profile'))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/users/b',{displayName:'B'}))).success).toBe(true);

    const exact=await store.getNodesByPathAsync('/users/a');
    expect(exact.success).toBe(true);
    if(!exact.success){
        throw new Error('expected success');
    }
    expect(exact.result.nodes.length).toBe(1);
    expect(exact.result.nodes[0]?.path).toBe('/users/a');

    const wildcard=await store.getNodesByPathAsync('/users/*');
    expect(wildcard.success).toBe(true);
    if(!wildcard.success){
        throw new Error('expected success');
    }
    expect(wildcard.result.nodes.map(n=>n.path)).toEqual([
        '/users/a',
        '/users/a/profile',
        '/users/b',
    ]);
});

test("queryNodesAsync supports keys selection, orderBy, skip, limit, and nextToken pagination",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/k/1',{displayName:'one',data:{rank:2}}));
    await store.insertNodeAsync(createNode('/k/2',{displayName:'two',data:{rank:1}}));
    await store.insertNodeAsync(createNode('/k/3',{displayName:'three',data:{rank:3}}));

    const page1=await store.queryNodesAsync({
        keys:['path','displayName'],
        steps:[
            {
                path:'/k/*',
            }
        ],
        orderBy:{
            prop:'displayName',
            direction:'asc',
        },
        skip:1,
        limit:1,
    });
    expect(page1.success).toBe(true);
    if(!page1.success){
        throw new Error('expected success');
    }
    expect(page1.result.nodes.length).toBe(1);
    expect(page1.result.nodes[0]).toEqual({
        path:'/k/3',
        displayName:'three',
    });
    expect(page1.result.nextToken).toBeDefined();

    const page2=await store.queryNodesAsync({
        keys:['path','displayName'],
        steps:[
            {
                path:'/k/*',
            }
        ],
        orderBy:{
            prop:'displayName',
            direction:'asc',
        },
        skip:1,
        limit:1,
        nextToken:page1.result.nextToken,
    });

    expect(page2.success).toBe(true);
    if(!page2.success){
        throw new Error('expected success');
    }
    expect(page2.result.nodes.length).toBe(1);
    expect(page2.result.nodes[0]).toEqual({
        path:'/k/2',
        displayName:'two',
    });
});

test("queryNodesAsync returns all props when keys is omitted, null, or contains star",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/all/1',{
        displayName:'all1',
        description:'desc',
        instructions:'inst',
        name:'fixed-name',
        created:'2020-01-01T00:00:00.000Z',
        modified:'2020-01-02T00:00:00.000Z',
        data:{a:1},
    }));

    const omitted=await store.queryNodesAsync({
        steps:[{path:'/all/1'}],
    });
    expect(omitted.success).toBe(true);
    if(!omitted.success){
        throw new Error('expected success');
    }
    expect(omitted.result.nodes[0]?.name).toBe('fixed-name');
    expect(omitted.result.nodes[0]?.type).toBe('test-node');

    const nullKeys=await store.queryNodesAsync({
        keys:null,
        steps:[{path:'/all/1'}],
    });
    expect(nullKeys.success).toBe(true);
    if(!nullKeys.success){
        throw new Error('expected success');
    }
    expect(nullKeys.result.nodes[0]?.created).toBe('2020-01-01T00:00:00.000Z');

    const starKeys=await store.queryNodesAsync({
        keys:['path',null,'displayName'] as any,
        steps:[{path:'/all/1'}],
    });
    expect(starKeys.success).toBe(true);
    if(!starKeys.success){
        throw new Error('expected success');
    }
    expect(starKeys.result.nodes[0]?.['instructions']).toBe('inst');
});

test("streamNodesAsync returns nodes and respects limit zero",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/stream/a'));
    await store.insertNodeAsync(createNode('/stream/b'));

    const items=await collectStreamAsync(store.streamNodesAsync({
        steps:[{path:'/stream/*'}],
        limit:0,
    }));

    expect(items).toEqual([]);
});

test("queryNodesAsync supports condition filtering",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/cond/1',{displayName:'Alpha',data:{tags:['a','b'],count:3}}));
    await store.insertNodeAsync(createNode('/cond/2',{displayName:'Beta',data:{tags:['b'],count:1}}));
    await store.insertNodeAsync(createNode('/cond/3',{displayName:'gamma',data:{tags:['c'],count:2}}));

    const eq=await store.queryNodesAsync({
        steps:[
            {path:'/cond/*'},
            {condition:{target:'displayName',op:'=',value:'Beta'}},
        ],
    });
    expect(eq.success).toBe(true);
    if(!eq.success){
        throw new Error('expected success');
    }
    expect(eq.result.nodes.map(n=>n.path)).toEqual(['/cond/2']);

    const ilike=await store.queryNodesAsync({
        steps:[
            {path:'/cond/*'},
            {condition:{target:'displayName',op:'ilike',value:'g*'}},
        ],
    });
    expect(ilike.success).toBe(true);
    if(!ilike.success){
        throw new Error('expected success');
    }
    expect(ilike.result.nodes.map(n=>n.path)).toEqual(['/cond/3']);

    const grouped=await store.queryNodesAsync({
        steps:[
            {path:'/cond/*'},
            {
                condition:{
                    groupOp:'or',
                    conditions:[
                        {target:'data.count',op:'>',value:2},
                        {target:'data.tags',op:'contains',value:'c'},
                    ],
                },
            },
        ],
        orderBy:{prop:'path',direction:'asc'},
    });
    expect(grouped.success).toBe(true);
    if(!grouped.success){
        throw new Error('expected success');
    }
    expect(grouped.result.nodes.map(n=>n.path)).toEqual(['/cond/1','/cond/3']);
});

test("queryNodesAsync supports edge traversal forward reverse and bi",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/graph/a'));
    await store.insertNodeAsync(createNode('/graph/b'));
    await store.insertNodeAsync(createNode('/graph/c'));

    expect((await store.insertEdgeAsync(createEdge('/graph/a','/graph/b',{type:'likes'}))).success).toBe(true);
    expect((await store.insertEdgeAsync(createEdge('/graph/c','/graph/a',{type:'likes'}))).success).toBe(true);

    const forward=await store.queryNodesAsync({
        steps:[
            {path:'/graph/a'},
            {edge:'likes',edgeDirection:'forward'},
        ],
    });
    expect(forward.success).toBe(true);
    if(!forward.success){
        throw new Error('expected success');
    }
    expect(forward.result.nodes.map(n=>n.path)).toEqual(['/graph/b']);

    const reverse=await store.queryNodesAsync({
        steps:[
            {path:'/graph/a'},
            {edge:'likes',edgeDirection:'reverse'},
        ],
    });
    expect(reverse.success).toBe(true);
    if(!reverse.success){
        throw new Error('expected success');
    }
    expect(reverse.result.nodes.map(n=>n.path)).toEqual(['/graph/c']);

    const bi=await store.queryNodesAsync({
        steps:[
            {path:'/graph/a'},
            {edge:'likes',edgeDirection:'bi'},
        ],
        orderBy:{prop:'path',direction:'asc'},
    });
    expect(bi.success).toBe(true);
    if(!bi.success){
        throw new Error('expected success');
    }
    expect(bi.result.nodes.map(n=>n.path)).toEqual(['/graph/b','/graph/c']);
});

test("queryNodesAsync supports returnAllScanned",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/scan/a'));
    await store.insertNodeAsync(createNode('/scan/b'));
    await store.insertNodeAsync(createNode('/scan/c'));

    await store.insertEdgeAsync(createEdge('/scan/a','/scan/b',{type:'jump'}));
    await store.insertEdgeAsync(createEdge('/scan/b','/scan/c',{type:'jump'}));

    const result=await store.queryNodesAsync({
        steps:[
            {path:'/scan/a'},
            {edge:'jump',edgeDirection:'forward'},
            {edge:'jump',edgeDirection:'forward'},
        ],
        returnAllScanned:true,
        orderBy:{prop:'path',direction:'asc'},
    });

    expect(result.success).toBe(true);
    if(!result.success){
        throw new Error('expected success');
    }
    expect(result.result.nodes.map(n=>n.path)).toEqual(['/scan/a','/scan/b','/scan/c']);
});

test("permission APIs work including inheritance from ancestor path and denial",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/users/admin'));
    await store.insertNodeAsync(createNode('/docs'));
    await store.insertNodeAsync(createNode('/docs/a'));
    await store.insertNodeAsync(createNode('/docs/a/child'));
    await store.insertNodeAsync(createNode('/docs/b'));

    await store.insertEdgeAsync(createEdge('/users/admin','/docs/a',{
        type:'grant',
        grant:ConvoNodePermissionType.readWrite,
    }));

    const permission=await store.getNodePermissionAsync('/users/admin','/docs/a/child');
    expect(permission.success).toBe(true);
    if(!permission.success){
        throw new Error('expected success');
    }
    expect(permission.result).toBe(ConvoNodePermissionType.readWrite);

    const deniedPermission=await store.getNodePermissionAsync('bad-path','/docs/a/child');
    expect(deniedPermission.success).toBe(true);
    if(!deniedPermission.success){
        throw new Error('expected success');
    }
    expect(deniedPermission.result).toBe(ConvoNodePermissionType.none);

    const checkOk=await store.checkNodePermissionAsync('/users/admin','/docs/a/child',ConvoNodePermissionType.write);
    expect(checkOk.success).toBe(true);

    const checkAnyOk=await store.checkNodePermissionAsync('/users/admin','/docs/a/child',ConvoNodePermissionType.readExecute,true);
    expect(checkAnyOk.success).toBe(true);

    const checkDenied=await store.checkNodePermissionAsync('/users/admin','/docs/b',ConvoNodePermissionType.read);
    expect(checkDenied.success).toBe(false);
    if(checkDenied.success){
        throw new Error('expected failure');
    }
    expect(checkDenied.statusCode).toBe(401);
});

test("queryNodesAsync supports step permission filtering and final query permission filtering",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/principal'));
    await store.insertNodeAsync(createNode('/perm/a'));
    await store.insertNodeAsync(createNode('/perm/b'));
    await store.insertNodeAsync(createNode('/perm/visible'));
    await store.insertNodeAsync(createNode('/perm/hidden'));

    await store.insertEdgeAsync(createEdge('/principal','/perm/a',{
        type:'grant',
        grant:ConvoNodePermissionType.read,
    }));
    await store.insertEdgeAsync(createEdge('/principal','/perm/visible',{
        type:'grant',
        grant:ConvoNodePermissionType.read,
    }));
    const stepPermission=await store.queryNodesAsync({
        steps:[
            {path:'/perm/*'},
            {
                permissionFrom:'/principal',
                permissionRequired:ConvoNodePermissionType.read,
            },
        ],
        orderBy:{prop:'path',direction:'asc'},
    });

    expect(stepPermission.success).toBe(true);
    if(!stepPermission.success){
        throw new Error('expected success');
    }
    expect(stepPermission.result.nodes.map(n=>n.path)).toEqual(['/perm/a','/perm/visible']);

    const finalPermission=await store.queryNodesAsync({
        steps:[
            {path:'/perm/*'},
        ],
        permissionFrom:'/principal',
        permissionRequired:ConvoNodePermissionType.read,
        orderBy:{prop:'path',direction:'asc'},
    });

    expect(finalPermission.success).toBe(true);
    if(!finalPermission.success){
        throw new Error('expected success');
    }
    expect(finalPermission.result.nodes.map(n=>n.path)).toEqual([
        '/perm/a',
        '/perm/b',
        '/perm/hidden',
        '/perm/visible',
    ]);
});

test("insertNodeAsync updateNodeAsync and deleteNodeAsync validate bad paths and permissionFrom",async ()=>{
    const store=createStore();

    const badInsert=await store.insertNodeAsync(createNode('bad-path'));
    expect(badInsert.success).toBe(false);
    if(badInsert.success){
        throw new Error('expected failure');
    }
    expect(badInsert.statusCode).toBe(400);

    const badInsertPermission=await store.insertNodeAsync(createNode('/valid'),{permissionFrom:'bad-path'});
    expect(badInsertPermission.success).toBe(false);
    if(badInsertPermission.success){
        throw new Error('expected failure');
    }
    expect(badInsertPermission.statusCode).toBe(400);

    await store.insertNodeAsync(createNode('/node/x'));

    const badUpdate=await store.updateNodeAsync({path:'bad-path'});
    expect(badUpdate.success).toBe(false);
    if(badUpdate.success){
        throw new Error('expected failure');
    }
    expect(badUpdate.statusCode).toBe(400);

    const badUpdatePermission=await store.updateNodeAsync({path:'/node/x'},{permissionFrom:'bad-path'});
    expect(badUpdatePermission.success).toBe(false);
    if(badUpdatePermission.success){
        throw new Error('expected failure');
    }
    expect(badUpdatePermission.statusCode).toBe(400);

    const updateOk=await store.updateNodeAsync({
        path:'/node/x',
        displayName:'updated',
        description:'desc',
        instructions:'inst',
        modified:'2024-01-01T00:00:00.000Z',
        data:{updated:true},
    });
    expect(updateOk.success).toBe(true);

    const getUpdated=await store.getNodesByPathAsync('/node/x');
    expect(getUpdated.success).toBe(true);
    if(!getUpdated.success){
        throw new Error('expected success');
    }
    expect(getUpdated.result.nodes[0]?.displayName).toBe('updated');
    expect(getUpdated.result.nodes[0]?.data).toEqual({updated:true});

    const badDelete=await store.deleteNodeAsync('bad-path');
    expect(badDelete.success).toBe(false);
    if(badDelete.success){
        throw new Error('expected failure');
    }
    expect(badDelete.statusCode).toBe(400);

    const badDeletePermission=await store.deleteNodeAsync('/node/x',{permissionFrom:'bad-path'});
    expect(badDeletePermission.success).toBe(false);
    if(badDeletePermission.success){
        throw new Error('expected failure');
    }
    expect(badDeletePermission.statusCode).toBe(400);

    const deleteOk=await store.deleteNodeAsync('/node/x');
    expect(deleteOk.success).toBe(true);

    const getDeleted=await store.getNodesByPathAsync('/node/x');
    expect(getDeleted.success).toBe(true);
    if(!getDeleted.success){
        throw new Error('expected success');
    }
    expect(getDeleted.result.nodes).toEqual([]);
});

test("updateNodeAsync supports mergeData option",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/node/merge',{
        data:{
            a:1,
            b:2,
            nested:{keep:true},
        },
    }));

    const replaceOk=await store.updateNodeAsync({
        path:'/node/merge',
        data:{
            b:3,
            c:4,
        },
    });
    expect(replaceOk.success).toBe(true);

    const replaced=await store.getNodesByPathAsync('/node/merge');
    expect(replaced.success).toBe(true);
    if(!replaced.success){
        throw new Error('expected success');
    }
    expect(replaced.result.nodes[0]?.data).toEqual({
        b:3,
        c:4,
    });

    const mergeOk=await store.updateNodeAsync({
        path:'/node/merge',
        data:{
            c:5,
            d:6,
        },
    },{
        mergeData:true,
    });
    expect(mergeOk.success).toBe(true);

    const merged=await store.getNodesByPathAsync('/node/merge');
    expect(merged.success).toBe(true);
    if(!merged.success){
        throw new Error('expected success');
    }
    expect(merged.result.nodes[0]?.data).toEqual({
        b:3,
        c:5,
        d:6,
    });
});

test("queryEdgesAsync getEdgeByIdAsync insertEdgeAsync updateEdgeAsync deleteEdgeAsync work and validate inputs",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/edge/from'));
    await store.insertNodeAsync(createNode('/edge/to'));

    const badGet=await store.getEdgeByIdAsync('missing','bad-path');
    expect(badGet.success).toBe(false);
    if(badGet.success){
        throw new Error('expected failure');
    }
    expect(badGet.statusCode).toBe(400);

    const notFound=await store.getEdgeByIdAsync('missing');
    expect(notFound.success).toBe(false);
    if(notFound.success){
        throw new Error('expected failure');
    }
    expect(notFound.statusCode).toBe(404);

    const badInsertFrom=await store.insertEdgeAsync(createEdge('bad-path','/edge/to'));
    expect(badInsertFrom.success).toBe(false);
    if(badInsertFrom.success){
        throw new Error('expected failure');
    }
    expect(badInsertFrom.statusCode).toBe(400);

    const badInsertTo=await store.insertEdgeAsync(createEdge('/edge/from','bad-path'));
    expect(badInsertTo.success).toBe(false);
    if(badInsertTo.success){
        throw new Error('expected failure');
    }
    expect(badInsertTo.statusCode).toBe(400);

    const badInsertPermission=await store.insertEdgeAsync(createEdge('/edge/from','/edge/to'),{permissionFrom:'bad-path'});
    expect(badInsertPermission.success).toBe(false);
    if(badInsertPermission.success){
        throw new Error('expected failure');
    }
    expect(badInsertPermission.statusCode).toBe(400);

    const inserted=await store.insertEdgeAsync(createEdge('/edge/from','/edge/to',{
        displayName:'edge1',
        description:'desc',
        instructions:'inst',
        name:'stable-edge',
        type:'rel',
        created:'2024-01-01T00:00:00.000Z',
        modified:'2024-01-02T00:00:00.000Z',
        grant:ConvoNodePermissionType.read,
    }));
    expect(inserted.success).toBe(true);
    if(!inserted.success){
        throw new Error('expected success');
    }

    const queried=await store.queryEdgesAsync({from:'/edge/from',to:'/edge/to',includeTotal:true});
    expect(queried.success).toBe(true);
    if(!queried.success){
        throw new Error('expected success');
    }
    expect(queried.result.edges.length).toBe(1);
    expect(queried.result.total).toBeDefined();

    const fetched=await store.getEdgeByIdAsync(inserted.result.id);
    expect(fetched.success).toBe(true);
    if(!fetched.success){
        throw new Error('expected success');
    }
    expect(fetched.result.id).toBe(inserted.result.id);

    const badUpdatePermission=await store.updateEdgeAsync({id:inserted.result.id},{permissionFrom:'bad-path'});
    expect(badUpdatePermission.success).toBe(false);
    if(badUpdatePermission.success){
        throw new Error('expected failure');
    }
    expect(badUpdatePermission.statusCode).toBe(400);

    const updateOk=await store.updateEdgeAsync({
        id:inserted.result.id,
        displayName:'edge2',
        description:'desc2',
        instructions:'inst2',
        modified:'2024-01-03T00:00:00.000Z',
        grant:ConvoNodePermissionType.write,
    });
    expect(updateOk.success).toBe(true);

    const fetchedUpdated=await store.getEdgeByIdAsync(inserted.result.id);
    expect(fetchedUpdated.success).toBe(true);
    if(!fetchedUpdated.success){
        throw new Error('expected success');
    }
    expect(fetchedUpdated.result.displayName).toBe('edge2');
    expect(fetchedUpdated.result.grant).toBe(ConvoNodePermissionType.write);

    const badDeletePermission=await store.deleteEdgeAsync(inserted.result.id,{permissionFrom:'bad-path'});
    expect(badDeletePermission.success).toBe(false);
    if(badDeletePermission.success){
        throw new Error('expected failure');
    }
    expect(badDeletePermission.statusCode).toBe(400);

    const deleteOk=await store.deleteEdgeAsync(inserted.result.id);
    expect(deleteOk.success).toBe(true);

    const missingAfterDelete=await store.getEdgeByIdAsync(inserted.result.id);
    expect(missingAfterDelete.success).toBe(false);
    if(missingAfterDelete.success){
        throw new Error('expected failure');
    }
    expect(missingAfterDelete.statusCode).toBe(404);
});

test("queryEmbeddingsAsync getEmbeddingByIdAsync insertEmbeddingAsync updateEmbeddingAsync deleteEmbeddingAsync work and validate inputs",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/embed/node'));

    const badGet=await store.getEmbeddingByIdAsync('missing','bad-path');
    expect(badGet.success).toBe(false);
    if(badGet.success){
        throw new Error('expected failure');
    }
    expect(badGet.statusCode).toBe(400);

    const notFound=await store.getEmbeddingByIdAsync('missing');
    expect(notFound.success).toBe(false);
    if(notFound.success){
        throw new Error('expected failure');
    }
    expect(notFound.statusCode).toBe(404);

    const badInsertPath=await store.insertEmbeddingAsync(createEmbedding('bad-path'));
    expect(badInsertPath.success).toBe(false);
    if(badInsertPath.success){
        throw new Error('expected failure');
    }
    expect(badInsertPath.statusCode).toBe(400);

    const badInsertPermission=await store.insertEmbeddingAsync(createEmbedding('/embed/node'),{permissionFrom:'bad-path'});
    expect(badInsertPermission.success).toBe(false);
    if(badInsertPermission.success){
        throw new Error('expected failure');
    }
    expect(badInsertPermission.statusCode).toBe(400);

    const inserted=await store.insertEmbeddingAsync(createEmbedding('/embed/node',{
        prop:'data',
        type:'vec',
        name:'stable-embedding',
        description:'desc',
        instructions:'inst',
        created:'2024-01-01T00:00:00.000Z',
        modified:'2024-01-02T00:00:00.000Z',
        vector:[1,2,3],
    }));
    expect(inserted.success).toBe(true);
    if(!inserted.success){
        throw new Error('expected success');
    }

    const queried=await store.queryEmbeddingsAsync({
        path:'/embed/node',
        includeVector:true,
        includeTotal:true,
    });
    expect(queried.success).toBe(true);
    if(!queried.success){
        throw new Error('expected success');
    }
    expect(queried.result.embeddings.length).toBe(1);
    expect(queried.result.total).toBeDefined();

    const fetched=await store.getEmbeddingByIdAsync(inserted.result.id);
    expect(fetched.success).toBe(true);
    if(!fetched.success){
        throw new Error('expected success');
    }
    expect(fetched.result.id).toBe(inserted.result.id);

    const badUpdatePermission=await store.updateEmbeddingAsync({id:inserted.result.id},{permissionFrom:'bad-path'});
    expect(badUpdatePermission.success).toBe(false);
    if(badUpdatePermission.success){
        throw new Error('expected failure');
    }
    expect(badUpdatePermission.statusCode).toBe(400);

    const updateOk=await store.updateEmbeddingAsync({
        id:inserted.result.id,
        description:'desc2',
        instructions:'inst2',
        modified:'2024-01-03T00:00:00.000Z',
        generateVector:true,
    });
    expect(updateOk.success).toBe(true);

    const fetchedUpdated=await store.getEmbeddingByIdAsync(inserted.result.id);
    expect(fetchedUpdated.success).toBe(true);
    if(!fetchedUpdated.success){
        throw new Error('expected success');
    }
    expect(fetchedUpdated.result.description).toBe('desc2');
    expect(fetchedUpdated.result.instructions).toBe('inst2');

    const badDeletePermission=await store.deleteEmbeddingAsync(inserted.result.id,{permissionFrom:'bad-path'});
    expect(badDeletePermission.success).toBe(false);
    if(badDeletePermission.success){
        throw new Error('expected failure');
    }
    expect(badDeletePermission.statusCode).toBe(400);

    const deleteOk=await store.deleteEmbeddingAsync(inserted.result.id);
    expect(deleteOk.success).toBe(true);

    const missingAfterDelete=await store.getEmbeddingByIdAsync(inserted.result.id);
    expect(missingAfterDelete.success).toBe(false);
    if(missingAfterDelete.success){
        throw new Error('expected failure');
    }
    expect(missingAfterDelete.statusCode).toBe(404);
});

test("deleteNodeAsync cascades to edges and embeddings",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/cascade/a'));
    await store.insertNodeAsync(createNode('/cascade/b'));

    const edge=await store.insertEdgeAsync(createEdge('/cascade/a','/cascade/b',{type:'rel'}));
    expect(edge.success).toBe(true);
    if(!edge.success){
        throw new Error('expected success');
    }

    const embedding=await store.insertEmbeddingAsync(createEmbedding('/cascade/a',{type:'vec',prop:'data'}));
    expect(embedding.success).toBe(true);
    if(!embedding.success){
        throw new Error('expected success');
    }

    const deleted=await store.deleteNodeAsync('/cascade/a');
    expect(deleted.success).toBe(true);
    const edgeAfter=await store.getEdgeByIdAsync(edge.result.id);
    expect(edgeAfter.success).toBe(false);
    if(edgeAfter.success){
        throw new Error('expected failure');
    }
    expect(edgeAfter.statusCode).toBe(404);

    const embeddingAfter=await store.getEmbeddingByIdAsync(embedding.result.id);
    expect(embeddingAfter.success).toBe(false);
    if(embeddingAfter.success){
        throw new Error('expected failure');
    }
    expect(embeddingAfter.statusCode).toBe(404);
});

test("permission guarded write operations deny access",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/actors/user'));
    await store.insertNodeAsync(createNode('/secure/node1'));
    await store.insertNodeAsync(createNode('/secure/node2'));

    const insertDenied=await store.insertNodeAsync(createNode('/secure/new'),{
        permissionFrom:'/actors/user',
    });
    expect(insertDenied.success).toBe(false);
    if(insertDenied.success){
        throw new Error('expected failure');
    }
    expect(insertDenied.statusCode).toBe(401);

    const updateDenied=await store.updateNodeAsync({
        path:'/secure/node1',
        displayName:'x',
    },{
        permissionFrom:'/actors/user',
    });
    expect(updateDenied.success).toBe(false);
    if(updateDenied.success){
        throw new Error('expected failure');
    }
    expect(updateDenied.statusCode).toBe(401);

    const deleteDenied=await store.deleteNodeAsync('/secure/node1',{
        permissionFrom:'/actors/user',
    });
    expect(deleteDenied.success).toBe(false);
    if(deleteDenied.success){
        throw new Error('expected failure');
    }
    expect(deleteDenied.statusCode).toBe(401);

    const edgeInsertDenied=await store.insertEdgeAsync(createEdge('/secure/node1','/secure/node2'),{
        permissionFrom:'/actors/user',
    });
    expect(edgeInsertDenied.success).toBe(false);
    if(edgeInsertDenied.success){
        throw new Error('expected failure');
    }
    expect(edgeInsertDenied.statusCode).toBe(401);

    const embeddingInsertDenied=await store.insertEmbeddingAsync(createEmbedding('/secure/node1'),{
        permissionFrom:'/actors/user',
    });
    expect(embeddingInsertDenied.success).toBe(false);
    if(embeddingInsertDenied.success){
        throw new Error('expected failure');
    }
    expect(embeddingInsertDenied.statusCode).toBe(401);
});

test("permission guarded edge and embedding update/delete operations allow access when grants exist",async ()=>{
    const store=createStore();

    await store.insertNodeAsync(createNode('/admin'));
    await store.insertNodeAsync(createNode('/secured/from'));
    await store.insertNodeAsync(createNode('/secured/to'));

    await store.insertEdgeAsync(createEdge('/admin','/secured/from',{
        type:'grant',
        grant:ConvoNodePermissionType.write,
    }));
    await store.insertEdgeAsync(createEdge('/admin','/secured/to',{
        type:'grant',
        grant:ConvoNodePermissionType.readWrite,
    }));

    const edge=await store.insertEdgeAsync(createEdge('/secured/from','/secured/to',{type:'rel'}));
    expect(edge.success).toBe(true);
    if(!edge.success){
        throw new Error('expected success');
    }

    const edgeUpdate=await store.updateEdgeAsync({
        id:edge.result.id,
        displayName:'ok',
    },{
        permissionFrom:'/admin',
    });
    expect(edgeUpdate.success).toBe(true);

    const edgeDelete=await store.deleteEdgeAsync(edge.result.id,{
        permissionFrom:'/admin',
    });
    expect(edgeDelete.success).toBe(true);

    const embedding=await store.insertEmbeddingAsync(createEmbedding('/secured/from',{type:'vec'}));
    expect(embedding.success).toBe(true);
    if(!embedding.success){
        throw new Error('expected success');
    }

    const embeddingUpdate=await store.updateEmbeddingAsync({
        id:embedding.result.id,
        description:'ok',
    },{
        permissionFrom:'/admin',
    });
    expect(embeddingUpdate.success).toBe(true);

    const embeddingDelete=await store.deleteEmbeddingAsync(embedding.result.id,{
        permissionFrom:'/admin',
    });
    expect(embeddingDelete.success).toBe(true);
});