import { openAiModule } from '@iyio/ai-complete-openai';
import { cognitoBackendAuthProviderModule } from "@iyio/aws-credential-providers";
import { awsSecretsModule } from '@iyio/aws-secrets';
import { EnvParams, ScopeModule, initRootScope } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";

export const initBackend=(additionalModule?:ScopeModule)=>{
    initRootScope(reg=>{
        reg.addParams(new EnvParams());
        reg.use(openAiModule);
        reg.use(nodeCommonModule);
        reg.use(awsSecretsModule);
        reg.use(additionalModule);
        reg.use(cognitoBackendAuthProviderModule);
        //reg.addProvider(FnEventTransformers,()=>fnEventTransformer);
    })
}
