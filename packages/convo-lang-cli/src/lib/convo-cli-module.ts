import { ConvoHttpImportService, ConvoProjectConfig, ConvoVfsImportService, convoAnthropicModule, convoCapabilitiesParams, convoDefaultModelParam, convoGitService, convoImportService, convoOpenAiModule, convoOpenRouterModule, convoProjectConfig, openAiApiKeyParam, openAiAudioModelParam, openAiBaseUrlParam, openAiChatModelParam, openAiImageModelParam, openAiSecretsParam, openAiVisionModelParam } from '@convo-lang/convo-lang';
import { convoBedrockModule } from "@convo-lang/convo-lang-bedrock";
import { convoMcpClientModule } from "@convo-lang/convo-lang-mcp-client";
import { convoDbModule } from "@convo-lang/db/db-module.js";
import { EnvParams, ScopeRegistration, deleteUndefined } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";
import { VfsCtrl, vfs } from '@iyio/vfs';
import { ConvoCliConfig, ConvoCliOptions } from "./convo-cli-types.js";
import { ConvoCliGitService } from './ConvoCliGitService.js';

export const convoCliModule=(
    reg:ScopeRegistration,
    vfsCtrl:VfsCtrl,
    config:ConvoCliConfig,
    options:ConvoCliOptions,
    projectConfig:ConvoProjectConfig|undefined
)=>{
    if(config.env && !config.overrideEnv){
        reg.addParams(config.env);
    }

    if(!options.config && !options.inlineConfig){
        reg.addParams(new EnvParams());
    }

    if(config.env && config.overrideEnv){
        reg.addParams(config.env);
    }

    reg.addParams(deleteUndefined({
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

    reg.use(nodeCommonModule);
    reg.use(convoOpenAiModule);
    reg.use(convoBedrockModule);
    reg.use(convoMcpClientModule);
    reg.use(convoOpenRouterModule);
    reg.use(convoAnthropicModule);
    reg.use(convoDbModule);
    reg.implementService(convoGitService,()=>new ConvoCliGitService());
    // reg.implementService(convoDbService,()=>new BunSqliteConvoDb({
    //     //dbPath:'convo-api.db',initSchema:true
    // }))

    reg.implementService(convoImportService,()=>new ConvoVfsImportService());
    reg.implementService(convoImportService,()=>new ConvoHttpImportService());

    reg.implementService(vfs,()=>vfsCtrl);
    if(projectConfig){
        reg.implementService(convoProjectConfig,()=>projectConfig);
    }
}