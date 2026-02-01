import { ConversationUiCtrl, ConvoComponent, ConvoComponentRendererContext, ConvoMarkdownEnableState, ConvoMessageRenderResult, ConvoRagRenderer, FlatConvoConversation, FlatConvoMessage, convoRoles, convoTags, defaultConvoRenderTarget, isMdConvoEnabledFor, shouldDisableConvoAutoScroll } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { aryRemoveWhere, cn, containsMarkdownImage, objectToMarkdown, parseMarkdownImages } from "@iyio/common";
import { Image, ScrollView, SlimButton, useSubject } from "@iyio/react-common";
import { Fragment } from "react";
import { ConversationStatusIndicator, ConversationStatusIndicatorProps } from "./ConversationStatusIndicator.js";
import { MarkdownViewer } from "./MarkdownViewer.js";
import { MessageComponentRenderer } from "./MessageComponentRenderer.js";
import { useConversationTheme, useConversationUiCtrl } from "./convo-lang-react.js";

export type ConvoMessageIconRenderer=(msg:FlatConvoMessage)=>string|any;

export interface ConvoMessageRenderOptions
{
    ctrl:ConversationUiCtrl;
    flat:FlatConvoConversation|null;
    showSystemMessages?:boolean;
    showFunctions?:boolean;
    hideSuggestions?:boolean;
    showResults?:boolean;
    rowClassName?:string;
    ragRenderer?:ConvoRagRenderer;
    assistantIcon?:string;
    userIcon?:string;
    assistantIconRender?:ConvoMessageIconRenderer;
    userIconRender?:ConvoMessageIconRenderer;
    iconSize?:string;
    iconClassName?:string;
    callRenderer?:(msg:FlatConvoMessage,flat:FlatConvoConversation,ctrl:ConversationUiCtrl)=>any;
    enableMarkdown?:ConvoMarkdownEnableState;
    markdownClassName?:string;
    messageClassName?:string;
    userClassName?:string;
    assistantClassName?:string;
    style:ConvoMessagesViewStyle;
}

const renderResult=(
    i:number,
    result:ConvoMessageRenderResult,
    options:ConvoMessageRenderOptions,
):any=>{
    const {ctrl,flat}=options;
    if((typeof result !== 'object') || !result){
        return null;
    }
    if(result.component){
        return <Fragment key={i+'comp'}>{result.component}</Fragment>
    }
    return renderMessage(i,{
        role:result.role??'assistant',
        content:result.content
    },options)
}

const renderMessage=(
    keyBase:number,
    m:FlatConvoMessage,
    renderOptions:ConvoMessageRenderOptions
)=>{

    const {
        ctrl,
        flat,
        showSystemMessages,
        showResults,
        showFunctions,
        hideSuggestions,
        rowClassName,
        ragRenderer,
        assistantIcon,
        userIcon,
        assistantIconRender,
        userIconRender,
        iconSize,
        iconClassName,
        callRenderer,
        enableMarkdown,
        markdownClassName,
        messageClassName,
        userClassName,
        assistantClassName,
        style
    }=renderOptions;

    if(!flat){
        return null;
    }

    const className=style.msg({user:m.role==='user',agent:m.role!=='user',suggestion:m.isSuggestion});
    const roleClass=cn(messageClassName,m.role==='assistant' && assistantClassName,m.role==='user' && userClassName);

    if(m.component!==undefined){
        return (
            <MessageComponentRenderer
                key={keyBase+'comp'}
                message={m}
                defaultRenderer={(msg,index)=>(
                    <Fragment key={`${keyBase}comp${index}`}>
                        {renderMessage(index,msg,renderOptions)}
                    </Fragment>
                )}
                ctx={{
                    id:keyBase+'comp',
                    ctrl,
                    convo:flat.conversation,
                    flat,
                    index:keyBase,
                    message:m,
                    isUser:m.role==='user',
                    className,
                    rowClassName,

                }}
            />
        )
    }


    if(m.role==='result'){
        if(!m.setVars || (!showResults && !showFunctions)){
            return null;
        }
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
            <div className={rowClassName} key={keyBase}>
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
            <div className={rowClassName} key={keyBase+'rag'}>
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
                <div className={rowClassName} key={keyBase+'s'}>
                    <div className={className}>
                        {m.content}
                    </div>
                </div>
            )
        }else if(showFunctions && ( m.fn || m.called)){
            return (
                <div className={rowClassName} key={keyBase+'f'}>
                    <div className={className}>
                        {JSON.stringify(m,null,4)}
                    </div>
                </div>
            )
        }else if(m.called){
            let callRendered=callRenderer?.(m,flat,ctrl);
            if(callRendered===undefined || callRendered===null){
                const compName=flat.messages.find(fm=>fm.fn && fm.fn.name===m.called?.name && !fm.called)?.tags?.[convoTags.renderer];
                const compRenderer=compName?ctrl.componentRenderers[compName]??ctrl.convo?.components[compName]?.renderer:undefined;
                if(!compRenderer){
                    return null;
                }
                const ctx:ConvoComponentRendererContext={// todo - merge with component renderer above, MAYBE?
                    id:keyBase+'comp',
                    ctrl,
                    convo:flat.conversation,
                    flat,
                    index:keyBase,
                    message:m,
                    isUser:m.role==='user',
                    className,
                    rowClassName,
                }

                const comp:ConvoComponent={
                    name:'renderer',
                    isJson:true,
                    atts:{message:m,args:m.calledParams,returnValue:m.calledReturn},
                }
                callRendered=(typeof compRenderer === 'function')?compRenderer(comp,ctx):compRenderer.render(comp,ctx);

                if(callRendered===undefined || callRendered===null){
                    return null;
                }
            }
            return (
                <div className={rowClassName} key={keyBase+'fr'}>
                    <div className={className}>
                        {callRendered}
                    </div>
                </div>
            )
        }
        return null;
    }


    if(m.content && containsMarkdownImage(m.content)){

        const parts=parseMarkdownImages(m.content);

        // add renderer here

        return (<Fragment key={keyBase+'f'}>{
            parts.map((p,pi)=>p.image?(
                <div className={rowClassName} key={pi}>
                    {ctrl.imageRenderer?.(p.image,style.img({user:m.role==='user',agent:m.role!=='user'}),m)??
                        <img
                            className={style.img({user:m.role==='user',agent:m.role!=='user'})}
                            alt={p.image.description}
                            src={ctrl.imagePathConverter?ctrl.imagePathConverter(p.image,style.img({user:m.role==='user',agent:m.role!=='user'}),m):p.image.url}
                        />
                    }
                </div>
            ):(
                <div className={rowClassName} key={pi}>
                    <div className={cn(className,roleClass)}>
                        {(enableMarkdown && isMdConvoEnabledFor(m.isUser?'user':'assistant',enableMarkdown))?
                            <MarkdownViewer markdown={p.text} contentClassName={markdownClassName}/>:p.text
                        }
                    </div>
                </div>
            ))
        }</Fragment>)

    }else if(m.isSuggestion){
        if(hideSuggestions){
            return true;
        }
        const isFirst=!flat.messages[keyBase-1]?.isSuggestion;
        if(!isFirst){
            return null;
        }
        const titles:string[]=[];
        const group:FlatConvoMessage[]=[];
        for(let x=keyBase;x<flat.messages.length;x++){
            const segMsg=flat.messages[x];
            if(!segMsg?.isSuggestion){
                break;
            }
            group.push(segMsg);
            const t=segMsg.tags?.[convoTags.suggestionTitle];
            if(t){
                titles.push(t);
            }
        }
        return (
            <div className={rowClassName} key={keyBase+'d'}>

                {!!titles.length && <div className={style.suggestTitles()}>
                    {titles.map((t,i)=>(
                        <span key={i}>{t}</span>
                    ))}
                </div>}

                <div className={cn(className,roleClass)}>
                    {group.map((msg,gi)=>(
                        <SlimButton className={style.suggestBtn()} key={gi} onClick={()=>{
                            ctrl.appendWithFunctionCallAsync(msg.content??'',msg.tags?.[convoTags.suggestionCallback])
                        }}>
                            {msg.tags?.[convoTags.suggestion]??msg.content}
                        </SlimButton>
                    ))}

                </div>
            </div>
        )
    }else{
        return (
            <div className={rowClassName} key={keyBase+'d'}>
                <div className={style.textMsg()}>
                    {(m.isAssistant && (!!assistantIcon || assistantIconRender))?getMessageIcon(m,assistantIcon,assistantIconRender,iconSize,iconClassName):null}

                    <div className={style.textMsgContent()}>
                        <div className={cn(className,roleClass)}>
                            {(enableMarkdown && isMdConvoEnabledFor(m.isUser?'user':'assistant',enableMarkdown))?
                                <MarkdownViewer markdown={m.content} contentClassName={markdownClassName}/>:m.content
                            }
                        </div>
                    </div>
                    {(m.isUser && (!!userIcon || userIconRender))?getMessageIcon(m,userIcon,userIconRender,iconSize,iconClassName):null}
                </div>
            </div>
        )
    }
}

const getMessageIcon=(msg:FlatConvoMessage,icon:any,renderer:ConvoMessageIconRenderer|undefined,size:string|undefined,className:string|undefined):any=>{
    if(renderer){
        icon=renderer(msg);
    }
    if(typeof icon==='string'){
        icon=<Image alt="icon" src={icon} className={className} style={{
            width:size,
            height:size,
        }} />
    }

    return icon||null;
}

export interface MessagesViewProps
{
    ctrl?:ConversationUiCtrl;
    renderTarget?:string;
    ragRenderer?:ConvoRagRenderer;
    messageBottomPadding?:string;
    autoHeight?:boolean;
    hideSuggestions?:boolean;
    assistantIcon?:string;
    userIcon?:string;
    assistantIconRender?:ConvoMessageIconRenderer;
    userIconRender?:ConvoMessageIconRenderer;
    iconSize?:string;
    iconClassName?:string;
    callRenderer?:(msg:FlatConvoMessage,flat:FlatConvoConversation,ctrl:ConversationUiCtrl)=>any;
    enableMarkdown?:ConvoMarkdownEnableState;
    markdownClassName?:string;
    messageClassName?:string;
    userClassName?:string;
    assistantClassName?:string;
    style?:ConvoMessagesViewStyle;
    statusIndicatorRenderer?:(props:ConversationStatusIndicatorProps)=>any;
}

export function MessagesView({
    renderTarget=defaultConvoRenderTarget,
    ctrl:_ctrl,
    ragRenderer,
    messageBottomPadding='120px',
    autoHeight,
    hideSuggestions=false,
    assistantIcon,
    userIcon,
    assistantIconRender,
    userIconRender,
    iconClassName,
    iconSize,
    callRenderer,
    enableMarkdown,
    markdownClassName,
    messageClassName,
    userClassName,
    assistantClassName,
    style=defaultStyle,
    statusIndicatorRenderer=(props)=><ConversationStatusIndicator {...props}/>
}:MessagesViewProps){

    const ctrl=useConversationUiCtrl(_ctrl)

    const convo=useSubject(ctrl.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const messages=flat?.messages??[];

    const theme=useConversationTheme(_ctrl);

    const currentTask=useSubject(ctrl?.currentTaskSubject);

    const showSystemMessages=useSubject(ctrl.showSystemMessagesSubject);
    const showResults=useSubject(ctrl.showResultsSubject);
    const showFunctions=useSubject(ctrl.showFunctionsSubject);

    const rowClassName=(theme.messageRowUnstyled?
        theme.messageRowClassName:
        style.row({fixedWidth:theme.rowWidth!==undefined},theme.messageRowClassName)
    );

    const options:ConvoMessageRenderOptions={
        ctrl,flat:flat??null,showSystemMessages,
        showFunctions,showResults,hideSuggestions,rowClassName,ragRenderer,
        assistantIcon,userIcon,assistantIconRender,userIconRender,iconClassName,iconSize,
        callRenderer,enableMarkdown,markdownClassName,
        messageClassName,userClassName,assistantClassName,
        style
    }

    const mapped=messages.map((m,i)=>{

        const ctrlRendered=ctrl.renderMessage(m,i);
        if(ctrlRendered===false || !flat || (m.renderTarget??defaultConvoRenderTarget)!==renderTarget){
            return null;
        }

        if(ctrlRendered?.position==='replace'){
            return renderResult(i,ctrlRendered,options);
        }

        const rendered=renderMessage(i,m,options);
        if(!rendered){
            return null;
        }
        if(!ctrlRendered){
            return rendered;
        }

        return (
            <Fragment key={i+'j'}>
                {ctrlRendered.position==='before' && renderResult(i,ctrlRendered,options)}
                {rendered}
                {ctrlRendered.position==='after' && renderResult(i,ctrlRendered,options)}
            </Fragment>
        )


    })

    const body=(
        <div className={style.list()}>

            {mapped}

            {!!currentTask && <div className={rowClassName}>{
                (theme.wrapLoader?
                    <div className={style.msg({agent:true})}>
                        {statusIndicatorRenderer({conversation:convo,uiCtrl:ctrl})}
                    </div>
                :
                    statusIndicatorRenderer({conversation:convo,uiCtrl:ctrl})
                )
            }</div>}
        </div>
    )

    return (
        <div className={style.root({autoHeight})} style={style.vars({...theme,messageBottomPadding})}>
            {autoHeight?
                body
            :
                <ScrollView flex1 autoScrollEnd autoScrollEndFilter={()=>!shouldDisableConvoAutoScroll(messages)}>
                    {body}
                </ScrollView>
            }
        </div>
    )

}

export type ConvoMessagesViewStyle=typeof defaultStyle;

const defaultStyle=atDotCss({name:'MessagesView',order:'framework',namespace:'convo-lang',css:`
    @.root{
        flex:1;
        display:flex;
        flex-direction:column;
    }
    @.root.autoHeight{
        flex:unset;
    }

    @.list{
        display:flex;
        flex-direction:column;
        gap:@@gap;
        padding:@@padding @@padding @@messageBottomPadding @@padding;
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
        background-color:@@suggestionBackgroundColor;
        border:@@suggestionBorder;
        padding:0;
        display:flex;
        flex-direction:column;
        color:@@suggestionColor;
        font-weight:@@suggestionWeight;
    }
    @.msg.agent.suggestion{
    }
    @.msg.user.suggestion{
    }
    @.suggestIcon{
        fill:@@agentColor;
    }
    @.suggestBtn{
        border-top:@@suggestionDivider;
        padding:@@messagePadding;
        transition:background-color 0.2s ease-in-out;
        text-align:center;
        justify-content:center;
    }
    @.suggestBtn:hover{
        background-color:color-mix( in srgb, @@userBackground , transparent 50% );
    }
    @.suggestBtn:first-child{
        border-top:none;
        border-top-right-radius:calc( @@messageBorderRadius / 2 );
        border-top-left-radius:calc( @@messageBorderRadius / 2 );
    }
    @.suggestBtn:last-child{
        border-bottom-right-radius:calc( @@messageBorderRadius / 2 );
        border-bottom-left-radius:calc( @@messageBorderRadius / 2 );
    }
    @.suggestTitles{
        display:flex;
        flex-direction:column;
        margin-top:0.5rem;
        margin-bottom:-0.5rem;
        margin:0.5rem 0.5rem -0.5rem 0.5rem;
        opacity:0.5;
        font-size:0.9em;
    }

    /*------*/

    @.textMsg{
        display:flex;
        gap:0.5rem;
    }
    @.textMsgContent{
        display:flex;
        flex-direction:column;
        flex:1;
    }
`});
