import { ConvoImageGenerator, ConvoImageResponse } from "@convo-lang/convo-lang";
import { httpClient, joinPaths } from "@iyio/common";
import { openAiApiKeyParam, openAiBaseUrlParam, openAiImageModelParam } from "./convo-lang-openai-params";

interface ImagesResponse
{
    created:number;
    data:{url:string;revised_prompt?:string}[]
}

export interface OpenAiConvoImageGeneratorOptions
{
    apiBaseUrl?:string;
    apiKey?:string;
    model?:string;
    defaultSize?:string
}

export const createOpenAiConvoImageGenerator=({
    apiBaseUrl=openAiBaseUrlParam.get()||'https://api.openai.com',
    model=openAiImageModelParam.get()??'dall-e-3',
    defaultSize='1024x1024',
    apiKey=process.env['OPENAI_API_KEY']||openAiApiKeyParam()
}:OpenAiConvoImageGeneratorOptions={}):ConvoImageGenerator=>{

    return async (request)=>{

        const images=await httpClient().postAsync<ImagesResponse>(joinPaths(apiBaseUrl,'/v1/images/generations'),{
            model:request.model??model,
            prompt:request.prompt,
            n:1,
            size:request.size??defaultSize
        },{
            noAuth:true,
            headers:{
                'Content-Type':'application/json',
                Authorization:`Bearer ${apiKey}`,
            },
        });

        if(!images?.data.length){
            return undefined;
        }

        return images.data.map<ConvoImageResponse>(i=>({
            created:Date.now(),
            url:i.url,
            revisedPrompt:i.revised_prompt,
        }));
    }
}
