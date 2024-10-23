import { AiCompletionRequest, AiCompletionRequestScheme, AiCompletionResult, AiCompletionResultScheme, aiComplete, aiCompleteModelCliam } from '@iyio/ai-complete';
import { FnEvent, UnauthorizedError, createFnHandler, shortUuid } from '@iyio/common';
import { initBackend } from "../ai-complete-openai-cdk-lib";
import { openAiAllowOpenAccessParam } from '../ai-complete-openai-cdk.deps';
import { QuotaResult, checkTokenQuotaAsync, storeTokenUsageAsync } from '../price-capping';

initBackend();

const CompleteOpenAiPrompt=async (
    fnEvt:FnEvent,
    input:AiCompletionRequest
):Promise<AiCompletionResult>=>{

    const remoteAddress=fnEvt.remoteAddress||'0.0.0.0';

    let quota:QuotaResult|undefined;

    if(!input.apiKey){
        quota=await checkTokenQuotaAsync({remoteAddress});
        if(!quota.allow){
            return {
                options:[{
                    message:{
                        id:shortUuid(),
                        type:'text',
                        role:'assistant',
                        content:'Token limit reached'
                    },
                    confidence:1,
                }]
            }
        }
    }

    const openAccess=openAiAllowOpenAccessParam();
    const _modelsString=fnEvt.claims?.[aiCompleteModelCliam];
    if(!(typeof _modelsString === 'string') && !openAccess){
        throw new UnauthorizedError();
    }

    const modelsString=(_modelsString as string)??'default';

    const r=await aiComplete().completeAsync(input,{
        allowedModels:modelsString.split(',').map(m=>m.trim()),
        allowAllModels:openAccess,
    });

    if(!input.apiKey){
        await storeTokenUsageAsync(
            r.tokenPrice??1,
            {remoteAddress}
        )
    }

    if(quota && quota.singleCap!==undefined && quota.singleUsage!==undefined){
        r.quotaUsd=quota.singleCap;
        r.quotaUsedUsd=quota.singleUsage;
    }

    return r;
}

export const handler=createFnHandler(CompleteOpenAiPrompt,{
    inputScheme:AiCompletionRequestScheme,
    outputScheme:AiCompletionResultScheme,
});

