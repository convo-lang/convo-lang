import { ConvoLocalStorageCache } from "./ConvoLocalStorageCache";

let defaultCache:ConvoLocalStorageCache|undefined;
export const getDefaultConvoCache=()=>{
    return defaultCache??(defaultCache=new ConvoLocalStorageCache());
}
