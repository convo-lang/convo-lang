import { ConvoTask, ConvoViewTheme } from "@convo-lang/convo-lang";
import { ProgressBar, useSubject } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { Button } from "./Button.js";
import { ConvoLoader } from "./ConvoLoader.js";
import { cn } from "./util.js";

export interface ConvoTaskViewProps
{
    className?:string;
    task:ConvoTask;
    theme:ConvoViewTheme;
}

export function ConvoTaskView({
    className,
    task,
    theme,
}:ConvoTaskViewProps){

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
        <div className={cn(theme.taskClassName,className)}>
            <div className={theme.taskRowClassName}>
                {task.documentUrl?
                    <Button openLinkInNewWindow to={task.documentUrl}>
                        <span className={cn(theme.taskNameClassName,theme.taskLinkClassName)}>{task.name}</span>
                    </Button>
                :
                    <span className={theme.taskNameClassName}>{task.name}</span>
                }
                <ConvoLoader theme={theme} />
            </div>
            {!!status && <span className={theme.taskStatusClassName}>{status}</span>}
            {progress!==undefined && <ProgressBar className={theme.taskProgressBarClassName} value={progress} />}

        </div>
    )

}

