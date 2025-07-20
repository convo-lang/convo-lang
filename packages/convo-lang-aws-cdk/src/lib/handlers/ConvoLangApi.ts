import { unknownConvoTokenPrice } from "@convo-lang/convo-lang";
import { createConvoLangApiRoutes } from "@convo-lang/convo-lang-api-routes";
import { BadRequestError, FnEvent, NotFoundError, asArrayItem, createFnHandler, queryParamsToObject } from '@iyio/common';
import { HttpRoute, getHttpRoute } from '@iyio/node-common';
import { initBackend } from "../convo-lang-aws-cdk-lib";
import { checkTokenQuotaAsync, storeTokenUsageAsync } from '../price-capping';


initBackend();


let currentRemoteAddress='0.0.0.0';
let routes:HttpRoute[]|null=null;
const getRoutes=()=>{
    return routes??(routes=createConvoLangApiRoutes({
        prefix:'',
        onCompletion:async ({result,flat})=>{
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
            await storeTokenUsageAsync(
                price,
                {remoteAddress:currentRemoteAddress}
            )
        },
        completionCtx:{
            beforeComplete:async (service,input,flat)=>{
                if(flat.apiKeyUsedForCompletion){
                    return;
                }
                const quota=await checkTokenQuotaAsync({remoteAddress:currentRemoteAddress});
                if(!quota.allow){
                    throw new BadRequestError('Token limit reached');
                }
            },
        }
    }));
}

const ConvoLangAPi=async (
    fnEvt:FnEvent,
    input:any
):Promise<any>=>{

    const routes=getRoutes();

    const method=fnEvt.method;
    let path=fnEvt.path;
    if(path.startsWith('/api/')){
        path=path.substring(4);
    }

    currentRemoteAddress=fnEvt.remoteAddress||'0.0.0.0';

    const qi=path.indexOf('?');
    const query:Record<string,string>=qi===-1?{}:queryParamsToObject(path.substring(qi));
    if(qi!==-1){
        path=path.substring(0,qi);
    }

    const route=getHttpRoute(path,method,routes);

    if(!route){
        throw new NotFoundError('Route not found')
    }

    const regex=asArrayItem(route.match);
    if(regex){
        const match=regex.exec(path);
        if(match){
            for(let i=1;i<match.length;i++){
                const value=match[i];
                query[i.toString()]=decodeURIComponent(value??'');

            }
        }
    }

    try{
        return await route.handler({
            req:{} as any,// convo-lang routes do not use the req object
            res:{} as any,// convo-lang routes do not use the res object
            path,
            filePath:'.',
            body:input,
            method,
            query
        });
    }finally{
        currentRemoteAddress='0.0.0.0';
    }
}

export const handler=createFnHandler(ConvoLangAPi,{});

