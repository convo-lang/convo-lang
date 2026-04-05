import { vfs, VfsCtrl } from "@iyio/vfs";
import { Conversation } from "../Conversation.js";
import { ConvoCompletion } from "../convo-types.js";
import { ConvoWorker } from "./ConvoWorker.js";

export interface ConvoWorkerCtxOptions
{
    basePath?:string;
    dryRun?:boolean;
    disableThreadLogging?:boolean;
    vfs?:VfsCtrl;
}

export class ConvoWorkerCtx
{
    public readonly basePath:string;

    public readonly dryRun:boolean;

    public readonly vfs:VfsCtrl;

    public readonly disableThreadLogging:boolean;

    public constructor({
        basePath='.',
        dryRun=false,
        disableThreadLogging=false,
        vfs:vfsProp=vfs(),
    }:ConvoWorkerCtxOptions){
        this.basePath=basePath;
        this.dryRun=dryRun;
        this.disableThreadLogging=disableThreadLogging;
        this.vfs=vfsProp;
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
    }

    public log(...args:any[]){
        console.log(...args);
    }

    public createConversationFor(worker?:ConvoWorker){
        return new Conversation({disableAutoFlatten:true});
    }

    public async writeAsync(path:string,content:Uint8Array|Blob|Blob[]|string){
        if(this.dryRun){
            this.log(`dryRun write - ${path}`);
            return;
        }
        await this.vfs.writeBufferAsync(path,content);
    }

    public async writeJsonAsync(path:string,value:any){
        return await this.writeAsync(path,JSON.stringify(value));
    }

    public async writeResponse(path:string,response:ConvoCompletion){
        const lastReturnValue=response.returnValues?response.returnValues[response.returnValues.length-1]:undefined;
        if(lastReturnValue!==undefined && lastReturnValue!==null){
            return await this.writeJsonAsync(path,lastReturnValue);
        }else{
            return await this.writeAsync(path,response.message?.content??'');
        }
    }

    public async readAsync(path:string){
        return await this.vfs.readStringAsync(path);
    }

    public async appendAsync(path:string,content:string){
        return await this.vfs.appendStringAsync(path,content);
    }

    public async existsAsync(path:string){
        return await this.vfs.getItemAsync(path)?true:false;
    }
}
