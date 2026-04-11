import { ConvoMarkdownEnableState, ConvoViewTheme, FlatConvoMessage, isMdConvoEnabledFor } from "@convo-lang/convo-lang";
import { ConvoMarkdownViewer } from "./ConvoMarkdownViewer.js";
import { ConvoThemeIcon } from "./ConvoThemeIcon.js";
import { cn } from "./util.js";

export interface ConvoContentMessageViewProps
{
    rowClassName:string;
    messageClassName:string;
    theme:ConvoViewTheme;
    message:FlatConvoMessage;
    enableMarkdown?:ConvoMarkdownEnableState;
    contentOverride?:string;
    elemRef?:(elem:HTMLElement|null)=>void;
}

export function ConvoContentMessageView({
    rowClassName,
    messageClassName,
    theme,
    message,
    enableMarkdown,
    contentOverride,
    elemRef,
}:ConvoContentMessageViewProps){

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