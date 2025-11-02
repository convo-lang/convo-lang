import { useDeepCompareItem } from "@iyio/react-common";
import { useMemo } from "react";
import { GenMetadataCtx, GenMetadataReactContext, useGenMetadata } from "./gen-lib.js";

export interface GenMetadataProps
{
    metadata?:Record<string,any>;
    children?:any;
    [key:string]:any;
}

export function GenMetadata({
    metadata,
    children,
    ...rest
}:GenMetadataProps){

    const parentMetadata=useGenMetadata();

    const md=useDeepCompareItem({
        parentMetadata,
        metadata,
        rest,
    })

    const ctx=useMemo<GenMetadataCtx>(()=>{
        return {metadata:{
            ...md.parentMetadata,
            ...md.metadata,
            ...md.rest
        }}
    },[md]);


    return (
        <GenMetadataReactContext.Provider value={ctx}>
            {children}
        </GenMetadataReactContext.Provider>
    )

}
