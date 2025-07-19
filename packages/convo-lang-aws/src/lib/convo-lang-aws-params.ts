import { defineNumberParam, defineStringParam } from "@iyio/common";

export const httpConvoLangAwsCompletionUrlParam=defineStringParam('httpConvoLangAwsCompletionUrl','/api/complete');

export const convoLangCompletionFnArnParam=defineStringParam('convoLangCompletionFnArn');
export const convoLangGetTokenQuotaFnArnParam=defineStringParam('convoLangGetTokenQuotaFnArn');
export const convoLangAwsMaxTextLengthParam=defineNumberParam('convoLangAwsMaxTextLength',3000);
export const convoLangAwsMaxAudioLengthParam=defineNumberParam('convoLangAwsMaxAudioLength',3000);
export const convoLangAwsMaxImageLengthParam=defineNumberParam('convoLangAwsMaxImageLength',3000);
