import { ConvoTask } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutProps } from "@iyio/common";
import { LoadingDots, ProgressBar, SlimButton, Text, View, useSubject } from "@iyio/react-common";
import { useEffect, useState } from "react";

export interface ConvoTaskViewProps
{
    task:ConvoTask;
}

export function ConvoTaskView({
    task,
    ...props
}:ConvoTaskViewProps & BaseLayoutProps){

    const progress=useSubject(task.progress?.progressSubject);
    const status=useSubject(task.progress?.statusSubject);

    const delay=task.delayMs;
    const [ready,setReady]=useState(!delay);
    useEffect(()=>{
        if(!delay){
            return;
        }
        const iv=setTimeout(()=>{
            setReady(true);
        },delay);
        return ()=>{
            clearTimeout(iv);
        }
    },[delay]);

    if(!ready){
        return null;
    }

    return (
        <div className={style.root(null,null,props)}>
            <View row alignCenter g05 opacity075>
                {task.documentUrl?
                    <SlimButton openLinkInNewWindow to={task.documentUrl}>
                        <Text sm className={style.link()} text={task.name}/>
                    </SlimButton>
                :
                    <Text sm text={task.name}/>
                }
                <LoadingDots size="0.5rem"/>
                </View>
            {!!status && <Text mt050 sm text={status}/>}
            {progress!==undefined && <ProgressBar className={style.bar()} mt025 value={progress} />}

        </div>
    )

}

const style=atDotCss({name:'ConvoTaskView',css:`
    @.root{
        display:flex;
        flex-direction:column;
    }
    @.link{
        text-decoration:underline;
    }
    @.bar{
        max-width:250px;
    }
`});
