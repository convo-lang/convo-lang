import { Conversation, ConversationUiCtrl } from "@convo-lang/convo-lang";
import { LoadingDots, useSubject } from "@iyio/react-common";
import { ConvoTaskView } from "./ConvoTaskView";

export interface ConversationStatusIndicatorProps
{
    uiCtrl?:ConversationUiCtrl|null;
    conversation?:Conversation|null;
    busy?:boolean;
}

export function ConversationStatusIndicator({
    uiCtrl,
    conversation,
    busy,
}:ConversationStatusIndicatorProps){

    const uiConvo=useSubject(uiCtrl?.convoSubject);
    const currentTask=useSubject(uiCtrl?.currentTaskSubject);

    conversation=conversation??uiConvo;

    const convoTasks=useSubject(conversation?.openTasksSubject);

    return (<>{
        convoTasks?.length?
            convoTasks.map((t,i)=><ConvoTaskView key={i} task={t} />)
        :(currentTask || busy)?
            <LoadingDots/>
        :
            null

    }</>)

}
