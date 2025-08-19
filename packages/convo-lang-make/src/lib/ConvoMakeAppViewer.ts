import { ConvoBrowserInf, ConvoBrowserPage } from "@convo-lang/convo-lang";
import { createPromiseSource, DisposeContainer, PromiseSource } from "@iyio/common";
import { ConvoMakeOutputReview, ConvoMakeOutputReviewRequest } from "./convo-make-types";
import { ConvoMakeAppCtrl } from "./ConvoMakeAppCtrl";


export class ConvoMakeAppViewer
{
    public readonly appCtrl:ConvoMakeAppCtrl;

    public readonly reviewRequest:ConvoMakeOutputReviewRequest;

    public readonly instName:string;

    public constructor(appCtrl:ConvoMakeAppCtrl,reviewRequest:ConvoMakeOutputReviewRequest){
        this.appCtrl=appCtrl;
        this.reviewRequest=reviewRequest;
        this.instName=`CONVO_MAKE${Date.now()}_${Math.round(Math.random()*100000)}`
    }

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
        this.pagePromise?.then(p=>p.dispose());
    }

    private pagePromise?:Promise<ConvoBrowserPage>|undefined;

    private async getPageAsync(browser:ConvoBrowserInf){
        const page=await browser.createPageAsync();
        const instName=this.instName;
        try{
            if(this.reviewRequest.reviewType==='http'){
                await page.openUrlAsync(`http://${this.appCtrl.app.host??'localhost'}:${this.appCtrl.app.port}/${this.reviewRequest.appPath}`);
            }else{
                await page.openSourceAsync('')// todo
            }
            if(this.isDisposed){
                page.dispose();
                return page;
            }

            await page.injectAsync({
                html:/*html*/`
                    <div id="${instName}" style="position:fixed;right:0;bottom:0;padding:0.5rem;display:flex;gap:0.5rem;z-index:999999">
                        <input type="text" id="${instName}_change" style="min-width:200px" placeholder="Enter change instructions" />
                        <button onclick="
                            const review={
                                approved:false,
                                message:document.getElementById('${instName}_change')?.value,
                            }
                            document.getElementById('${instName}').style.display='none';
                            ${instName}(review);
                        ">Submit change</button>
                        |
                        <button onclick="
                            document.getElementById('${instName}').style.display='none';
                            ${instName}({approved:true});
                        ">Approve</button>
                    </div>
                `,
                callback:{
                    name:instName,
                    callback:(review:ConvoMakeOutputReview)=>{
                        this.reviewSource?.resolve(review);
                    }
                }
            });

            return page;
        }catch(ex){
            page.dispose();
            throw ex;
        }
    }

    private firstView=true;
    private reviewSource?:PromiseSource<ConvoMakeOutputReview>;
    public async reviewAsync():Promise<ConvoMakeOutputReview>{
        const browser=this.appCtrl.parent.options.browserInf;
        if(!browser || !this.appCtrl.app.port){
            return {approved:true};
        }

        const page=await (this.pagePromise??(this.pagePromise=this.getPageAsync(browser)));

        try{

            if(this.firstView){
                this.firstView=false;
            }else{
                await page.evalAsync(`document.getElementById('${this.instName}').style.display='flex';`);
            }

            const reviewSource=createPromiseSource<ConvoMakeOutputReview>();
            this.reviewSource=reviewSource;

            const review=await reviewSource.promise;

            review.approved=review.approved??true;

            const s=await page.getScreenShotAsync({screenshotBase64Url:true,screenshot:true});
            review.screenshot=s?.screenshot;
            review.screenshotBase64Url=s?.screenshotBase64Url;
            return review;
        }finally{
            if(this.isDisposed){
                page.dispose();
            }
        }

    }
}
