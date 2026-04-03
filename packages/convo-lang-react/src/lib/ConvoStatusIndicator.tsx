import { Conversation, ConversationUiCtrl, ConvoViewTheme } from "@convo-lang/convo-lang";
import { useSubject } from "@iyio/react-common";
import { ConvoLoader } from "./ConvoLoader.js";
import { ConvoTaskView } from "./ConvoTaskView.js";

export interface ConvoStatusIndicatorProps
{
    uiCtrl?:ConversationUiCtrl|null;
    conversation?:Conversation|null;
    busy?:boolean;
    theme:ConvoViewTheme;
}

export function ConvoStatusIndicator({
    uiCtrl,
    conversation,
    busy,
    theme,
}:ConvoStatusIndicatorProps){

    const uiConvo=useSubject(uiCtrl?.convoSubject);
    const currentTask=useSubject(uiCtrl?.currentTaskSubject);

    conversation=conversation??uiConvo;

    const convoTasks=useSubject(conversation?.openTasksSubject);

    return (<>{
        convoTasks?.length?
            convoTasks.map((t,i)=><ConvoTaskView theme={theme} key={i} task={t} />)
        :(currentTask || busy)?
            <ConvoLoader theme={theme}/>
        :
            null

    }</>)

}
