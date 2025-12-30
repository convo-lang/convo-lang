import { ConvoGraphEntityRef } from "../../convo-graph-types.js";
import { ConvoGraphEntityRenderResult, ConvoGraphEntityRenderer } from "../graph/convo-graph-react-type.js";
import { ChatNodeView } from "./ChatNodeView.js";

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
