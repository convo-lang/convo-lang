import { ConvoDb, ConvoDbCommandResult, ConvoDbPermissionBoundary, ConvoNode, ConvoNodePermissionType, ConvoNodeQueryResult, PromiseResultType, PromiseResultTypeVoid, ResultTypeVoid } from "@convo-lang/convo-lang";
import { describe, expect, test } from "bun:test";
import { createTestDb } from "./createTestDb.js";

const createProxiedDb=():ConvoDb=>{
    return createTestDb('mem') as ConvoDb;
}

interface PermissionTestDb
{
    db:ConvoDb;
    aliceDb:ConvoDb;
    bobDb:ConvoDb;
}

const expectSuccess=async <T>(promise:PromiseResultType<T>):Promise<T>=>{
    const r=await promise;
    if(!r.success){
        console.error(r.error);
    }
    expect(r.success).toBe(true);
    if(!r.success){
        throw new Error(r.error);
    }
    return r.result;
}

const expectVoidSuccess=async (promise:PromiseResultTypeVoid):Promise<void>=>{
    const r=await promise;
    expect(r.success).toBe(true);
    if(!r.success){
        throw new Error(r.error);
    }
}

const expectFailure=async <T>(
    promise:PromiseResultType<T>|Promise<ResultTypeVoid>,
    statusCode=401
):Promise<void>=>{
    const r=await promise;
    expect(r.success).toBe(false);
    if(r.success){
        throw new Error('Expected failure');
    }
    expect(r.statusCode as number).toBe(statusCode);
}

const insertNodesAsync=async (db:ConvoDb,nodes:ConvoNode[]):Promise<void>=>{
    for(const node of nodes){
        await expectSuccess(db.insertNodeAsync(node));
    }
}

const setupPermissionDbAsync=async ():Promise<PermissionTestDb>=>{
    const db=createProxiedDb();

    await insertNodesAsync(db,[
        {
            path:'/users/alice',
            type:'user',
            data:{name:'Alice'},
        },
        {
            path:'/users/bob',
            type:'user',
            data:{name:'Bob'},
        },
        {
            path:'/docs/read-only',
            type:'doc',
            data:{value:'read-only'},
        },
        {
            path:'/docs/write',
            type:'doc',
            data:{value:'write'},
        },
        {
            path:'/docs/bob-only',
            type:'doc',
            data:{value:'bob-only'},
        },
        {
            path:'/docs/no-access',
            type:'doc',
            data:{value:'no-access'},
        },
    ]);

    await expectSuccess(db.insertEdgeAsync({
        from:'/users/alice',
        to:'/docs/read-only',
        type:'grant',
        grant:ConvoNodePermissionType.read,
    }));

    await expectSuccess(db.insertEdgeAsync({
        from:'/users/alice',
        to:'/docs/write',
        type:'grant',
        grant:ConvoNodePermissionType.readWrite,
    }));

    await expectSuccess(db.insertEdgeAsync({
        from:'/users/bob',
        to:'/docs/bob-only',
        type:'grant',
        grant:ConvoNodePermissionType.all,
    }));

    return {
        db,
        aliceDb:db.auth.createBoundary('/users/alice'),
        bobDb:db.auth.createBoundary('/users/bob'),
    };
}

describe('ConvoDbPermissionBoundary',()=>{

    test('createBoundary returns a cached ConvoDbPermissionBoundary',()=>{
        const db=createProxiedDb();

        const a=db.auth.createBoundary('/users/alice');
        const b=db.auth.createBoundary('/users/alice');

        expect(a).toBeInstanceOf(ConvoDbPermissionBoundary);
        expect(a).toBe(b);
        expect((a as ConvoDbPermissionBoundary).identityPath).toBe('/users/alice');
    });

    test('queryNodesAsync enforces read grants and ignores spoofed permissionFrom',async ()=>{
        const {aliceDb}=await setupPermissionDbAsync();

        const allowed=await expectSuccess(aliceDb.queryNodesAsync({
            permissionFrom:'/users/bob',
            permissionRequired:ConvoNodePermissionType.read,
            steps:[{path:'/docs/read-only'}],
        }));
        expect(allowed.nodes.map(n=>n.path)).toEqual(['/docs/read-only']);

        const denied=await expectSuccess(aliceDb.queryNodesAsync({
            permissionFrom:'/users/bob',
            permissionRequired:ConvoNodePermissionType.read,
            steps:[{path:'/docs/bob-only'}],
        }));

        expect(denied.nodes).toHaveLength(0);
    });

    test('write operations require write grants from the boundary identity',async ()=>{
        const {db,aliceDb}=await setupPermissionDbAsync();

        await expectVoidSuccess(aliceDb.updateNodeAsync(
            {
                path:'/docs/write',
                data:{value:'updated'},
            },
            {permissionFrom:'/users/bob'}
        ));

        const updated=await expectSuccess(db.getNodeByPathAsync('/docs/write'));
        expect(updated?.data['value']).toBe('updated');

        await expectFailure(aliceDb.updateNodeAsync({
            path:'/docs/read-only',
            data:{value:'should-not-update'},
        }));

        await expectSuccess(aliceDb.insertNodeAsync({
            path:'/docs/write/child',
            type:'doc',
            data:{value:'child'},
        }));

        const inserted=await expectSuccess(db.getNodeByPathAsync('/docs/write/child'));
        expect(inserted?.path).toBe('/docs/write/child');

        await expectVoidSuccess(aliceDb.deleteNodeAsync('/docs/write/child'));

        const deleted=await expectSuccess(db.getNodeByPathAsync('/docs/write/child'));
        expect(deleted).toBeUndefined();

        await expectFailure(aliceDb.insertNodeAsync({
            path:'/docs/read-only/child',
            type:'doc',
            data:{value:'denied'},
        }));
    });

    test('edge inserts require write access to from and read or write access to to',async ()=>{
        const {aliceDb}=await setupPermissionDbAsync();

        const inserted=await expectSuccess(aliceDb.insertEdgeAsync({
            from:'/docs/write',
            to:'/docs/read-only',
            type:'reference',
        }));

        expect(inserted.id).toBeString();
        expect(inserted.from).toBe('/docs/write');
        expect(inserted.to).toBe('/docs/read-only');

        await expectFailure(aliceDb.insertEdgeAsync({
            from:'/docs/read-only',
            to:'/docs/write',
            type:'reference',
        }));
    });

    test('permission helpers use the boundary identity instead of caller supplied paths',async ()=>{
        const {aliceDb,bobDb}=await setupPermissionDbAsync();

        const aliceToBobOnly=await expectSuccess(aliceDb.getNodePermissionAsync('/users/bob','/docs/bob-only'));
        expect(aliceToBobOnly).toBe(ConvoNodePermissionType.none);

        const bobToBobOnly=await expectSuccess(bobDb.getNodePermissionAsync('/users/alice','/docs/bob-only'));
        expect(bobToBobOnly).toBe(ConvoNodePermissionType.all);

        await expectFailure(aliceDb.checkNodePermissionAsync(
            '/users/bob',
            '/docs/bob-only',
            ConvoNodePermissionType.read
        ));
    });

    test('executeCommandAsync applies boundary permissions and rejects driver commands',async ()=>{
        const {aliceDb}=await setupPermissionDbAsync();

        const allowed=await expectSuccess(aliceDb.executeCommandAsync({
            queryNodes:{
                query:{
                    permissionFrom:'/users/bob',
                    permissionRequired:ConvoNodePermissionType.read,
                    steps:[{path:'/docs/read-only'}],
                },
            },
        })) as ConvoDbCommandResult;

        expect((allowed.queryNodes as ConvoNodeQueryResult<keyof ConvoNode>).nodes.map(n=>n.path)).toEqual(['/docs/read-only']);

        const denied=await expectSuccess(aliceDb.executeCommandAsync({
            queryNodes:{
                query:{
                    permissionFrom:'/users/bob',
                    permissionRequired:ConvoNodePermissionType.read,
                    steps:[{path:'/docs/bob-only'}],
                },
            },
        })) as ConvoDbCommandResult;

        expect((denied.queryNodes as ConvoNodeQueryResult<keyof ConvoNode>).nodes).toHaveLength(0);

        await expectFailure(aliceDb.executeCommandAsync({
            driverCmd:{
                fn:'selectNodesByPathsAsync',
                args:['*',['/docs/read-only'],[{prop:'path'}]] as any,
            },
        }));
    });
});
