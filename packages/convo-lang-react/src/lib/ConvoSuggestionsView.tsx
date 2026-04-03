import { ConversationSuggestions, ConvoViewTheme, getLastConvoSuggestions } from "@convo-lang/convo-lang";
import { SlimButton, useSubject } from "@iyio/react-common";
import { useConversationUiCtrl } from "./convo-lang-react.js";
import { cn } from "./util.js";

export interface ConvoSuggestionsViewProps
{
    className?:string;
    maxSuggestions?:number;
    theme:ConvoViewTheme;
}

export function ConvoSuggestionsView({
    className,
    maxSuggestions=Number.MAX_SAFE_INTEGER,
    theme,
}:ConvoSuggestionsViewProps){

    const ctrl=useConversationUiCtrl();

    const convo=useSubject(ctrl.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const messages=flat?.messages??[];

    const sug:ConversationSuggestions|undefined=getLastConvoSuggestions(messages);


    return (
        <div className={cn(theme.inputSuggestionsContainerClassName,className)}>

            {sug?.suggestions.map((v,i)=>i>=maxSuggestions?null:(
                <SlimButton key={i} className={theme.inputSuggestionButtonClassName} onClick={()=>{
                    ctrl.appendUiMessageAsync(v);
                }}>
                    {v}
                </SlimButton>
            ))}

        </div>
    )

}

