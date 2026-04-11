const underReg=/[_-]+([a-z]?)/g;
const snakeReg=/([a-z])([A-Z]+)/g;
const uppersReg=/(^| )(api)( |$)/g;

export const topLevelDomainReg=/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i;
export const isValidTopLevelDomain=(domain:string)=>topLevelDomainReg.test(domain);

export const formatDisplayName=(name:any):string=>{
    if(typeof name !== 'string'){
        name=name+'';
    }

    if(isValidTopLevelDomain(name)){
        return name;
    }

    name=(name as string)
        .replace(underReg,(_,c:string)=>` ${c?c.toUpperCase():''}`)
        .replace(snakeReg,(_,a:string,b:string)=>`${a} ${b}`)
        .replace(uppersReg,(_,s:string,w:string,e:string)=>`${s}${w.toUpperCase()}${e}`);
    
    return (name as string).substring(0,1).toUpperCase()+(name as string).substring(1);
}

