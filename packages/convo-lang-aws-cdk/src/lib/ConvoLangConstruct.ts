import { openAiSecretsParam } from '@convo-lang/convo-lang';
import { convoLangApiFnArnParam, convoLangGetTokenQuotaFnArnParam } from '@convo-lang/convo-lang-aws';
import { FnInfo, FnsBuilder, ManagedProps, NodeFn, NodeFnProps, getDefaultManagedProps, grantTableQueryPerms } from '@iyio/cdk-common';
import * as cdk from 'aws-cdk-lib';
import * as db from "aws-cdk-lib/aws-dynamodb";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { convoLangAnonUsdCapParam, convoLangAnonUsdCapTotalParam, convoLangCapsTableParam } from "./convo-lang-aws-cdk.deps";

export interface ConvoLangConstructOptions
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

export class ConvoLangConstruct extends Construct
{

    public readonly handlerFn:NodeFn;
    public readonly getQuotaFn:NodeFn|null;

    public readonly fnBuilder:FnsBuilder;

    public constructor(scope:Construct,id:string,{
        managed=getDefaultManagedProps(),
        defaultFnProps,
        fnName="ConvoLangApiFn",
        anonUsdCap,
        anonUsdCapTotal,
        grantAccess,
        handleQuotas=anonUsdCap!==undefined || anonUsdCapTotal!==undefined,
    }:ConvoLangConstructOptions={})
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
            arnParam:convoLangApiFnArnParam,
            grantAccess,
            createProps:{
                createPublicUrl:true,
                bundledHandlerFileNames:[
                    '../../dist/packages/convo-lang-aws-cdk/handlers/ConvoLangApi',
                    '../../node_modules/@convo-lang/convo-lang-aws-cdk/handlers/ConvoLangApi',
                ],
                timeoutMs:1000*60*5,
                ...defaultFnProps,
            },
        }];

        if(handleQuotas){
            fnsInfo.push({
                name:getQName,
                grantName:fnName,
                arnParam:convoLangGetTokenQuotaFnArnParam,
                grantAccess,
                createProps:{
                    createPublicUrl:true,
                    bundledHandlerFileNames:[
                        '../../dist/packages/convo-lang-aws-cdk/handlers/GetConvoLangTokenQuota',
                        '../../node_modules/@convo-lang/convo-lang-aws-cdk/handlers/GetConvoLangTokenQuota',
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

        handlerFn.func.addToRolePolicy(new iam.PolicyStatement({
            effect:iam.Effect.ALLOW,
            actions:[
                "bedrock:InvokeModel"
            ],
            resources:["*"],
        }))

        if(anonUsdCap!==undefined){
            handlerFn.func.addEnvironment(convoLangAnonUsdCapParam.typeName,anonUsdCap.toString());
            quotaFn?.func.addEnvironment(convoLangAnonUsdCapParam.typeName,anonUsdCap.toString());
        }

        if(anonUsdCapTotal!==undefined){
            handlerFn.func.addEnvironment(convoLangAnonUsdCapTotalParam.typeName,anonUsdCapTotal.toString());
            quotaFn?.func.addEnvironment(convoLangAnonUsdCapTotalParam.typeName,anonUsdCapTotal.toString());
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
                params.setParam(convoLangCapsTableParam,capTable.tableArn);
            }
        }

        const secret=new secrets.Secret(this,'ApiKey');
        secret.grantRead(handlerFn.func);

        if(params){
            params.setParam(openAiSecretsParam,secret.secretArn);
        }
    }
}
