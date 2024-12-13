import { ReadonlySubject, aryDuplicateRemoveItem } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { Conversation } from "./Conversation";
import { ConvoRoomState } from "./convo-types";

/**
 * A ConvoRoom contains 1 or more conversations and allows conversations to interact with each
 * other
 */
export class ConvoRoom
{
    private readonly _state:BehaviorSubject<ConvoRoomState>=new BehaviorSubject<ConvoRoomState>({
        conversations:[],
        lookup:{}
    });
    public get stateSubject():ReadonlySubject<ConvoRoomState>{return this._state}
    public get state(){return this._state.value}




    public addConversation(convo:Conversation){
        this._state.next(createState([...this._state.value.conversations,convo]));
    }


    public removeConversation(convo:Conversation){
        this._state.next(createState(aryDuplicateRemoveItem(this._state.value.conversations,convo)));
    }
}

const createState=(conversations:Conversation[]):ConvoRoomState=>{
    const lookup:Record<string,Conversation>={};
    for(const c of conversations){
        if(lookup[c.name]===undefined){
            lookup[c.name]=c;
        }
    }

    return {
        conversations,
        lookup,
    }
}
