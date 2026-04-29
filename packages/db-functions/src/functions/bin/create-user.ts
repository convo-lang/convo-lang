import type { ConvoDbFunctionExecutionContext, ConvoNode, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { authSecretsPath, encryptSecret, hashPasswordAsync } from "../../lib/auth-lib.js";
import { CreateUserSignRequest, UserSignIn } from "../../lib/auth-types.js";

export async function resultHandler(signIn:CreateUserSignRequest,{
    db
}:ConvoDbFunctionExecutionContext):PromiseResultType<PartialNode>{

    try{
        
        if(!signIn.password && !signIn.otpSecret){
            return {
                success:false,
                error:'password or otpSecret required',
                statusCode:400
            }
        }

        const email=signIn?.claims['email'];
        if(!email){
            return {
                success:false,
                error:'claims.email required',
                statusCode:400,
            }
        }
        const existing=await db.queryNodesAsync({keys:'path',limit:1,steps:[{
            path:'/usr/*',
            condition:{
                groupOp:'and',
                conditions:[
                    {target:'data.jwt.claims.email',op:'=',value:email},
                    {target:'type',op:'=',value:'user-sign-in'},
                ]
            }
        }]});

        if(!existing.success){
            return existing;
        }

        if(existing.result.nodes.length){
            return {
                success:false,
                error:'Email already in use',
                statusCode:400,
            }
        }

        const secret=await db.getNodeByPathAsync(authSecretsPath);
        if(!secret.success){
            return secret;
        }

        if(!secret.result){
            return {
                success:false,
                error:`\`${authSecretsPath}\` not set`,
                statusCode:500,
            }
        }

        

        let passwordHash:string|undefined;
        let otpSecretValue:string|undefined

        if(signIn.password){

            const salt=secret.result.data['passwordSalt'];
            if(!salt){
                return {
                    success:false,
                    error:`\`${authSecretsPath}[passwordSalt]\` not set`,
                    statusCode:500,
                }
            }
            const passwordHashResult=await hashPasswordAsync(signIn.password,salt);
            if(!passwordHashResult.success){
                return passwordHashResult;
            }
            passwordHash=passwordHashResult.result;
        }

        if(signIn.otpSecret){
            const otpSecret=secret.result.data['otpSecret'];
            if(!otpSecret){
                return {
                    success:false,
                    error:`\`${authSecretsPath}[otpSecret]\` not set`,
                    statusCode:500,
                }
            }
            otpSecretValue=await encryptSecret(signIn.otpSecret,otpSecret);
        }

        const id=globalThis.crypto.randomUUID();
        const jwt={...signIn,id};
        if(!jwt.identityPaths){
            jwt.identityPaths=[];
        }
        jwt.identityPaths.push(`/usr/${id}`);
        delete (jwt as Partial<CreateUserSignRequest>).password;
        delete (jwt as Partial<CreateUserSignRequest>).otpSecret;
        const node:ConvoNode={
            path:`/usr/${id}`,
            type:'user-sign-in',
            data:{
                passwordHash:passwordHash,
                otpSecret:otpSecretValue,
                jwt,
            } satisfies UserSignIn
        };


        const r=await db.insertNodeAsync(node);
        if(!r.success){
            return r;
        }
        
        return {
            success:true,
            result:node,
        }
        
    }catch(ex){
        console.error('Create user failed',ex);
        return {
            success:false,
            error:`Create user failed: ${(ex as any)?.message}`,
            statusCode:500,
        };
    }
}
