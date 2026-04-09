import { ConversationUiCtrl, ConvoComponent, ConvoComponentRendererContext, ConvoMarkdownEnableState, ConvoRagRenderer, ConvoViewTheme, FlatConvoConversation, FlatConvoMessage, convoFlatMessageSourceMessageKey, convoMessageToStringSafe, convoRoles, convoTags, isMdConvoEnabledFor } from "@convo-lang/convo-lang";
import { aryRemoveWhere, containsMarkdownImage, parseMarkdownImages } from "@iyio/common";
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
    elemRef?:(elem:HTMLElement|null)=>void;
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
    theme,
    elemRef
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


    if(message.role==='result' && message.streamingActive){
        const content=message.content??'';
        return (
            <div ref={elemRef} className={rowClassName}>
                <ConvoThemeIcon theme={theme} icon="assignmentIcon" className={theme.assistantIconClassName}/>
                <div className={cn(messageClassName,theme.assignmentMessageClassName)}>
                    <div className={theme.assignmentStreamingFunctionCallClassName}>
                        {message.streamingFunction}
                        <span className={cn('__convo-message-tokens',theme.assignmentStreamingFunctionTokenCountCallClassName)}>( ~{Math.round(content.length/4)} tokens )</span>
                    </div>
                    <div className={cn('__convo-message-content-fn',theme.assignmentWindowClassName)}>
                        {content.substring(content.length-600)}
                    </div>
                </div>
            </div>
        )
    }else if(message.role==='result' || message.setVars){
        if(!message.setVars || (!showResults && !showFunctions)){
            return null;
        }
        const called=flat.messages[messageIndex+1];
        const keys=Object.keys(message.setVars);
        aryRemoveWhere(keys,k=>k.startsWith('__') && k!=='__return');
        if(!keys.length){
            return null;
        }
        return (
            <div className={rowClassName}>
                <ConvoThemeIcon theme={theme} icon="assignmentIcon" className={theme.assistantIconClassName}/>
                <div className={cn(messageClassName,theme.assignmentMessageClassName)}>
                    <div className={cn(theme.assignmentListClassName)}>
                        {called?.called && <div className={theme.assignmentFunctionCallClassName}>
                            {called.called.name}({JSON.stringify(called.calledParams,null,4)})
                        </div>}
                        {keys.map((k)=>{
                            let value:string;
                            try{
                                value=JSON.stringify(message.setVars?.[k],null,4);
                            }catch{
                                value='[object]';
                            }
                            return (
                                <div key={k+'r'} className={theme.assignmentValueClassName}>{k+' = '+value}</div>
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
                    elemRef={elemRef}
                />
            )
        }else if(showFunctions && ( message.fn || (message.called && !showResults))){
            return (
                <div className={rowClassName}>
                    <ConvoThemeIcon theme={theme} icon="functionIcon" className={theme.assistantIconClassName}/>
                    <div className={messageClassName}>
                        {(!message.called?convoMessageToStringSafe(message[convoFlatMessageSourceMessageKey]):null)?.trim()??JSON.stringify(message,null,4)}
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

        return (<>{
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
                    contentOverride={p.text??''}
                    enableMarkdown={enableMarkdown}
                    elemRef={elemRef}
                />
            ))
        }</>)

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
                elemRef={elemRef}
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
    contentOverride?:string;
    elemRef?:(elem:HTMLElement|null)=>void;
}

function BubbleMessageView({
    rowClassName,
    messageClassName,
    theme,
    message,
    enableMarkdown,
    contentOverride,
    elemRef,
}:BubbleMessageViewProps){

    const content=contentOverride??message.content??'';

    return (
        <div className={rowClassName} ref={elemRef}>
            {message.role==='system' && <ConvoThemeIcon theme={theme} icon="systemIcon" className={theme.assistantIconClassName} />}
            {message.isAssistant && <ConvoThemeIcon theme={theme} icon="assistantIcon" />}
            <div className={cn('__convo-message-content',messageClassName,!enableMarkdown&&theme.plainTextClassName)}>{
                (enableMarkdown && isMdConvoEnabledFor(message.isUser?'user':'assistant',enableMarkdown))?
                    <ConvoMarkdownViewer markdown={content} className={theme.markdownClassName}/>
                :
                    content
            }</div>
            {message.isUser && <ConvoThemeIcon theme={theme} icon="userIcon" />}
        </div>
    )

}

