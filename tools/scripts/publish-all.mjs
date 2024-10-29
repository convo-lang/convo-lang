import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as Path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { enumProjects } from './enum-projects.mjs';

const _publishScope=process.env['NPM_PUBLISH_SCOPE'];
if(!_publishScope){
    throw new Error('NPM_PUBLISH_SCOPE env var not defined')
}
const publishScope=_publishScope+'/';

console.log('NPM_TOKEN',process.env['NPM_TOKEN'])

const dryRun=process.argv.includes('--dry-run');

let includeProjects=null;
for(let i=2;i<process.argv.length;i++){
    if(process.argv[i]==='--include'){
        if(!includeProjects){
            includeProjects=[];
        }
        includeProjects.push(process.argv[i+1]);
    }
}

const publishMap={};

enumProjects({publicOnly:true},({name,project,pkg})=>{
    if( !project.data?.targets?.publish ||
        (includeProjects && !includeProjects.includes(name)) ||
        !pkg.name.startsWith(publishScope)
    ){
        return;
    }

    publishMap[name]=pkg;

});

console.log(publishMap);


(async ()=>{
    for(const name in publishMap){

        const pkg=publishMap[name];

        console.log(`https://registry.npmjs.org/${pkg.name}`)
        const r=await fetch(`https://registry.npmjs.org/${pkg.name}`);
        const isNew=r.status===404;

        if(isNew){
            console.log(`new package ${pkg.name}@${pkg.version}`);
            continue;
        }

        if(!r.ok){
            throw new Error(`unable to get npm package for ${pkg.name}`)
        }

        const info=await r.json();

        if(info.versions[pkg.version]){
            delete publishMap[name];
            console.log(`${pkg.name}@${pkg.version} already published`);
            continue;
        }

        const distTags=info['dist-tags']
        if(distTags){
            for(const e in distTags){
                if(distTags[e]===pkg.version){
                    delete publishMap[name];
                    console.log(`${pkg.name}@${pkg.version} already published`);
                    continue;
                }
            }
        }
    }

    for(const name in publishMap){

        const pkg=publishMap[name];
        console.log(`Publishing ${pkg.name}@${pkg.version}`);
        console.log(`npx nx run ${name}:publish --ver ${pkg.version} --tag latest`);
        if(dryRun){
            console.log(`Dry run, skipping real publish`)
        }else{
            execSync(`npx nx run ${name}:publish --ver ${pkg.version} --tag latest`);
        }

    }

    console.log('done')
})();
