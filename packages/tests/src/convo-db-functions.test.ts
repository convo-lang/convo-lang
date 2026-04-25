import { ConvoNode } from "@convo-lang/convo-lang";
import { describe, expect, test } from "bun:test";
import { createTestDb } from "./createTestDb.js";

const createDb=()=>createTestDb('mem');

describe('convo db functions',()=>{

    test('calls a ConvoDbFunction at /example-functions/a',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/a',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const handler=async (args,ctx)=>{
                            return {
                                message:'hello',
                                echo:args?.value,
                                nodePath:ctx.node.path,
                            };
                        };
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/a',
                call:{
                    args:{
                        value:'abc',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes.length).toBe(1);

        const resultNode=queryResult.result.nodes[0];
        expect(resultNode?.path).toBe('/null');
        expect(resultNode?.type).toBe('function-result');
        expect(resultNode?.data).toEqual({
            value:{
                message:'hello',
                echo:'abc',
                nodePath:'/example-functions/a',
            },
        });
    });

    test('calls javascript handler',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/handler',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const handler=(args,ctx)=>{
                            return {
                                handler:true,
                                echo:args.value,
                                nodePath:ctx.node.path,
                            };
                        };
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/handler',
                call:{
                    args:{
                        value:'handler-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(1);
        expect(queryResult.result.nodes[0]).toEqual({
            path:'/null',
            type:'function-result',
            data:{
                value:{
                    handler:true,
                    echo:'handler-value',
                    nodePath:'/example-functions/handler',
                },
            },
        });
    });

    test('calls javascript nodeHandler returning a single node',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/node-handler-single',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const nodeHandler=(args,ctx)=>{
                            return {
                                path:'/result/node-single',
                                type:'result-node',
                                data:{
                                    from:ctx.node.path,
                                    echo:args.value,
                                },
                            };
                        };
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/node-handler-single',
                call:{
                    args:{
                        value:'single-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(1);
        expect(queryResult.result.nodes[0]).toEqual({
            path:'/result/node-single',
            type:'result-node',
            data:{
                from:'/example-functions/node-handler-single',
                echo:'single-value',
            },
        });
    });

    test('calls javascript nodeHandler returning multiple nodes',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/node-handler-multi',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const nodeHandler=(args,ctx)=>{
                            return [
                                {
                                    path:'/result/node-1',
                                    type:'result-node',
                                    data:{
                                        index:1,
                                        echo:args.value,
                                        from:ctx.node.path,
                                    },
                                },
                                {
                                    path:'/result/node-2',
                                    type:'result-node',
                                    data:{
                                        index:2,
                                        echo:args.value,
                                        from:ctx.node.path,
                                    },
                                },
                            ];
                        };
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/node-handler-multi',
                call:{
                    args:{
                        value:'multi-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(2);
        expect(queryResult.result.nodes).toEqual([
            {
                path:'/result/node-1',
                type:'result-node',
                data:{
                    index:1,
                    echo:'multi-value',
                    from:'/example-functions/node-handler-multi',
                },
            },
            {
                path:'/result/node-2',
                type:'result-node',
                data:{
                    index:2,
                    echo:'multi-value',
                    from:'/example-functions/node-handler-multi',
                },
            },
        ]);
    });

    test('calls javascript resultHandler returning multiple nodes',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/result-handler',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const resultHandler=(args,ctx)=>{
                            return {
                                success:true,
                                result:[
                                    {
                                        path:'/result/result-1',
                                        type:'result-node',
                                        data:{
                                            kind:'resultHandler',
                                            index:1,
                                            echo:args.value,
                                            from:ctx.node.path,
                                        },
                                    },
                                    {
                                        path:'/result/result-2',
                                        type:'result-node',
                                        data:{
                                            kind:'resultHandler',
                                            index:2,
                                            echo:args.value,
                                            from:ctx.node.path,
                                        },
                                    },
                                ],
                            };
                        };
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/result-handler',
                call:{
                    args:{
                        value:'result-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(2);
        expect(queryResult.result.nodes).toEqual([
            {
                path:'/result/result-1',
                type:'result-node',
                data:{
                    kind:'resultHandler',
                    index:1,
                    echo:'result-value',
                    from:'/example-functions/result-handler',
                },
            },
            {
                path:'/result/result-2',
                type:'result-node',
                data:{
                    kind:'resultHandler',
                    index:2,
                    echo:'result-value',
                    from:'/example-functions/result-handler',
                },
            },
        ]);
    });

    test('calls javascript streamHandler',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/stream-handler',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const streamHandler=(args,ctx)=>(async function*(){
                            yield {
                                path:'/result/stream-1',
                                type:'result-node',
                                data:{
                                    index:1,
                                    echo:args.value,
                                    from:ctx.node.path,
                                },
                            };
                            yield {
                                path:'/result/stream-2',
                                type:'result-node',
                                data:{
                                    index:2,
                                    echo:args.value,
                                    from:ctx.node.path,
                                },
                            };
                        })();
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/stream-handler',
                call:{
                    args:{
                        value:'stream-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(2);
        expect(queryResult.result.nodes).toEqual([
            {
                path:'/result/stream-1',
                type:'result-node',
                data:{
                    index:1,
                    echo:'stream-value',
                    from:'/example-functions/stream-handler',
                },
            },
            {
                path:'/result/stream-2',
                type:'result-node',
                data:{
                    index:2,
                    echo:'stream-value',
                    from:'/example-functions/stream-handler',
                },
            },
        ]);
    });

    test('calls javascript function with multiple handler types defined together',async ()=>{

        const db=createDb();

        const fnNode:ConvoNode={
            path:'/example-functions/all-handlers',
            type:'function',
            data:{
                isExecutable:true,
                function:{
                    format:'javascript',
                    effects:'pure',
                    main:`
                        const handler=(args,ctx)=>{
                            return {
                                kind:'handler',
                                echo:args.value,
                                from:ctx.node.path,
                            };
                        };

                        const nodeHandler=(args,ctx)=>{
                            return [
                                {
                                    path:'/result/all-node-1',
                                    type:'result-node',
                                    data:{
                                        kind:'nodeHandler',
                                        index:1,
                                        echo:args.value,
                                        from:ctx.node.path,
                                    },
                                },
                                null,
                                {
                                    path:'/result/all-node-2',
                                    type:'result-node',
                                    data:{
                                        kind:'nodeHandler',
                                        index:2,
                                        echo:args.value,
                                        from:ctx.node.path,
                                    },
                                },
                            ];
                        };

                        const resultHandler=(args,ctx)=>{
                            return {
                                success:true,
                                result:[
                                    {
                                        path:'/result/all-result-1',
                                        type:'result-node',
                                        data:{
                                            kind:'resultHandler',
                                            index:1,
                                            echo:args.value,
                                            from:ctx.node.path,
                                        },
                                    },
                                    {
                                        path:'/result/all-result-2',
                                        type:'result-node',
                                        data:{
                                            kind:'resultHandler',
                                            index:2,
                                            echo:args.value,
                                            from:ctx.node.path,
                                        },
                                    },
                                ],
                            };
                        };

                        const streamHandler=(args,ctx)=>(async function*(){
                            yield {
                                path:'/result/all-stream-1',
                                type:'result-node',
                                data:{
                                    kind:'streamHandler',
                                    index:1,
                                    echo:args.value,
                                    from:ctx.node.path,
                                },
                            };
                            yield {
                                path:'/result/all-stream-2',
                                type:'result-node',
                                data:{
                                    kind:'streamHandler',
                                    index:2,
                                    echo:args.value,
                                    from:ctx.node.path,
                                },
                            };
                        })();
                    `,
                },
            },
        };

        const insertResult=await db.insertNodeAsync(fnNode);
        expect(insertResult.success).toBe(true);
        if(!insertResult.success){
            return;
        }

        const queryResult=await db.queryNodesAsync({
            steps:[{
                path:'/example-functions/all-handlers',
                call:{
                    args:{
                        value:'all-value',
                    },
                },
            }],
        });

        expect(queryResult.success).toBe(true);
        if(!queryResult.success){
            return;
        }

        expect(queryResult.result.nodes).toHaveLength(7);
        expect(queryResult.result.nodes).toEqual([
            {
                path:'/null',
                type:'function-result',
                data:{
                    value:{
                        kind:'handler',
                        echo:'all-value',
                        from:'/example-functions/all-handlers',
                    },
                },
            },
            {
                path:'/result/all-node-1',
                type:'result-node',
                data:{
                    kind:'nodeHandler',
                    index:1,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
            {
                path:'/result/all-node-2',
                type:'result-node',
                data:{
                    kind:'nodeHandler',
                    index:2,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
            {
                path:'/result/all-result-1',
                type:'result-node',
                data:{
                    kind:'resultHandler',
                    index:1,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
            {
                path:'/result/all-result-2',
                type:'result-node',
                data:{
                    kind:'resultHandler',
                    index:2,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
            {
                path:'/result/all-stream-1',
                type:'result-node',
                data:{
                    kind:'streamHandler',
                    index:1,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
            {
                path:'/result/all-stream-2',
                type:'result-node',
                data:{
                    kind:'streamHandler',
                    index:2,
                    echo:'all-value',
                    from:'/example-functions/all-handlers',
                },
            },
        ]);
    });
});
