import { ReadonlySubject } from "@iyio/common";


export interface ConvoBrowserInf
{
    createPageAsync():Promise<ConvoBrowserPage>;

    get pagesSubject():ReadonlySubject<ConvoBrowserPage[]>;
    get pages():ConvoBrowserPage[];

    dispose():void;
}

export interface ConvoBrowserCallback
{
    name:string;
    callback:(...args:any[])=>Promise<any>|void;
}

export interface ConvoBrowserInjectOptions
{
    javascript?:string;
    css?:string;
    html?:string;
    callback?:ConvoBrowserCallback|ConvoBrowserCallback[];
}

export interface ConvoBrowserPage
{

    openUrlAsync(url:string):Promise<void>;

    openSourceAsync(source:string):Promise<void>;

    injectAsync(options:ConvoBrowserInjectOptions):Promise<void>;

    getScreenShotAsync(options:ConvoBrowserScreenshotOptions):Promise<ConvoBrowserScreenshot|undefined>;

    /**
     * Evaluates the given javascript and return the result.
     */
    evalAsync(javascript:string):Promise<any>;

    dispose():void;


}

export interface ConvoBrowserScreenshotOptions{
    screenshot?:boolean;
    screenshotBase64Url?:boolean;
}
export interface ConvoBrowserScreenshot{
    screenshot?:Blob;
    screenshotBase64Url?:string;
}
