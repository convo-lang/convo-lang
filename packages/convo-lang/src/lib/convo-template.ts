import { getRawConvoValueAsString } from "./convo-template-types.js";


export const convoScript=(strings:TemplateStringsArray,...values:any[]):string=>{

    if(strings.length===1){
        return (strings[0] as string).trim();
    }

    const strAry:string[]=[(strings[0] as string)];

    for(let i=1;i<strings.length;i++){

        const value=getRawConvoValueAsString(values[i-1],true);
        if(value){
            strAry.push(value);
        }


        strAry.push(strings[i] as string);
    }

    return strAry.join('').trim();
}
