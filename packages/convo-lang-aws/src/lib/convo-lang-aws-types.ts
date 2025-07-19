import { z } from "zod";

export const TokenQuotaScheme=z.object({
    id:z.string(),
    usage:z.number(),
    cap:z.number().optional(),
})
export type TokenQuota=z.infer<typeof TokenQuotaScheme>;

export const ConvoLangAwsRequestScheme=z.object({
    endpoint:z.string(),
    method:z.enum(['GET','POST','PUT','DELETE']),
    apiKeys:z.record(z.string()).optional(),
    body:z.any(),
});
export type ConvoLangAwsRequest=z.infer<typeof ConvoLangAwsRequestScheme>;

