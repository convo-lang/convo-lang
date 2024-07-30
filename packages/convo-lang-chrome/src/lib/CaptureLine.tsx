import { atDotCss } from "@iyio/at-dot-css";
import { View } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { popCtrl } from "./PopupCtrl";
import { ConvoCaptureState, ConvoTaskState } from "./convo-chrome-types";

const fallbackImageUrl='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRDlEOUQ5Ii8+CjxwYXRoIGQ9Ik0zMS45ODc0IDM1LjAwNThDMzAuOTUxNCAzNC4xODg5IDI5LjQ0NzEgMzQuMzc4MiAyOC42MzAzIDM1LjQxNDJDMjcuODEzNCAzNi40NTAzIDI4LjAwMjcgMzcuOTU0NSAyOS4wMzg3IDM4Ljc3MTRMODguMDEyNiA4NC45OTQyQzg5LjA0ODcgODUuODExMSA5MC41NTI5IDg1LjYyMTggOTEuMzY5OCA4NC41ODU4QzkyLjE4NjYgODMuNTQ5NyA5MS45OTc0IDgyLjA0NTUgOTAuOTYxMyA4MS4yMjg2TDg1LjQzMjUgNzYuODk1MkM4NS40ODIzIDc2LjU4NjQgODUuNTAyMyA3Ni4yNjc2IDg1LjUwMjMgNzUuOTM4OVY0NC4wNjExQzg1LjUwMjMgNDAuNTQ0NiA4Mi42NDMyIDM3LjY4NTUgNzkuMTI2NyAzNy42ODU1SDQwLjg3MzNDMzkuNDM4OCAzNy42ODU1IDM4LjEwMzkgMzguMTYzNyAzNy4wMzggMzguOTcwNkwzMS45ODc0IDM1LjAwNThaTTQzLjk0MTYgNDQuMzc5OUM0NC40Njk1IDQ0LjE4MDYgNDUuMDQ3MyA0NC4wNjExIDQ1LjY1NSA0NC4wNjExQzQ4LjI5NDkgNDQuMDYxMSA1MC40MzY3IDQ2LjIwMjkgNTAuNDM2NyA0OC44NDI4QzUwLjQzNjcgNDkuMDQyIDUwLjQyNjcgNDkuMjQxMiA1MC4zOTY4IDQ5LjQ0MDVMNDMuOTQxNiA0NC4zNzk5Wk02MC44MDY5IDU3LjU5OTJMNjIuNzk5MyA1NC42NzA0QzYzLjI0NzYgNTQuMDEyOSA2My45ODQ3IDUzLjYyNDQgNjQuNzcxNyA1My42MjQ0QzY1LjU1ODcgNTMuNjI0NCA2Ni4zMDU4IDU0LjAxMjkgNjYuNzQ0MiA1NC42NzA0TDc3Ljg3MTUgNzAuOTY4TDYwLjgwNjkgNTcuNTk5MlpNNzYuNjc2MSA4Mi4zMTQ1TDY4LjU4NzEgNzUuOTM4OUg2MEg1Mi44Mjc1SDQzLjI2NDJDNDIuMzM3NyA3NS45Mzg5IDQxLjQ5MSA3NS40MDEgNDEuMDkyNSA3NC41NTQyQzQwLjY5NCA3My43MDc1IDQwLjgzMzUgNzIuNzExMyA0MS40NDEyIDcyLjAwNEw1MC4yMDc1IDYxLjY0MzdDNTAuMjM3NCA2MS42MDM5IDUwLjI2NzMgNjEuNTc0IDUwLjMwNzIgNjEuNTM0MUwzNC40OTc4IDQ5LjA4MThWNzUuOTM4OUMzNC40OTc4IDc5LjQ1NTQgMzcuMzU2OCA4Mi4zMTQ1IDQwLjg3MzMgODIuMzE0NUg3Ni42NzYxWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==';

export interface CaptureLineProps
{
    capture:ConvoCaptureState;
    task:ConvoTaskState;
}

export function CaptureLine({
    capture,
    task,
}:CaptureLineProps){

    const [title,setTitle]=useState<string|null>(capture.title??task.id);
    const [iconUrl,setIconUrl]=useState(capture.iconUrl??'');

    useEffect(()=>{

        const tabId=capture.tabId;
        if(tabId===undefined){
            return;
        }

        let m=true;

        const iv=setInterval(()=>{
            popCtrl().getTabByIdAsync(tabId).then(tab=>{
                if(!m){
                    return;
                }
                if(tab){
                    setTitle(tab.title??'(no title)');
                    setIconUrl(tab.favIconUrl??'');
                }else{
                    setTitle(null);
                }
            })
        },500);

        return ()=>{
            m=false;
            clearInterval(iv);
        }
    },[capture]);

    if(title===null){
        return null;
    }

    return (
        <div className={style.root()}>

            <img className={style.icon()} src={iconUrl||fallbackImageUrl} alt={title}/>
            <span>{title}</span>
            <View row g1 flex1>
                {capture?.stop?'Stopped':<>
                    <button onClick={()=>{
                        if(capture){
                            capture.stop=true;
                            capture.cancel=true;
                            popCtrl().onTaskStateChange(task);
                        }
                    }}>Cancel</button>
                    <button onClick={()=>{
                        if(capture){
                            capture.stop=true;
                            popCtrl().onTaskStateChange(task);
                        }
                    }}>Stop</button>
                </>}
            </View>

        </div>
    )

}

const style=atDotCss({name:'CaptureLine',css:`
    @.root{
        display:flex;
        gap:1rem;
        align-items:center;
    }
    @.icon{
        width:40px;
        height:40px;
        border-radius:6px;
    }
`});
