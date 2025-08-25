import { ProviderResult } from "vscode";
import { ConvoMakeExtLabel } from "./ConvoMakeExtLabel";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptions, ConvoMakeExtTreeItemOptionsBase } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtJson extends ConvoMakeExtTreeItem<Record<string,any>>
{

    public constructor(options:ConvoMakeExtTreeItemOptions<any>){
        super({
            ...options,
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return getConvoMakeExtJsonChildren(this.id??'',this.obj,this.getBaseParams())
    }
}

export const getConvoMakeExtJsonChildren=(id:string,obj:any,baseParams:Omit<ConvoMakeExtTreeItemOptionsBase<any>,'obj'>):ProviderResult<any[]>=>
{
    const children:(ConvoMakeExtJson|ConvoMakeExtLabel)[]=[];
    if(!obj || (typeof obj !== 'object')){
        return children;
    }

    const keys=Object.keys(obj);
    keys.sort();
    for(const key of keys){
        const v=(obj as any)[key];
        if(v===undefined || v===null){
            continue;
        }
        if(typeof v === 'object'){
            children.push(new ConvoMakeExtJson({
                ...baseParams,
                id:`${id}::${key}`,
                name:key,
                type:'json',
                obj:v,
            }))
        }else{
            children.push(new ConvoMakeExtLabel({
                ...baseParams,
                id:`${id}::${key}`,
                name:`${key} = ${v}`,
                type:'label',
                obj:v,
            }))
        }
    }

    return children;

}
