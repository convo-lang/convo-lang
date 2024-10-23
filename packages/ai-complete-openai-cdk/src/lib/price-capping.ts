import { TokenQuota } from "@iyio/ai-complete";
import { createUpdateExpression, dynamoClient } from "@iyio/aws-dynamo";
import { DataTableDescription } from "@iyio/common";
import { aiCompleteAnonUsdCapParam, aiCompleteAnonUsdCapTotalParam, aiCompleteCapsTableParam } from "./ai-complete-openai-cdk.deps";

export interface CallerInfo
{
    remoteAddress:string;
}

export interface QuotaResult
{
    allow:boolean;
    totalUsage?:number;
    singleUsage?:number;
    totalCap?:number;
    singleCap?:number;
}

const CapsTable:DataTableDescription<TokenQuota>={
    name:"Caps",
    primaryKey:"id",
    tableIdParam:aiCompleteCapsTableParam,
}

const _getCapAsync=async (id:string):Promise<TokenQuota>=>{
    let cap=await dynamoClient().getFromTableAsync(CapsTable,{id});
    if(cap){
        return cap;
    }
    cap={id,usage:0}
    await dynamoClient().putIntoTable(CapsTable,cap);
    return cap;
}

export const getTokenQuotaAsync=(caller:CallerInfo):Promise<TokenQuota>=>{
    const id=caller.remoteAddress||'0.0.0.0';
    return _getCapAsync(id);
}

export const checkTokenQuotaAsync=async (
    caller:CallerInfo
):Promise<QuotaResult>=>{

    const id=caller.remoteAddress||'0.0.0.0';

    let singleCap=aiCompleteAnonUsdCapParam.get();
    let totalCap=aiCompleteAnonUsdCapTotalParam.get();

    if(singleCap===undefined && totalCap===undefined){
        return {allow:true};
    }

    const [single,total]=await Promise.all([
        singleCap!==undefined?_getCapAsync(id):undefined,
        totalCap!==undefined?_getCapAsync('_'):undefined,
    ]);

    if(single?.cap!==undefined){
        singleCap=single.cap;
    }

    if(total?.cap!==undefined){
        totalCap=total.cap;
    }

    const allow=(
        (singleCap===undefined?true:single?single.usage<singleCap:false) &&
        (totalCap===undefined?true:total?total.usage<totalCap:false)
    )
    return {
        allow,
        singleUsage:(singleCap===undefined || !single)?undefined:singleCap-single.usage,
        totalUsage:(totalCap===undefined || !total)?undefined:totalCap-total.usage,
        singleCap,
        totalCap

    }
}


export const storeTokenUsageAsync=async (usage:number,caller:CallerInfo)=>{

    const id=caller.remoteAddress||'0.0.0.0';

    const singleCap=aiCompleteAnonUsdCapParam.get();
    const totalCap=aiCompleteAnonUsdCapTotalParam.get();

    if(singleCap===undefined && totalCap===undefined){
        return;
    }

    await Promise.all([
        singleCap!==undefined?dynamoClient().patchTableItem(CapsTable,{
            id,
            usage:createUpdateExpression({
                add:usage
            })
        }):undefined,
        totalCap!==undefined?dynamoClient().patchTableItem(CapsTable,{
            id:'_',
            usage:createUpdateExpression({
                add:usage
            })
        }):undefined,
    ]);

}
