import { asArray } from "@iyio/common";
import { readFileAsStringAsync } from "@iyio/node-common";

export const defaultConvoCliApiPort=7222;

export const defaultConvoCliConfigFile='~/.config/convo/convo.json';

export const loadEnvFileAsync=async (path:string|string[])=>{
    const ary=asArray(path);
    for(const path of ary){
        const value=(await readFileAsStringAsync(path)).trim();
        const lines=value.split('\n');
        const loaded:string[]=[];
        for(const l of lines){
            const line=l.trim();
            if(!line || line.startsWith('#')){
                continue;
            }
            const i=line.indexOf('=');
            if(i===-1){
                continue;
            }
            const key=line.substring(0,i).trim();
            loaded.push(key);
            process.env[key]=line.substring(i+1).trim();
        }

        if(loaded.length){
            console.log(`${path}:${loaded.join(', ')}`);
        }

    }
}
