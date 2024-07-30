import { BaseLayoutProps, bcn } from "@iyio/common";
import { ConversationUiCtrl } from "@iyio/convo-lang";
import { useSubject } from "@iyio/react-common";
import { MessageComponentRenderer } from "./MessageComponentRenderer";

export interface ComponentRenderTargetProps
{
    renderTarget:string|(string|undefined)[]|null|undefined;
    ctrl:ConversationUiCtrl|null|undefined;
    maxRenderCount?:number;
}

export function ComponentRenderTarget({
    renderTarget,
    ctrl,
    maxRenderCount=Number.MAX_SAFE_INTEGER,
    ...props
}:ComponentRenderTargetProps & BaseLayoutProps){

    const convo=useSubject(ctrl?.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const cmp=(
        (renderTarget===null || !flat)?
            null
        :Array.isArray(renderTarget)?
            flat.messages.filter(m=>m.component && renderTarget.includes(m.renderTarget))
        :
            flat.messages.filter(m=>m.component && m.renderTarget===renderTarget)
    );

    return (
        <div className={bcn(props,'ComponentRenderTarget')}>

            {cmp?.map((c,i)=>i>=maxRenderCount?null:(
                <MessageComponentRenderer key={i} ctrl={ctrl??undefined} message={c} />
            ))}

        </div>
    )

}
