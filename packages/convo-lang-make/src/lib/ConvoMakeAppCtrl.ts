import { ConvoMakeApp } from "@convo-lang/convo-lang";
import { createPromiseSource, delayAsync, DisposeContainer, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoMakeAppTargetRef, ConvoMakeShellProc } from "./convo-make-types.js";
import { ConvoMakeAppViewer } from "./ConvoMakeAppViewer.js";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl.js";

export interface ConvoMakeAppCtrlOptions
{
    app:ConvoMakeApp;
    parent:ConvoMakeCtrl;
}

export class ConvoMakeAppCtrl
{
    public readonly app:ConvoMakeApp;
    public readonly parent:ConvoMakeCtrl;

    private readonly _running:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get runningSubject():ReadonlySubject<boolean>{return this._running}
    public get running(){return this._running.value}

    public constructor({
        app,
        parent,
    }:ConvoMakeAppCtrlOptions){
        this.app=app;
        this.parent=parent;
    }

    private readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
        this._proc?.dispose();
    }

    private readonly readySource=createPromiseSource();

    private _proc?:ConvoMakeShellProc;

    private _runPromise:Promise<void>|undefined;
    public runAsync():Promise<void>{
        return this._runPromise??(this._runPromise=this._runAsync())
    }

    private async _runAsync()
    {
        const shell=this.parent.options.shell;
        if(!this.app.startCommand || !shell || this.isDisposed){
            this.readySource.resolve(undefined);
            return;
        }

        this._proc=shell.execAsync(this.app.startCommand);

        if(this.app.port){

            while(true){

                const open=await shell.isPortOpenAsync(this.app.port);
                if(open){
                    break;
                }

                await delayAsync(500);
            }

        }


        this.readySource.resolve(undefined);

        await this._proc.exitPromise;


    }

    public async getViewerAsync(reviewRequest:ConvoMakeAppTargetRef):Promise<ConvoMakeAppViewer>{
        this.runAsync();
        await this.readySource.promise;

        return new ConvoMakeAppViewer(this,reviewRequest);
    }
}

