import { appendFile } from "node:fs/promises";

export const log=(...values:any[])=>{
    writeOutputAsync(values.map(v=>{
        try{
            if(typeof v === 'string'){
                return v;
            }
            return JSON.stringify(v);
        }catch{
            return v+'';
        }
    }).join(' '))
}

const queue:string[]=[];
let writing=false;
const writeOutputAsync=async (value:string)=>{
    if(writing){
        queue.push(value);
        return;
    }
    try{
        writing=true;
        if(queue.length){
            value=queue.splice(0,queue.length).join('\n')+'\n'+value;
        }
        await appendFile('./log',value+'\n');
    }catch(ex){
        process.stdout.write('Error writing to log');
    }finally{
        writing=false;
        if(queue.length){
            const value=queue.splice(0,queue.length).join('\n');
            writeOutputAsync(value);
        }
    }
}