import { ThemeColor, ThemeIcon } from "vscode";
import { ConvoMakeExtItemMetadata } from "./convo-make-ext-types.js";
import { ConvoMakeExtTarget } from "./ConvoMakeExtTarget.js";
import { ConvoMakeExtTreeItem } from "./ConvoMakeExtTreeItem.js";

const metadataKey=Symbol('ConvoExtMetadata');

export const getConvoExtMakeMetadata=(obj:any):ConvoMakeExtItemMetadata=>
{
    return obj[metadataKey]??(obj[metadataKey]={});
}

export const getConvoExtMakeMetadataValue=<K extends keyof ConvoMakeExtItemMetadata>(obj:any,key:K):ConvoMakeExtItemMetadata[K]=>
{
    return getConvoExtMakeMetadata(obj)[key];
}

export const getConvoExtMakeMetadataOrCreateValue=<K extends keyof ConvoMakeExtItemMetadata>(obj:any,key:K,create:()=>Required<ConvoMakeExtItemMetadata>[K]):Required<ConvoMakeExtItemMetadata>[K]=>
{
    const metadata=getConvoExtMakeMetadata(obj);
    let v=metadata[key];
    if(v===undefined){
        metadata[key]=v=create();
    }
    return v as any;
}

export const createConvoExtIcon=(icon:string)=>{
    return new ThemeIcon(
        icon,
        icon==='check'?new ThemeColor('charts.green'):undefined
    )
}


export const getAllTargetsFromConvoMakeExtTreeItemAsync=async (item:ConvoMakeExtTreeItem<any>,onlyExists:boolean)=>{
    const targets:ConvoMakeExtTarget[]=[];
    await _getAllTargetsFromConvoMakeExtTreeItemAsync(item,onlyExists,targets);
    return targets;
}

const _getAllTargetsFromConvoMakeExtTreeItemAsync=async (item:ConvoMakeExtTreeItem<any>,onlyExists:boolean,targets:ConvoMakeExtTarget[])=>{
    if((item instanceof ConvoMakeExtTarget) && (onlyExists?item.obj.outExists:true)){
        targets.push(item);
    }

    const children=await item.getChildren();

    if(children){
        for(const child of children){
            await _getAllTargetsFromConvoMakeExtTreeItemAsync(child,onlyExists,targets);
        }
    }
}
