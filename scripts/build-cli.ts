#!/usr/bin/env bun

import { readFile, stat, writeFile } from "fs/promises";
import path from "path";

process.chdir(path.join(import.meta.dirname,'../packages/cli'));

const archList=[
    'linux-x64',
    'linux-arm64',
    'windows-x64',
    'windows-arm64',
    'darwin-x64',
    'darwin-arm64',
    'linux-x64-musl',
    'linux-arm64-musl',
] as const;

for(const arch of archList){
    console.log(`Building - ${arch}`);
    const outfile=`../cli-${arch}/bin/convo${arch.startsWith('windows')?'.exe':''}`;
    await Bun.build({
        entrypoints:['../convo-lang-cli/src/lib/convo-entry.ts'],
        compile:{
            outfile,
            target:`bun-${arch}`,
        },
        minify:true,
    });
    const info=await stat(outfile);
    console.log(`packages/${outfile.substring(3)} ${Math.ceil(info.size/1000000).toLocaleString()}mb`);
}

const pkg=JSON.parse((await readFile('./package.json')).toString());
if(pkg.optionalDependencies){
    const version=pkg.version;
    for(const e in pkg.optionalDependencies){
        if(e.startsWith('@convo-lang/cli-')){
            pkg.optionalDependencies[e]=version;
        }
    }
    await writeFile('./package.json',JSON.stringify(pkg,null,4));
    console.log(`Updated optionalDependencies versions to ${version}`);
}

console.log('CLI build complete')