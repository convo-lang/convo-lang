import { ConvoModelInfo } from "./convo-types";
import { knownConvoAnthropicModels } from "./providers/anthropic-models";
import { openAiModels } from "./providers/openai-models";


export const defaultConvoModels:ConvoModelInfo[]=[
    ...openAiModels,
    ...knownConvoAnthropicModels,
]
Object.freeze(defaultConvoModels);
