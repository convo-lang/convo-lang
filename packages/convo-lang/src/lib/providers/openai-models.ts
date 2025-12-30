import { ConvoModelInfo } from "../convo-types.js";

let _chat:ConvoModelInfo;
let _vision:ConvoModelInfo;
let _image:ConvoModelInfo;
let _textToSpeech:ConvoModelInfo;
let _speechToText:ConvoModelInfo;
let _embedding:ConvoModelInfo;

const m=(num:number)=>num/1000000;

export const openAiModels:ConvoModelInfo[]=[



    // gpt-5
    _chat=_vision={
        name:'gpt-5',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:400000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.25),
        outputTokenPriceUsd:m(10),
        isServiceDefault:true,
    },
    {
        name:'gpt-5-mini',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:400000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.25),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-5-nano',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:400000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.05),
        outputTokenPriceUsd:m(0.4),
    },
    {
        name:'gpt-5-chat',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.25),
        outputTokenPriceUsd:m(10),
    },


    // o4
    {
        name:'o4-mini-deep-research',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2),
        outputTokenPriceUsd:m(8),
    },
    {
        name:'o4-mini',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.1),
        outputTokenPriceUsd:m(4.4),
    },


    // o3
    {
        name:'o3-deep-research',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(40),
    },
    {
        name:'o3-pro',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2),
        outputTokenPriceUsd:m(8),
    },
    {
        name:'o3',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(20),
        outputTokenPriceUsd:m(80),
    },
    {
        name:'o3-mini',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.1),
        outputTokenPriceUsd:m(4.4),
    },

    // o1
    {
        name:'o1',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:200000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(15),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'o1-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(15),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'o1-preview-2024-09-12',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(15),
        outputTokenPriceUsd:m(16),
    },

    // o1-mini
    {
        name:'o1-mini',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(12),
    },
    {
        name:'o1-mini-2024-09-12',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(12),
    },

    // gpt-4o-realtime
    {
        name:'gpt-4o-realtime-preview-2024-10-01',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','audio'],
        outputCapabilities:['text','audio'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(20),
        inputAudioTokenPriceUsd:m(100),
        outputAudioTokenPriceUsd:m(200),
    },
    {
        name:'gpt-4o-realtime-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','audio'],
        outputCapabilities:['text','audio'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(20),
        inputAudioTokenPriceUsd:m(100),
        outputAudioTokenPriceUsd:m(200),
    },

    // gpt-4.1
    {
        name:'gpt-4.1',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:1047576,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2),
        outputTokenPriceUsd:m(8),
    },
    {
        name:'gpt-4.1-mini',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:1047576,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.4),
        outputTokenPriceUsd:m(1.6),
    },
    {
        name:'gpt-4.1-nano',
        matchNameStart:true,
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:1047576,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.1),
        outputTokenPriceUsd:m(0.4),
    },

    // gpt-4o
    {
        name:'gpt-4o',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
    },
    {
        name:'gpt-4o-2024-08-06',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
    },
    {
        name:'gpt-4o-2024-05-13',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(15),
    },
    {
        name:'gpt-4o-audio-preview-2024-10-01',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(19),
        inputAudioTokenPriceUsd:m(100),
        outputAudioTokenPriceUsd:m(200),
    },
    {
        name:'gpt-4o-audio-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
        inputAudioTokenPriceUsd:m(100),
        outputAudioTokenPriceUsd:m(200),
    },
    {
        name:'chatgpt-4o-latest',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(15),
    },

    // gpt-4o-mini
    {
        name:'gpt-4o-mini',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.15),
        outputTokenPriceUsd:m(0.6),
    },
    {
        name:'gpt-4o-mini-2024-07-18',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.15),
        outputTokenPriceUsd:m(0.6),
    },

    // gpt-4-turbo
    {
        name:'gpt-4-turbo',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4-turbo-2024-04-09',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4-turbo-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },

    // gpt-4
    {
        name:'gpt-4-1106-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'gpt-4-0125-preview',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:8192,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'gpt-4-0613',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:8192,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },

    // gpt-3.5-turbo
    {
        name:'gpt-3.5-turbo-instruct',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:4096,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-instruct-0914',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:4096,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-16k',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(4),
    },
    {
        name:'gpt-3.5-turbo-1106',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-0125',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.5),
        outputTokenPriceUsd:m(1.5),
    },
    {
        name:'gpt-3.5-turbo',
        supportsFunctionCalling:true,
        supportsChat:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },

    // whisper
    _speechToText={
        name:'whisper-1',
        inputCapabilities:['audio','video'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:0.006,
    },

    // tts
    {
        name:'tts-1-hd-1106',
        inputCapabilities:['text'],
        outputCapabilities:['audio'],
        inputTokenPriceUsd:30,
    },
    {
        name:'tts-1-hd',
        inputCapabilities:['text'],
        outputCapabilities:['audio'],
        inputTokenPriceUsd:15,
    },
    _textToSpeech={
        name:'tts-1',
        inputCapabilities:['text'],
        outputCapabilities:['audio'],
        inputTokenPriceUsd:15,
    },
    {
        name:'tts-1-1106',
        inputCapabilities:['text'],
        outputCapabilities:['audio'],
        inputTokenPriceUsd:15,
    },

    // dall-e
    _image={
        name:'gpt-image-1',
        inputCapabilities:['text','image'],
        outputCapabilities:['image'],
        imagePriceUsd:0.063,
        imageLgPriceUsd:0.063,
        imageHdPriceUsd:0.25,
        imageLgHdPriceUsd:0.25,
    },
    {
        name:'dall-e-3',
        inputCapabilities:['text'],
        outputCapabilities:['image'],
        imagePriceUsd:0.04,
        imageLgPriceUsd:0.08,
        imageHdPriceUsd:0.08,
        imageLgHdPriceUsd:0.12,
    },
    {
        name:'dall-e-2',
        inputCapabilities:['text'],
        outputCapabilities:['image'],
        imagePriceUsd:0.016,
        imageLgPriceUsd:0.018,
    },

    // text-embedding
    _embedding={
        name:'text-embedding-3-small',
        inputCapabilities:['text'],
        outputCapabilities:['embedding'],
        inputTokenPriceUsd:m(0.02),
        outputDimension:1536,
    },
    {
        name:'text-embedding-3-large',
        inputCapabilities:['text'],
        outputCapabilities:['embedding'],
        inputTokenPriceUsd:m(0.13),
        outputDimension:3072,
    },
    {
        name:'text-embedding-ada-002',
        inputCapabilities:['text'],
        outputCapabilities:['embedding'],
        inputTokenPriceUsd:m(0.1),
        outputDimension:1536,
    },
];

Object.freeze(openAiModels);
export const defaultOpenAiChatModel=_chat;
export const defaultOpenAiVisionModel=_vision;
export const defaultOpenAiImageModel=_image;
export const defaultOpenAiTextToSpeechModel=_textToSpeech;
export const defaultOpenAiSpeechToTextModel=_speechToText;
export const defaultOpenAiEmbeddingModel=_embedding;

for(const m of openAiModels){
    Object.freeze(m);
}
