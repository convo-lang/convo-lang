import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput, ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { ConvoCompletionCtx, ConvoCompletionService, FlatConvoConversationBase, isConvoModelAliasMatch } from "@convo-lang/convo-lang";
import { deleteUndefined, Scope } from "@iyio/common";
import { bedrockModelPrefix, convoBedrockInputType, convoBedrockOutputType } from "./bedrock-lib.js";
import { bedrockModels } from "./bedrock-models.js";
import { awsBedrockApiKeyParam, awsBedrockProfileParam, awsBedrockRegionParam, awsProfileParam, awsRegionParam } from "./bedrock-params.js";

export interface BedrockConvoCompletionServiceOptions
{
    region:string;
    profile?:string;
    apiKey?:string;
}

export class BedrockConvoCompletionService implements ConvoCompletionService<ConverseCommandInput,ConverseCommandOutput>
{
    public readonly serviceId='bedrock';

    public static fromScope(scope:Scope){
        return new BedrockConvoCompletionService({
            region:awsBedrockRegionParam.get()??awsRegionParam.get()??'us-east-1',
            profile:awsBedrockProfileParam.get()??awsProfileParam.get(),
            apiKey:awsBedrockApiKeyParam.get(),
        })
    }


    public readonly inputType=convoBedrockInputType;
    public readonly outputType=convoBedrockOutputType;

    private readonly region:string;
    private readonly profile?:string;
    private readonly apiKey?:string;
    public constructor({
        region,
        profile,
        apiKey,
    }:BedrockConvoCompletionServiceOptions){
        this.region=region;
        this.profile=profile;
        this.apiKey=apiKey;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        if(!model){
            return false;
        }
        return (
            model.startsWith(bedrockModelPrefix) ||
            bedrockModels.some(m=>m.name===model || m.aliases?.some(a=>isConvoModelAliasMatch))
        );
    }

    private clients:Record<string,BedrockRuntimeClient>={};
    private getClient(
        region=this.region,
        profile=this.profile,
        apiKey=this.apiKey,
    ):BedrockRuntimeClient{
        const key=`${region}:::${profile??'.'}:::${apiKey??'.'}`;

        return this.clients[key]??(this.clients[key]=new BedrockRuntimeClient(deleteUndefined({
            region,
            profile,
            token:apiKey?{token:apiKey}:undefined,
            authSchemePreference:apiKey?["httpBearerAuth"]:undefined,
        })));
    }

    public async completeConvoAsync(
        input:ConverseCommandInput,
        flat:FlatConvoConversationBase,
        ctx:ConvoCompletionCtx<ConverseCommandInput,ConverseCommandOutput>
    ):Promise<ConverseCommandOutput>{

        const client=this.getClient();

        await ctx.beforeComplete?.(this,input,flat);

        return await client.send(new ConverseCommand(input));
    }

    public getModelsAsync(){
        return Promise.resolve(bedrockModels);// todo - get using client
    }
}

