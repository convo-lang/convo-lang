import { ConversationUiCtrl, ConvoMarkdownEnableState, ConvoMessageRenderResult, ConvoRagRenderer, ConvoViewTheme, FlatConvoConversation, FlatConvoMessage, defaultConvoRenderTarget, shouldDisableConvoAutoScroll } from "@convo-lang/convo-lang";
import { ScrollView, useSubject } from "@iyio/react-common";
import { Fragment } from "react";
import { useConversationUiCtrl } from "./convo-lang-react.js";
import { ConvoMessageView, ConvoMessageViewProps } from "./ConvoMessageView.js";
import { ConvoStatusIndicator, ConvoStatusIndicatorProps } from "./ConvoStatusIndicator.js";
import { cn } from "./util.js";



export interface ConvoMessageListViewProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
    renderTarget?:string;
    ragRenderer?:ConvoRagRenderer;
    messageBottomPadding?:string|null;
    disableScroll?:boolean;
    hideSuggestions?:boolean;
    callRenderer?:(msg:FlatConvoMessage,flat:FlatConvoConversation,ctrl:ConversationUiCtrl)=>any;
    enableMarkdown?:ConvoMarkdownEnableState;
    statusIndicatorRenderer?:(props:ConvoStatusIndicatorProps)=>any;
    theme:ConvoViewTheme;
}


export function ConvoMessageListView({
    className,
    renderTarget=defaultConvoRenderTarget,
    ctrl:_ctrl,
    ragRenderer,
    messageBottomPadding='120px',
    disableScroll,
    hideSuggestions=false,
    callRenderer,
    enableMarkdown,
    statusIndicatorRenderer=(props)=><ConvoStatusIndicator {...props}/>,
    theme,
}:ConvoMessageListViewProps){

    const ctrl=useConversationUiCtrl(_ctrl)

    const convo=useSubject(ctrl.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const messages=flat?.messages??[];

    const currentTask=useSubject(ctrl?.currentTaskSubject);

    const showSystemMessages=useSubject(ctrl.showSystemMessagesSubject);
    const showResults=useSubject(ctrl.showResultsSubject);
    const showFunctions=useSubject(ctrl.showFunctionsSubject);

    const mapped=!flat?[]:messages.map((m,i)=>{

        const ctrlRendered=ctrl.renderMessage(m,i);
        if(ctrlRendered===false || (m.renderTarget??defaultConvoRenderTarget)!==renderTarget){
            return null;
        }

        const props:ConvoMessageViewProps={
            theme,
            message:m,
            messageIndex:i,
            flat,
            ctrl,
            showSystemMessages,
            showResults,
            showFunctions,
            ragRenderer,
            callRenderer,
            enableMarkdown,
            hideSuggestions,
        }

        if(ctrlRendered?.position==='replace'){
            return (
                <Fragment key={i+'r'}>
                    {renderCtrlResult(i,ctrlRendered,props)}
                </Fragment>
            )
        }

        const rendered=(
            <ConvoMessageView {...props} key={i+'m'}/>
        )

        if(!ctrlRendered){
            return rendered;
        }

        return (
            <Fragment key={i+'j'}>
                {ctrlRendered.position==='before' && renderCtrlResult(i,ctrlRendered,props)}
                {rendered}
                {ctrlRendered.position==='after' && renderCtrlResult(i,ctrlRendered,props)}
            </Fragment>
        )


    })

    const body=(
        <div className={theme.messageListClassName}>

            {mapped}

            {!!currentTask && <div className={theme.statusIndicatorRowClassName}>{
                statusIndicatorRenderer({conversation:convo,uiCtrl:ctrl,theme})
            }</div>}

            {!!messageBottomPadding && <div style={{height:messageBottomPadding}}/>}
        </div>
    )

    return (
        <div className={cn(
            theme.messageListContainerClassName,
            disableScroll && theme.messageListContainerScrollDisabledClassName,
            className,
        )}>
            {disableScroll?
                body
            :
                <ScrollView
                    flex1
                    autoScrollEnd
                    autoScrollEndFilter={()=>!shouldDisableConvoAutoScroll(messages)}
                    className={theme.scrollViewClassName}
                    containerClassName={theme.scrollContentClassName}
                >
                    {body}
                </ScrollView>
            }
        </div>
    )

}

const renderCtrlResult=(
    i:number,
    result:ConvoMessageRenderResult,
    messageProps:ConvoMessageViewProps
):any=>{
    if((typeof result !== 'object') || !result){
        return null;
    }
    if(result.component){
        return <Fragment key={i+'comp'}>{result.component}</Fragment>
    }
    return (
        <ConvoMessageView
            {...messageProps}
            message={{
                role:result.role??'assistant',
                content:result.content
            }}
            messageIndex={i}
            key={i+'comp-d'}
        />
    )
}
