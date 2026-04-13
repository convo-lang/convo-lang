import { ConvoEmbeddingsGenerationRequest, ConvoEmbeddingsGenerationResult, ConvoEmbeddingsGenerationSupportRequest, ConvoEmbeddingsService } from "./convo-types.js";
import { PromiseResultType, ResultType } from "./result-type.js";

let mock:MockConvoEmbeddingsService|undefined;
export const getDefaultMockConvoEmbeddingsService=()=>{
    return mock??(mock=new MockConvoEmbeddingsService());
}

export class MockConvoEmbeddingsService implements ConvoEmbeddingsService
{
    public canGenerateEmbeddings(request:ConvoEmbeddingsGenerationSupportRequest):ResultType<boolean>
    {
        return {
            success:true,
            result:true,
        }
    }
    public generateEmbeddingsAsync(request:ConvoEmbeddingsGenerationRequest):PromiseResultType<ConvoEmbeddingsGenerationResult>
    {
        const len=request.dimensions??100;
        const parts=request.text.split(spReg);
        const ary:number[]=Array(len);
        let di=0;
        while(di<len){
            for(let i=0;i<parts.length && di<len;i++){
                const word=parts[i] as string;
                let d=0;
                for(let c=0;c<word.length;c++){
                    d+=word.codePointAt(c)??0;
                }
                ary[di]=d;
                di++;
            }
        }
        return Promise.resolve({
            success:true,
            result:{
                provider:'mock',
                model:'mock',
                text:request.text,
                embedding:ary,
            },
        })
    }

}

const spReg=/[\s\r\n]/