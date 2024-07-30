import { ConvoErrorReferences, ConvoErrorType } from "./convo-types";



export class ConvoError extends Error
{

    public readonly convoType:ConvoErrorType;

    public readonly convoMessage?:string;

    public readonly convoRefs:ConvoErrorReferences;

    public constructor(type:ConvoErrorType,refs:ConvoErrorReferences={},message?:string)
    {
        super(`ConvoError - ${type}${message?' - '+message:''}`);
        this.convoType=type;
        this.convoMessage=message;
        this.convoRefs=refs;
    }
}
