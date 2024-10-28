import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as Path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { enumProjects } from './enum-projects.mjs';

// If paths to the build output for packages will be used.
// This is useful for local integration testing with projects before publishing
const local=process.argv.includes('--local');
const force=process.argv.includes('--force');

const deps=[];
const devDeps=[];

enumProjects({publicOnly:true},({name,project,pkg})=>{

    if(!project.data?.targets?.publish){
        return;
    }

    if(local){
        const output=project.data?.targets?.build?.options?.outputPath;
        if(!output){
            throw new Error(`unable to get output path for ${name}`);
        }
        const path=Path.join(process.cwd(),output);
        if(pkg.forDev){
            devDeps.push(path);
        }else{
            deps.push(path);
        }
    }else{
        if(pkg.forDev){
            devDeps.push(`${pkg.name}@${pkg.version}`);
        }else{
            deps.push(`${pkg.name}@${pkg.version}`);
        }
    }

});

if(devDeps.length){
    console.log(`npm i ${devDeps.join(' ')} --save-dev${force?' --force':''}`);
}
if(deps.length){
    console.log(`npm i ${deps.join(' ')}${force?' --force':''}`);
}
