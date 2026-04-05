import { useWProp } from "@iyio/react-common";
import { ConvoMessageView, ConvoMessageViewProps } from "./ConvoMessageView.js";

export function ConvoStreamingMessageView({
    message,
    ...props
}:ConvoMessageViewProps){

    useWProp(message,'content',{disable:!message.streamingActive});

    return (
        <ConvoMessageView message={message} {...props}/>
    )

}
