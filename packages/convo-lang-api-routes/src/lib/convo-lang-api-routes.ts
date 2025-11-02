import { Conversation, ConvoCompletionServiceAndModel, ConvoHttpToInputRequest, ConvoModelInfo, ConvoRagSearch, FlatConvoConversation, completeConvoUsingCompletionServiceAsync, convertConvoInput, convoAnyModelName, convoCompletionService, convoConversationConverterProvider, convoRagService, defaultConvoHttpEndpointPrefix, defaultConvoRagSearchLimit, defaultConvoRagTol, defaultMaxConvoRagSearchLimit, getConvoCompletionServiceAsync, getConvoCompletionServiceModelsAsync, getConvoCompletionServicesForModelAsync } from '@convo-lang/convo-lang';
import { BadRequestError, InternalOptions, NotFoundError, dupDeleteUndefined, escapeRegex, getErrorMessage, safeParseNumber } from "@iyio/common";
import { HttpRoute } from "@iyio/node-common";
import { ConvoLangRouteOptions, ConvoLangRouteOptionsBase, ConvoTokenQuota, ImageGenRouteOptions, defaultConvoLangFsRoot } from './convo-lang-api-routes-lib.js';
import { createImageGenRoute } from './createImageGenRoute.js';
import { getMockConvoRoutes } from './mock-routes.js';

const modelServiceMap:Record<string,ConvoCompletionServiceAndModel[]>={}

export const createConvoLangApiRoutes=({
    prefix=defaultConvoHttpEndpointPrefix,
    imageGenOptions,
    imageGenCallback,
    fsRoot=defaultConvoLangFsRoot,
    publicWebBasePath,
    useResourceRedirects=publicWebBasePath?true:false,
    enableVfs=false,
    enableCaching=false,
    cacheQueryParam=enableCaching?'cache':undefined,
    cacheDir='cache',
    onCompletion,
    completionCtx,
    getUsage,
    enableMockRoute
}:ConvoLangRouteOptions={}):HttpRoute[]=>{

    const baseOptions:InternalOptions<ConvoLangRouteOptionsBase,'cacheQueryParam'|'publicWebBasePath'>={
        fsRoot,
        cacheDir,
        enableCaching,
        useResourceRedirects,
        cacheQueryParam,
        publicWebBasePath,
        enableVfs,
    }

    if(!prefix.startsWith('/')){
        prefix='/'+prefix;
    }

    if(prefix.endsWith('/')){
        prefix=prefix.substring(0,prefix.length-1);
    }

    const regPrefix='^'+(prefix?escapeRegex(prefix):'')

    const routes:HttpRoute[]=[
        {
            method:'GET',
            match:new RegExp(`${regPrefix}/models$`),
            handler:async ()=>{
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

                return models;

            }
        },

        {
            method:'POST',
            match:new RegExp(`${regPrefix}/completion$`),
            handler:async (ctx)=>{
                const {
                    body,
                }=ctx;
                const services=convoCompletionService.all();

                const flat:FlatConvoConversation=body;

                const service=(await getConvoCompletionServicesForModelAsync(flat.responseModel??convoAnyModelName,services,modelServiceMap))?.[0]?.service;

                try{
                    const result=await completeConvoUsingCompletionServiceAsync(
                        flat,
                        service,
                        convoConversationConverterProvider.all(),
                        completionCtx
                    );

                    if(onCompletion){
                        onCompletion({
                            httpCtx:ctx,
                            flat,
                            completionService:service,
                            result,
                            success:true,
                        })
                    }

                    return result;
                }catch(error){

                    if(onCompletion){
                        onCompletion({
                            httpCtx:ctx,
                            flat,
                            completionService:service,
                            result:[],
                            success:false,
                            error,
                        })
                    }

                    throw error;
                }
            }
        },

        {
            method:'POST',
            match:new RegExp(`${regPrefix}/convo$`),
            handler:async ({
                body,
            })=>{

                if(typeof body !== 'string'){
                    throw new BadRequestError('string convo expected')
                }

                const conversation=new Conversation();
                try{
                    conversation.append(body);
                }catch(ex){
                    throw new BadRequestError('Invalid convo format - '+getErrorMessage(ex))
                }

                const l=conversation.convo.length;

                await conversation.completeAsync(body);

                return conversation.convo.substring(l);
            }
        },

        {
            method:'POST',
            match:new RegExp(`${regPrefix}/convert$`),
            handler:async ({
                body,
            })=>{

                const request:ConvoHttpToInputRequest=body;
                let inputType=request.inputType;

                if(!inputType){
                    const modelService=await getConvoCompletionServiceAsync(request.flat,convoCompletionService.all());
                    if(!modelService?.service){
                        throw new NotFoundError('Unable to find service for model');
                    }
                    inputType=modelService.service.inputType;
                }

                const result=convertConvoInput(request.flat,inputType,convoConversationConverterProvider.all()).result
                if(!result){
                    throw new NotFoundError('No conversion found');
                }
                return result;
            }
        },

        {
            method:'GET',
            match:new RegExp(`${regPrefix}/usage$`),
            handler:async (ctx)=>{

                let usage:ConvoTokenQuota|undefined;
                if(getUsage){
                    usage=await getUsage(ctx);
                }

                if(!usage){
                    usage={
                        id:'_',
                        usage:-1,
                    }
                }

                return usage;
            }
        },

        {
            method:'POST',
            match:new RegExp(`${regPrefix}/rag/search$`),
            handler:async ({
                body
            })=>{

                const search:ConvoRagSearch=body;
                if(!search){
                    throw new BadRequestError();
                }

                if(search.limit===undefined){
                    search.limit=defaultConvoRagSearchLimit;
                }

                if(search.limit>defaultMaxConvoRagSearchLimit){
                    search.limit=defaultMaxConvoRagSearchLimit;
                }

                return await convoRagService().searchAsync(search);
            }
        },

        {
            method:'GET',
            match:new RegExp(`${regPrefix}/rag/search/(.*)`),
            handler:async ({
                query
            })=>{

                const content=query['1'];
                if(!content){
                    throw new BadRequestError();
                }

                return await convoRagService().searchAsync({
                    content,
                    tolerance:safeParseNumber(query['tol'],defaultConvoRagTol),
                    paths:query['paths']?.split(',').map(p=>p.trim()).filter(p=>p),
                    limit:Math.min(safeParseNumber(query['limit'],defaultConvoRagSearchLimit),defaultMaxConvoRagSearchLimit),
                });
            }
        },
    ];

    if(enableMockRoute){
        routes.push(...getMockConvoRoutes(regPrefix))
    }

    if(imageGenOptions || imageGenCallback){
        const imageGenerator=imageGenCallback??imageGenOptions?.imageGenerator;
        if(imageGenerator){
            const imgOptions:ImageGenRouteOptions={
                imageGenerator,
                routeMatch:new RegExp(`${regPrefix}/image/([^/]+)/([^/]+)`),
                promptQueryParam:2,
                saltQueryParam:1,
                ...baseOptions,
                ...dupDeleteUndefined(imageGenOptions)
            }
            routes.push(createImageGenRoute(imgOptions));
        }
    }


    return routes;
}
