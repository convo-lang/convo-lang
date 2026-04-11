import { delayAsync } from '@iyio/common';
import type { MicVAD, RealTimeVADOptions } from '@ricky0123/vad-web/dist/real-time-vad.js';

type ExportType={
    new:(options?: Partial<RealTimeVADOptions>)=>Promise<MicVAD>
}

let importPromise:Promise<ExportType>|undefined;

export const importVadWebAsync=():Promise<ExportType>=>{
    return importPromise??(importPromise=_importVadWebAsync());
}

const _importVadWebAsync=async ():Promise<ExportType>=>{

    const src=(await import('./vad-src.js')).src;

    const script=globalThis.document?.createElement('script');
    if(!script){
        throw new Error('document undefined. Browser env expected');
    }

    script.setAttribute('type','module');
    script.textContent=src;
    globalThis.document.head.append(script);

    const start=Date.now();
    while(true){
        const vad=(globalThis.window as any).vad?.MicVAD;
        if(!vad){
            await delayAsync(15);
            continue;
        }
        if(Date.now()-start>30000){
            importPromise=undefined;
            throw new Error('Loading VAD timed out');
        }
        return vad;
    }
}