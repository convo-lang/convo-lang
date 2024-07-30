import { defineService, defineStringParam } from "@iyio/common";
import { ConvoGraphStore } from "./convo-graph-types";
import { ConvoCompletionService } from "./convo-types";

export const convoCompletionService=defineService<ConvoCompletionService>('ConvoCompletionService');

export const convoCapabilitiesParams=defineStringParam('convoCapabilities');

export const convoGraphStore=defineService<ConvoGraphStore>('ConvoGraphStore');
