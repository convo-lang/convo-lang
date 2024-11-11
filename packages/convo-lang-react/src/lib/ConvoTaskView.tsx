import { ConvoTask } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { ProgressBar, SlimButton, Text, useSubject } from "@iyio/react-common";
import { useEffect, useState } from "react";

export interface ConvoTaskViewProps
{
    task:ConvoTask;
}

export function ConvoTaskView({
    task
}:ConvoTaskViewProps){

    const progress=useSubject(task.progress?.progressSubject);
    const status=useSubject(task.progress?.statusSubject);

    const [ready,setReady]=useState(false);
    useEffect(()=>{
        const iv=setTimeout(()=>{
            setReady(true);
        },750);
        return ()=>{
            clearTimeout(iv);
        }
    },[]);

    if(!ready){
        return null;
    }

    return (
        <div className={style.root()}>

            {task.documentUrl?
                <SlimButton openLinkInNewWindow to={task.documentUrl}>
                    <Text className={style.link()} text={task.name}/>
                </SlimButton>
            :
                <Text text={task.name}/>
            }
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
