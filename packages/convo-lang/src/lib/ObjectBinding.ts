import { DisposeCallback, ObjWatchEvt, stopWatchingObj, watchObj } from "@iyio/common";

export interface ObjectBindingOptions<T extends Record<string,any>>
{
    obj:T;
}

export abstract class ObjectBinding<T extends Record<string,any>>
{
    public readonly obj:T;
    private readonly disposeListener:DisposeCallback;

    public constructor({
        obj,
    }:ObjectBindingOptions<T>){
        this.obj=obj;
        const watcher=watchObj(obj);
        this.disposeListener=watcher.addListenerWithDispose((_,evt)=>{
            this.sync(evt);
        });
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this._dispose();
        this.disposeListener();
        stopWatchingObj(this.obj);
    }

    protected _dispose()
    {

    }

    public abstract sync(evt:ObjWatchEvt<T>):void;
}

export class FnObjectBinding<T extends Record<string,any>> extends ObjectBinding<T>
{
    private readonly _sync:(evt:ObjWatchEvt<T>)=>void;
    public constructor(obj:T,sync:(evt:ObjWatchEvt<T>)=>void)
    {
        super({obj});
        this._sync=sync;
        const d=this.deferredEvt;
        if(d){
            this.deferredEvt=undefined;
            sync(d);
        }
    }

    private deferredEvt:ObjWatchEvt<T>|undefined;
    public override sync(evt: ObjWatchEvt<T>): void {
        if(this._sync){
            this._sync(evt);
        }else{
            this.deferredEvt=evt;
        }
    }
}