import { getConvoHonoRoutes } from "@convo-lang/hono/convo-lang-hono.js";
import { getStaticHonoRoutesAsync } from "@convo-lang/hono/hono-static-routes.js";
import { serve } from '@hono/node-server';
import { CancelToken, DisposeCallback, joinPaths } from "@iyio/common";
import { Hono } from "hono";
import { cors as _cors } from 'hono/cors';
import { defaultConvoCliApiPort } from "./convo-cli-lib.js";
import { ConvoCliApiRouteProvider, ConvoCliOptionsDbMapped } from "./convo-cli-types.js";



export const runConvoCliApiAsync=async (options:ConvoCliOptionsDbMapped,cancel?:CancelToken)=>{

    const {
        apiPort:port=defaultConvoCliApiPort,
        apiReusePort:reusePort=false,
        apiRouteBase:baseRoute='/api/convo-lang',
        apiCors:cors,
        apiLogging:enableLogging,
        apiDbRoot,
        dbMap,
        disableApiDbAuth,
        apiStaticRoot:staticRoot,
        embeddedFileMap,
        apiRequireSignIn,
        apiModule,
    }=options;

    const app=new Hono({
        getPath:!apiDbRoot?undefined:req=>{

            const path=new URL(req.url).pathname;

            if(path.startsWith(baseRoute)){
                return path;
            }

            return joinPaths(baseRoute,'db',apiDbRoot,path==='/'?'/index.html':path);
        }
    });

    const routes=getConvoHonoRoutes({enableLogging,dbMap,disableDbAuth:disableApiDbAuth,requireSignIn:apiRequireSignIn});

    if(staticRoot){
        await getStaticHonoRoutesAsync(app,staticRoot,embeddedFileMap);
    }

    if(cors){
        app.use('/*',_cors({
            origin:Array.isArray(cors)?cors:'*'
        }));
    }

    app.route(baseRoute,routes);

    if(apiModule){
        for(const mod of apiModule){
            let cb:ConvoCliApiRouteProvider|undefined;
            if(typeof mod === 'string'){
                const [importName,...modName]=mod.split(':');
                const importedMod=await import(modName.join(':'));
                const routesCb=importedMod[importName??''];
                if(typeof routesCb === 'function'){
                    cb=routesCb;
                }
            }else{
                cb=mod;
            }

            if(cb){
                console.log(`Loading API module: ${mod}`);
                const routes=await cb(options);
                if(routes){
                   app.route(baseRoute,routes);
                }else{
                    console.error(`API module export undefined: ${mod}`);
                }
            }
        }
    }

    let dispose:DisposeCallback|undefined;
    if(globalThis.Bun){
        const server=globalThis.Bun?.serve({
            fetch:app.fetch,
            port,
            reusePort,
        });
        dispose=()=>{
            server.stop();
        }
    }else{
        const server=serve({
            fetch:app.fetch,
            port,
        });
        dispose=()=>{
            server.close();
        }
    };

    console.log(`Convo-Lang CLI API. listening:http://0.0.0.0:${port}, baseRoute:${baseRoute}, pid:${process.pid}`);

    await cancel?.toPromise();

    console.log('Stopping API server');

    dispose();

}
