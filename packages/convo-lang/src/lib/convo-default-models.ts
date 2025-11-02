import { ConvoModelInfo } from "./convo-types.js";
import { knownConvoAnthropicModels } from "./providers/anthropic-models.js";
import { openAiModels } from "./providers/openai-models.js";


export const defaultConvoModels:ConvoModelInfo[]=[
    ...openAiModels,
    ...knownConvoAnthropicModels,
]
Object.freeze(defaultConvoModels);
