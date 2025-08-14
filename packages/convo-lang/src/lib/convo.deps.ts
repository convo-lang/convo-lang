import { defineProvider, defineService, defineStringParam } from "@iyio/common";
import { ConvoLocalStorageCache } from "./ConvoLocalStorageCache";
import { ConvoVfsCache } from "./ConvoVfsCache";
import { PassthroughConvoConversationConverter } from "./PassthroughConvoConversationConverter";
import { ConvoCompletionService, ConvoConversationCache, ConvoConversationConverter, ConvoImportService } from "./convo-types";

export const convoCompletionService=defineService<ConvoCompletionService<any,any>>('ConvoCompletionService');

export const convoConversationConverterProvider=defineProvider<ConvoConversationConverter<any,any>>('convoConversationConverterProvider',()=>new PassthroughConvoConversationConverter());

export const convoCapabilitiesParams=defineStringParam('convoCapabilities');

export const convoDefaultModelParam=defineStringParam('convoDefaultModel');

export const convoCacheService=defineService<ConvoConversationCache>('convoCacheService',()=>globalThis.window?new ConvoLocalStorageCache():new ConvoVfsCache());

export const convoImportService=defineService<ConvoImportService>('convoImportService');
