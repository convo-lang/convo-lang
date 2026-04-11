#!/usr/bin/env bun
import { writeFile } from "fs/promises";
import path from "path";

process.chdir(path.join(import.meta.dir,'..'));

console.log('DIR',process.cwd());

const downloadSrcAsync=async (url:string,saveTo:string)=>{
    const r=await fetch(url);
    const src=`export const src=${JSON.stringify(await r.text())};`;
    await writeFile(saveTo,src);
    console.log(`${src.length} bytes written to ${saveTo}`);
}

await Promise.all([
    downloadSrcAsync('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js','packages/convo-lang-react/src/lib/bundled-packages/onnxruntime-src.ts'),
    downloadSrcAsync('https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@latest/dist/bundle.min.js','packages/convo-lang-react/src/lib/bundled-packages/vad-src.ts'),
]);



