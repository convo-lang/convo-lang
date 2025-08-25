import { ConvoMakeBuildEvt, ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import { pushBehaviorSubjectAry, ReadonlySubject } from "@iyio/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";

export class ConvoExt
{
    private readonly _makeCtrls:BehaviorSubject<ConvoMakeCtrl[]>=new BehaviorSubject<ConvoMakeCtrl[]>([]);
    public get makeCtrlsSubject():ReadonlySubject<ConvoMakeCtrl[]>{return this._makeCtrls}
    public get makeCtrls(){return this._makeCtrls.value}
    public set makeCtrls(value:ConvoMakeCtrl[]){
        if(value==this._makeCtrls.value){
            return;
        }
        this._makeCtrls.next(value);
    }

    private readonly _onBuildEvent=new Subject<ConvoMakeBuildEvt>();
        public get onBuildEvent():Observable<ConvoMakeBuildEvt>{return this._onBuildEvent}

    public addMakeCtrl(ctrl:ConvoMakeCtrl)
    {
        pushBehaviorSubjectAry(this._makeCtrls,ctrl);
        this.bindMakeCtrl(ctrl);
    }

    private bindMakeCtrl(ctrl:ConvoMakeCtrl){

        const sub=ctrl.onBuildEvent.subscribe((evt:ConvoMakeBuildEvt)=>{
            switch(evt.type){
                case 'ctrl-dispose':
                    sub.unsubscribe();
                    break;
            }
            this._onBuildEvent.next(evt);
        })
    }
}
