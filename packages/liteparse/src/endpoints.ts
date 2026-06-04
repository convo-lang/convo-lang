import { getErrorMessage } from "@iyio/common";
import { LiteParse } from '@llamaindex/liteparse';
import { Hono } from "hono";

export const convoLiteParseEndpoints=()=>{
    const app=new Hono();

    app.post('parse-document',async c=>{
        try{

            const formData=await c.req.formData();
            const file=formData.get('file');
            if(!file){
                return c.text('file required',400);
            }
            if(!(file instanceof File)){
                return c.text('file parameter should be a file',400);
            }

            const data=await file.bytes();

            const parser=new LiteParse();
            const result=await parser.parse(data);

            return c.json(result,200);

        }catch(ex){
            return c.text('Failed to parse document - '+getErrorMessage(ex),500);
        }
    })

    return app;
}