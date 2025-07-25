import { Conversation, ConversationUiCtrl } from "@convo-lang/convo-lang";
import { LoadingDots, useSubject } from "@iyio/react-common";
import { ConvoTaskView } from "./ConvoTaskView";

export interface ConversationStatusIndicatorProps
{
    uiCtrl?:ConversationUiCtrl|null;
    conversation?:Conversation|null;
    busy?:boolean;
    loadingIndicator?:any;
    convoTaskViewClassName?:string;
}

export function ConversationStatusIndicator({
    uiCtrl,
    conversation,
    busy,
    loadingIndicator,
    convoTaskViewClassName,
}:ConversationStatusIndicatorProps){

    const uiConvo=useSubject(uiCtrl?.convoSubject);
    const currentTask=useSubject(uiCtrl?.currentTaskSubject);

    conversation=conversation??uiConvo;

    const convoTasks=useSubject(conversation?.openTasksSubject);

    return (<>{
        convoTasks?.length?
            convoTasks.map((t,i)=><ConvoTaskView mt05={i!==0} className={convoTaskViewClassName} key={i} task={t} />)
        :(currentTask || busy)?
            (loadingIndicator??<LoadingDots/>)
        :
            null

    }</>)

}
