import { type ConvoNode, type ConvoNodeEdge } from "@convo-lang/convo-lang";
import { InMemoryConvoDb } from "@convo-lang/db/InMemoryConvoDb.js";
import { LayeredConvoDb } from "@convo-lang/db/LayeredConvoDb.js";
import { expect, test } from "bun:test";

const createLayer=(name:string)=>new InMemoryConvoDb({name});

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

test("LayeredConvoDb keeps mount path boundaries distinct",async ()=>{
    const app=createLayer('app');
    const apple=createLayer('apple');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/app',
                db:app,
            },
            {
                mountPoint:'/apple',
                db:apple,
            },
        ],
    });

    expect((await store.insertNodeAsync(createNode('/app',{displayName:'App root'}))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/app/child',{displayName:'App child'}))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/app/child/grandchild',{displayName:'App grandchild'}))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/apple/child',{displayName:'Apple child'}))).success).toBe(true);

    const appRoot=await store.getNodeByPathAsync('/app');
    expect(appRoot.success).toBe(true);
    if(!appRoot.success){
        throw new Error('expected success');
    }
    expect(appRoot.result?.displayName).toBe('App root');

    const appWildcard=await store.queryNodesAsync({
        steps:[
            {
                path:'/app/*',
            },
        ],
        readBatchSize:1,
    });
    expect(appWildcard.success).toBe(true);
    if(!appWildcard.success){
        throw new Error('expected success');
    }
    expect(appWildcard.result.nodes.map(n=>n.path).sort()).toEqual(['/app/child']);

    const appRecursiveWildcard=await store.queryNodesAsync({
        steps:[
            {
                path:'/app/**',
            },
        ],
        readBatchSize:1,
    });
    expect(appRecursiveWildcard.success).toBe(true);
    if(!appRecursiveWildcard.success){
        throw new Error('expected success');
    }
    expect(appRecursiveWildcard.result.nodes.map(n=>n.path).sort()).toEqual(['/app','/app/child','/app/child/grandchild']);

    const appAppleNode=await app.getNodeByPathAsync('/apple/child');
    expect(appAppleNode.success).toBe(true);
    if(!appAppleNode.success){
        throw new Error('expected success');
    }
    expect(appAppleNode.result).toBeUndefined();

    const badInsert=await store.insertNodeAsync(createNode('/application/node'));
    expect(badInsert.success).toBe(false);
    if(badInsert.success){
        throw new Error('expected failure');
    }
    expect(badInsert.statusCode).toBe(404);
});

test("LayeredConvoDb falls through layers without blob support",async ()=>{
    const blocked=createLayer('blocked');
    const blobStore=createLayer('blob-store');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/',
                db:blocked,
                supportsBlobs:false,
            },
            {
                mountPoint:'/',
                db:blobStore,
            },
        ],
    });

    const write=await store.writeBlobAsync('/files/readme.txt','hello');
    expect(write.success).toBe(true);

    const blockedHas=await blocked.hasBlobAsync('/files/readme.txt');
    expect(blockedHas.success).toBe(true);
    if(!blockedHas.success){
        throw new Error('expected success');
    }
    expect(blockedHas.result).toBe(false);

    const blobStoreHas=await blobStore.hasBlobAsync('/files/readme.txt');
    expect(blobStoreHas.success).toBe(true);
    if(!blobStoreHas.success){
        throw new Error('expected success');
    }
    expect(blobStoreHas.result).toBe(true);

    const storeHas=await store.hasBlobAsync('/files/readme.txt');
    expect(storeHas.success).toBe(true);
    if(!storeHas.success){
        throw new Error('expected success');
    }
    expect(storeHas.result).toBe(true);
});

test("LayeredConvoDb returns not found when all matching layers lack blob support",async ()=>{
    const blocked=createLayer('blocked');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/files',
                db:blocked,
                supportsBlobs:false,
            },
        ],
    });

    const has=await store.hasBlobAsync('/files/readme.txt');
    expect(has.success).toBe(false);
    if(has.success){
        throw new Error('expected failure');
    }
    expect(has.statusCode).toBe(404);

    const write=await store.writeBlobAsync('/files/readme.txt','hello');
    expect(write.success).toBe(false);
    if(write.success){
        throw new Error('expected failure');
    }
    expect(write.statusCode).toBe(404);
});

test("LayeredConvoDb hides unsupported edge layers and writes to the next supported layer",async ()=>{
    const unsupported=createLayer('unsupported');
    const supported=createLayer('supported');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/',
                db:unsupported,
                supportsEdges:false,
            },
            {
                mountPoint:'/',
                db:supported,
            },
        ],
    });

    expect((await store.insertNodeAsync(createNode('/a'))).success).toBe(true);
    expect((await store.insertNodeAsync(createNode('/b'))).success).toBe(true);
    expect((await supported.insertNodeAsync(createNode('/a'))).success).toBe(true);
    expect((await supported.insertNodeAsync(createNode('/b'))).success).toBe(true);

    const hidden=await unsupported.insertEdgeAsync(createEdge('/a','/b',{
        name:'hidden',
        displayName:'Hidden edge',
    }));
    expect(hidden.success).toBe(true);

    const visible=await store.insertEdgeAsync(createEdge('/a','/b',{
        name:'visible',
        displayName:'Visible edge',
    }));
    expect(visible.success).toBe(true);
    if(!visible.success){
        throw new Error('expected success');
    }

    const edges=await store.queryEdgesAsync({from:'/a',limit:10});
    expect(edges.success).toBe(true);
    if(!edges.success){
        throw new Error('expected success');
    }
    expect(edges.result.edges.map(e=>e.name)).toEqual(['visible']);

    const supportedEdges=await supported.queryEdgesAsync({from:'/a',limit:10});
    expect(supportedEdges.success).toBe(true);
    if(!supportedEdges.success){
        throw new Error('expected success');
    }
    expect(supportedEdges.result.edges.map(e=>e.id)).toEqual([visible.result.id]);
});

test("LayeredConvoDb driver paginates edge queries across layers and reports totals",async ()=>{
    const left=createLayer('left');
    const right=createLayer('right');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/left',
                db:left,
            },
            {
                mountPoint:'/right',
                db:right,
            },
        ],
    });

    await store.insertNodeAsync(createNode('/left/a'));
    await store.insertNodeAsync(createNode('/left/b'));
    await store.insertNodeAsync(createNode('/right/a'));
    await store.insertNodeAsync(createNode('/right/b'));

    const expectedNames=['left-1','left-2','right-1','right-2'];

    for(const name of expectedNames){
        const prefix=name.startsWith('left')?'/left':'/right';
        const from=name.endsWith('1')?`${prefix}/a`:`${prefix}/b`;
        const to=name.endsWith('1')?`${prefix}/b`:`${prefix}/a`;
        const inserted=await store.insertEdgeAsync(createEdge(from,to,{name}));
        expect(inserted.success).toBe(true);
    }

    const names:string[]=[];
    let nextToken:string|undefined;
    let total:number|undefined;

    for(let i=0;i<10;i++){
        const page=await store._driver.queryEdgesAsync({
            limit:1,
            includeTotal:true,
            nextToken,
        });
        expect(page.success).toBe(true);
        if(!page.success){
            throw new Error('expected success');
        }

        total=page.result.total;
        names.push(...page.result.edges.map(e=>e.name??''));
        nextToken=page.result.nextToken;

        if(!nextToken){
            break;
        }
    }

    expect(total).toBe(4);
    expect(names.sort()).toEqual(expectedNames);
    expect(nextToken).toBeUndefined();
});

test("layered edge queryNodesAsync supports non-recursive and recursive wildcard query paths",async ()=>{
    const base=createLayer('/');
    const posts=createLayer('/wild/posts');
    const archive=createLayer('/wild/a/archive');
    const store=new LayeredConvoDb({
        name:'layered',
        layers:[
            {
                mountPoint:'/',
                db:base,
            },
            {
                mountPoint:'/wild/a/archive',
                db:archive,
            },
            {
                mountPoint:'/wild/posts',
                db:posts,
            },
        ],
    });

    const paths=[
        '/wild',
        '/wild/a',
        '/wild/ab',
        '/wild/a/b',
        '/wild/posts',
        '/wild/posts/1',
        '/wild/a/posts',
        '/wild/a/posts/1',
        '/wild/a/posts/1/comment',
        '/wild/a/archive',
        '/wild/a/archive/posts',
        '/wild/a/archive/posts/1',
    ];

    for(const path of paths){
        await store.insertNodeAsync(createNode(path));
    }

    const queryPathsAsync=async (path:string):Promise<string[]>=>{
        const result=await store.queryNodesAsync({
            steps:[
                {path},
            ],
            orderBy:{prop:'path',direction:'asc'},
        });
        expect(result.success).toBe(true);
        if(!result.success){
            throw new Error('expected success');
        }
        return result.result.nodes.map(n=>n.path);
    };

    expect(await queryPathsAsync('/wild/*')).toEqual([
        '/wild/a',
        '/wild/ab',
        '/wild/posts',
    ]);

    expect(await queryPathsAsync('/wild/a*')).toEqual([
        '/wild/a',
        '/wild/ab',
    ]);

    expect((await queryPathsAsync('/wild/**')).sort()).toEqual([...paths].sort());

    expect(await queryPathsAsync('/wild/*/posts/*')).toEqual([
        '/wild/a/posts/1',
    ]);

    expect(await queryPathsAsync('/wild/**/posts/*')).toEqual([
        '/wild/a/archive/posts/1',
        '/wild/a/posts/1',
        '/wild/posts/1',
    ]);
});