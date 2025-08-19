import { ConvoBrowserInf, ConvoBrowserPage } from "@convo-lang/convo-lang";
import { DisposeContainer, pushBehaviorSubjectAry, ReadonlySubject, removeBehaviorSubjectAryValue } from "@iyio/common";
import puppeteer, { Browser } from 'puppeteer';
import { BehaviorSubject } from "rxjs";
import { ConvoBrowserPageCtrl } from "./ConvoBrowserPageCtrl";

export class ConvoBrowserCtrl implements ConvoBrowserInf
{
    private readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
        const pages=[...this._pages.value];
        for(const p of pages){
            p.dispose();
        }
        this._browser?.close();

    }

    private readonly _pages:BehaviorSubject<ConvoBrowserPageCtrl[]>=new BehaviorSubject<ConvoBrowserPageCtrl[]>([]);
    public get pagesSubject():ReadonlySubject<ConvoBrowserPage[]>{return this._pages as any}
    public get pages(){return this._pages.value}


    private _browser:Browser|undefined;
    private _browserPromise:Promise<Browser>|undefined;
    public async getBrowserAsync(){
        return this._browserPromise??(this._browserPromise=(async ()=>{
            const browser=await puppeteer.launch({headless:false});
            this._browser=browser;
            if(this.isDisposed){
                browser.close();
            }
            return browser;
        })());
    }

    public async createPageAsync():Promise<ConvoBrowserPage>{
        const browser=await this.getBrowserAsync();

        const page=await browser.newPage();

        const ctrl=new ConvoBrowserPageCtrl(this,page);

        pushBehaviorSubjectAry(this._pages,ctrl);

        return ctrl;

    }

    public closePage(page:ConvoBrowserPageCtrl){
        removeBehaviorSubjectAryValue(this._pages,page);
        page.dispose();
    }
}
