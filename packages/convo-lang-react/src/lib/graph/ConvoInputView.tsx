import { ConvoInputTemplate } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { wAryRemove, wSetProp, wSetPropOrDeleteFalsy } from "@iyio/common";
import { ScrollView, SlimButton, Text, View, useSubject, useWProp } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useCallback, useState } from "react";
import { ConvoNodeSelector } from "./ConvoNodeSelector";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib";
import { ConvoInputSource } from "./convo-graph-react-type";

export interface ConvoInputViewProps
{
    input:ConvoInputTemplate;
}

/**
 * @acIgnore
 */
export function ConvoInputView({
    input
}:ConvoInputViewProps){

    const ctrl=useConvoGraphViewCtrl();

    const code=useWProp(input,'value');
    const isJson=useWProp(input,'isJson');
    const to=useWProp(input,'to');

    const sources=useSubject(ctrl.inputSourcesSubject);
    const [source,setSource]=useState<ConvoInputSource|null>(null);
    const loadSource=async ()=>{
        if(!source){
            return;
        }
        let value:any;
        if(source.getValue){
            value=await source.getValue(source.id);
        }else{
            value=source.value;
        }
        wSetProp(input,'name',source.title);
        if(typeof value === 'string'){
            wSetProp(input,'isJson',false);
            wSetProp(input,'value',value);
        }else{
            wSetProp(input,'isJson',true);
            wSetProp(input,'value',JSON.stringify(value,null,4));
        }
    }

    const setCode=useCallback((v:string)=>{
        wSetProp(input,'value',v);
    },[input]);


    const run=async ()=>{

        if(!ctrl){
            return;
        }

        const group=await ctrl.ctrl.startTraversalAsync({
            payload:isJson?JSON.parse(input.value):input.value,
            edge:input.to,
            edgePattern:input.to?undefined:{
                from:input.id
            },
            saveToStore:true,
        });

        await ctrl.ctrl.runGroupAsync(group);
    }

    return (
        <div className={style.root()}>

            <View row g050 alignCenter>
                To
                <ConvoNodeSelector flex1 value={to} onChange={id=>wSetProp(input,'to',id||undefined)} emptyLabel="None (use edge)" />
            </View>

            {!!sources.length && <View row g050 alignCenter>
                <select className={style.select()} value={source?.id??''} onChange={v=>setSource(sources.find(s=>s.id===v.target.value)??null)}>
                    <option value="">Select a input source</option>
                    {sources.map(s=>(
                        <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                </select>
                <SlimButton onClick={loadSource}>
                    <Text opacity050 text="Load"/>
                </SlimButton>
            </View>}

            <View row>
                <label>JSON</label>
                <input type="checkbox" checked={isJson??false} onChange={e=>wSetPropOrDeleteFalsy(input,'isJson',e.target.checked)}/>
            </View>

            <ScrollView mt050 fitToMaxSize="400px" className={style.scroll()}>
                <LazyCodeInput
                    lineNumbers
                    language={isJson?'json':'tex'}
                    value={code}
                    onChange={setCode}
                    bottomPadding={10}
                />
            </ScrollView>

            <View row justifyBetween>

                <SlimButton opacity050 onClick={run}>run</SlimButton>

                <SlimButton opacity050 onClick={()=>{
                    wAryRemove(ctrl.graph.inputs,input);
                }}>remove</SlimButton>


            </View>

        </div>
    )

}

const style=atDotCss({name:'ConvoInputView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        gap:1rem;
    }
    @.input{
        flex:1;
    }
    @.select{
        max-width:350px;
    }
    @.scroll > div::-webkit-scrollbar{
        width:16px;
        border-radius:2px;
        margin:0;
    }
    @.scroll > div::-webkit-scrollbar-thumb{
        border-radius:4px;
        border:3px solid #2C2C2C;
        cursor:pointer;

    }
`});
