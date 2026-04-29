import type { ConvoDbFunctionExecutionContext, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { generateSecret, generateURI } from "otplib";
import { authSecretsPath } from "../../lib/auth-lib.js";
import { CreateOtpLinkRequest } from "../../lib/auth-types.js";

export async function resultHandler({
    issuer,
    label
}:CreateOtpLinkRequest,{
    db
}:ConvoDbFunctionExecutionContext):PromiseResultType<PartialNode>{

    try{
    
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

        const otpSecret=secret.result.data['otpSecret'];
        if(!otpSecret){
            return {
                success:false,
                error:`\`${authSecretsPath}[otpSecret]\` not set`,
                statusCode:500,
            }
        }


        return {
            success:true,
            result:{
                path:'/null',
                type:'otp-link',
                data:{
                    link:generateURI({
                        issuer,
                        label,
                        secret:generateSecret()
                    }),
                }
            }
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
