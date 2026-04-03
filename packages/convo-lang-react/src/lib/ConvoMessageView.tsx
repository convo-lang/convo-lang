import { ConversationUiCtrl, ConvoComponent, ConvoComponentRendererContext, ConvoMarkdownEnableState, ConvoRagRenderer, ConvoViewTheme, FlatConvoConversation, FlatConvoMessage, convoRoles, convoTags, isMdConvoEnabledFor } from "@convo-lang/convo-lang";
import { aryRemoveWhere, containsMarkdownImage, objectToMarkdown, parseMarkdownImages } from "@iyio/common";
import { Fragment } from "react";
import { Button } from "./Button.js";
import { ConvoMarkdownViewer } from "./ConvoMarkdownViewer.js";
import { ConvoThemeIcon } from "./ConvoThemeIcon.js";
import { MessageComponentRenderer } from "./MessageComponentRenderer.js";
import { cn } from "./util.js";

export interface ConvoMessageViewProps
{
    className?:string;
    message:FlatConvoMessage;
    messageIndex:number;
    ctrl:ConversationUiCtrl;
    flat:FlatConvoConversation;
    showSystemMessages?:boolean;
    showFunctions?:boolean;
    hideSuggestions?:boolean;
    showResults?:boolean;
    ragRenderer?:ConvoRagRenderer;
    callRenderer?:(msg:FlatConvoMessage,flat:FlatConvoConversation,ctrl:ConversationUiCtrl)=>any;
    enableMarkdown?:ConvoMarkdownEnableState;
    theme:ConvoViewTheme;
}

export function ConvoMessageView({
    className,
    ctrl,
    flat,
    showSystemMessages,
    showFunctions,
    hideSuggestions,
    showResults,
    enableMarkdown,
    ragRenderer,
    callRenderer,
    message,
    messageIndex,
    theme
}:ConvoMessageViewProps){

    const messageClassName=cn(
        theme.messageClassName,
        message.isAssistant && theme.assistantMessageClassName,
        message.isUser && theme.userMessageClassName,
        message.role==='result' && theme.resultMessageClassName,
        message.role==='rag' && theme.ragMessageClassName,
        message.role==='system' && theme.systemMessageClassName,
        message.called && theme.callMessageClassName,
        (message.fn && !message.called) && theme.functionMessageClassName,
        message.isSuggestion && theme.suggestionMessageClassName,
    );
    const rowClassName=cn(
        theme.rowClassName,
        message.isAssistant && theme.assistantRowClassName,
        message.isUser && theme.userRowClassName,
        message.role==='result' && theme.resultRowClassName,
        message.role==='rag' && theme.ragRowClassName,
        message.role==='system' && theme.systemRowClassName,
        message.called && theme.callRowClassName,
        (message.fn && !message.called) && theme.functionRowClassName,
        message.isSuggestion && theme.suggestionRowClassName,
        className,
    );

    if(message.component!==undefined){
        return (
            <MessageComponentRenderer
                message={message}
                defaultRenderer={(msg,index)=>(
                    <Fragment key={`${messageIndex}comp${index}`}>
                        <ConvoMessageView
                            message={msg}
                            messageIndex={index}

                            ctrl={ctrl}
                            flat={flat}
                            showSystemMessages={showSystemMessages}
                            showFunctions={showFunctions}
                            hideSuggestions={hideSuggestions}
                            showResults={showResults}
                            enableMarkdown={enableMarkdown}
                            ragRenderer={ragRenderer}
                            callRenderer={callRenderer}
                            theme={theme}
                        />
                    </Fragment>
                )}
                ctx={{
                    id:messageIndex+'comp',
                    ctrl,
                    convo:flat.conversation,
                    flat,
                    index:messageIndex,
                    message:message,
                    isUser:message.isUser??false,
                    className:messageClassName,
                    rowClassName:cn(rowClassName,theme.componentRowClassName),
                    theme
                }}
            />
        )
    }


    if(message.role==='result'){
        if(!message.setVars || (!showResults && !showFunctions)){
            return null;
        }
        const keys=Object.keys(message.setVars);
        aryRemoveWhere(keys,k=>k.startsWith('__') && k!=='__return');
        if(!keys.length){
            return null;
        }
        let firstValue=message.setVars[keys[0]??''];
        if(keys.length===1 && Array.isArray(firstValue) && firstValue.length===1){
            firstValue=firstValue[0];
        }
        const singleItem=keys.length===1 && firstValue && (typeof firstValue==='object');
        return (
            <div className={rowClassName}>
                <div className={messageClassName}>
                    <div className={cn(theme.assignmentListClassName,singleItem && theme.assignmentSingleItemListClassName)}>
                        {keys.map((k,ki)=>{

                            const value=ki===0?firstValue:(message.setVars?.[k]);

                            return (
                                <div className={theme.assignmentRowClassName} key={k+'r'}>
                                    <div className={theme.assignmentNameClassName}>{k}</div>
                                    {!singleItem && (theme.assignmentIcon?
                                        <ConvoThemeIcon theme={theme} icon="assignmentIcon"/>
                                    :
                                        <div className={cn(theme.iconClassName,theme.assignmentIconClassName)}>=</div>
                                    )}
                                    <div className={theme.assignmentValueClassName}>{k[0]===k[0]?.toLowerCase()?
                                        objectToMarkdown(value)
                                    :
                                        JSON.stringify(value,null,4)
                                    }</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }else if(message.role===convoRoles.rag){
        return (
            <div className={rowClassName}>
                {ragRenderer?.(message,ctrl)??
                    <div className={cn(messageClassName,theme.plainTextClassName)}>
                        <ConvoThemeIcon theme={theme} icon="ragIcon"/>
                        {message.content}
                    </div>
                }
            </div>
        )
    }else if(message.fn || (message.role!=='user' && message.role!=='assistant')){
        if(showSystemMessages && message.role==='system'){
            return (
                <BubbleMessageView
                    rowClassName={rowClassName}
                    messageClassName={messageClassName}
                    theme={theme}
                    message={message}
                />
            )
        }else if(showFunctions && ( message.fn || message.called)){
            return (
                <div className={rowClassName}>
                    <div className={messageClassName}>
                        {JSON.stringify(message,null,4)}
                    </div>
                </div>
            )
        }else if(message.called){
            let callRendered=callRenderer?.(message,flat,ctrl);
            if(callRendered===undefined || callRendered===null){
                const compName=flat.messages.find(fm=>fm.fn && fm.fn.name===message.called?.name && !fm.called)?.tags?.[convoTags.renderer];
                const compRenderer=compName?ctrl.componentRenderers[compName]??ctrl.convo?.components[compName]?.renderer:undefined;
                if(!compRenderer){
                    return null;
                }
                const ctx:ConvoComponentRendererContext={// todo - merge with component renderer above, MAYBE?
                    id:messageIndex+'comp',
                    ctrl,
                    convo:flat.conversation,
                    flat,
                    index:messageIndex,
                    message:message,
                    isUser:message.isUser??false,
                    className:messageClassName,
                    rowClassName:theme.rowClassName,
                    theme,
                }

                const comp:ConvoComponent={
                    name:'renderer',
                    isJson:true,
                    atts:{message:message,args:message.calledParams,returnValue:message.calledReturn},
                }
                callRendered=(typeof compRenderer === 'function')?compRenderer(comp,ctx):compRenderer.render(comp,ctx);

                if(callRendered===undefined || callRendered===null){
                    return null;
                }
            }
            return (
                <div className={cn(rowClassName,theme.componentRowClassName)}>
                    {callRendered}
                </div>
            )
        }
        return null;
    }


    if(message.content && containsMarkdownImage(message.content)){

        const parts=parseMarkdownImages(message.content);

        // add renderer here

        return (<Fragment>{
            parts.map((p,pi)=>p.image?(
                <div className={rowClassName} key={pi}>
                    {ctrl.imageRenderer?.(p.image,cn(theme.imageClassName,message.role==='user'?theme.userImageClassName:theme.assistantImageClassName),message)??
                        <img
                            className={cn(theme.imageClassName,message.role==='user'?theme.userImageClassName:theme.assistantImageClassName)}
                            alt={p.image.description}
                            src={ctrl.imagePathConverter?ctrl.imagePathConverter(p.image,cn(theme.imageClassName,message.role==='user'?theme.userImageClassName:theme.assistantImageClassName),message):p.image.url}
                        />
                    }
                </div>
            ):(
                <BubbleMessageView
                    key={pi}
                    rowClassName={rowClassName}
                    messageClassName={messageClassName}
                    theme={theme}
                    message={message}
                    enableMarkdown={enableMarkdown}
                />
            ))
        }</Fragment>)

    }else if(message.isSuggestion){
        if(hideSuggestions){
            return true;
        }
        const isFirst=!flat.messages[messageIndex-1]?.isSuggestion;
        if(!isFirst){
            return null;
        }
        const titles:string[]=[];
        const group:FlatConvoMessage[]=[];
        for(let x=messageIndex;x<flat.messages.length;x++){
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
            <div className={rowClassName}>
                <div className={theme.suggestionContainerClassName}>
                    {titles.map((t,i)=>(
                        <div key={i} className={theme.suggestionTitleContainerClassName}>
                        <ConvoThemeIcon theme={theme} icon="suggestionTitleIcon"/>
                            <span className={theme.suggestionTitleClassName}>{t}</span>
                        </div>
                    ))}
                    <div className={messageClassName}>
                        {group.map((msg,gi)=>(
                            <Button className={theme.suggestionButtonClassName} key={gi} onClick={()=>{
                                ctrl.appendWithFunctionCallAsync(msg.content??'',msg.tags?.[convoTags.suggestionCallback])
                            }}>
                                <ConvoThemeIcon theme={theme} icon="suggestionButtonIcon"/>
                                {msg.tags?.[convoTags.suggestion]??msg.content}
                                <ConvoThemeIcon theme={theme} icon="suggestionButtonEndIcon"/>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }else{
        return (
            <BubbleMessageView
                rowClassName={rowClassName}
                messageClassName={messageClassName}
                theme={theme}
                message={message}
                enableMarkdown={enableMarkdown}
            />
        )
    }

}


interface BubbleMessageViewProps
{
    rowClassName:string;
    messageClassName:string;
    theme:ConvoViewTheme;
    message:FlatConvoMessage;
    enableMarkdown?:ConvoMarkdownEnableState;
}

function BubbleMessageView({
    rowClassName,
    messageClassName,
    theme,
    message,
    enableMarkdown,
}:BubbleMessageViewProps){

    return (
        <div className={rowClassName}>
            {message.role==='system' && <ConvoThemeIcon theme={theme} icon="systemIcon" />}
            {message.isAssistant && <ConvoThemeIcon theme={theme} icon="assistantIcon" />}
            <div className={cn(messageClassName,!enableMarkdown&&theme.plainTextClassName)}>{
                (enableMarkdown && isMdConvoEnabledFor(message.isUser?'user':'assistant',enableMarkdown))?
                    <ConvoMarkdownViewer markdown={message.content} className={theme.markdownClassName}/>
                :
                    message.content
            }</div>
            {message.isUser && <ConvoThemeIcon theme={theme} icon="userIcon" />}
        </div>
    )

}
