import { Conversation, ConvoModelInfo, FlatConvoConversation, completeConvoUsingCompletionServiceAsync, convoCompletionService, convoConversationConverterProvider, defaultConvoHttpEndpointPrefix } from '@convo-lang/convo-lang';
import { BadRequestError, escapeRegex, getErrorMessage } from "@iyio/common";
import { HttpRoute } from "@iyio/node-common";

export interface VfsHttpRouteOptions
{
    prefix?:string;
}

export const createConvoLangApiRoutes=({
    prefix=defaultConvoHttpEndpointPrefix,
}:VfsHttpRouteOptions={}):HttpRoute[]=>{

    if(!prefix.startsWith('/')){
        prefix='/'+prefix;
    }

    if(prefix.endsWith('/')){
        prefix=prefix.substring(0,prefix.length-1);
    }

    const regPrefix='^'+escapeRegex(prefix);

    return [
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
                    const ms=await s.getModelsAsync();
                    if(ms){
                        models.push(...ms);
                    }
                }

                return models;

            }
        },

        {
            method:'POST',
            match:new RegExp(`${regPrefix}/completion$`),
            handler:async ({
                body,
            })=>{
                const services=convoCompletionService.all();

                const flat:FlatConvoConversation=body;

                let service=services.find(s=>s.canComplete(flat.responseModel,flat));

                return completeConvoUsingCompletionServiceAsync(
                    flat,
                    service,
                    convoConversationConverterProvider.all()
                );
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



    ]
}
