import type { ConvoDbFunctionExecutionContext, ConvoNode, PartialNode, PromiseResultType } from "@convo-lang/convo-lang";
import { authSecretsPath, getRandom } from "../../lib/auth-lib.js";

interface Args{
    override?:boolean;
}

export async function resultHandler({
    override=false
}:Args,{
    db
}:ConvoDbFunctionExecutionContext):PromiseResultType<PartialNode>{

    try{

        const nodeR=await db.getNodeByPathAsync(authSecretsPath);
        if(!nodeR.success){
            return nodeR;
        }

        const node:ConvoNode=nodeR.result??{
            path:authSecretsPath,
            type:'auth-secrets',
            data:{}
        }

        let changed=false;

        if(!node.data['jwt'] || override){
            node.data['jwt']=getRandom();
            changed=true;
        }

        if(!node.data['passwordSalt'] || override){
            node.data['passwordSalt']=getRandom();
            changed=true;
        }

        if(!node.data['otpSecret'] || override){
            node.data['otpSecret']=getRandom();
            changed=true;
        }

        if(nodeR.result){
            if(changed){
                await db.updateNodeAsync(node);
            }
        }else{
            await db.insertNodeAsync(node);
        }

        return {
            success:true,
            result:node,
        };
        
    }catch(ex){
        console.error('init auth failed',ex);
        return {
            success:false,
            error:`Init auth failed: ${(ex as any)?.message}`,
            statusCode:500,
        };
    }
}

