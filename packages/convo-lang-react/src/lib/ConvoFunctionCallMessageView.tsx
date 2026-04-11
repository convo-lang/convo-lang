import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { ChevronUpIcon, CurlyBracesIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./Button.js";
import { formatConvoArgsString } from "./convo-theme-lib.js";
import { ConvoThemeIcon } from "./ConvoThemeIcon.js";
import { cn } from "./util.js";

export interface ConvoFunctionCallMessageViewProps
{
    rowClassName:string;
    messageClassName:string;
    theme:ConvoViewTheme;
    elemRef?:(elem:HTMLElement|null)=>void;
    fnName:string;
    calledParams?:any;
    isStreaming?:boolean;
}

export function ConvoFunctionCallMessageView({
    rowClassName,
    messageClassName,
    theme,
    elemRef,
    fnName,
    calledParams,
    isStreaming
}:ConvoFunctionCallMessageViewProps){

    const [open,setOpen]=useState<boolean|'json'>(false);

    const args=useMemo(()=>{
        let str:string;
        if(open===true && calledParams && (typeof calledParams==='object')){
            const lines:string[]=[];
            for(const e in calledParams){
                const v=calledParams[e];
                lines.push(`${e}: ${(typeof e === 'string'?v:JSON.stringify(v,null,4))}`);
            }
            str=lines.join('\n');
        }else{
            str=(typeof calledParams === 'string')?(calledParams??''):open==='json'?JSON.stringify(calledParams,null,4):JSON.stringify(calledParams);
        }
        return {
            content:open?str:formatConvoArgsString(str,theme,false),
            tokens:Math.ceil(str.length/4),
        }
    },[calledParams,open]);


    return (
        <div className={rowClassName} ref={elemRef}>
            <ConvoThemeIcon theme={theme} icon="functionCallIcon" />
            <div className={cn(messageClassName,theme.functionCallClassName,open&&theme.functionCallOpenClassName)}>
                {open?
                    <div className={theme.functionCallOpenHeaderClassName}>
                        <span>{fnName}(</span>
                        <Button className={cn(theme.iconButtonClassName,theme.functionCallJsonButtonClassName)} onClick={()=>setOpen(open===true?'json':true)}>
                            <ConvoThemeIcon theme={theme} icon="functionCallJsonIcon" fallback={CurlyBracesIcon} />
                        </Button>
                        <Button className={cn(theme.iconButtonClassName,theme.functionCallCollapseButtonClassName)} onClick={()=>setOpen(false)}>
                            <ConvoThemeIcon theme={theme} icon="functionCallCollapseIcon" fallback={ChevronUpIcon} />
                        </Button>
                    </div>
                :
                    <span>{fnName}(</span>
                }
                {open?
                    <code className={theme.functionCallArgsOpenClassName}>{args.content}</code>
                :
                    <Button disabled={isStreaming} className={cn('__convo-message-content-fn',theme.functionCallArgsClassName)} onClick={()=>setOpen(true)}>{args.content}</Button>
                }
                <span>)</span>
                <div className={cn('__convo-message-tokens',theme.functionCallTokensClassName)}>(~{args.tokens} tokens)</div>
            </div>
        </div>
    )

}