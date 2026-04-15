import { ConvoGitFileStatus, ConvoGitService, GitStatusRequest, GitStatusSingleRequest, PromiseResultType } from "@convo-lang/convo-lang";

export class ConvoCliGitService implements ConvoGitService
{
    public async gitStatusSingleAsync(request:GitStatusSingleRequest):PromiseResultType<ConvoGitFileStatus>{
        throw new Error("Method not implemented.");
    }
    public async gitStatusAsync(request:GitStatusRequest):PromiseResultType<ConvoGitFileStatus[]>{
        throw new Error("Method not implemented.");
    }
    
}