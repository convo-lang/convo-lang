import { completeConvoUsingCompletionServiceAsync, convertConvoInput, convoAnyModelName, ConvoCompletionChunk, ConvoCompletionCtx, ConvoCompletionMessage, ConvoCompletionService, convoCompletionService, ConvoCompletionServiceAndModel, ConvoCompletionServiceFeatureSupport, convoConversationConverterProvider, ConvoDbActionDeleteEdge, ConvoDbActionDeleteEmbedding, ConvoDbActionDeleteNode, ConvoDbActionInsertEdge, ConvoDbActionInsertEmbedding, ConvoDbActionInsertNode, ConvoDbActionUpdateEdge, ConvoDbActionUpdateEmbedding, ConvoDbActionUpdateNode, ConvoDbCommand, ConvoDbMap, convoDbService, ConvoEmbeddingsGenerationSupportRequest, convoEmbeddingsService, type ConvoHttpToInputRequest, type ConvoModelInfo, ConvoNodeQuery, ConvoNodeStreamItem, convoTranscriptionRequestToSupportRequest, convoTranscriptionService, ConvoTtsRequest, convoTtsService, type FlatConvoConversation, FlatConvoConversationBase, getConvoCompletionServiceAsync, getConvoCompletionServiceModelsAsync, getConvoCompletionServicesForModelAsync } from "@convo-lang/convo-lang";
import { CancelToken, minuteMs, uuid } from "@iyio/common";
import { Context, Hono } from "hono";
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';
import { timeout } from 'hono/timeout';
import z from "zod";
import { initConvoHonoAsync } from "./convo-lang-hono-init.js";

export const ConvoTokenQuotaScheme=z.object({
    id:z.string(),
    usage:z.number(),
    cap:z.number().optional(),
})
export type ConvoTokenQuota=z.infer<typeof ConvoTokenQuotaScheme>;

export interface ConvoCompletionRequestCtx{
    requestContext:Context;
    flat:FlatConvoConversation;
    completionService?:ConvoCompletionService<any,any>;
    result:ConvoCompletionMessage[];
    error?:any;
    success:boolean;
}

export interface ConvoHonoRoutesOptions
{
    completionTimeoutMs?:number;
    enableLogging?:boolean;
    dbMap?:ConvoDbMap;
    
    onCompletion?:(requestCtx:ConvoCompletionRequestCtx)=>void;

    beforeComplete?:(requestCtx:Context,service:ConvoCompletionService<any,any>,input:any,flat:FlatConvoConversationBase)=>void|Promise<void>;
    afterComplete?:(requestCtx:Context,service:ConvoCompletionService<any,any>,output:any,input:any,flat:FlatConvoConversationBase)=>void|Promise<void>;

    completionCtx?:ConvoCompletionCtx;

    getUsage?:(ctx:Context)=>ConvoTokenQuota|undefined|Promise<ConvoTokenQuota|undefined>;

    /**
     * If true a mock route will be added for demoing purposes
     */
    enableMockRoute?:boolean;
}

export const getConvoHonoRoutes=({
    completionTimeoutMs=minuteMs*30,
    enableLogging,
    dbMap,
    onCompletion,
    beforeComplete,
    afterComplete,
    completionCtx,
    getUsage,
}:ConvoHonoRoutesOptions={})=>{
    const convoModelServiceMap:Record<string,ConvoCompletionServiceAndModel[]>={};

    const routes=new Hono();

    let modelCache:ConvoModelInfo[]|undefined;

    if(enableLogging){
        const customLogger=(message:string,...rest:string[])=>{
            console.log(message,...rest)
        }
        routes.use(logger(customLogger));
    }

    routes.get('/models',async (c)=>{

        if(modelCache){
            return c.json(modelCache);
        }

        await initConvoHonoAsync();


        const services=convoCompletionService.all();
        const models:ConvoModelInfo[]=[];

        for(const s of services){
            if(!s.getModelsAsync){
                continue;
            }
            const ms=await getConvoCompletionServiceModelsAsync(s);
            if(ms.length){
                models.push(...ms);
            }
        }

        models.sort((a,b)=>(b.priority??0)-(a.priority??0));

        modelCache=models;

        return c.json(models);
    });

    routes.get('/completion/support/:modelName',async (c)=>{

        await initConvoHonoAsync();

        const services=convoCompletionService.all();

        const name=c.req.param('modelName');

        const support:ConvoCompletionServiceFeatureSupport={};
        for(const ser of services){
            const s=await ser.getSupportAsync?.(name);
            if(s){
                for(const e in s){
                    const v=(s as any)[e];
                    if(v===true){
                        (support as any)[e]=true;
                    }
                }
            }
        }

        return c.json(support,200);
    });

    routes.post('/completion',timeout(completionTimeoutMs),async (c)=>{
        return completeAsync(c,true,completionCtx) as any;
    });

    routes.post('/completion/stream',timeout(completionTimeoutMs),(c)=>{
        return streamSSE(c,async stream=>{
            let mid='';
            const result=await completeAsync(c,false,{
                ...completionCtx,
                onChunk:async (_service,chunk)=>{
                    mid=chunk.mid;
                    await stream.writeSSE({
                        event:'chunk',
                        id:chunk.id,
                        data:JSON.stringify(chunk)
                    })
                }
            });
            const id=uuid();
            await stream.writeSSE({
                event:'complete',
                id,
                data:JSON.stringify({
                    id,
                    mid:mid||uuid(),
                    type:'completion',
                    completion:result as ConvoCompletionMessage[],
                } satisfies ConvoCompletionChunk),
            })
        });
    });

    const completeAsync=async (c:Context,returnJson:boolean,ctx?:ConvoCompletionCtx<any,any>)=>{

        await initConvoHonoAsync();

        const flat:FlatConvoConversation=await c.req.json();

        const services=convoCompletionService.all();

        const service=(await getConvoCompletionServicesForModelAsync(flat.responseModel??convoAnyModelName,services,convoModelServiceMap))?.[0]?.service;

        try{
            const result=await completeConvoUsingCompletionServiceAsync(
                flat,
                service,
                convoConversationConverterProvider.all(),
                {
                    ...ctx,

                    beforeComplete:beforeComplete?(service,input,flat)=>{
                        return beforeComplete(c,service,input,flat);
                    }:ctx?.beforeComplete,
                    
                    afterComplete:afterComplete?(service,output,input,flat)=>{
                        return afterComplete(c,service,output,input,flat);
                    }:ctx?.afterComplete,

                }
            );

            if(onCompletion){
                onCompletion({
                    requestContext:c,
                    flat,
                    completionService:service,
                    result,
                    success:true,
                })
            }

            return returnJson?c.json(result):result;
        }catch(error){

            if(onCompletion){
                onCompletion({
                    requestContext:c,
                    flat,
                    completionService:service,
                    result:[],
                    success:false,
                    error,
                })
            }
            
            console.error('completion failed',error);
            if(!returnJson){
                throw error;
            }
            return c.json(error,500);
        }
    }

    if(getUsage){
        routes.get('/usage',async c=>{
            let usage:ConvoTokenQuota|undefined;
            if(getUsage){
                usage=await getUsage(c);
            }

            if(!usage){
                usage={
                    id:'_',
                    usage:-1,
                }
            }

            return c.json(usage);
        });
    }

    routes.post('/convert',async (c)=>{

        await initConvoHonoAsync();

        const request:ConvoHttpToInputRequest=await c.req.json();
        let inputType=request.inputType;

        if(!inputType){
            const modelService=await getConvoCompletionServiceAsync(request.flat,convoCompletionService.all());
            if(!modelService?.service){
                return c.json('Unable to find service for model',404);
            }
            inputType=modelService.service.inputType;
        }

        const result=convertConvoInput(request.flat,inputType,convoConversationConverterProvider.all()).result
        if(!result){
            return c.json('No conversion found',404);
        }
        return c.json(result);
    });

    routes.post('/transcribe',async (c)=>{

        await initConvoHonoAsync();

        const data=await c.req.formData();
        const audio=data.get('audio');
        const requestF=data.get('request');
        if(typeof requestF !== 'string'){
            return c.json('request param request',400);
        }
        if(!(audio instanceof Blob)){
            return c.json('audio should be a blob',400);
        }
        const request=JSON.parse(requestF as string);
        request.audio=audio;

        const all=convoTranscriptionService.all();
        const support=convoTranscriptionRequestToSupportRequest(request);
        for(const s of all){
            if(!await s.canTranscribe(support)){
                continue;
            }
            const t=await s.transcribeAsync(request);
            if(t.success){
                delete t.file;
            }
            return c.json(t,t.success?200:500);
        }

        return c.json('No supported',400);
    });

    routes.post('/transcribe/support',async (c)=>{

        await initConvoHonoAsync();

        const services=convoTranscriptionService.all();

        const request=await c.req.json();

        for(const ser of services){
            if(await ser.canTranscribe(request)){
                return c.json(true);
            }

        }

        return c.json(false);
    });

    routes.post('/tts',async (c)=>{

        await initConvoHonoAsync();

        const request=await c.req.json() as ConvoTtsRequest;

        const all=convoTtsService.all();
        for(const s of all){
            if(!await s.canConvertToSpeech(request)){
                continue;
            }
            const t=await s.convertToSpeechAsync(request);
            if(t.success){
                return new Response(
                    t.tts.audio,
                    {headers:{
                        'Content-Type':t.tts.audio.type,
                    }}
                )
            }else{
                return c.json(t.error,500);
            }
        }

        return c.json('No supported',400);
    });

    routes.post('/tts/support',async (c)=>{

        await initConvoHonoAsync();

        const services=convoTtsService.all();

        const request=await c.req.json();

        for(const ser of services){
            if(await ser.canConvertToSpeech(request)){
                return c.json(true);
            }

        }

        return c.json(false);
    });

    routes.post('/embeddings',async (c)=>{

        await initConvoHonoAsync();

        const request=await c.req.json();
        const supportRequest={...request} as ConvoEmbeddingsGenerationSupportRequest;
        delete (supportRequest as any).text;

        const all=convoEmbeddingsService.all();
        for(const s of all){
            if(!await s.canGenerateEmbeddings(supportRequest)){
                continue;
            }
            const t=await s.generateEmbeddingsAsync(request);
            if(t.success){
                return c.json(t.result,200);
            }else{
                return c.json(t.error,t.statusCode);
            }
        }

        return c.json('No supported',400);
    });

    routes.post('/embeddings/support',async (c)=>{

        await initConvoHonoAsync();

        const services=convoEmbeddingsService.all();

        const request=await c.req.json();

        for(const ser of services){
            if(await ser.canGenerateEmbeddings(request)){
                return c.json(true);
            }

        }

        return c.json(false);
    });

    const getDb=(name:string)=>{
        if(!dbMap){
            return name==='default'?convoDbService.get():undefined;
        }
        const named=dbMap[name];
        if(named){
            return named();
        }
        const fallback=dbMap['*'];
        if(fallback){
            let db=fallback();
            dbMap[name]=()=>db;
            return db;
        }
        return undefined;
    }

    routes.post('/db/:dbName',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const commands=await c.req.json<ConvoDbCommand[]>();

        const result=await store.executeCommandsAsync(commands);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.post('/db/:dbName/node/query',async (c)=>{

        await initConvoHonoAsync();

        try{

            const store=getDb(c.req.param('dbName'));
            if(!store){
                return c.json('No database found by name',404);
            }

            const query:ConvoNodeQuery=await c.req.json();
            const result=await store.queryNodesAsync(query);
            
            if(!result.success){
                return c.json(result.error,result.statusCode);
            }

            return c.json(result.result,200);
        }catch(ex){
            return c.json(ex,500);
        }
    });

    routes.get('/db/:dbName/node/:path{.*}',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        let path=c.req.param('path');
        if(!path.startsWith('/')){
            path='/'+path;
        }

        const result=await store.queryNodesAsync({steps:[{path}]})
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        if(path.endsWith('*')){
            const first=result.result.nodes[0];
            if(!first){
                return c.json('not found',404);
            }
            return c.json(first,200);
        }else{
            return c.json(result.result,200);
        }
    });

    routes.post('/db/:dbName/node',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionInsertNode=await c.req.json();
        const result=await store.insertNodeAsync(request.node,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.patch('/db/:dbName/node',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionUpdateNode=await c.req.json();
        const result=await store.updateNodeAsync(request.node,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.delete('/db/:dbName/node',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionDeleteNode=await c.req.json();
        const result=await store.deleteNodeAsync(request.path,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.get('/db/:dbName/edge/:id',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const result=await store.getEdgeByIdAsync(c.req.param('id'));

        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.post('/db/:dbName/edge',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionInsertEdge=await c.req.json();
        const result=await store.insertEdgeAsync(request.edge,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.patch('/db/:dbName/edge',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionUpdateEdge=await c.req.json();
        const result=await store.updateEdgeAsync(request.update,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.delete('/db/:dbName/edge',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionDeleteEdge=await c.req.json();
        const result=await store.deleteEdgeAsync(request.id,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.get('/db/:dbName/embedding/:id',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const result=await store.getEmbeddingByIdAsync(c.req.param('id'));

        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.post('/db/:dbName/embedding',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionInsertEmbedding=await c.req.json();
        const result=await store.insertEmbeddingAsync(request.embedding,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(result.result,200);
    });

    routes.patch('/db/:dbName/embedding',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionUpdateEmbedding=await c.req.json();
        const result=await store.updateEmbeddingAsync(request.update,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.delete('/db/:dbName/embedding',async (c)=>{

        await initConvoHonoAsync();

        const store=getDb(c.req.param('dbName'));
        if(!store){
            return c.json('No database found by name',404);
        }

        const request:ConvoDbActionDeleteEmbedding=await c.req.json();
        const result=await store.deleteEmbeddingAsync(request.id,request.options);
        
        if(!result.success){
            return c.json(result.error,result.statusCode);
        }

        return c.json(null,201);
    });

    routes.post('/db/:dbName/stream',timeout(completionTimeoutMs),async (c)=>{

        return streamSSE(c,async stream=>{

            await initConvoHonoAsync();

            let id=0;
            let ping=0;

            const store=getDb(c.req.param('dbName'));
            if(!store){
                const item:ConvoNodeStreamItem<any>={
                    type:'error',
                    error:'Database not found by name',
                    statusCode:404
                }
                await stream.writeSSE({
                    event:'node',
                    id:(id++).toString(),
                    data:JSON.stringify(item),
                });
                return;
            }

            const query=await c.req.json<ConvoNodeQuery>();

            let queue:ConvoNodeStreamItem<any>[]=[];
            let isWriting=false;
            const iv=setInterval(async ()=>{
                if(isWriting){
                    return;
                }
                isWriting=true;
                try{
                    await stream.writeSSE({
                        event:'ping',
                        id:'p'+(ping++),
                        data:'null'
                    });
                    if(queue.length){
                        const q=queue;
                        queue=[];
                        for(const item of q){
                            await stream.writeSSE({
                                event:'node',
                                id:(id++).toString(),
                                data:JSON.stringify(item)
                            });
                        }
                    }
                }catch(ex){
                    console.error('Write SSE ping failed',ex);    
                }finally{
                    isWriting=false;
                }
            },7500);
            try{
                const cancel=new CancelToken();
                stream.onAbort(()=>{
                    cancel.cancelNow();
                });
                if(cancel.isCanceled){
                    return;
                }


                for await(const item of store.streamNodesAsync(query,cancel)){
                    if(isWriting){
                        queue.push(item);
                    }else{
                        isWriting=true;
                        try{
                            await stream.writeSSE({
                                event:'node',
                                id:(id++).toString(),
                                data:JSON.stringify(item)
                            });
                        }finally{
                            isWriting=false;
                        }
                    }
                    if(cancel.isCanceled){
                        break;
                    }
                }
            }finally{
                clearInterval(iv);
            }

        });
    });

    return routes;
}
