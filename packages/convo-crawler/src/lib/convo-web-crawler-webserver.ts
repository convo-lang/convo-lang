import { asArrayItem, getContentType, getErrorMessage, queryParamsToObject } from "@iyio/common";
import { readFileAsStringAsync } from "@iyio/node-common";
import { Stats, createReadStream } from "fs";
import { stat } from "fs/promises";
import { createServer } from "http";
import { basename, join } from "path";
import { writeConvoCrawlerPreviewAsync } from "./convo-web-crawler-output-previewer-writer";
import { createConvoWebPdfFromMdAsync } from "./convo-web-pdf";
import { convoWebRoutes } from "./convo-web-routes";
import { getConvoWebRoute, isConvoWebHandlerResult } from "./convo-web-routing";

const pass=process.env['CONVO_WEB_PASSWORD'];

const defaultCorsHeaders:Record<string,string>={
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"*",
    "Access-Control-Allow-Methods":"OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD",
    "Access-Control-Max-Age":"86400",
    "Access-Control-Allow-Credentials":"true",
}

export const defaultConvoCrawlerWebServerPort=8899;
export interface ConvoCrawlerWebServerOptions
{
    port?:number;
    baseDir?:string;
    displayUrl?:string;
}
export const runConvoCrawlerWebServer=({
    port=defaultConvoCrawlerWebServerPort,
    baseDir='convo-crawler-out',
    displayUrl
}:ConvoCrawlerWebServerOptions)=>{
    createServer(async (req,res)=>{
        let path=(req.url??'/');
        const qi=path.indexOf('?');
        const query:Record<string,string>=qi===-1?{}:queryParamsToObject(path.substring(qi));
        if(qi!==-1){
            path=path.substring(0,qi);
        }
        const filepath=join(baseDir,path.replace(/^\//,'').replace(/\/\.{2,}\//g,'/_/'));
        const method=req.method??'GET';
        console.info(`request ${path} -> ${filepath}`)
        let html:string|undefined;
        let markdown:string|undefined;
        let text:string|undefined;
        let json:any;
        let outPath:string|undefined;
        let outSize:number=0;

        for(const e in defaultCorsHeaders){
            res.setHeader(e,defaultCorsHeaders[e]??'');
        }

        if(method==='OPTIONS'){
            res.statusCode=204;
            res.end();
            return;
        }

        if(pass && path.toLowerCase().startsWith('/api/')){
            let auth=req.headers['authorization']??'';
            if(auth.toLowerCase().startsWith('bearer ')){
                auth=auth.substring('bearer'.length).trim();
            }
            if(auth!==pass){
                res.setHeader('Content-Type','text/plain');
                res.statusCode=403;
                res.end('access denied');
                return;
            }
        }

        try{
            const route=getConvoWebRoute(path,method,convoWebRoutes);
            if(route){
                const regex=asArrayItem(route.match);
                if(regex){
                    const match=regex.exec(path);
                    if(match){
                        for(let i=1;i<match.length;i++){
                            const value=match[i];
                            if(!value){continue}
                            query[i.toString()]=value;

                        }
                    }
                }
                let body:any=undefined;
                if(req.readable && (req.method==='POST' || req.method==='PUT')){
                    body=await new Promise<any>((resolve,reject)=>{
                        let chunk:any;
                        //todo - use something other than a string
                        let data='';
                        req.on('readable',()=>{
                            while((chunk=req.read())){
                                data+=chunk?.toString?.()??'';
                            }
                        })
                        req.on('end',()=>{
                            try{
                                resolve(JSON.parse(data))
                            }catch(ex){
                                reject(ex);
                            }
                        })
                        req.on('error',reject);
                    })
                }
                const result=await route.handler({
                    path,
                    filePath:filepath,
                    body,
                    method,
                    query
                });
                if(isConvoWebHandlerResult(result)){
                    json=result.json;
                    html=result.html;
                    markdown=result.markdown;
                    text=result.text;
                    outPath=result.filePath;
                }else{
                    json=result;
                }
            }else{
                let s:Stats|undefined;
                try{
                    s=await stat(filepath);
                }catch{
                    //
                }
                if(s){
                    if(s.isDirectory()){
                        html=await writeConvoCrawlerPreviewAsync(filepath,{
                            back:true,
                            title:basename(filepath),
                        });
                    }else if(s.isFile() || s.isSymbolicLink()){
                        outPath=filepath;
                        outSize=s.size;
                    }
                }
            }
        }catch(ex){
            res.setHeader('Content-Type','text/plain');
            res.statusCode=500;
            res.end(getErrorMessage(ex)+'\n\n\n'+(ex as any)?.stack)
            return;
        }
        if(html){
            res.setHeader('Content-Type','text/html');
            res.statusCode=200;
            res.end(html);
        }else if(markdown){
            res.setHeader('Content-Type','text/markdown');
            res.statusCode=200;
            res.end(markdown);
        }else if(text){
            res.setHeader('Content-Type','text/plain');
            res.statusCode=200;
            res.end(text);
        }else if(json!==undefined){
            res.setHeader('Content-Type','application/json');
            req.statusCode=200;
            let text:string='null';
            try{
                text=JSON.stringify(json);
            }catch(ex){
                text=JSON.stringify(getErrorMessage(ex));
            }
            res.end(text);
        }else if(outPath){

            if(query['format']==='pdf'){
                const pdf=await createConvoWebPdfFromMdAsync(await readFileAsStringAsync(outPath));
                res.statusCode=200;
                res.write(pdf);
                res.end();
                return;
            }

            res.statusCode=200;
            const stream=createReadStream(outPath);
            stream.on('open',()=>{
                res.setHeader('Content-type',getContentType(outPath));
                if(outSize){
                    res.setHeader('Content-Length',outSize.toString());
                }
                stream.pipe(res);
            })
            stream.on('error',err=>{
                res.setHeader('Content-type','text/plain');
                res.end(getErrorMessage(err));
            });
        }else{
            res.setHeader('Content-Type','text/plain');
            res.statusCode=404;
            res.end('404');
        }
    }).listen(port);
    console.info(`convo crawler listening on port ${port} - ${displayUrl||`http://localhost:${port}`}`);
}
