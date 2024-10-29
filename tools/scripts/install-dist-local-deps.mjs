import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as Path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { enumProjects } from './enum-projects.mjs';

const rootDir=process.cwd();

const [,,...targets]=process.argv;

//npx nx run-many --target=build

if(targets.length){
    enumProjects({publicOnly:true},({name,project})=>{
        if(!project.data?.targets?.publish || !targets.includes(name)){
            return;
        }
        const cmd=`npx nx run ${name}:build`
        console.log(cmd)
        execSync(cmd,{encoding:'utf-8'});
    });
}else{
    const cmd='npx nx run-many --target=build --verbose'
    console.log(cmd)
    execSync(cmd,{encoding:'utf-8'});
}



enumProjects({publicOnly:true},({name,project})=>{

    if(!project.data?.targets?.publish || (targets.length && !targets.includes(name))){
        return;
    }


    const output=project.data?.targets?.build?.options?.outputPath;
    if(!output){
        return;
    }
    const pkgPath=Path.join(output,'package.json')
    const pkg=JSON.parse(readFileSync(pkgPath).toString());

    let updated=false;
    const installs=[];

    const enumDeps=(deps)=>{
        for(const e in deps){
            if(!e.startsWith('@iyio/')){
                continue;
            }
            if(deps[e].includes('/')){
                console.log(` ${name}::${e} -> ${deps[e]}`);
                continue;
            }
            const [,depName]=e.split('/');

            const depPath=Path.join(`dist/packages/${depName}`);
            if(!existsSync(depPath)){
                console.log(`Skipping dep because output dir does not exist. depPath=${depPath}, pkg=${e}`);
                continue;
            }
            const old=deps[e];
            //deps[e]=`file:../${depName}`;
            console.log(`*${name}::${e}@${old} -> file:../${depName}`);
            updated=true;
            installs.push(Path.join(rootDir,'dist/packages',depName))
        }
    }

    if(pkg.dependencies){
        enumDeps(pkg.dependencies);
    }
    if(pkg.peerDependencies){
        enumDeps(pkg.peerDependencies);
    }

    if(!installs.length){
        return;
    }

    console.log(`Updating ${name}`);

    process.chdir(output);

    const cmd=`npm i ${installs.join(' ')}`
    console.log(cmd)
    execSync(cmd,{encoding:'utf-8'});

    process.chdir(rootDir);


});
