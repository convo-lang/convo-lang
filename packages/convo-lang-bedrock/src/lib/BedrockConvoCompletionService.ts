import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput, ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { ConvoCompletionCtx, ConvoCompletionService, FlatConvoConversationBase } from "@convo-lang/convo-lang";
import { Scope } from "@iyio/common";
import { convoBedrockInputType, convoBedrockOutputType } from "./bedrock-lib";
import { bedrockModels } from "./bedrock-models";
import { awsBedrockProfileParam, awsBedrockRegionParam, awsProfileParam, awsRegionParam } from "./bedrock-params";

export interface BedrockConvoCompletionServiceOptions
{
    region:string;
    profile?:string;
}

export class BedrockConvoCompletionService implements ConvoCompletionService<ConverseCommandInput,ConverseCommandOutput>
{
    public readonly serviceId='bedrock';

    public static fromScope(scope:Scope){
        return new BedrockConvoCompletionService({
            region:awsBedrockRegionParam.get()??awsRegionParam.get()??'us-east-1',
            profile:awsBedrockProfileParam.get()??awsProfileParam.get()
        })
    }


    public readonly inputType=convoBedrockInputType;
    public readonly outputType=convoBedrockOutputType;

    private readonly region:string;
    private readonly profile?:string;
    public constructor({
        region,
        profile,
    }:BedrockConvoCompletionServiceOptions){
        this.region=region;
        this.profile=profile;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        // if(!model){
        //     return this.isFallback;
        // }
        // return this.models.some(m=>m.name===model);
        return true;
    }

    private clients:Record<string,BedrockRuntimeClient>={};
    private getClient(
        region=this.region,
        profile=this.profile,
    ):BedrockRuntimeClient{
        const key=`${region}:::${profile??'.'}`;

        return this.clients[key]??(this.clients[key]=new BedrockRuntimeClient({region,profile}));
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

