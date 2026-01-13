import { defineService } from "@iyio/common";

export const convoUrlOpenerService=defineService<ConvoUrlOpener>('convoUrlOpenerService');

export interface ConvoUrlOpener
{
    openUrl(url:string,task:string,message?:string):boolean|Promise<boolean>;
}
