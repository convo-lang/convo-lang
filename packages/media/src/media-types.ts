export interface DrawImageToCanvasOptions
{
    src:Blob|string;
    width?:number;
    height?:number;
    maxWidth?:number;
    maxHeight?:number;
    canvas?:HTMLCanvasElement;

}


export interface ResizeImageOptions extends DrawImageToCanvasOptions
{
    contentType?:string;
    quality?:number;
}