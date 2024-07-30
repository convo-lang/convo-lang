import { defineNumberParam, defineProvider, defineService, defineStringParam } from "@iyio/common";
import { AiCompletionService } from "./AiCompletionService";
import { AiCompletionProvider } from "./ai-complete-types";

export const AiCompletionProviders=defineProvider<AiCompletionProvider>("AiCompletionProviders");

export const aiComplete=defineService('aiComplete',scope=>AiCompletionService.fromScope(scope));

export const httpAiCompletionUrlParam=defineStringParam('httpAiCompletionUrl','/api/complete');

export const aiCompletionFnArnParam=defineStringParam('aiCompletionFnArn');
export const aiCompletionGetTokenQuotaFnArnParam=defineStringParam('aiCompletionGetTokenQuotaFnArn');

export const aiCompletionMaxTextLengthParam=defineNumberParam('aiCompletionMaxTextLength',3000);
export const aiCompletionMaxAudioLengthParam=defineNumberParam('aiCompletionMaxAudioLength',3000);
export const aiCompletionMaxImageLengthParam=defineNumberParam('aiCompletionMaxImageLength',3000);
