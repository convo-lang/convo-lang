export interface DrawImageToCanvasOptions
{
    src:Blob|string;
    width?:number;
    height?:number;
    maxWidth?:number;
    maxHeight?:number;
    canvas?:HTMLCanvasElement;

}

export const drawImageToCanvasAsync=({
    src,
    maxWidth,
    maxHeight,
    width=maxWidth,
    height=maxHeight,
    canvas,
}:DrawImageToCanvasOptions):Promise<HTMLCanvasElement>=>{

    return new Promise<HTMLCanvasElement>((resolve,reject)=>{

        let revokeSrc=false;
        if(src instanceof Blob){
            revokeSrc=true;
            src=URL.createObjectURL(src);
        }

        const dispose=()=>{
            if(revokeSrc && (typeof src === 'string')){
                URL.revokeObjectURL(src);
            }
        }

        const img=new Image();
        img.src=src;

        img.onload=() => {
            try{
                // 1. Create a canvas
                if(!canvas){
                    canvas=document.createElement('canvas');
                }
                const ctx=canvas.getContext('2d');
                if(!ctx){
                    reject('Unable to create 2d canvas context');
                    return;
                }

                if(width===undefined){
                    if(height===undefined){
                        width=img.width;
                    }else{
                        width=Math.round(height*(img.width/img.height));
                    }
                }

                if(maxWidth!==undefined && width>maxWidth){
                    width=maxWidth;
                }

                if(height===undefined){
                    height=Math.round(width/(img.width/img.height));
                }

                if(maxHeight!==undefined && height>maxHeight){
                    height=maxHeight;
                }

                // 2. Set the canvas to the desired size
                canvas.width=width;
                canvas.height=height;

                // 3. Draw and resize the image
                // Optional: Enable smoothing for better quality
                ctx.imageSmoothingEnabled=true;
                ctx.imageSmoothingQuality='high';
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas);
            }finally{
                dispose();
            }

            // 4. Get the resized image as a Data URL
            const resizedDataUrl=canvas.toDataURL('image/jpeg', 0.9);

            // Alternatively, get a Blob for server upload
            canvas.toBlob((blob) => {
                // Use this blob for uploading to a server
                console.log('Resized Blob:', blob);
            }, 'image/jpeg', 0.9);
        };
        img.onerror=(err)=>{
            dispose();
            reject(err);
        }
    });
}


export interface ResizeImageOptions extends DrawImageToCanvasOptions
{
    contentType?:string;
    quality?:number;
}
export const resizeImageAsync=async ({
    contentType='image/jpeg',
    quality=0.9,
    ...options}:ResizeImageOptions
):Promise<Blob>=>{
    const canvas=await drawImageToCanvasAsync(options);
    return await new Promise<Blob>((resolve,reject)=>{
        canvas.toBlob((blob)=>{
            if(blob){
                resolve(blob);
            }else{
                reject('Unable to convert canvas to blob');
            }
        },contentType,quality);
    })
}

export interface ResizeImageOptions extends DrawImageToCanvasOptions
{
    contentType?:string;
    quality?:number;
}
export const resizeImageDataUrlAsync=async ({
    contentType='image/jpeg',
    quality=0.9,
    ...options}:ResizeImageOptions
):Promise<string>=>{
    const canvas=await drawImageToCanvasAsync(options);
    return canvas.toDataURL(contentType,quality);
}
export interface ContentTypeAndExtension{
    contentType:string;
    extension:string;
}
export const getAudioRecordingContentType=():ContentTypeAndExtension|undefined=>{
    const options:ContentTypeAndExtension[]=[
        {contentType:"audio/mpeg",extension:"mp3"},
        {contentType:"audio/mp3",extension:"mp3"},
        {contentType:"audio/webm;codecs=opus",extension:"webm"},
        {contentType:"audio/ogg;codecs=opus",extension:"ogg"},
        {contentType:"audio/webm",extension:"webm"},
        {contentType:"audio/ogg",extension:"ogg"},
        {contentType:"audio/wav",extension:"wav"},
    ];
    for(const t of options){
        if(globalThis.window?.MediaRecorder?.isTypeSupported?.(t.contentType)){
            return t;
        }
    }
    return undefined;
}

export const getVideoRecordingContentType=():ContentTypeAndExtension|undefined=>{
    const options:ContentTypeAndExtension[]=[
        {contentType:"video/mp4;codecs=hvc1",extension:"mp4"},
        {contentType:"video/mp4;codecs=avc1",extension:"mp4"},
        {contentType:"video/webm;codecs=vp9",extension:"webm"},
        {contentType:"video/webm;codecs=vp8",extension:"webm"},
        {contentType:"video/webm",extension:"webm"},
        {contentType:"video/mp4",extension:"mp4"},
        {contentType:"video/quicktime",extension:"mov"},
    ];

    for(const t of options){
        if(globalThis.window?.MediaRecorder?.isTypeSupported?.(t.contentType)){
            return t;
        }
    }
    return undefined;
};


export const stopStream=(stream:MediaStream|null|undefined)=>{
    if(!stream){
        return;
    }
    const tracks=stream.getTracks();
    for(const t of tracks){
        t.stop();
    }
}
