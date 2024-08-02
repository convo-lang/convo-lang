import { createJsonRefReplacer } from "@iyio/common";
import { Subject } from "rxjs";
import { ConvoCompletionMessage, ConvoComponentCompletionHandler, ConvoComponentSubmission } from "./convo-types";

export const submitConvoComponent=(submission:ConvoComponentSubmission)=>{
    convoComponentSubmissionSubject.next(submission);
}

export const convoComponentSubmissionSubject=new Subject<ConvoComponentSubmission>();

export const defaultConvoUiSubmissionCallback:ConvoComponentCompletionHandler=({convo})=>{

    return new Promise<ConvoCompletionMessage[]>((resolve,reject)=>{
        const sub=convoComponentSubmissionSubject.subscribe(v=>{
            if(v.convo===convo){
                sub.unsubscribe();
                if(v.messages){
                    resolve(v.messages)
                }else if(v.data!==undefined){
                    try{
                        resolve([{
                            role:'user',
                            content:JSON.stringify(v.data,createJsonRefReplacer())
                        }])
                    }catch(ex){
                        reject(ex);
                    }
                }else{
                    resolve([]);
                }

            }
        })
    })
}
