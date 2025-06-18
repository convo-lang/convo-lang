import { ConvoModelInfo } from "../convo-types";

const m=(num:number)=>num/1000000;
let chatModel:ConvoModelInfo;

export const knownConvoAnthropicModels:ConvoModelInfo[]=[
    chatModel={
        name:'claude-3-7-sonnet-20250219',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
    }
]

for(const m of knownConvoAnthropicModels){
    Object.freeze(m);
}

export const defaultAnthropicChatModel=chatModel;
