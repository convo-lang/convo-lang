import { Conversation, ConversationUiCtrl, FlatConvoMessage } from "@convo-lang/convo-lang";
import { useSubject } from '@iyio/react-common';
import { createContext, useContext } from "react";
import { ConvoLangTheme } from "./convo-lang-theme";

export const ConversationUiContext=createContext<ConversationUiCtrl|null>(null);

export const useConversationUiCtrl=(ctrlOverride?:ConversationUiCtrl):ConversationUiCtrl=>{
    const ctx=useContext(ConversationUiContext);
    if(ctrlOverride){
        return ctrlOverride;
    }
    if(!ctx){
        throw new Error('useConversationUiCtrl used outside of a ConversationUiContext');
    }
    return ctx;
}

export const useConversation=(ctrlOverride?:ConversationUiCtrl):Conversation|null=>{
    const ctrl=useConversationUiCtrl(ctrlOverride);

    return useSubject(ctrl.convoSubject);
}

export const useConversationMessages=(ctrlOverride?:ConversationUiCtrl):FlatConvoMessage[]=>{

    const ctrl=useConversationUiCtrl(ctrlOverride);

    const convo=useSubject(ctrl.convoSubject);

    const messages=useSubject(convo?.flatSubject)?.messages;

    return messages??[];
}

export const useConversationTheme=(ctrlOverride?:ConversationUiCtrl):Partial<ConvoLangTheme>=>{
    const ctrl=useConversationUiCtrl(ctrlOverride);
    return useSubject(ctrl.themeSubject);
}
