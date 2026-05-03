import { SpriteImage, TuiImageConversionOptions } from "./tui-types.js";

const imageHeaderSize=32;
const imageHeader=[0x43, 0x6f, 0x6e, 0x76];



/**
 * Converts a base64 string into a SpriteImage.* Data layout:
 * [header - 4 bytes][width - 4 bytes][bytesPerByte - 4 bytes][height - 4 bytes][reserved - 16 bytes][pixel data - (width*bytesPerByte*height) bytes]
 * header = x43 x6f x6e x76
 *
 * If invalid data is supplied a default (X) image will be supplied with and the `error` property of the image will be populated.
 */
export const convertB64TuiImage=(b64:string, options?:TuiImageConversionOptions):SpriteImage=>{
    try{
        const data=decodeB64Bytes(b64);
        const error=validateTuiImageBytes(data);

        if(error){
            return createDefaultTuiImage(error);
        }

        const view=new DataView(data.buffer, data.byteOffset, data.byteLength);
        let width=view.getUint32(4, true);
        const bytesPerPixel=view.getUint32(8, true);
        let height=view.getUint32(12, true);
        const pixelLength=width*bytesPerPixel*height;
        let pixelData:Uint8Array=data.slice(imageHeaderSize, imageHeaderSize+pixelLength);

        if(options?.cleanEdges??(bytesPerPixel>3?true:false)){
            makeTransparentPixelBorders(pixelData,width,height,bytesPerPixel);
        }

        const targetSize=getTuiImageTargetSize(width,height,options);
        if(targetSize && (targetSize.width!==width || targetSize.height!==height)){
            pixelData=resizeTuiImagePixels(pixelData,width,height,bytesPerPixel,targetSize.width,targetSize.height);
            width=targetSize.width;
            height=targetSize.height;
        }

        return {
            width,
            height,
            bytesPerPixel,
            pixelData,
        };
    }catch(ex){
        return createDefaultTuiImage(ex instanceof Error?ex.message:'Unable to decode TUI image');
    }
}

const decodeB64Bytes=(b64:string):Uint8Array=>{
    const normalized=normalizeB64(b64);

    if(!normalized){
        throw new Error('Empty TUI image data');
    }

    const atobFn=(globalThis as {atob?:(value:string)=>string}).atob;
    let atobError:unknown;

    if(atobFn){
        try{
            const binary=atobFn(normalized);
            const bytes=new Uint8Array(binary.length);

            for(let i=0;i<binary.length;i++){
                bytes[i]=binary.charCodeAt(i);
            }

            return bytes;
        }catch(ex){
            atobError=ex;
        }
    }

    const BufferCtor=(globalThis as any).Buffer;
    if(BufferCtor?.from){
        return new Uint8Array(BufferCtor.from(normalized, 'base64'));
    }

    throw atobError instanceof Error?atobError:new Error('No base64 decoder available');
}

const normalizeB64=(b64:string):string=>{
    const trimmed=b64.trim();
    const commaIndex=trimmed.indexOf(',');
    const value=trimmed.startsWith('data:') && commaIndex>=0?trimmed.slice(commaIndex+1):trimmed;

    return value.replace(/\s+/g,'');
}

const validateTuiImageBytes=(data:Uint8Array):string|undefined=>{
    if(data.length<imageHeaderSize){
        return `Invalid TUI image data. Expected at least ${imageHeaderSize} bytes.`;
    }

    for(let i=0;i<imageHeader.length;i++){
        if(data[i]!==imageHeader[i]){
            return 'Invalid TUI image header.';
        }
    }

    const view=new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width=view.getUint32(4, true);
    const bytesPerPixel=view.getUint32(8, true);
    const height=view.getUint32(12, true);

    if(!width || !height){
        return 'Invalid TUI image dimensions.';
    }

    if(!bytesPerPixel){
        return 'Invalid TUI image bytesPerPixel value.';
    }

    const pixelLength=width*bytesPerPixel*height;
    if(!Number.isSafeInteger(pixelLength)){
        return 'Invalid TUI image pixel data length.';
    }

    if(data.length<imageHeaderSize+pixelLength){
        return `Invalid TUI image pixel data length. Expected ${pixelLength} bytes.`;
    }

    return undefined;
}

const getTuiImageTargetSize=(width:number, height:number, options?:TuiImageConversionOptions):{width:number;height:number}|undefined=>{
    const optionWidth=getTuiImageDimension(options?.width);
    const optionHeight=getTuiImageDimension(options?.height);

    if(!optionWidth && !optionHeight){
        return undefined;
    }

    const targetWidth=optionWidth??Math.max(1,Math.round(width*(optionHeight as number)/height));
    const targetHeight=optionHeight??Math.max(1,Math.round(height*(optionWidth as number)/width));

    return {width:targetWidth,height:targetHeight};
}

const getTuiImageDimension=(value:number|undefined):number|undefined=>{
    if(value===undefined){
        return undefined;
    }

    if(!Number.isFinite(value) || value<=0){
        return undefined;
    }

    return Math.max(1,Math.round(value));
}

const resizeTuiImagePixels=(pixelData:Uint8Array, width:number, height:number, bytesPerPixel:number, targetWidth:number, targetHeight:number):Uint8Array=>{
    const targetPixelLength=targetWidth*targetHeight*bytesPerPixel;
    if(!Number.isSafeInteger(targetPixelLength)){
        throw new Error('Invalid TUI image target pixel data length.');
    }

    const resized=new Uint8Array(targetPixelLength);

    for(let y=0;y<targetHeight;y++){
        const sourceY=Math.min(height-1,Math.floor((y*height)/targetHeight));

        for(let x=0;x<targetWidth;x++){
            const sourceX=Math.min(width-1,Math.floor((x*width)/targetWidth));
            const sourceOffset=((sourceY*width)+sourceX)*bytesPerPixel;
            const targetOffset=((y*targetWidth)+x)*bytesPerPixel;

            for(let b=0;b<bytesPerPixel;b++){
                resized[targetOffset+b]=pixelData[sourceOffset+b] as number;
            }
        }
    }

    return resized;
}

const makeTransparentPixelBorders=(pixelData:Uint8Array, width:number, height:number, bytesPerPixel:number):void=>{
    if(bytesPerPixel<4){
        return;
    }

    const transparentPixels=new Uint8Array(width*height);

    for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
            const pixelIndex=(y*width)+x;
            const offset=pixelIndex*bytesPerPixel;

            transparentPixels[pixelIndex]=pixelData[offset+3]===0?1:0;
        }
    }

    for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
            const pixelIndex=(y*width)+x;

            if(!transparentPixels[pixelIndex]){
                continue;
            }

            for(let ny=Math.max(0,y-1);ny<=Math.min(height-1,y+1);ny++){
                for(let nx=Math.max(0,x-1);nx<=Math.min(width-1,x+1);nx++){
                    const offset=((ny*width)+nx)*bytesPerPixel;

                    pixelData[offset+3]=0;
                }
            }
        }
    }
}

const createDefaultTuiImage=(error:string):SpriteImage=>{
    const width=8;
    const height=8;
    const bytesPerPixel=3;
    const pixelData=new Uint8Array(width*height*bytesPerPixel);

    for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
            const offset=((y*width)+x)*bytesPerPixel;
            const isX=x===y || x===width-y-1;

            pixelData[offset]=isX?255:32;
            pixelData[offset+1]=isX?64:32;
            pixelData[offset+2]=isX?64:32;
        }
    }

    return {
        width,
        height,
        bytesPerPixel,
        pixelData,
        error,
    };
}
