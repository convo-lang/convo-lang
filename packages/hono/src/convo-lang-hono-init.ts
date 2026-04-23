import { convoAnthropicModule, convoOpenAiModule, convoOpenRouterModule } from "@convo-lang/convo-lang";
import { EnvParams, initRootScope, rootScope, ScopeModule } from "@iyio/common";


let inited=false;
export const convoHonoScope=(additionalModule?:ScopeModule)=>{
    if(inited){
        return;
    }
    inited=true;
    if(rootScope.initCalled()){
        return;
    }
    initRootScope(scope=>{
        scope.addParams(new EnvParams());
        scope.use(convoOpenAiModule);
        scope.use(convoOpenRouterModule);
        scope.use(convoAnthropicModule);
        scope.use(additionalModule);
    })
}

export const initConvoHonoAsync=async (additionalModule?:ScopeModule)=>{
    convoHonoScope(additionalModule);
    await rootScope.getInitPromise();
}
