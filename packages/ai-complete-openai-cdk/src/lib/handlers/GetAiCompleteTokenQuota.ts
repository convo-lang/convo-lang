import { TokenQuota, TokenQuotaScheme } from '@iyio/ai-complete';
import { FnEvent, createFnHandler } from '@iyio/common';
import { initBackend } from "../ai-complete-openai-cdk-lib";
import { getTokenQuotaAsync } from '../price-capping';

initBackend();

const GetAiCompleteTokenQuota=async (
    fnEvt:FnEvent,
):Promise<TokenQuota>=>{

    const remoteAddress=fnEvt.remoteAddress||'0.0.0.0';

    return getTokenQuotaAsync({remoteAddress});
}

export const handler=createFnHandler(GetAiCompleteTokenQuota,{
    outputScheme:TokenQuotaScheme,
});

