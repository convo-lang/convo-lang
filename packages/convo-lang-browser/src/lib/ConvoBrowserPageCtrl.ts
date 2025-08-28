import { ConvoBrowserInjectOptions, ConvoBrowserPage, ConvoBrowserScreenshot, ConvoBrowserScreenshotOptions } from "@convo-lang/convo-lang";
import { asArray } from "@iyio/common";
import { Page } from 'puppeteer';
import { ConvoBrowserCtrl } from "./ConvoBrowserCtrl";

export class ConvoBrowserPageCtrl implements ConvoBrowserPage
{

    public readonly parent:ConvoBrowserCtrl;
    public readonly page:Page;

    public constructor(parent:ConvoBrowserCtrl,page:Page)
    {
        this.parent=parent;
        this.page=page;
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.parent.closePage(this);
        this.page.close();
    }

    public async openUrlAsync(url:string):Promise<void>
    {
        await this.page.goto(url,{waitUntil:'domcontentloaded'});
    }

    public async openSourceAsync(source:string):Promise<void>
    {

    }

    private injections:ConvoBrowserInjectOptions[]=[];

    public async injectAsync(options:ConvoBrowserInjectOptions):Promise<void>
    {
        options={...options}
        this.injections.push(options);
        await this._injectAsync(options);
    }

    private async _injectAsync(options:ConvoBrowserInjectOptions):Promise<void>
    {
        if(options.callback){
            const ary=asArray(options.callback);
            for(const c of ary){
                this.page.exposeFunction(c.name,c.callback);
            }
        }
        if(options.css){
            await this.page.addStyleTag({
                content:options.css
            })
        }
        if(options.html){
            await this.page.addScriptTag({
                content:`(()=>{
                    const div=document.createElement('div');
                    div.innerHTML=${JSON.stringify(options.html)};
                    while(div.children.length){
                        const c=div.children.item(0);
                        c.remove();
                        document.body.append(c);
                    }
                })()`
            })
        }
        if(options.javascript){
            let js=options.javascript.trim();
            if(js.startsWith('<script>')){
                js=js.substring('<script>'.length);
            }
            if(js.endsWith('</script>')){
                js=js.substring(0,js.length-'</script>'.length)
            }
            await this.page.addScriptTag({
                content:js
            })
        }
    }

    public async getScreenShotAsync(options:ConvoBrowserScreenshotOptions):Promise<ConvoBrowserScreenshot>
    {
        const r=await this.page.screenshot();
        return {
            screenshot:options.screenshot?new Blob([r as any],{type:'image/png'}):undefined,
            screenshotBase64Url:options.screenshotBase64Url?`data:image/png;base64,${(r as any).toString('base64')}`:undefined,
        }
    }

    public evalAsync(javascript:string):Promise<any>{
        return this.page.evaluate<any>(javascript);
    }
}
