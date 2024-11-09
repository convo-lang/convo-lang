import { Lock } from "@iyio/common";

let lock:Lock|null=globalThis?.window?new Lock(5):null;

/**
 * Returns a lock that is used to limit the max number of open requests to LLMs.
 * Default value is 5 in the browser and the limit is disabled outside of the browser.
 */
export const getGlobalConversationLock=()=>lock;

/**
 * Sets the max global number of conversation completion requests that can be set at the same
 * time. Set the value to null will disable the global lock.
 * @warning Calling this function while Conversations are actively sending messages can result in the
 *          current max count being exceeded while the new lock count takes affect.
 */
export const setGlobalConversationLockMaxConcurrent=(maxConcurrent:number|null)=>{
    if(!maxConcurrent || maxConcurrent<=0){
        lock=null;
        return;
    }
    if(lock && lock.maxConcurrent===maxConcurrent){
        return;
    }

    lock=new Lock(maxConcurrent);
}
