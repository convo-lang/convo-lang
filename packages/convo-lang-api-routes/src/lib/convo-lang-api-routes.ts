import { Conversation, ConvoCompletionServiceAndModel, ConvoHttpToInputRequest, ConvoModelInfo, FlatConvoConversation, completeConvoUsingCompletionServiceAsync, convertConvoInput, convoAnyModelName, convoCompletionService, convoConversationConverterProvider, defaultConvoHttpEndpointPrefix, getConvoCompletionServiceModelsAsync, getConvoCompletionServicesForModelAsync } from '@convo-lang/convo-lang';
import { BadRequestError, InternalOptions, dupDeleteUndefined, escapeRegex, getErrorMessage } from "@iyio/common";
import { HttpRoute } from "@iyio/node-common";
import { ConvoLangRouteOptions, ConvoLangRouteOptionsBase, ImageGenRouteOptions, defaultConvoLangFsRoot } from './convo-lang-api-routes-lib';
import { createImageGenRoute } from './createImageGenRoute';

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

    const regPrefix='^'+escapeRegex(prefix);

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
            handler:({
                body,
            })=>{

                const request:ConvoHttpToInputRequest=body;

                return convertConvoInput(request.flat,request.inputType,convoConversationConverterProvider.all());
            }
        },
    ];

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
