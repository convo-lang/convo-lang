import { ConversationSuggestions, getLastConvoSuggestions } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutProps } from "@iyio/common";
import { SlimButton, useSubject } from "@iyio/react-common";
import { useConversationUiCtrl } from "./convo-lang-react.js";

export interface SuggestionsViewProps
{
    suggestionClassName?:string;
    maxSuggestions?:number;
}

export function SuggestionsView({
    suggestionClassName,
    maxSuggestions,
    ...props
}:SuggestionsViewProps & BaseLayoutProps){

    const ctrl=useConversationUiCtrl();

    const convo=useSubject(ctrl.convoSubject);

    const flat=useSubject(convo?.flatSubject);

    const messages=flat?.messages??[];

    const sug:ConversationSuggestions|undefined=getLastConvoSuggestions(messages);


    return (
        <div className={style.root(null,null,props)}>

            {sug?.suggestions.map((v,i)=>(
                <SlimButton key={i} className={suggestionClassName} onClick={()=>{
                    ctrl.appendUiMessageAsync(v);
                }}>
                    {v}
                </SlimButton>
            ))}

        </div>
    )

}

const style=atDotCss({name:'SuggestionsView',order:'framework',namespace:'convo',css:`
    @.root{
        display:flex;
        gap:1.5rem;
        justify-content:center;
        flex-wrap:wrap;
    }
`});
