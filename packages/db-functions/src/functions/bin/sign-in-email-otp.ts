import type { ConvoDbFunctionExecutionContext, ConvoSignInJwt, ConvoSignInJwtTransport, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { sign } from "hono/jwt";
import { verify } from "otplib";
import { authSecretsPath, decryptSecret, invalidSignIn } from "../../lib/auth-lib.js";
import { UserSignIn } from "../../lib/auth-types.js";

interface Args{
    email:string;
    otp:string;
}

export async function resultHandler({
    email,
    otp
}:Args,{
    db
}:ConvoDbFunctionExecutionContext):PromiseResultType<PartialNode>{

    try{
        if(typeof email!=='string'){
            return {
                success:false,
                error:'email required',
                statusCode:400,
            }
        }

        if(typeof otp!=='string'){
            return {
                success:false,
                error:'password required',
                statusCode:400,
            }
        }

        const [usr,secret]=await Promise.all([

            db.queryNodesAsync({keys:'data',limit:1,steps:[{
                path:'/usr/*',
                condition:{
                    groupOp:'and',
                    conditions:[
                        {target:'data.jwt.claims.email',op:'=',value:email},
                        {target:'type',op:'=',value:'user-sign-in'},
                    ]
                }
            }]}),

            db.getNodeByPathAsync(authSecretsPath),
        ]);
        

        if(!secret.success || !secret.result){
            console.error(`\`${authSecretsPath}\` not set`);
            return invalidSignIn;
        }

        const jwtSecret=secret.result.data['jwt'];
        const otpSecret=secret.result.data['otpSecret'];

        if(!jwtSecret){
            console.error(`\`${authSecretsPath}[jwt]\` not set`);
            return invalidSignIn;
        }

        if(!otpSecret){
            console.error(`\`${authSecretsPath}[otpSecret]\` not set`);
            return invalidSignIn;
        }

        if(
            !usr.success ||
            !usr.result
        ){
            return invalidSignIn;
        }
        


        const userSignIn=usr.result.nodes?.[0]?.data as UserSignIn|undefined;
        if(!userSignIn?.otpSecret){
            return invalidSignIn;
        }


        const s=await decryptSecret(userSignIn.otpSecret,otpSecret);


        const v=await verify({secret:s,token:otp});
        if(!v.valid){
            return invalidSignIn;
        }

        const jwtValue=userSignIn.jwt;
        if(
            !jwtValue?.claims ||
            (typeof jwtValue.claims!=='object') ||
            !Array.isArray(jwtValue.identityPaths) ||
            jwtValue.identityPaths.some(v=>typeof v!=='string')
        ){
            return invalidSignIn;
        }

        const jwt:ConvoSignInJwt={
            ...jwtValue,
            dbName:db.dbName,
            jwt:await sign(
                {...jwtValue,dbName:db.dbName} satisfies ConvoSignInJwtTransport,
                jwtSecret,
                'HS256'
            )
        };
        return {
            success:true,
            result:{
                path:'/null',
                type:'sign-in-jwt',
                data:jwt,
            }
        }
    }catch(ex){
        console.error('sign-in error',ex);
        return invalidSignIn;
    }
}


