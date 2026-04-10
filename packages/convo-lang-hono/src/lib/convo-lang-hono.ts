import { completeConvoUsingCompletionServiceAsync, convertConvoInput, convoAnyModelName, ConvoCompletionChunk, ConvoCompletionCtx, ConvoCompletionMessage, convoCompletionService, ConvoCompletionServiceAndModel, ConvoCompletionServiceFeatureSupport, convoConversationConverterProvider, type ConvoHttpToInputRequest, type ConvoModelInfo, convoTranscriptionRequestToSupportRequest, convoTranscriptionService, type FlatConvoConversation, getConvoCompletionServiceAsync, getConvoCompletionServiceModelsAsync, getConvoCompletionServicesForModelAsync } from "@convo-lang/convo-lang";
import { minuteMs, uuid } from "@iyio/common";
import { Context, Hono } from "hono";
import { streamSSE } from 'hono/streaming';
import { timeout } from 'hono/timeout';
import { initConvoHonoAsync } from "./convo-lang-hono-init.js";

export interface ConvoHonoRoutesOptions
{
    completionTimeoutMs?:number;
}

export const getConvoHonoRoutes=({
    completionTimeoutMs=minuteMs*30,
}={})=>{
    const convoModelServiceMap:Record<string,ConvoCompletionServiceAndModel[]>={};

    const routes=new Hono();

    let modelCache:ConvoModelInfo[]|undefined;


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
        return await completeAsync(c,true) as any;
    });

    routes.post('/completion/stream',timeout(completionTimeoutMs),(c)=>{
        return streamSSE(c,async stream=>{
            let mid='';
            const result=await completeAsync(c,false,{
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
                ctx
            );

            return returnJson?c.json(result):result;
        }catch(error){
            console.error('completion failed',error);
            if(!returnJson){
                throw error;
            }
            return c.json(error,500);
        }
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
            return c.json(t);
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

    return routes;
}


