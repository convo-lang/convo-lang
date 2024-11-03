import { BadRequestError, InternalServerError, getErrorMessage } from "@iyio/common";
import { createHttpHandlerResult, createHttpServer } from "@iyio/node-common";

export const startHttpServer=async (port,conversation,lock,cancel)=>{
    const server=createHttpServer({
        port,
        serverName:'Convo Studio Example API',
        hostname:'0.0.0.0',
        routes:[{

            method:'GET',
            path:'/convo',
            handler:()=>{
                return createHttpHandlerResult({
                    statusCode:200,
                    text:conversation.convo
                })
            },

            method:'POST',
            path:'/convo',
            rawBody:true,
            handler:async ({req})=>{
                const body=await readBodyAsync(req);
                const release=await lock.waitAsync(cancel);
                try{

                    console.log(body);

                    try{
                        conversation.append(body);
                    }catch(ex){
                        throw new BadRequestError('Invalid convo - '+getErrorMessage(ex));
                    }

                    const len=conversation.convo.length;
                    await conversation.completeAsync();
                    console.log(conversation.convo.substring(len));

                    return createHttpHandlerResult({
                        statusCode:200,
                        text:conversation.convo
                    })

                }catch(ex){
                    console.error('HTTP completion failed',ex);
                    throw new InternalServerError('completion failed - '+getErrorMessage(ex));
                }finally{
                    release();
                }
            },
        }],
    })

    console.log('');

    await cancel.toPromise();

    server.close();

    console.log('HTTP server exited');
}

const readBodyAsync=(req)=>{
    return new Promise((resolve,reject)=>{
        let chunk;
        //todo - use something other than a string
        let data='';
        req.on('readable',()=>{
            while((chunk=req.read())){
                data+=chunk?.toString?.()??'';
            }
        })
        req.on('end',()=>{
            try{
                resolve(data);
            }catch(ex){
                reject(ex);
            }
        })
        req.on('error',reject);
    })
}
