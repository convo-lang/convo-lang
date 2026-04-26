import { ConvoDbInstanceMap } from "@convo-lang/convo-lang";
import { getConvoHonoRoutes } from "@convo-lang/hono/convo-lang-hono.js";
import { serve } from '@hono/node-server';
import { CancelToken, DisposeCallback } from "@iyio/common";
import { Hono } from "hono";
import { cors as _cors } from 'hono/cors';
import { defaultConvoCliApiPort } from "./convo-cli-lib.js";

export interface ConvoCliApiServerOptions
{
    port?:number;
    reusePort?:boolean;
    baseRoute?:string;
    cors?:boolean|string[];
    enableLogging?:boolean;
    dbMap?:ConvoDbInstanceMap;
    disableApiDbAuth?:boolean;
}

export const runConvoCliApiAsync=async ({
    port=defaultConvoCliApiPort,
    reusePort=false,
    baseRoute='/api/convo-lang',
    cors,
    enableLogging,
    dbMap,
    disableApiDbAuth,
}:ConvoCliApiServerOptions,cancel?:CancelToken)=>{

    const app=new Hono();

    const routes=getConvoHonoRoutes({enableLogging,dbMap,disableDbAuth:disableApiDbAuth});

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
