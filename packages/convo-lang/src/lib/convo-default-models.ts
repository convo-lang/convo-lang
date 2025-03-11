import { ConvoModelInfo } from "./convo-types";
import { knownConvoAnthropicModels } from "./providers/anthropic-models";
import { knownConvoOpenAiModels } from "./providers/openai-models";


export const defaultConvoModels:ConvoModelInfo[]=[
    ...knownConvoOpenAiModels,
    ...knownConvoAnthropicModels,
]
Object.freeze(defaultConvoModels);
