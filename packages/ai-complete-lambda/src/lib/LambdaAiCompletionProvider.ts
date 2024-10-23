import { AiCompletionMessage, AiCompletionProvider, AiCompletionRequest, AiCompletionRequestScheme, AiCompletionResult, AiCompletionResultScheme, CompletionOptions, aiCompletionFnArnParam } from '@iyio/ai-complete';
import { LambdaClient } from '@iyio/aws-lambda';
import { Scope } from '@iyio/common';

export interface LambdaAiCompletionProviderOptions
{
    fnArn:string;
    lambdaClient:LambdaClient;
}

export class LambdaAiCompletionProvider implements AiCompletionProvider
{

    public static fromScope(scope:Scope){
        return new LambdaAiCompletionProvider({
            fnArn:aiCompletionFnArnParam(scope),
            lambdaClient:LambdaClient.fromScope(scope),
        })
    }

    private readonly fnArn:string;
    private readonly lambdaClient:LambdaClient;

    public constructor({
        fnArn,
        lambdaClient,
    }:LambdaAiCompletionProviderOptions){

        this.fnArn=fnArn;
        this.lambdaClient=lambdaClient;
    }

    public async completeAsync(lastMessage:AiCompletionMessage,request:AiCompletionRequest):Promise<AiCompletionResult>
    {
        return await this.lambdaClient.invokeAsync<AiCompletionRequest,AiCompletionResult>({
            label:'LambdaAiCompletionProvider',
            fn:this.fnArn,
            input:request,
            inputScheme:AiCompletionRequestScheme,
            outputScheme:AiCompletionResultScheme,
            // todo - add input and output schemes
        })
    }

    public toModelFormat(lastMessage:AiCompletionMessage,request:AiCompletionRequest,options?:CompletionOptions):any
    {
        return undefined;
    }

}
