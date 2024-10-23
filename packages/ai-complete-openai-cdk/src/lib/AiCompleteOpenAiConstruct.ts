import { aiCompletionFnArnParam, aiCompletionGetTokenQuotaFnArnParam } from '@iyio/ai-complete';
import { openAiSecretsParam } from '@iyio/ai-complete-openai';
import { FnInfo, FnsBuilder, ManagedProps, NodeFn, NodeFnProps, getDefaultManagedProps, grantTableQueryPerms } from '@iyio/cdk-common';
import * as cdk from 'aws-cdk-lib';
import * as db from "aws-cdk-lib/aws-dynamodb";
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { aiCompleteAnonUsdCapParam, aiCompleteAnonUsdCapTotalParam, aiCompleteCapsTableParam } from './ai-complete-openai-cdk.deps';

export interface AiCompleteOpenAiConstructOptions
{
    managed?:ManagedProps;
    defaultFnProps?:NodeFnProps;
    fnName?:string;
    grantAccess?:boolean;
    /**
     * Anonymous price cap. If defined anonymous users will be able to invoke the completion lambda
     * with the given cap. Users are tracked by IP.
     */
    anonUsdCap?:number;

    /**
     * Anonymous price cap for all users combined
     */
    anonUsdCapTotal?:number;

    handleQuotas?:boolean;
}

export class AiCompleteOpenAiConstruct extends Construct
{

    public readonly handlerFn:NodeFn;
    public readonly getQuotaFn:NodeFn|null;

    public readonly fnBuilder:FnsBuilder;

    public constructor(scope:Construct,id:string,{
        managed=getDefaultManagedProps(),
        defaultFnProps,
        fnName="OpenAiCompletionFn",
        anonUsdCap,
        anonUsdCapTotal,
        grantAccess,
        handleQuotas=anonUsdCap!==undefined || anonUsdCapTotal!==undefined,
    }:AiCompleteOpenAiConstructOptions={})
    {
        super(scope,id);

        const {params}=managed;

        let getQName=fnName;
        if(getQName.endsWith('Fn')){
            getQName=getQName.substring(0,getQName.length-2);
        }
        getQName+='GetTokenQuotaFn';

        const fnsInfo:FnInfo[]=[{
            name:fnName,
            arnParam:aiCompletionFnArnParam,
            grantAccess,
            createProps:{
                bundledHandlerFileNames:[
                    '../../dist/packages/ai-complete-openai-cdk/handlers/CompleteOpenAiPrompt',
                    '../../node_modules/@iyio/ai-complete-openai-cdk/handlers/CompleteOpenAiPrompt',
                ],
                timeoutMs:1000*60*5,
                ...defaultFnProps,
            },
        }];

        if(handleQuotas){
            fnsInfo.push({
                name:getQName,
                grantName:fnName,
                arnParam:aiCompletionGetTokenQuotaFnArnParam,
                grantAccess,
                createProps:{
                    bundledHandlerFileNames:[
                        '../../dist/packages/ai-complete-openai-cdk/handlers/GetAiCompleteTokenQuota',
                        '../../node_modules/@iyio/ai-complete-openai-cdk/handlers/GetAiCompleteTokenQuota',
                    ],
                    timeoutMs:1000*20,
                    ...defaultFnProps,
                },
            })
        }

        const fnBuilder=new FnsBuilder(this,"Fns",{
            fnsInfo,
            managed,
        })

        this.fnBuilder=fnBuilder;

        const handlerFn=fnBuilder.fns.find(f=>f.info.name===fnName)?.fn;
        if(!handlerFn){
            throw new Error('FnsBuilder did not create a matching named fn');
        }

        const quotaFn=handleQuotas?fnBuilder.fns.find(f=>f.info.name===getQName)?.fn:null;
        if(quotaFn===undefined){
            throw new Error('FnsBuilder did not create a matching named quota fn');
        }

        this.handlerFn=handlerFn;
        this.getQuotaFn=quotaFn;

        if(anonUsdCap!==undefined){
            handlerFn.func.addEnvironment(aiCompleteAnonUsdCapParam.typeName,anonUsdCap.toString());
            quotaFn?.func.addEnvironment(aiCompleteAnonUsdCapParam.typeName,anonUsdCap.toString());
        }

        if(anonUsdCapTotal!==undefined){
            handlerFn.func.addEnvironment(aiCompleteAnonUsdCapTotalParam.typeName,anonUsdCapTotal.toString());
            quotaFn?.func.addEnvironment(aiCompleteAnonUsdCapTotalParam.typeName,anonUsdCapTotal.toString());
        }

        if(handleQuotas){
            const capTable=new db.Table(this,'Caps',{
                tableClass:db.TableClass.STANDARD,
                billingMode:db.BillingMode.PAY_PER_REQUEST,
                partitionKey:{
                    name:'id',
                    type:db.AttributeType.STRING,
                },
                removalPolicy:cdk.RemovalPolicy.RETAIN,
            });
            capTable.grantFullAccess(handlerFn.func);
            grantTableQueryPerms(handlerFn.func,capTable);
            if(quotaFn){
                capTable.grantFullAccess(quotaFn.func);
                grantTableQueryPerms(quotaFn.func,capTable);
            }
            if(params){
                params.setParam(aiCompleteCapsTableParam,capTable.tableArn);
            }
        }

        const secret=new secrets.Secret(this,'ApiKey');
        secret.grantRead(handlerFn.func);

        if(params){
            params.setParam(openAiSecretsParam,secret.secretArn);
        }
    }
}
