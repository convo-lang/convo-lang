import { z } from "zod";

export const TokenQuotaScheme=z.object({
    id:z.string(),
    usage:z.number(),
    cap:z.number().optional(),
})
export type TokenQuota=z.infer<typeof TokenQuotaScheme>;
