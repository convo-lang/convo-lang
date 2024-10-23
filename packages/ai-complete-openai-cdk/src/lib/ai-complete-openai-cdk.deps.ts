import { defineBoolParam, defineNumberParam, defineStringParam } from "@iyio/common";

export const openAiAllowOpenAccessParam=defineBoolParam('openAiAllowOpenAccess',false);
export const aiCompleteAnonUsdCapParam=defineNumberParam('aiCompleteAnonUsdCap');
export const aiCompleteAnonUsdCapTotalParam=defineNumberParam('aiCompleteAnonUsdCapTotal');
export const aiCompleteCapsTableParam=defineStringParam('aiCompleteCapsTable');
