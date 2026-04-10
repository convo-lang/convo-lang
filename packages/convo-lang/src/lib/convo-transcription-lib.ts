import { convoTranscriptionRequestToSupportRequest } from "./convo-lib.js";
import { ConvoTranscriptionRequest, ConvoTranscriptionResult } from "./convo-types.js";
import { convoTranscriptionService } from "./convo.deps.js";

export const transcribeAudioAsync=async (request:ConvoTranscriptionRequest):Promise<ConvoTranscriptionResult>=>{
    const services=convoTranscriptionService.all();
    const support=convoTranscriptionRequestToSupportRequest(request);
    for(const service of services){
        if(!await service.canTranscribe(support)){
            continue;
        }
        return await service.transcribeAsync(request);
    }

    return {
        success:false,
        error:{
            message:'No transcription service available for request',
            error:null,
        }
    }
}
