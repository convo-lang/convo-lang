import { TokenQuota, TokenQuotaScheme } from '@convo-lang/convo-lang-aws';
import { FnEvent, createFnHandler } from '@iyio/common';
import { initBackend } from "../convo-lang-aws-cdk-lib";
import { getTokenQuotaAsync } from '../price-capping';

initBackend();

const GetConvoLangTokenQuota=async (
    fnEvt:FnEvent,
):Promise<TokenQuota>=>{

    const remoteAddress=fnEvt.remoteAddress||'0.0.0.0';

    return getTokenQuotaAsync({remoteAddress});
}

export const handler=createFnHandler(GetConvoLangTokenQuota,{
    outputScheme:TokenQuotaScheme,
});

