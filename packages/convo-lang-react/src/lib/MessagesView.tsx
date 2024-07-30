import { atDotCss } from "@iyio/at-dot-css";
import { aryRemoveWhere, cn, containsMarkdownImage, objectToMarkdown, parseMarkdownImages } from "@iyio/common";
import { ConversationUiCtrl, ConvoMessageRenderResult, ConvoRagRenderer, FlatConvoConversation, FlatConvoMessage, convoRoles, convoTags, defaultConvoRenderTarget, shouldDisableConvoAutoScroll } from "@iyio/convo-lang";
import { LoadingDots, ScrollView, SlimButton, useSubject } from "@iyio/react-common";
import { Fragment } from "react";
import { MessageComponentRenderer } from "./MessageComponentRenderer";
import { useConversationTheme, useConversationUiCtrl } from "./convo-lang-react";

const renderResult=(
    ctrl:ConversationUiCtrl,
    flat:FlatConvoConversation,
    result:ConvoMessageRenderResult,
    i:number,
    showSystemMessages:boolean,
    showFunctions:boolean,
    rowClassName:string|undefined,
    ragRenderer:ConvoRagRenderer|undefined,
):any=>{
    if((typeof result !== 'object') || !result){
        return null;
    }
    if(result.component){
        return <Fragment key={i+'comp'}>{result.component}</Fragment>
    }
    return renderMessage(ctrl,flat,{
        role:result.role??'assistant',
        content:result.content
    },i,showSystemMessages,showFunctions,rowClassName,ragRenderer)
}

const renderMessage=(
    ctrl:ConversationUiCtrl,
    flat:FlatConvoConversation,
    m:FlatConvoMessage,
    i:number,
    showSystemMessages:boolean,
    showFunctions:boolean,
    rowClassName:string|undefined,
    ragRenderer:ConvoRagRenderer|undefined,
)=>{

    const className=style.msg({user:m.role==='user',agent:m.role!=='user',suggestion:m.isSuggestion});

    if(m.component!==undefined && m.component!==false){
        return (
            <MessageComponentRenderer
                key={i+'comp'}
                ctx={{
                    id:i+'comp',
                    ctrl,
                    convo:flat.conversation,
                    flat,
                    index:i,
                    message:m,
                    isUser:m.role==='user',
                    className,
                    rowClassName,

                }}
            />
        )
    }


    if(m.setVars && (m.role==='result' || showSystemMessages)){
        const keys=Object.keys(m.setVars);
        aryRemoveWhere(keys,k=>k.startsWith('__'));
        if(!keys.length){
            return null;
        }
        let firstValue=m.setVars[keys[0]??''];
        if(keys.length===1 && Array.isArray(firstValue) && firstValue.length===1){
            firstValue=firstValue[0];
        }
        const singleItem=keys.length===1 && firstValue && (typeof firstValue==='object');
        return (
            <div className={rowClassName} key={i}>
                <div className={cn(className,style.data())}>
                    <div className={style.table({singleItem})}>
                        {keys.map((k,ki)=>{

                            const value=ki===0?firstValue:(m.setVars?.[k]);

                            return (
                                <Fragment key={k+'r'}>
                                    <div>{k}</div>
                                    {!singleItem && <div>-</div>}
                                    <div>{k[0]===k[0]?.toLowerCase()?
                                        objectToMarkdown(value)
                                    :
                                        JSON.stringify(value,null,4)
                                    }</div>
                                </Fragment>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }else if(m.role===convoRoles.rag){
        return (
            <div className={rowClassName} key={i+'rag'}>
                {ragRenderer?.(m,ctrl)??
                    <div className={cn(className,style.rag())}>
                        {m.content}
                    </div>
                }
            </div>
        )
    }else if(m.fn || (m.role!=='user' && m.role!=='assistant')){
        if(showSystemMessages && m.role==='system'){
            return (
                <div className={rowClassName} key={i+'s'}>
                    <div className={className}>
                        {m.content}
                    </div>
                </div>
            )
        }else if(showFunctions && ( m.fn || m.called)){
            return (
                <div className={rowClassName} key={i+'f'}>
                    <div className={className}>
                        {JSON.stringify(m,null,4)}
                    </div>
                </div>
            )
        }
        return null;
    }


    if(m.content && containsMarkdownImage(m.content)){

        const parts=parseMarkdownImages(m.content);

        return (<Fragment key={i+'f'}>{
            parts.map((p,pi)=>p.image?(
                <div className={rowClassName} key={i}>
                    <img
                        className={style.img({user:m.role==='user',agent:m.role!=='user'})}
                        alt={p.image.description}
                        src={p.image.url}
                    />
                </div>
            ):(
                <div className={rowClassName} key={pi}>
                    <div className={className}>
                        {p.text}
                    </div>
                </div>
            ))
    }</Fragment>)

    }else if(m.isSuggestion){
        return (
            <div className={rowClassName} key={i+'d'}>
                <SlimButton className={className} onClick={()=>{
                    ctrl.appendUiMessageAsync(m.content??'')
                }}>
                    {m.tags?.[convoTags.suggestion]??m.content}
                </SlimButton>
            </div>
        )
    }else{
        return (
            <div className={rowClassName} key={i+'d'}>
                <div className={className}>
                    {m.content}
                </div>
            </div>
        )
    }
}

export interface MessagesViewProps
{
    ctrl?:ConversationUiCtrl;
    renderTarget?:string;
    ragRenderer?:ConvoRagRenderer;
}

export function MessagesView({
    renderTarget=defaultConvoRenderTarget,
    ctrl:_ctrl,
    ragRenderer,
}:MessagesViewProps){

    const ctrl=useConversationUiCtrl(_ctrl)

    const convo=useSubject(ctrl.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const messages=flat?.messages??[];

    const theme=useConversationTheme(_ctrl);

    const currentTask=useSubject(ctrl?.currentTaskSubject);

    const showSystemMessages=useSubject(ctrl.showSystemMessagesSubject);
    const showFunctions=useSubject(ctrl.showFunctionsSubject);

    const rowClassName=(theme.messageRowUnstyled?
        theme.messageRowClassName:
        style.row({fixedWidth:theme.rowWidth!==undefined},theme.messageRowClassName)
    );

    const mapped=messages.map((m,i)=>{

        const ctrlRendered=ctrl.renderMessage(m,i);
        if(ctrlRendered===false || !flat || (m.renderTarget??defaultConvoRenderTarget)!==renderTarget){
            return null;
        }

        if(ctrlRendered?.position==='replace'){
            return renderResult(ctrl,flat,ctrlRendered,i,showSystemMessages,showFunctions,rowClassName,ragRenderer);
        }

        const rendered=renderMessage(ctrl,flat,m,i,showSystemMessages,showFunctions,rowClassName,ragRenderer);
        if(!ctrlRendered){
            return rendered;
        }

        return (
            <Fragment key={i+'j'}>
                {ctrlRendered.position==='before' && renderResult(ctrl,flat,ctrlRendered,i,showSystemMessages,showFunctions,rowClassName,ragRenderer)}
                {rendered}
                {ctrlRendered.position==='after' && renderResult(ctrl,flat,ctrlRendered,i,showSystemMessages,showFunctions,rowClassName,ragRenderer)}
            </Fragment>
        )


    })


    return (
        <div className={style.root()} style={style.vars(theme)}>
            <ScrollView flex1 autoScrollEnd autoScrollEndFilter={()=>!shouldDisableConvoAutoScroll(messages)}>
                <div className={style.list()}>

                    {mapped}

                    {!!currentTask && <div className={rowClassName}>{
                        (theme.wrapLoader===false?
                            <LoadingDots {...theme.loaderProps}/>
                        :
                            <div className={style.msg({agent:true})}>
                                <LoadingDots {...theme.loaderProps}/>
                            </div>
                        )
                    }</div>}
                </div>
            </ScrollView>
        </div>
    )

}

const style=atDotCss({name:'MessagesView',order:'framework',namespace:'iyio',css:`
    @.root{
        flex:1;
        display:flex;
        flex-direction:column;
    }

    @.list{
        display:flex;
        flex-direction:column;
        gap:@@gap;
        padding:@@padding @@padding 120px @@padding;
    }
    @.msg{
        padding:@@messagePadding;
        border-radius:@@messageBorderRadius;
        white-space:pre-wrap;
        word-break:break-word;
        font-size:@@fontSize;
        max-width:@@maxMessageWidth;
    }
    @.msg.user{
        color:@@userColor;
        font-weight:@@userWeight;
        background-color:@@userBackground;
        border:@@userBorder;
        margin-left:4rem;
        align-self:flex-end;
    }
    @.msg.agent{
        color:@@agentColor;
        font-weight:@@agentWeight;
        background-color:@@agentBackground;
        border:@@agentBorder;
        margin-right:4rem;
        align-self:flex-start;
    }

    @.img{
        border-radius:18px;
        max-width:80%;
    }
    @.img.user{
        margin-left:4rem;
        align-self:flex-end;
    }
    @.img.agent{
        margin-right:4rem;
        align-self:flex-start;
    }

    @.data{
        background-color:#3B3B3D99 !important;
        font-size:0.8rem;
        padding:0.5rem;
    }
    @.table{
        display:grid;
        grid-template-columns:auto auto 1fr;
    }
    @.table.singleItem{
        display:flex;
        flex-direction:column;
    }
    @.table > *{
        padding:0.5rem 0.25rem;
        border-bottom:1px solid #ffffff33;
        align-items:center;
        display:flex;
    }
    @.table > *:nth-last-child(-n+3){
        border-bottom:none;
    }
    @.table.singleItem > *:first-child{
        font-size:1rem;
        font-weight:bold;
        padding-bottom:0;
    }
    @.row{
        display:flex;
        flex-direction:column;
        gap:@@gap;
    }
    @.row.fixedWidth{
        width:@@rowWidth;
        max-width:100%;
        align-self:center;
    }
    @.rag{
        background-color:#3B3B3D99 !important;
    }
    @.msg.suggestion{
        background-color:#000000;
        box-shadow:0 0 8px #00000099;
        border:1px solid #ffffff22;
    }
    @.msg.agent.suggestion{
        margin-left:0.5rem;
    }
    @.msg.user.suggestion{
        margin-right:0.5rem;
    }
`});
