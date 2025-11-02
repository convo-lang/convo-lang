
import { ScopeModule, initRootScope, rootScope } from '@iyio/common';
import { openAiApiKeyParam } from './openai-params.js';
import { convoOpenAiModule } from './openai-service.js';

let inited=false;
export const initOpenAiBackend=(apiKey?:string,module?:ScopeModule)=>{
    if(inited){
        return;
    }
    inited=true;
    if(rootScope.initCalled()){
        return;
    }
    initRootScope(reg=>{
        reg.addParams({
            [openAiApiKeyParam.typeName]:apiKey??process.env['OPENAI_API_KEY']??''
        });
        reg.use(convoOpenAiModule);
        reg.use(module);
    })
}
