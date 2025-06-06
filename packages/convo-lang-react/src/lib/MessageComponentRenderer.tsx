import { ConversationUiCtrl, ConvoComponentRenderFunction, ConvoComponentRendererContext, ConvoComponentRendererWithOptions, ConvoMessageComponent, FlatConvoMessage, convoTags, parseConvoMessageComponents } from "@convo-lang/convo-lang";
import { objectToMarkdown } from "@iyio/common";
import { useSubject } from "@iyio/react-common";
import { Fragment, useMemo } from "react";

export interface MessageComponentRendererProps
{
    message?:FlatConvoMessage;
    ctrl?:ConversationUiCtrl;
    ctx?:ConvoComponentRendererContext;
    doNotRenderInRow?:boolean;
}

/**
 * @acIgnore
 */
export function MessageComponentRenderer({
    message,
    ctrl,
    ctx:_ctx,
    doNotRenderInRow=(message && ctrl)?true:false,
}:MessageComponentRendererProps){

    const convo=useSubject(ctrl?.convoSubject);
    const flat=useSubject(convo?.flatSubject);

    const ctrlCtx=useMemo<ConvoComponentRendererContext|undefined>(()=>{

        if(!ctrl || !message || !convo || !flat){
            return undefined;
        }

        return {
            id:'_',
            ctrl,
            convo,
            flat,
            message,
            isUser:message.role==='user',
            index:0,
        }
    },[message,ctrl,convo,flat]);

    const ctx=_ctx??ctrlCtx;

    const content=ctx?.message.content??message?.content;
    const id=ctx?.id??'_';

    const defaultComponentName=message?.tags?.[convoTags.component];
    const components=useMemo<ConvoMessageComponent[]|undefined>(()=>{
        return content?parseConvoMessageComponents(content,defaultComponentName):undefined;
    },[content,defaultComponentName]);

    if(!ctx){
        return null;
    }

    return (
        <>
            {components?.map((c,i)=>{
                const renderer=ctx.ctrl.componentRenderers[c.name];
                let fn:ConvoComponentRenderFunction|undefined;
                let options:ConvoComponentRendererWithOptions|undefined;
                if(typeof renderer === 'function'){
                    options=undefined;
                    fn=renderer;
                }else{
                    options=renderer;
                    fn=options?.render;
                }

                if(fn){
                    return (
                        <Fragment key={id+'-c-'+i}>
                            {(options?.doNotRenderInRow || doNotRenderInRow)?
                                fn(c,ctx)
                            :
                                <div className={ctx.rowClassName}>
                                    {fn(c,ctx)}
                                </div>
                            }
                        </Fragment>
                    )
                }else{
                    return (
                        <div className={ctx.rowClassName} key={id+'-m-'+i}>
                            <div className={ctx.className}>
                                {objectToMarkdown(c)}
                            </div>
                        </div>
                    )
                }

            })}
        </>

    )

}

