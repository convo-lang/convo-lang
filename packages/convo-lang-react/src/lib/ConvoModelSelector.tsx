import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { useSubject } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { useConversationUiCtrl, useConvoTheme } from "./convo-lang-react.js";

export interface ConvoModelSelectorProps
{
    theme?:ConvoViewTheme;
    selectableModels?:string[];
}

export function ConvoModelSelector({
    theme,
    selectableModels
}:ConvoModelSelectorProps){

    theme=useConvoTheme(theme);

    const ctrl=useConversationUiCtrl();
    const convo=useSubject(ctrl.convoSubject);

    const model=useSubject(ctrl.modelOverrideSubject);
    const [_models,setModels]=useState<string[]|null>(null);
    const models=selectableModels??_models;

    const hasModels=models?true:false;

    useEffect(()=>{
        if(!convo || hasModels){
            return;
        }
        let m=true;
        (async ()=>{
            try{
                const models=await convo.getAllModelsAsync();
                if(m && models){
                    setModels(models.map(m=>m.name).sort());
                }
            }catch(ex){
                console.error('Failed to load LLM model list',ex);
            }
        })();
        return ()=>{
            m=false;
        }
    },[convo,hasModels]);


    return (
        <select className={theme.modelSelectorClassName} value={model??''} onChange={e=>ctrl.modelOverride=e.target.value||null}>
            <option value="">(default)</option>
            {models?.map((m,i)=>(
                <option key={i} value={m}>
                    {m}
                </option>
            ))}
        </select>
    )

}
