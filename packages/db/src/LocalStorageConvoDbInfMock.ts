import { getObjKeyCount } from "@iyio/common";
import { LocalStorageConvoDbInf } from "./LocalStorageConvoDb.js";

export class LocalStorageConvoDbInfMock implements LocalStorageConvoDbInf
{
    
    public readonly data:Record<string,string>={};

    public get length(){return getObjKeyCount(this.data)}

    public key(index:number):string|null
    {
        let i=0;
        for(const key in this.data){
            if(index===i){
                return key;
            }
            i++;
        }
        return null;
    }

    public getItem(key:string):string|null{
        return this.data[key]??null;
    }

    public setItem(key:string, value:string):void{
        this.data[key]=value;
    }

    public removeItem(key:string):void{
        delete this.data[key];
    }

    
}