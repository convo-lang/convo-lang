import { httpClient } from "@iyio/common";
import { allConvoModelCapability, ConvoModelCapability, ConvoModelInfo } from "../convo-types";
import { openRouterAutoSelectModel, openRouterModel, openRouterModelPrefix } from "./open-router-lib";

export interface Architecture {
    input_modalities:string[];
    output_modalities:string[];
    tokenizer:string;
    instruct_type:string|null;
}

export interface Pricing {
    prompt:string;
    completion:string;
    image:string;
    request:string;
    web_search:string;
    internal_reasoning:string;
    input_cache_read:string|null;
    input_cache_write:string|null;
}

export interface TopProvider {
    is_moderated:boolean;
    context_length:number|null;
    max_completion_tokens:number|null;
}

/**
 * Information about an OpenRouter model.
 */
export interface OpenRouterModelInfo {
  /**
   * Unique model identifier used in API requests (e.g., "google/gemini-2.5-pro-preview")
   */
  id: string;

  /**
   * Permanent slug for the model that never changes
   */
  canonical_slug: string;

  /**
   * Human-readable display name for the model
   */
  name: string;

  /**
   * Unix timestamp of when the model was added to OpenRouter
   */
  created: number;

  /**
   * Detailed description of the model’s capabilities and characteristics
   */
  description: string;

  /**
   * Maximum context window size in tokens
   */
  context_length: number;

  /**
   * Object describing the model’s technical capabilities
   */
  architecture: Architecture;

  /**
   * Lowest price structure for using this model
   */
  pricing: Pricing;

  /**
   * Configuration details for the primary provider
   */
  top_provider: TopProvider;

  /**
   * Rate limiting information (null if no limits)
   */
  per_request_limits: Record<string,any> | null;

  /**
   * Array of supported API parameters for this model
   */
  supported_parameters: string[];
}

let promiseValue:Promise<ConvoModelInfo[]>|null=null;
export const getOpenRouterModelsAsync=async ():Promise<ConvoModelInfo[]>=>{ // todo - cache on disk for x number of days
    return await (promiseValue??(promiseValue=_getOpenRouterModelsAsync()));
}
const _getOpenRouterModelsAsync=async ():Promise<ConvoModelInfo[]>=>{
    const models=(await httpClient().getAsync<{data:OpenRouterModelInfo[]}>('https://openrouter.ai/api/v1/models'))?.data;
    const r=models?.map<ConvoModelInfo>(m=>({
        name:openRouterModelPrefix+m.id,
        description:m.description,
        contextWindowSize:m.context_length,
        inputCapabilities:(
            m.architecture.input_modalities
            .filter(i=>allConvoModelCapability.includes(i as any))
        ) as ConvoModelCapability[],
        outputCapabilities:(
            m.architecture.output_modalities
            .filter(i=>allConvoModelCapability.includes(i as any))
        ) as ConvoModelCapability[],
        inputTokenPriceUsd:Number(m.pricing.prompt)||0,
        outputTokenPriceUsd:Number(m.pricing.completion)||0,
        supportsChat:true,
        supportsFunctionCalling:true,
        supportsJsonMode:true,
    }))??[];

    const autoName=`${openRouterModelPrefix}openrouter/auto`
    const auto=r?.find(m=>m.name===autoName);
    if(auto){
        r.push({
            ...auto,
            name:openRouterAutoSelectModel,
        },{
            ...auto,
            name:openRouterModel,
        })
    }
    return r;
}
