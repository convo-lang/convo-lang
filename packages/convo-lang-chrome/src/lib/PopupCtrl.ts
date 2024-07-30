import { ReadonlySubject, UiActionItem } from '@iyio/common';
import { BehaviorSubject } from 'rxjs';
import { BaseConvoChromeCtrl } from './BaseConvoChromeCtrl';
import { CcMsg, CcView, ConvoCaptureConfig } from './convo-chrome-types';

let defaultCtrl:PopupCtrl|null=null;

export const popCtrl=()=>{
    return defaultCtrl??(defaultCtrl=new PopupCtrl())
}

export class PopupCtrl extends BaseConvoChromeCtrl
{

    private readonly _route:BehaviorSubject<string>=new BehaviorSubject<string>('/');
    public get routeSubject():ReadonlySubject<string>{return this._route}
    public get route(){return this._route.value}
    public set route(value:string){
        if(value==this._route.value){
            return;
        }
        this._route.next(value);
    }


    private readonly _mainNav:BehaviorSubject<(UiActionItem|null|undefined)[]>=new BehaviorSubject<(UiActionItem|null|undefined)[]>([]);
    public get mainNavSubject():ReadonlySubject<(UiActionItem|null|undefined)[]>{return this._mainNav}
    public get mainNav(){return this._mainNav.value}
    public set mainNav(value:(UiActionItem|null|undefined)[]){
        if(value==this._mainNav.value){
            return;
        }
        this._mainNav.next(value);
    }

    private readonly _views:BehaviorSubject<CcView[]>=new BehaviorSubject<CcView[]>([]);
    public get viewsSubject():ReadonlySubject<CcView[]>{return this._views}
    public get views(){return this._views.value}
    public set views(value:CcView[]){
        if(value==this._views.value){
            return;
        }
        this._views.next(value);
    }

    private readonly _captureConfig:BehaviorSubject<ConvoCaptureConfig|null>=new BehaviorSubject<ConvoCaptureConfig|null>(null);
    public get captureConfigSubject():ReadonlySubject<ConvoCaptureConfig|null>{return this._captureConfig}
    public get captureConfig(){return this._captureConfig.value}
    public set captureConfig(value:ConvoCaptureConfig|null){
        if(value==this._captureConfig.value){
            return;
        }
        this._captureConfig.next(value);
    }

    private readonly _tabId:BehaviorSubject<number|null>=new BehaviorSubject<number|null>(null);
    public get tabIdSubject():ReadonlySubject<number|null>{return this._tabId}
    public get tabId(){return this._tabId.value}
    public set tabId(value:number|null){
        if(value==this._tabId.value){
            return;
        }
        this._tabId.next(value);
    }


    public constructor()
    {
        super();
        this.sendMessage({
            type:'getAppState'
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        //
    }

    public getTabAsync():Promise<chrome.tabs.Tab|undefined>{
        const id=this.tabId;
        if(!id){
            return Promise.resolve(undefined);
        }
        return this.getTabByIdAsync(id);
    }

    public async getTabByIdAsync(id:number):Promise<chrome.tabs.Tab|undefined>{
        try{
            return await chrome.tabs.get(id);
        }catch{
            return undefined;
        }
    }

}
