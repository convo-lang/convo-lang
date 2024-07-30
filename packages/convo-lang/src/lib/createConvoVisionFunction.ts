import { z } from "zod";
import { convoFunctions, convoLabeledScopeParamsToObj, convoVars, defaultConvoVisionResponse, escapeConvoMessageContent } from "./convo-lib";
import { ConvoFunctionDef } from "./convo-types";

const paramsType=z.object({
    query:z.string().describe('The question or request made by the user.'),
    supportInfo:z.string().optional().describe("Any supporting information required to answer the user's question or complete their request. This can include information from previous messages."),
    imageUrls:z.string().array().describe('URLs of referenced images')
})

export type CreateConvoVisionFunctionOptions=Partial<ConvoFunctionDef>;

export const createConvoVisionFunction=({
    ...defaults
}:CreateConvoVisionFunctionOptions={}):ConvoFunctionDef=>{
    return {
        ...defaults,
        name:convoFunctions.queryImage,
        description:'Queries an image based on a user request',
        paramsType,
        scopeCallback:async (scope,ctx)=>{
            const {
                query,
                supportInfo,
                imageUrls
            }=paramsType.parse(convoLabeledScopeParamsToObj(scope));

            const srcConvo=ctx.convo.conversation;
            if(!srcConvo){
                return {error:'no parent conversation found'};
            }

            const convo=srcConvo?.createChild({
                capabilities:[],
                serviceCapabilities:['vision'],
            });

            const varMsg=ctx.getVar(convoVars.__visionServiceSystemMessage,scope);
            if(typeof varMsg === 'string'){
                convo.append(/*convo*/`
                    > system
                    ${escapeConvoMessageContent(varMsg)}
                `)
            }

            convo.append(/*convo*/`
                > user
                ${(supportInfo?escapeConvoMessageContent(supportInfo)+'\n\n':'')+imageUrls.map(i=>`![](${i})`).join('\n')}
                ${escapeConvoMessageContent(query)}
            `);

            convo.unregisteredVars['__debug']=true;

            const completion=await convo.completeAsync();

            const response=completion.message?.content;
            if(response!==undefined){
                return {result:response};
            }

            const d=ctx.getVar(convoVars.__defaultVisionResponse,scope);
            return {result:(typeof d === 'string')?d:defaultConvoVisionResponse};

        }
    }
}
