import { ConvoModelInfo } from "@convo-lang/convo-lang";


const t=(num:number)=>num/1000;

// https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html
// pricing - https://aws.amazon.com/bedrock/pricing/

const anthropicDefaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:true,
    jsonModeImplementAsFunction:true,
}

export const bedrockAnthropicModels:ConvoModelInfo[]=[
    {
        name:'us.anthropic.claude-3-haiku-20240307-v1:0',
        inputTokenPriceUsd:t(0.0008),
        outputTokenPriceUsd:t(0.004),
        aliases:[{name:'claude-3-5'}],
        ...anthropicDefaults,
        requiredFirstMessageRole:'user',
    },
    {
        name:'us.anthropic.claude-3-5-haiku-20241022-v1:0',
        inputTokenPriceUsd:t(0.0008),
        outputTokenPriceUsd:t(0.004),
        aliases:[{name:'claude-3-5-haiku'}],
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
        inputTokenPriceUsd:t(0.003),
        outputTokenPriceUsd:t(0.015),
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
        inputTokenPriceUsd:t(0.003),
        outputTokenPriceUsd:t(0.015),
        aliases:[{name:'claude-3-5-sonnet'}],
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        inputTokenPriceUsd:t(0.003),
        outputTokenPriceUsd:t(0.015),
        aliases:[{name:'claude-3-7-sonnet'}],
        ...anthropicDefaults,
    },
    {
        name:'us.anthropic.claude-opus-4-20250514-v1:0',
        inputTokenPriceUsd:t(0.015),
        outputTokenPriceUsd:t(0.075),
        aliases:[{name:'claude-4-opus'}],
        ...anthropicDefaults,
        requiredFirstMessageRole:'user',
    },
    {
        name:'us.anthropic.claude-sonnet-4-20250514-v1:0',
        inputTokenPriceUsd:t(0.003),
        outputTokenPriceUsd:t(0.015),
        aliases:[{name:'claude'},{name:'claude-4-sonnet'}],
        ...anthropicDefaults,
    },
]


const ai21Defaults:Partial<ConvoModelInfo>={
    supportsChat:true,
    supportsFunctionCalling:true,
    jsonModeImplementAsFunction:true,
}

export const bedrockAi21Models:ConvoModelInfo[]=[
]

export const bedrockDeepSeekModels:ConvoModelInfo[]=[
    {
        name:'us.deepseek.r1-v1:0',
        inputTokenPriceUsd:t(0.00135),
        outputTokenPriceUsd:t(0.0054),
        supportsChat:true,
        aliases:[{name:'deepseek'},{name:'r1'},{name:'deepseek-r1'}],
        requiredFirstMessageRole:'user',
    },
]

export const bedrockMistralModels:ConvoModelInfo[]=[
    {
        name:'us.mistral.pixtral-large-2502-v1:0',
        inputTokenPriceUsd:t(0.002),
        outputTokenPriceUsd:t(0.006),
        supportsChat:true,
        aliases:[{name:'mistral'},{name:'pixtral'}],
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
        inputTokenPriceUsd:t(0.00024),
        outputTokenPriceUsd:t(0.00097),
        aliases:[{name:'llama-4-maverick-17b'}],
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama4-scout-17b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00017),
        outputTokenPriceUsd:t(0.00066),
        aliases:[{name:'llama-4-scout-17b'}],
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-1-70b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00072),
        outputTokenPriceUsd:t(0.00072),
        aliases:[{name:'llama-3-1-70b'}],
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-1-8b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00022),
        outputTokenPriceUsd:t(0.00022),
        aliases:[{name:'llama-3-1-8b'}],
        ...llamaSmallDefaults,
        supportsFunctionCalling:true,
    },
    // {
    //     name:'us.meta.llama3-1-405b-instruct-v1:0',

        // ADD PRICING
    //     ...llamaDefaults,
    // },
    {
        name:'us.meta.llama3-2-11b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00016),
        outputTokenPriceUsd:t(0.00016),
        aliases:[{name:'llama-3-2-11b'}],
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-2-1b-instruct-v1:0',
        inputTokenPriceUsd:t(0.0001),
        outputTokenPriceUsd:t(0.0001),
        aliases:[{name:'llama-3-2-1b'}],
        ...llamaSmallDefaults
    },
    {
        name:'us.meta.llama3-2-3b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00015),
        outputTokenPriceUsd:t(0.00015),
        aliases:[{name:'llama-3-2-3b'}],
        ...llamaSmallDefaults,
    },
    {
        name:'us.meta.llama3-2-90b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00072),
        outputTokenPriceUsd:t(0.00072),
        aliases:[{name:'llama-3-2-90b'}],
        ...llamaDefaults,
    },
    {
        name:'us.meta.llama3-3-70b-instruct-v1:0',
        inputTokenPriceUsd:t(0.00072),
        outputTokenPriceUsd:t(0.00072),
        ...llamaDefaults,
        isServiceDefault:true,
        aliases:[{name:'llama'},{name:'llama-3-3-70b'}],
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
        inputTokenPriceUsd:t(0.00006),
        outputTokenPriceUsd:t(0.00024),
        aliases:[{name:'novo-lite'}],
        ...novaDefaults,
    },
    {
        name:'us.amazon.nova-micro-v1:0',
        inputTokenPriceUsd:t(0.000035),
        outputTokenPriceUsd:t(0.00014),
        aliases:[{name:'novo-micro'}],
        ...novaDefaults,
    },
    {
        name:'us.amazon.nova-pro-v1:0',
        inputTokenPriceUsd:t(0.0008),
        outputTokenPriceUsd:t(0.0032),
        aliases:[{name:'novo'},{name:'novo-pro'}],
        ...novaDefaults,
    },
]

export const bedrockModels:ConvoModelInfo[]=[
    ...bedrockAnthropicModels,
    ...bedrockAi21Models,
    ...bedrockDeepSeekModels,
    ...bedrockLlamaModels,
    ...bedrockMistralModels,
    ...bedrockNovaModels,
]

