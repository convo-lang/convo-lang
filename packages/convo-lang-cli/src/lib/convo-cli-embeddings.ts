import { convoEmbeddingsService } from "@convo-lang/convo-lang";
import { ConvoCliOptions } from "./convo-cli-types";

export const generateEmbeddingAsync=async (text:string,args:ConvoCliOptions)=>{
    const es=convoEmbeddingsService.all()[0];
    if(!es){
        console.error('No embedding service registered');
        process.exit(1);
    }
    const r=await es.generateEmbeddingsAsync({
        text,
        model:args.embeddingModel,
        provider:args.embeddingProvider,
        format:args.embeddingFormat,
        dimensions:args.embeddingDimensions,
    });
    if(!r.success){
        console.error(r.error);
        process.exit(1);
    }
    console.log(JSON.stringify(r.result));
    return r.result;
}