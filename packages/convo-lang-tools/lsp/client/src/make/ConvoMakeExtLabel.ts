import { ProviderResult } from "vscode";
import { ConvoMakeExtTreeItem, ConvoMakeExtTreeItemOptions } from "./ConvoMakeExtTreeItem";



export class ConvoMakeExtLabel extends ConvoMakeExtTreeItem<any>
{

    public constructor(options:ConvoMakeExtTreeItemOptions<any>){
        super({
            ...options,
            noChildren:true,
        });
    }

    public getChildren():ProviderResult<any[]>
    {
        return []
    }
}

