import { ConvoDb, ConvoSignInJwtTransport } from "@convo-lang/convo-lang";
import { minuteMs } from "@iyio/common";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

export class JwtVerifier
{
    public readonly guestToken:TokenRef={
        identityPath:'/usr/guest',
        token:{
            dbName:'',
            id:'',
            identityPaths:['/usr/guest'],
            claims:{}
        }
    }


    private readonly keyCache:Record<string,KeyRef>={};
    
    public async getDbTokenAsync(c:Context,db:ConvoDb):Promise<TokenRef>{
        let auth=c.req.header('Authorization');
        if(!auth){
            return this.guestToken;
        }

        if(auth.startsWith('Bearer ')){
            auth=auth.substring(6).trim();
        }

        let key:string;
        const cached=this.keyCache[db.dbName];
        if(cached && cached.ttl>Date.now()){
            key=cached.key;
        }else{
            const node=await db.getNodeByPathAsync('/secrets/auth-secrets');
            if(!node.success || !node.result){
                return this.guestToken;
            }

            const k=node.result.data['jwt'];
            if(typeof k !=='string'){
                return this.guestToken;
            }
            key=k;
            this.keyCache[db.dbName]={ttl:Date.now()+ttl,key};

        }
        
        try{
            const token=await verify(auth,key,'HS256') as ConvoSignInJwtTransport;

            if(token.dbName!==db.dbName){
                throw new HTTPException(401);
            }

            const identityPath=token.identityPaths?.[0];
            if(!identityPath){
                throw new HTTPException(401);
            }

            return {
                identityPath,
                token,
            };
        }catch{
            throw new HTTPException(401);
        }
        

    }
}

const ttl=5*minuteMs;

interface KeyRef
{
    ttl:number;
    key:string;
}

export interface TokenRef
{
    token:ConvoSignInJwtTransport;
    identityPath:string;
}