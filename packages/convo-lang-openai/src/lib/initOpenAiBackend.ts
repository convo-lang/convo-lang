import { ScopeModule, initRootScope, rootScope } from '@iyio/common';
import { openaiConvoModule } from './_module.openaiConvoModule';
import { openAiApiKeyParam } from './convo-lang-openai-params';

let inited=false;
/**
 * Use `initOpenAiBackend` exported from the core `@convo-lang/convo-lang` package instead.
 * @deprecated
 */
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
