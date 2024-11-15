import { BadRequestError, NotFoundError, fsBase64Chars, getFileName, httpClient, joinPaths, parseConfigBool, strHashBase64 } from "@iyio/common";
import { HttpRoute, createHttpHandlerResult, pathExistsAsync } from "@iyio/node-common";
import { vfs } from "@iyio/vfs";
import { writeFile } from "fs/promises";
import { ImageGenRouteOptions, defaultConvoLangFsRoot } from "./convo-lang-api-routes-lib";



export const createImageGenRoute=({
    imageGenerator,
    routeMatch,
    promptQueryParam,
    saltQueryParam,
    writeRevisedPromptsToDisk,
    cacheQueryParam,
    enableVfs,
    enableCaching,
    imageCacheSubDir='generated-images',
    useResourceRedirects,
    fsRoot=defaultConvoLangFsRoot,
    cacheDir='cache',
    publicWebBasePath,
}:ImageGenRouteOptions):HttpRoute=>{

    const cacheFullDir=joinPaths(fsRoot,cacheDir,imageCacheSubDir);

    const createFileResponseAsync=async (path:string,hash:string)=>{
        if(useResourceRedirects){
            return createHttpHandlerResult({
                redirect:joinPaths(publicWebBasePath??'/',cacheDir,imageCacheSubDir,hash.substring(0,3),getFileName(path))
            });
        }else if(enableVfs){
            const buffer=await vfs().readBufferAsync(path);
            return createHttpHandlerResult({
                statusCode:200,
                contentType:'image/png',
                buffer,
                size:buffer.byteLength,
            })
        }else{
            return createHttpHandlerResult({
                filePath:path
            })
        }
    }

    return {
        method:'GET',
        match:routeMatch,
        handler:async ({query})=>{

            const prompt=query[promptQueryParam];
            if(!prompt){
                throw new BadRequestError('Prompt query or route param not provided')
            }
            const salt=saltQueryParam===undefined?'_':(query[saltQueryParam]??'');
            if(!salt){
                throw new BadRequestError('Bad salt');
            }

            const cv=cacheQueryParam===undefined?undefined:query[cacheQueryParam];
            const cache=cv===undefined?(enableCaching?true:false):parseConfigBool(cv);

            const name=`${salt}:${prompt}`;
            const hash=strHashBase64(name,undefined,fsBase64Chars);

            const path=joinPaths(cacheFullDir,hash.substring(0,3),`${hash}.png`);
            if(cache){
                let cachedPath:string|undefined;
                if(enableVfs){
                    const match=await vfs().getItemAsync(path);
                    cachedPath=match?.path;
                }else if(await pathExistsAsync(path)){
                    cachedPath=path;
                }
                if(cachedPath){
                    return await createFileResponseAsync(cachedPath,hash);
                }
            }

            const generated=await imageGenerator({
                prompt,
                cache,
            })


            const img=generated?.[0];

            console.info(`Generated Image - ${prompt}`,img);

            let imgData:Blob;

            if(img?.data){
                imgData=img.data;
            }else if(img?.url){
                const r=await httpClient().getResponseAsync(img.url);
                if(!r){
                    throw new NotFoundError();
                }
                imgData=await r.blob();
            }else{
                throw new NotFoundError();
            }

            if(!cache){
                const buffer=new Uint8Array(await imgData.arrayBuffer());
                return createHttpHandlerResult({
                    statusCode:200,
                    contentType:'image/png',
                    buffer,
                    size:buffer.byteLength,
                })
            }

            await Promise.all([
                (enableVfs?
                    vfs().writeBufferAsync(path,imgData)
                :
                    writeFile(path,new Uint8Array(await imgData.arrayBuffer()))
                ),
                (img.revisedPrompt && writeRevisedPromptsToDisk)?(
                    enableVfs?
                        vfs().writeStringAsync(path+'.description',img.revisedPrompt)
                    :
                        writeFile(path+'.description',img.revisedPrompt)
                ):null
            ]);
            return await createFileResponseAsync(path,hash);
        }
    }
}
