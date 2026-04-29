import type { ConvoDbFunctionExecutionContext, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { verify } from "otplib";
import { VerifyOptRequest } from "../../lib/auth-types.js";

export async function resultHandler({
    secret,
    token,
}:VerifyOptRequest,{
    db
}:ConvoDbFunctionExecutionContext):PromiseResultType<PartialNode>{

    try{
    
        const r=await verify({secret,token});
        
        return {
            success:true,
            result:{
                path:'/null',
                type:'otp-link',
                data:{valid:r.valid}
            }
        }
        
    }catch(ex){
        console.error('Failed to verify token',ex);
        return {
            success:false,
            error:`Failed to verify token: ${(ex as any)?.message}`,
            statusCode:500,
        };
    }
}
