import { ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoMakeStage } from "./convo-make-types";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl";

export interface ConvoMakeStageCtrlOptions
{
    makeCtrl:ConvoMakeCtrl;
    stage:ConvoMakeStage;
}

export class ConvoMakeStageCtrl
{
    public readonly makeCtrl:ConvoMakeCtrl;
    public readonly stage:ConvoMakeStage;

    private readonly _isReady:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isReadySubject():ReadonlySubject<boolean>{return this._isReady}
    public get isReady(){return this._isReady.value}

    public constructor({
        makeCtrl,
        stage,
    }:ConvoMakeStageCtrlOptions){
        this.makeCtrl=makeCtrl;
        this.stage=stage;
    }

    public getBlocked():ConvoMakeStageCtrl[]{
        const blocked:ConvoMakeStageCtrl[]=[];
        for(const stage of this.makeCtrl.stages){
            if(stage===this){
                continue;
            }
            if( stage.stage.deps?.some(d=>d===this.stage.name) ||
                this.stage.blocks?.some(b=>b===stage.stage.name)
            ){
                blocked.push(stage);
            }
        }
        return blocked;
    }

    public getDependencies():ConvoMakeStageCtrl[]{
        const deps:ConvoMakeStageCtrl[]=[];
        for(const stage of this.makeCtrl.stages){
            if(stage===this){
                continue;
            }
            if( this.stage.deps?.some(d=>d===stage.stage.name) ||
                stage.stage.blocks?.some(b=>b===this.stage.name)
            ){
                deps.push(stage);
            }
        }
        return deps;
    }

    public checkReady(){
        if(this.isReady){
            return;
        }
        const deps=this.getDependencies();
        if(!deps.length || deps.every(d=>d.isReady && d.areTargetsReady())){

            this._isReady.next(true);
            this.tryBuildTargets();

            const blocks=this.getBlocked();
            for(const b of blocks){
                if(!b.isReady){
                    b.checkReady();
                }
            }


        }
    }

    public areTargetsReady():boolean{
        for(const target of this.makeCtrl.targets){
            if(target.target.stage===this.stage.name && target.state!=='complete'){
                return false;
            }
        }
        return true;
    }

    public tryBuildTargets()
    {
        for(const target of this.makeCtrl.targets){
            if(target.target.stage===this.stage.name){
                target.buildAsync();
            }
        }
    }

}
