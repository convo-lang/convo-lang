import { SpriteImage } from "./tui-types.js";

const imageHeaderSize=32;
const imageHeader=[0x43, 0x6f, 0x6e, 0x76];

/**
 * Converts a base64 string into a SpriteImage.* Data layout:
 * [header - 4 bytes][width - 4 bytes][bytesPerByte - 4 bytes][height - 4 bytes][reserved - 16 bytes][pixel data - (width*bytesPerByte*height) bytes]
 * header = x43 x6f x6e x76
 *
 * If invalid data is supplied a default (X) image will be supplied with and the `error` property of the image will be populated.
 */
export const convertB64TuiImage=(b64:string):SpriteImage=>{
    try{
        const data=decodeB64Bytes(b64);
        const error=validateTuiImageBytes(data);

        if(error){
            return createDefaultTuiImage(error);
        }

        const view=new DataView(data.buffer, data.byteOffset, data.byteLength);
        const width=view.getUint32(4, true);
        const bytesPerPixel=view.getUint32(8, true);
        const height=view.getUint32(12, true);
        const pixelLength=width*bytesPerPixel*height;

        return {
            width,
            height,
            bytesPerPixel,
            pixelData:data.slice(imageHeaderSize, imageHeaderSize+pixelLength),
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
