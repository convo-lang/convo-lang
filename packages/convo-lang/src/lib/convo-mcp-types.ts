import { ConvoScopeFunction } from "./convo-types.js";

export type ConvoMcpDescriptionPartType='tool'|'resource'|'prompt'|'promptTemplate';

export interface ConvoMcpDescription
{
    name:string;
    description:string;
    tools:ConvoMcpToolDescription[];
    resources:ConvoMcpDescriptionPart[];
    prompts:ConvoMcpDescriptionPart[];
    promptTemplates:ConvoMcpDescriptionPart[];
}

export interface ConvoMcpDescriptionPart
{
    localPath:string;
    fullPath:string;
    type:ConvoMcpDescriptionPartType;
    convo?:string;
}

export interface ConvoMcpToolDescription extends ConvoMcpDescriptionPart
{
    functionName:string;
    callAsync:ConvoScopeFunction;
}
