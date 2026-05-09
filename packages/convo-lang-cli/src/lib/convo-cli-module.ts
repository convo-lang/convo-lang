import { ConvoHttpImportService, ConvoProjectConfig, ConvoVfsImportService, convoCapabilitiesParams, convoDbProvider, convoDefaultModelParam, convoGitService, convoImportService, convoOpenAiModule, convoOpenRouterModule, convoProjectConfig, openAiApiKeyParam, openAiAudioModelParam, openAiBaseUrlParam, openAiChatModelParam, openAiImageModelParam, openAiSecretsParam, openAiVisionModelParam } from '@convo-lang/convo-lang';
import { convoMcpClientModule } from "@convo-lang/convo-lang-mcp-client";
import { EnvParams, ScopeRegistration, deleteUndefined } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";
import { VfsCtrl, vfs } from '@iyio/vfs';
import { ConvoCliConfig, ConvoCliOptions } from "./convo-cli-types.js";
import { ConvoCliGitService } from './ConvoCliGitService.js';

export const convoCliModule=(
    scope:ScopeRegistration,
    vfsCtrl:VfsCtrl,
    config:ConvoCliConfig,
    options:ConvoCliOptions,
    projectConfig:ConvoProjectConfig|undefined
)=>{
    if(config.env && !config.overrideEnv){
        scope.addParams(config.env);
    }

    if(!options.config && !options.inlineConfig){
        scope.addParams(new EnvParams());
    }

    if(config.env && config.overrideEnv){
        scope.addParams(config.env);
    }

    scope.addParams(deleteUndefined({
        [openAiApiKeyParam.typeName]:config.apiKey,
        [openAiBaseUrlParam.typeName]:config.apiBaseUrl,
        [openAiChatModelParam.typeName]:config.chatModel,
        [openAiAudioModelParam.typeName]:config.audioModel,
        [openAiImageModelParam.typeName]:config.imageModel,
        [openAiVisionModelParam.typeName]:config.visionModel,
        [openAiSecretsParam.typeName]:config.secrets,

        [convoCapabilitiesParams.typeName]:config.capabilities,
        [convoDefaultModelParam.typeName]:config.defaultModel?.trim()||'gpt-4.1',
    }) as Record<string,string>);

    scope.use(nodeCommonModule);
    scope.use(convoOpenAiModule);
    //reg.use(convoBedrockModule);
    scope.use(convoMcpClientModule);
    scope.use(convoOpenRouterModule);
    //reg.use(convoAnthropicModule);
    scope.implementService(convoGitService,()=>new ConvoCliGitService());

    convoCliDbModule(scope);
    

    scope.implementService(convoImportService,()=>new ConvoVfsImportService());
    scope.implementService(convoImportService,()=>new ConvoHttpImportService());

    scope.implementService(vfs,()=>vfsCtrl);
    if(projectConfig){
        scope.implementService(convoProjectConfig,()=>projectConfig);
    }
}

export const convoCliDbModule=(
    scope:ScopeRegistration,
)=>{

    scope.implement(convoDbProvider,()=>{
        return async (type,args)=>{
            return (await import('@convo-lang/db')).inMemory(type,args)
        }
    },['mem']);

    scope.implement(convoDbProvider,()=>{
        return async (type,args)=>{
            return (await import('@convo-lang/db-node')).sqlite(type,args)
        }
    },['sql','sqlite','node-sqlite']);

    if(globalThis.Bun){

        scope.implement(convoDbProvider,()=>{
            return async (type,args)=>{
                return (await import('@convo-lang/db-bun')).sqlite(type,args)
            }
        },['sql','sqlite','bun-sqlite']);

    }
}