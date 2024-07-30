import { BaseConvoChromeCtrl } from './BaseConvoChromeCtrl';
import { CcMsg } from './convo-chrome-types';

export class WorldIsoCtrl extends BaseConvoChromeCtrl
{

    protected onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        console.log('hio 👋 👋 👋 Iso World Msg',msg,sender);
    }

}
