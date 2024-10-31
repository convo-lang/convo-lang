import { openAiApiKeyParam, openaiConvoModule } from '@convo-lang/convo-lang-openai';
import { ScopeModule, initRootScope, rootScope } from '@iyio/common';

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
        reg.use(openaiConvoModule);
        reg.use(module);
    })
}
