import { ConvoDocReader } from "@convo-lang/convo-lang";
import { PdfReader, pdfReaderPool } from "@iyio/pdf-viewer";
import { VfsItem, getVfsItemUrl } from "@iyio/vfs";

export class ConvoPdfDocReader implements ConvoDocReader
{

    private readonly reader:PdfReader;

    public constructor(src:VfsItem|string)
    {
        const url=getVfsItemUrl(src);
        if(!url){
            throw new Error('Unable to get URL from src');
        }

        const reader=pdfReaderPool().getReader(url);
        this.reader=reader;
    }
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        pdfReaderPool().returnReader(this.reader);
    }

    public async pageToImageAsync(pageIndex:number,format?:string):Promise<Blob|undefined>{
        const r=await this.reader.pageToImageAsync(pageIndex,format);
        return r??undefined;
    }
    public async getPageCountAsync():Promise<number>{
        return (await this.reader.getDocAsync())?.numPages??0;
    }
}
