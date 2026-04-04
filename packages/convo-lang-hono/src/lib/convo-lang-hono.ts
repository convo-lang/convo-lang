import { completeConvoUsingCompletionServiceAsync, convertConvoInput, convoAnyModelName, convoCompletionService, ConvoCompletionServiceAndModel, convoConversationConverterProvider, type ConvoHttpToInputRequest, type ConvoModelInfo, type FlatConvoConversation, getConvoCompletionServiceAsync, getConvoCompletionServiceModelsAsync, getConvoCompletionServicesForModelAsync } from "@convo-lang/convo-lang";
import { minuteMs } from "@iyio/common";
import { Hono } from "hono";
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



    routes.get('/models',async (c)=>{

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

        return c.json(models);
    });

    routes.post('/completion',timeout(completionTimeoutMs),async (c)=>{

        await initConvoHonoAsync();

        const body=await c.req.json();
        const services=convoCompletionService.all();

        const flat:FlatConvoConversation=body;

        const service=(await getConvoCompletionServicesForModelAsync(flat.responseModel??convoAnyModelName,services,convoModelServiceMap))?.[0]?.service;

        try{
            const result=await completeConvoUsingCompletionServiceAsync(
                flat,
                service,
                convoConversationConverterProvider.all()
            );

            return c.json(result);
        }catch(error){
            console.error('completion failed',error);
            return c.json(error,500);
        }
    });

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

    return routes;
}
