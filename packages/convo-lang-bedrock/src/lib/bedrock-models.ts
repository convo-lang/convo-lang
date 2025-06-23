import { ConvoModelInfo } from "@convo-lang/convo-lang";

// https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html

const anthropicDefaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:true,
    jsonModeImplementAsFunction:true,
}

export const bedrockAnthropicModels:ConvoModelInfo[]=[
    {
        name:'us.anthropic.claude-3-haiku-20240307-v1:0',
        ...anthropicDefaults,
        requiredFirstMessageRole:'user',
    },
    {
        name:'us.anthropic.claude-3-5-haiku-20241022-v1:0',
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-opus-4-20250514-v1:0',
        ...anthropicDefaults,
        requiredFirstMessageRole:'user',
    },
    {
        name:'us.anthropic.claude-sonnet-4-20250514-v1:0',
        aliases:[{name:'claud'}],
        ...anthropicDefaults,
    },
]

export const bedrockDeepSeekModels:ConvoModelInfo[]=[
    {
        name:'us.deepseek.r1-v1:0',
        supportsChat:true,
        aliases:[{name:'deepseek'}],
        requiredFirstMessageRole:'user',
    },
]

export const bedrockMistralModels:ConvoModelInfo[]=[
    {
        name:'us.mistral.pixtral-large-2502-v1:0',
        supportsChat:true,
        aliases:[{name:'mistral'}],
        supportsFunctionCalling:true,
        requiredFirstMessageRole:'user',
    },
]

const llamaDefaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:true,
    enableRespondWithTextFunction:true,
    //jsonModeInstructWrapInCodeBlock:true,
    //jsonModeDisableFunctions:true,
    jsonModeImplementAsFunction:true,
    filterToolChoice:true,
    requiredFirstMessageRole:'user',
}

const llamaSmallDefaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:false,
    enableRespondWithTextFunction:true,
    jsonModeInstructWrapInCodeBlock:true,
    jsonModeDisableFunctions:true,
    filterToolChoice:true,
    requiredFirstMessageRole:'user',
}



export const bedrockLlamaModels:ConvoModelInfo[]=[
    {
        name:'us.meta.llama4-maverick-17b-instruct-v1:0',
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama4-scout-17b-instruct-v1:0',
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-1-70b-instruct-v1:0',
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-1-8b-instruct-v1:0',
        ...llamaSmallDefaults,
        supportsFunctionCalling:true,
    },
    // {
    //     name:'us.meta.llama3-1-405b-instruct-v1:0',
    //     ...llamaDefaults,
    // },
    {
        name:'us.meta.llama3-2-11b-instruct-v1:0',
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-2-1b-instruct-v1:0',
        ...llamaSmallDefaults
    },
    {
        name:'us.meta.llama3-2-3b-instruct-v1:0',
        ...llamaSmallDefaults,
    },
    {
        name:'us.meta.llama3-2-90b-instruct-v1:0',
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-3-70b-instruct-v1:0',
        ...llamaDefaults,
        isServiceDefault:true,
        aliases:[{name:'llama'}],
    },
];

const novaDefaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:true,
    requiredFirstMessageRole:'user',
}

export const bedrockNovaModels:ConvoModelInfo[]=[
    {
        name:'us.amazon.nova-lite-v1:0',
        ...novaDefaults,
    },
    {
        name:'us.amazon.nova-micro-v1:0',
        ...novaDefaults,
    },
    {
        name:'us.amazon.nova-pro-v1:0',
        aliases:[
            {name:'novo'},
            {name:'aws'},
        ],
        ...novaDefaults,
    },
]

export const bedrockModels:ConvoModelInfo[]=[
    ...bedrockAnthropicModels,
    ...bedrockDeepSeekModels,
    ...bedrockLlamaModels,
    ...bedrockMistralModels,
    ...bedrockNovaModels,
]

