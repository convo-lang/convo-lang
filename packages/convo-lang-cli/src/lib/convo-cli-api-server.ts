import { ConvoDbInstanceMap } from "@convo-lang/convo-lang";
import { getConvoHonoRoutes } from "@convo-lang/hono/convo-lang-hono.js";
import { getStaticHonoRoutesAsync } from "@convo-lang/hono/hono-static-routes.js";
import { serve } from '@hono/node-server';
import { CancelToken, DisposeCallback, joinPaths } from "@iyio/common";
import { Hono } from "hono";
import { cors as _cors } from 'hono/cors';
import { defaultConvoCliApiPort } from "./convo-cli-lib.js";
import { ConvoCliOptions } from "./convo-cli-types.js";



export const runConvoCliApiAsync=async ({
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
    apiRequireSignIn
}:Omit<ConvoCliOptions,'dbMap'>&{dbMap?:ConvoDbInstanceMap},cancel?:CancelToken)=>{

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
