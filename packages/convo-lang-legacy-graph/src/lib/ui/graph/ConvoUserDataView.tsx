import { deepCompare, parseJsonCode, wSetProp } from "@iyio/common";
import { View, useWProp, useWatchDeep } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback, useEffect, useState } from "react";

export interface ConvoUserDataViewProps
{
    hasUserData?:{userData?:Record<string,any>};
}

export function ConvoUserDataView({
    hasUserData,
}:ConvoUserDataViewProps){

    const [code,setCode]=useState(()=>hasUserData?.userData?JSON.stringify(hasUserData.userData,null,4):'');

    const userData=useWProp(hasUserData,'userData');
    const deep=useWatchDeep(userData);
    useEffect(()=>{
        const iv=setTimeout(()=>{
                setCode(v=>{
                try{
                    if(deepCompare(JSON.parse(v),userData)){
                        return v;
                    }else{
                        return JSON.stringify(userData,null,4);
                    }
                }catch{
                    return v;
                }
            })
        },200);
        return ()=>{
            clearTimeout(iv);
        }
    },[userData,deep]);

    const onChange=useCallback((code:string)=>{
        setCode(code);
        try{
            wSetProp(hasUserData,'userData',JSON.parse(code));
        }catch{
            // do nothing
        }
    },[hasUserData]);


    return (
        <View col mt1>
            userData
            <LazyCodeInput
                value={code}
                onChange={onChange}
                language="json"
                parser={parseJsonCode}
                lineNumbers
                bottomPadding={20}
            />
        </View>
    )

}

