import { convoOpenAiModule } from "@convo-lang/convo-lang";
import { convoBedrockModule } from "@convo-lang/convo-lang-bedrock";
import { convoPineconeModule } from "@convo-lang/convo-lang-pinecone";
import { cognitoBackendAuthProviderModule } from "@iyio/aws-credential-providers";
import { awsSecretsModule } from '@iyio/aws-secrets';
import { EnvParams, ScopeModule, initRootScope } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";


export const initBackend=(additionalModule?:ScopeModule)=>{
    initRootScope(reg=>{
        reg.addParams(new EnvParams());
        reg.use(nodeCommonModule);
        reg.use(awsSecretsModule);
        reg.use(additionalModule);
        reg.use(cognitoBackendAuthProviderModule);

        // for now register all providers - will need to add option to configure / add providers
        // using CDK construct
        reg.use(convoOpenAiModule);
        reg.use(convoBedrockModule);
        reg.use(convoPineconeModule);

        //reg.addProvider(FnEventTransformers,()=>fnEventTransformer);
    })
}
