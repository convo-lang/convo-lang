import { atDotCss } from "@iyio/at-dot-css";
import { Form, ScrollView } from "@iyio/react-common";
import { useState } from "react";
import { PopupCtrl, popCtrl } from "./PopupCtrl";

export interface TaskViewProps
{
    ctrl?:PopupCtrl;
}

export function TaskView({
    ctrl=popCtrl()
}:TaskViewProps){

    const [prompt,setPrompt]=useState('reply to this email');

    return (
        <div className={style.root()}>

            <ScrollView flex1 containerCol>

            </ScrollView>

            <Form onSubmit={()=>{
                setPrompt('');
                if(prompt.trim()){
                    ctrl.startTask(prompt.trim());
                }
            }}>
                <input placeholder="Enter prompt" value={prompt} onChange={e=>setPrompt(e.target.value)}/>
            </Form>

        </div>
    )

}

const style=atDotCss({name:'TaskView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
    }
`});
