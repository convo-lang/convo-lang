import { ConvoCompletionMessage, ConvoCompletionService, ConvoHttpToInputRequest, ConvoModelInfo, FlatConvoConversationBase, getSerializableFlatConvoConversation, passthroughConvoInputType, passthroughConvoOutputType } from "@convo-lang/convo-lang";
import { ConvoLangAwsRequest, ConvoLangAwsRequestScheme, convoLangCompletionFnArnParam } from '@convo-lang/convo-lang-aws';
import { LambdaClient } from '@iyio/aws-lambda';
import { Scope } from "@iyio/common";

export interface LambdaAiCompletionProviderOptions
{
    fnArn:string;
    lambdaClient:LambdaClient;
}

export class LambdaAiCompletionProvider implements ConvoCompletionService<FlatConvoConversationBase,ConvoCompletionMessage[]>
{

    public readonly serviceId='http';

    public static fromScope(scope:Scope){
        return new LambdaAiCompletionProvider({
            fnArn:convoLangCompletionFnArnParam(scope),
            lambdaClient:LambdaClient.fromScope(scope),
        })
    }

    private readonly fnArn:string;
    private readonly lambdaClient:LambdaClient;

    public readonly inputType=passthroughConvoInputType;

    public readonly outputType=passthroughConvoOutputType;


    public constructor({
        fnArn,
        lambdaClient,
    }:LambdaAiCompletionProviderOptions){

        this.fnArn=fnArn;
        this.lambdaClient=lambdaClient;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        return true;
    }

    public async completeConvoAsync(flat:FlatConvoConversationBase):Promise<ConvoCompletionMessage[]>
    {

        return await this.sendRequest({
            endpoint:'/completion',
            method:'POST',
            body:getSerializableFlatConvoConversation(flat)
        });
    }

    public async getModelsAsync():Promise<ConvoModelInfo[]|undefined>
    {
        return await this.sendRequest({
            endpoint:'/models',
            method:'GET',
        });
    }

    public async relayConvertConvoToInputAsync(flat:FlatConvoConversationBase,inputType:string):Promise<FlatConvoConversationBase>{
        const body:ConvoHttpToInputRequest={
            flat:getSerializableFlatConvoConversation(flat),
            inputType
        };

        return await this.sendRequest({
            endpoint:'/convert',
            method:'POST',
            body
        });

    }

    public async sendRequest(request:ConvoLangAwsRequest):Promise<any>{
        return await this.lambdaClient.invokeAsync<ConvoLangAwsRequest,any>({
            label:'LambdaAiCompletionProvider',
            fn:this.fnArn,
            input:request,
            inputScheme:ConvoLangAwsRequestScheme,
        });
    }

}

