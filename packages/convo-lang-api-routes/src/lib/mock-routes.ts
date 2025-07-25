import { strHashBase64Fs } from "@iyio/common";
import { HttpRoute } from "@iyio/node-common";

const createId=(value:any)=>{
    if(typeof value !=='string'){
        value=JSON.stringify(value);
    }
    return strHashBase64Fs(value||'_',2);
}

export const getMockConvoRoutes=(regPrefix:string):HttpRoute[]=>[
    {
        method:'GET',
        match:new RegExp(`${regPrefix}/mock/(.*)`),
        handler:async ({
            query
        })=>{

            return {
                id:createId(query[1]),
                value:query[1]
            }
        }
    },
    {
        method:'POST',
        match:new RegExp(`${regPrefix}/mock/(.*)`),
        handler:async ({
            body,
            query
        })=>{

            return {
                ...body,
                id:createId(query[1]),
            }
        }
    },
    {
        method:'PUT',
        match:new RegExp(`${regPrefix}/mock/(.*)`),
        handler:async ({
            body,
            query
        })=>{

            return {
                ...body,
                id:createId(query[1]),
            }
        }
    },
    {
        method:'DELETE',
        match:new RegExp(`${regPrefix}/mock/(.*)`),
        handler:async ({
            query
        })=>{

            return {
                id:createId(query[1]),
            }
        }
    },
]
