import { ConvoModelInfo } from "../convo-types";

let _chat:ConvoModelInfo;
let _vision:ConvoModelInfo;
let _image:ConvoModelInfo;
let _textToSpeech:ConvoModelInfo;
let _speechToText:ConvoModelInfo;
let _embedding:ConvoModelInfo;

const m=(num:number)=>num/1000000;

export const knownConvoOpenAiModels:ConvoModelInfo[]=[
    // o1
    {
        name:'o1-preview',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(15),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'o1-preview-2024-09-12',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(15),
        outputTokenPriceUsd:m(16),
    },

    // o1-mini
    {
        name:'o1-mini',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(12),
    },
    {
        name:'o1-mini-2024-09-12',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(12),
    },

    // gpt-4o-realtime
    {
        name:'gpt-4o-realtime-preview-2024-10-01',
        functionCallingSupport:true,
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
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','audio'],
        outputCapabilities:['text','audio'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(20),
        inputAudioTokenPriceUsd:m(100),
        outputAudioTokenPriceUsd:m(200),
    },

    // gpt-4o
    _chat=_vision={
        name:'gpt-4o',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
    },
    {
        name:'gpt-4o-2024-08-06',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2.5),
        outputTokenPriceUsd:m(10),
    },
    {
        name:'gpt-4o-2024-05-13',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(15),
    },
    {
        name:'gpt-4o-audio-preview-2024-10-01',
        functionCallingSupport:true,
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
        functionCallingSupport:true,
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
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(5),
        outputTokenPriceUsd:m(15),
    },

    // gpt-4o-mini
    {
        name:'gpt-4o-mini',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.15),
        outputTokenPriceUsd:m(0.6),
    },
    {
        name:'gpt-4o-mini-2024-07-18',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text','image'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.15),
        outputTokenPriceUsd:m(0.6),
    },

    // gpt-4-turbo
    {
        name:'gpt-4-turbo',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4-turbo-2024-04-09',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4-turbo-preview',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },

    // gpt-4
    {
        name:'gpt-4-1106-preview',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'gpt-4-0125-preview',
        functionCallingSupport:true,
        contextWindowSize:128000,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(10),
        outputTokenPriceUsd:m(30),
    },
    {
        name:'gpt-4',
        functionCallingSupport:true,
        contextWindowSize:8192,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },
    {
        name:'gpt-4-0613',
        functionCallingSupport:true,
        contextWindowSize:8192,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(30),
        outputTokenPriceUsd:m(60),
    },

    // gpt-3.5-turbo
    {
        name:'gpt-3.5-turbo-instruct',
        functionCallingSupport:true,
        contextWindowSize:4096,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-instruct-0914',
        functionCallingSupport:true,
        contextWindowSize:4096,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-16k',
        functionCallingSupport:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(3),
        outputTokenPriceUsd:m(4),
    },
    {
        name:'gpt-3.5-turbo-1106',
        functionCallingSupport:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1),
        outputTokenPriceUsd:m(2),
    },
    {
        name:'gpt-3.5-turbo-0125',
        functionCallingSupport:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.5),
        outputTokenPriceUsd:m(1.5),
    },
    {
        name:'gpt-3.5-turbo',
        functionCallingSupport:true,
        contextWindowSize:16385,
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(1.5),
        outputTokenPriceUsd:m(2),
    },

    // legacy
    {
        name:'babbage-002',
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(0.4),
        outputTokenPriceUsd:m(0.4),
    },
    {
        name:'davinci-002',
        inputCapabilities:['text'],
        outputCapabilities:['text'],
        inputTokenPriceUsd:m(2),
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
]
Object.freeze(knownConvoOpenAiModels);
export const defaultOpenAiChatModel=_chat;
export const defaultOpenAiVisionModel=_vision;
export const defaultOpenAiImageModel=_image;
export const defaultOpenAiTextToSpeechModel=_textToSpeech;
export const defaultOpenAiSpeechToTextModel=_speechToText;
export const defaultOpenAiEmbeddingModel=_embedding;

for(const m of knownConvoOpenAiModels){
    Object.freeze(m);
}
