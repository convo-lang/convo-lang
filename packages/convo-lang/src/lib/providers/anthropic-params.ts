import { defineStringParam } from "@iyio/common";

export const anthropicApiKeyParam=defineStringParam('anthropicApiKey');
export const anthropicBaseUrlParam=defineStringParam('anthropicBaseUrl','https://api.anthropic.com');

export const anthropicChatModelParam=defineStringParam('anthropicChatModel');
export const anthropicAudioModelParam=defineStringParam('anthropicAudioModel');
export const anthropicImageModelParam=defineStringParam('anthropicImageModel');
export const anthropicVisionModelParam=defineStringParam('anthropicVisionModel');

export const anthropicSecretsParam=defineStringParam('anthropicSecrets');
