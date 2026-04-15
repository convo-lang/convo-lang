import { defineProvider, defineService, defineStringParam } from "@iyio/common";
import type { ConvoCompletionService, ConvoConversationCache, ConvoConversationConverter, ConvoEmbeddingsService, ConvoImportService, ConvoProjectConfig, ConvoTranscriptionService, ConvoTtsService } from "./convo-types.js";
import { ConvoLocalStorageCache } from "./ConvoLocalStorageCache.js";
import { ConvoVfsCache } from "./ConvoVfsCache.js";
import type { ConvoDb } from "./db/convo-db-types.js";
import { ConvoGitService } from "./git/convo-git-types.js";
import { PassthroughConvoConversationConverter } from "./PassthroughConvoConversationConverter.js";

export const convoCompletionService=defineService<ConvoCompletionService<any,any>>('ConvoCompletionService');

export const convoConversationConverterProvider=defineProvider<ConvoConversationConverter<any,any>>('convoConversationConverterProvider',()=>new PassthroughConvoConversationConverter());

export const convoCapabilitiesParams=defineStringParam('convoCapabilities');

export const convoDefaultModelParam=defineStringParam('convoDefaultModel');

export const convoCacheService=defineService<ConvoConversationCache>('convoCacheService',()=>globalThis.window?new ConvoLocalStorageCache():new ConvoVfsCache());

export const convoImportService=defineService<ConvoImportService>('convoImportService');

export const convoProjectConfig=defineService<ConvoProjectConfig>('convoProjectConfig',()=>({}));

export const convoTranscriptionService=defineService<ConvoTranscriptionService>('ConvoTranscriptionService');
export const convoTtsService=defineService<ConvoTtsService>('ConvoTtsService');
export const convoEmbeddingsService=defineService<ConvoEmbeddingsService>('ConvoEmbeddingsService');
export const convoDbService=defineService<ConvoDb>('ConvoDb');
export const convoDbProvider=defineProvider<(connection?:string)=>Promise<ConvoDb|undefined>>('ConvoDbProvider');
export const convoGitService=defineService<ConvoGitService>('ConvoGitService');
