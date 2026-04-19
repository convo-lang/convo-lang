import {build} from 'bun';

const rootDir=new URL('.',import.meta.url);
const entryPath=new URL('./src/main.ts',rootDir);
const outDir=new URL('./dist/',rootDir);

await build({
    entrypoints:[entryPath.pathname],
    outdir:outDir.pathname,
    target:'browser',
    format:'cjs',
    minify:true,
    sourcemap:'none',
    naming:'main.js',
    external:['obsidian'],
});

console.log(`Built Obsidian plugin bundle to ${outDir.pathname}`);
