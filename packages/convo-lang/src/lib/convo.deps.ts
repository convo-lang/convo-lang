import { defineProvider, defineService, defineStringParam } from "@iyio/common";
import { PassthroughConvoConversationConverter } from "./PassthroughConvoConversationConverter";
import { ConvoGraphStore } from "./convo-graph-types";
import { ConvoCompletionService, ConvoConversationConverter } from "./convo-types";

export const convoCompletionService=defineService<ConvoCompletionService<any,any>>('ConvoCompletionService');

export const convoConversationConverterProvider=defineProvider<ConvoConversationConverter<any,any>>('convoConversationConverterProvider',()=>new PassthroughConvoConversationConverter());

export const convoCapabilitiesParams=defineStringParam('convoCapabilities');

export const convoGraphStore=defineService<ConvoGraphStore>('ConvoGraphStore');
