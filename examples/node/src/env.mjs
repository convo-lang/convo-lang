import { accessSync, readFileSync } from "fs"

export const loadEnv=(paths=[".env",".env.development"])=>{
    if(!Array.isArray(paths)){
        paths=[paths];
    }
    for(const path of paths){
        try{
            accessSync(path);
        }catch{
            continue;
        }
        const lines=readFileSync(path).toString().split('\n');
        for(let line of lines){
            line=line.trim();
            if(!line || line.startsWith('#')){
                continue;
            }
            const i=line.indexOf('=');
            if(i===-1){
                continue;
            }
            const name=line.substring(0,i).trim();
            const value=line.substring(i+1).trim();
            process.env[name]=value;
            console.log(`Loaded ${name} from ${path} into env`);
        }
    }

}
