import { JsonScheme } from "@iyio/common";
import { z, ZodType, ZodTypeAny } from "zod";
import { AiCompletionService } from "./AiCompletionService";

export interface CompletionOptions
{
    allowedModels?:string[];
    allowAllModels?:boolean;
}

export interface AiCompletionProvider
{

    getAllowedModels?():readonly string[];

    completeAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):Promise<AiCompletionResult>;

    canComplete?(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):boolean;

    getMaxTokensForMessageType?(messageType:AiCompletionMessageType,model?:string):number|undefined;

    getTokenEstimateForMessage?(message:string,model?:string):number|undefined;

    toModelFormat(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):any;
}

// export const AiCompletionFunctionParamScheme=z.object({
//     name:z.string(),
//     description:z.string(),
//     type:z.string(),
//     required:z.boolean().optional(),
//     jsonScheme:z.record(z.any()).optional(),
// })
// export type AiCompletionFunctionParam=z.infer<typeof AiCompletionFunctionParamScheme>;

export const AiCompletionFunctionScheme=z.object({
    name:z.string(),
    description:z.string(),
    params:z.record(z.any()).optional(),
})
export type AiCompletionFunction=Omit<z.infer<typeof AiCompletionFunctionScheme>,'params'> & {
    params?:JsonScheme;
};

export const AiCompletionFunctionCallScheme=z.object({
    name:z.string(),
    params:z.record(z.any()),
})
export type AiCompletionFunctionCall=z.infer<typeof AiCompletionFunctionCallScheme>;

export const AiCompletionFunctionCallErrorScheme=z.object({
    name:z.string(),
    error:z.string(),
})
export type AiCompletionFunctionCallError=z.infer<typeof AiCompletionFunctionCallErrorScheme>;

export const allAiCompletionRoles=['system','user','assistant','function'] as const;
export const AiCompletionRoleScheme=z.enum(allAiCompletionRoles);
export type AiCompletionRole=z.infer<typeof AiCompletionRoleScheme>;
export const isAiCompletionRole=(value:any):value is AiCompletionRole=>allAiCompletionRoles.includes(value);

export const AiCompletionMessageTypeScheme=z.enum(['text','image','audio','function','function-error','error']);
export type AiCompletionMessageType=z.infer<typeof AiCompletionMessageTypeScheme>;

export const AiCompletionMessageScheme=z.object({

    id:z.string(),

    /**
     * Id of a message to replace in the current conversation.
     */
    replaceId:z.string().optional(),

    name:z.string().optional(),

    vision:z.boolean().optional(),

    role:AiCompletionRoleScheme,

    content:z.string().optional(),

    responseFormat:z.string().optional(),

    responseFormatTypeName:z.string().optional(),
    responseFormatIsArray:z.boolean().optional(),
    responseAssignTo:z.string().optional(),

    url:z.string().optional(),

    metadata:z.record(z.string().optional()).optional(),

    /**
     * Base64 blob of data
     */
    data:z.string().optional(),

    /**
     * URL to data data
     */
    dataUrl:z.string().optional(),

    dataContentType:z.string().optional(),

    /**
     * The type of the message
     */
    type:AiCompletionMessageTypeScheme,

    /**
     * The requested message type to response with.
     */
    requestedResponseType:AiCompletionMessageTypeScheme.optional(),

    call:AiCompletionFunctionCallScheme.optional(),

    callError:AiCompletionFunctionCallErrorScheme.optional(),

    /**
     * Name of a function that was called.
     */
    called:z.string().optional(),

    calledParams:z.any().optional(),

    calledReturn:z.any().optional(),

    /**
     * Id of another message that cause an error
     */
    errorCausedById:z.string().optional(),

    /**
     * If true the message has a type of either error or function-error
     */
    isError:z.boolean().optional(),

    /**
     * The AI model to use with the message. Typically only the model of the last message is used.
     * For example messages that are submitted to a chat model will all use the same model.
     */
    model:z.string().optional(),

    /**
     * The requested endpoint to complete the message with
     */
    endpoint:z.string().optional(),

    /**
     * An optional Id that can be used to help track abuse.
     */
    userId:z.string().optional(),
})
export type AiCompletionMessage=z.infer<typeof AiCompletionMessageScheme>;


export const AiCompletionOptionScheme=z.object({
    message:AiCompletionMessageScheme,
    confidence:z.number(),
})
export type AiCompletionOption=z.infer<typeof AiCompletionOptionScheme>;


export const AiCompletionResultScheme=z.object({
    /**
     * A list of messages generated before the returned options were generated. For
     * example when a audio message is received it will be transcribed and a message will be
     * created from the transcription and that message will be added to the before list.
     */
    preGeneration:AiCompletionMessageScheme.array().optional(),
    options:AiCompletionOptionScheme.array(),

    inputTokens:z.number().optional(),
    outputTokens:z.number().optional(),
    tokenPrice:z.number().optional(),
    model:z.string().optional(),
    endpoint:z.string().optional(),
    format:z.string().optional(),
    formatTypeName:z.string().optional(),
    formatIsArray:z.boolean().optional(),
    assignTo:z.string().optional(),
    quotaUsd:z.number().optional(),
    quotaUsedUsd:z.number().optional(),
})
export type AiCompletionResult=z.infer<typeof AiCompletionResultScheme>;

export const AiCompletionCapabilityScheme=z.enum(['vision']);
export type AiCompletionCapability=z.infer<typeof AiCompletionCapabilityScheme>;

export const AiCompletionRequestScheme=z.object({

    messages:AiCompletionMessageScheme.array(),
    providerData:z.any().optional(),
    functions:AiCompletionFunctionScheme.array().optional(),

    /**
     * If true only preGeneration messages should be returned. This can be useful in the case
     * where you would like to transcribe a message but not a have response generated from the
     * transcription.
     */
    preGenerateOnly:z.boolean().optional(),

    /**
     * Array of capabilities that should be included.
     */
    capabilities:AiCompletionCapabilityScheme.array().optional(),

    apiKey:z.string().optional(),

    ragPrefix:z.string().optional(),
    ragSuffix:z.string().optional(),

    toolChoice:z.literal('none').or(z.literal(('auto'))).or(z.literal('required')).or(z.object({
        name:z.string()
    })).optional()
})
export type AiCompletionRequest=z.infer<typeof AiCompletionRequestScheme> & {
    debug?:(...args:any[])=>void;
};

export type AiCompletionMessageOptionalId=Omit<AiCompletionMessage,'id'> & {
    id?:string;
}

export interface AiCompletionFunctionInterface<Z extends ZodTypeAny=ZodType<any>,T=z.infer<Z>,C=any,V=any>
{
    name:string;
    description:string;
    params:Z;
    callback?:(params:T,aiService:AiCompletionService)=>C;
    render?:(params:T,callbackResult:Awaited<C>,aiService:AiCompletionService)=>V;
}


export const TokenQuotaScheme=z.object({
    id:z.string(),
    usage:z.number(),
    cap:z.number().optional(),
})

export type TokenQuota=z.infer<typeof TokenQuotaScheme>;
