import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as Path from 'path';
import chalk from 'chalk';
import { enumProjects } from './enum-projects.mjs'
import devkit from '@nrwl/devkit';

const { readCachedProjectGraph } = devkit;

const [, , version] = process.argv;

const graph = readCachedProjectGraph();

const addVersions=(a,b)=>{
    const aAry=a.split('.').map(n=>Number(n));
    const bAry=b.split('.').map(n=>Number(n));
    return `${(aAry[0]??0)+(bAry[0]??0)}.${(aAry[1]??0)+(bAry[1]??0)}.${(aAry[2]??0)+(bAry[2]??0)}`
}

enumProjects({publicOnly:true},({name,version:v,pkg,packageJson})=>{

    if(pkg.iyioSetVersion===false){
        console.log(`${name} opts out of auto setting version`);
        return;
    }

    if(version.startsWith('+')){
        pkg.version=addVersions(v,version.substring(1));
    }else{
        pkg.version=version;
    }

    console.log(`${name} ${v} -> ${pkg.version}`);

    writeFileSync(packageJson,JSON.stringify(pkg,null,4)+'\n');
})
