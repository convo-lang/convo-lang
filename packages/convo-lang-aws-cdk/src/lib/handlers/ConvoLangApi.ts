import { unknownConvoTokenPrice } from "@convo-lang/convo-lang";
import { getConvoHonoRoutes } from "@convo-lang/hono/convo-lang-hono.js";
import { handle } from 'hono/aws-lambda';
import { initBackend } from "../convo-lang-aws-cdk-lib.js";
import { checkTokenQuotaAsync, getTokenQuotaAsync, storeTokenUsageAsync } from '../price-capping.js';

initBackend();

class TokenLimitError extends Error
{

}

const defaultAddress='0.0.0.0';
export const handler=handle(getConvoHonoRoutes({
    onCompletion:async ({requestContext,result,flat})=>{
        if(flat.apiKeyUsedForCompletion){
            return;
        }
        let price=0;
        for(const m of result){
            if(m.tokenPrice){
                price+=m.tokenPrice;
            }else{
                price+=((m.inputTokens??0)*unknownConvoTokenPrice)+((m.outputTokens??0)*unknownConvoTokenPrice);
            }
        }
        const address=requestContext.req.header('X-Forwarded-For')||defaultAddress;
        await storeTokenUsageAsync(
            price,
            {remoteAddress:address}
        )
    },
    beforeComplete:async (c,service,input,flat)=>{
        if(flat.apiKeyUsedForCompletion){
            return;
        }
        const address=c.req.header('X-Forwarded-For')||defaultAddress;
        const quota=await checkTokenQuotaAsync({remoteAddress:address});
        if(!quota.allow){
            throw new TokenLimitError('Token limit reached');
        }
    },
    getUsage:async (c)=>{
        const address=c.req.header('X-Forwarded-For')||defaultAddress;
        return await getTokenQuotaAsync({remoteAddress:address})
    }
}));

