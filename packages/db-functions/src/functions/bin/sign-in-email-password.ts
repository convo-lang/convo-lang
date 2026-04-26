import type { ConvoDbFunctionExecutionContext, ConvoSignInJwt, ConvoSignInJwtTransport, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { sign } from "hono/jwt";
import { authSecretsPath, hashPasswordAsync, invalidSignIn } from "../../lib/auth-lib.js";
import { UserSignIn } from "../../lib/auth-types.js";

interface Args{
    email:string;
    password:string;
}

export async function resultHandler({
    email,
    password
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

        if(typeof password!=='string'){
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
        const passwordSalt=secret.result.data['passwordSalt'];

        if(!jwtSecret){
            console.error(`\`${authSecretsPath}[jwt]\` not set`);
        }

        if(!passwordSalt){
            console.error(`\`${authSecretsPath}[passwordSalt]\` not set`);
        }

        let passwordHash:string|undefined;

        if(
            !usr.success ||
            !usr.result ||
            !(passwordHash=usr.result.nodes[0]?.data['passwordHash']) ||
            !jwtSecret ||
            !passwordSalt
        ){
            return invalidSignIn;
        }
        

        const hash=await hashPasswordAsync(password,passwordSalt);
        if(!hash.success || hash.result!==passwordHash){
            return invalidSignIn;
        }

        const jwtValue=(usr.result.nodes?.[0].data as UserSignIn)?.jwt;
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

