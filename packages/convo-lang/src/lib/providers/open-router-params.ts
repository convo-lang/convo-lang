import { defineStringParam } from "@iyio/common";

export const openRouterApiKeyParam=defineStringParam('openRouterApiKey');
export const openRouterBaseUrlParam=defineStringParam('openRouterBaseUrl','https://openrouter.ai/api');

export const openRouterChatModelParam=defineStringParam('openRouterChatModel');
export const openRouterAudioModelParam=defineStringParam('openRouterAudioModel');
export const openRouterImageModelParam=defineStringParam('openRouterImageModel');
export const openRouterVisionModelParam=defineStringParam('openRouterVisionModel');

export const openRouterSecretsParam=defineStringParam('openRouterSecrets');
