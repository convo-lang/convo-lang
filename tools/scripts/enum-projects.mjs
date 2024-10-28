import devkit from '@nrwl/devkit';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as Path from 'path';
import chalk from 'chalk';

const { readCachedProjectGraph } = devkit;

/**
 *
 * @param {{publicOnly:boolean;}} options
 * @param {(info:{name:string,project:any,root:string,pkg:any,version:string,graph:any,packageJson:string})=>boolean|void} callback
 */
export const enumProjects=(options,callback)=>{
    const graph = readCachedProjectGraph();

    for(const e in graph.nodes){

        const project=graph.nodes[e];

        const root=project.data.root;

        if(!root){
            console.warn(`no root for ${e}`);
            continue;
        }

        const packageJson=Path.join(root,'package.json');

        if(!existsSync(packageJson)){
            continue;
        }

        const pkg=JSON.parse(readFileSync(packageJson).toString());

        if(pkg.private && options.publicOnly){
            console.log(`Skipping private package ${e}`);
            continue;
        }

        if(!pkg.name){
            console.log(`Skipping package with no name - ${e}`);
            continue;
        }

        if(!pkg.version){
            console.log(`Skipping package with no version - ${e}`);
            continue;
        }

        const version=pkg.version;

        if(callback({name:e,project,root,pkg,version,graph,packageJson})===false){
            break;
        }

    }
}
