import { ConvoGraphEntityRef } from "../../convo-graph-types";
import { ConvoGraphEntityRenderResult, ConvoGraphEntityRenderer } from "../graph/convo-graph-react-type";
import { ChatNodeView } from "./ChatNodeView";

export const convoGraphChatRenderer:ConvoGraphEntityRenderer=(entity:ConvoGraphEntityRef):ConvoGraphEntityRenderResult|null=>{
    switch(entity.type){
        case 'node':
            return {
                bar:null,
                view:<ChatNodeView node={entity.entity} />,
                rootClassName:'farts'
            }

        default:
            return null;
    }
}
