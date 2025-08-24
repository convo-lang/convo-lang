import { AppendConvoOptions, Conversation, convoMakeStateDir, ConvoMakeTarget, ConvoMakeTargetDeclaration, convoVars, defaultConvoMakeStageName, escapeConvo } from "@convo-lang/convo-lang";
import { createPromiseSource, DisposeContainer, getDirectoryName, joinPaths, normalizePath, ReadonlySubject, strHashBase64Fs } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { convoMakeOutputTypeName, convoMakeTargetHasProps, getConvoMakeInputSortKey, getConvoMakeTargetInHash } from "./convo-make-lib";
import { getDefaultConvoMakeTargetSystemMessage } from "./convo-make-prmopts";
import { ConvoMakeAppTargetRef, ConvoMakePassUpdate, ConvoMakeTargetState } from "./convo-make-types";
import { ConvoMakeAppViewer } from "./ConvoMakeAppViewer";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl";

export interface ConvoMakeTargetCtrlOptions
{
    makeCtrl:ConvoMakeCtrl;
    target:ConvoMakeTarget;
    targetDeclaration:ConvoMakeTargetDeclaration;
    parent?:ConvoMakeTargetCtrl;
}

interface Append{
    content:string;
    options?:AppendConvoOptions;
}


export class ConvoMakeTargetCtrl
{
    public readonly makeCtrl:ConvoMakeCtrl;
    public readonly parent?:ConvoMakeTargetCtrl;
    public readonly target:ConvoMakeTarget;
    public readonly targetDeclaration:ConvoMakeTargetDeclaration;
    public readonly cacheFile:string;
    public readonly convoFile:string;
    public readonly imageFile:string;
    public readonly metaOutBase:string;
    public readonly outPath:string;
    public readonly conversation:Conversation;
    public readonly appRef?:ConvoMakeAppTargetRef;

    private readonly _output:BehaviorSubject<string|undefined>=new BehaviorSubject<string|undefined>(undefined);
    public get outputSubject():ReadonlySubject<string|undefined>{return this._output}
    public get output(){return this._output.value}

    private readonly _state:BehaviorSubject<ConvoMakeTargetState>=new BehaviorSubject<ConvoMakeTargetState>('waiting');
    public get stateSubject():ReadonlySubject<ConvoMakeTargetState>{return this._state}
    public get state(){return this._state.value}

    private readonly _contentReady:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get contentReadySubject():ReadonlySubject<boolean>{return this._contentReady}
    public get contentReady(){return this._contentReady.value}

    public constructor({
        makeCtrl,
        target,
        targetDeclaration,
        parent,
    }:ConvoMakeTargetCtrlOptions){
        this.makeCtrl=makeCtrl;
        this.target=target;
        this.targetDeclaration=targetDeclaration;
        this.parent=parent;
        this.outPath=normalizePath(joinPaths(this.makeCtrl.options.dir,this.target.out));
        const metaOutBase=normalizePath(joinPaths(
            this.makeCtrl.options.dir,
            convoMakeStateDir,
            this.target.stage??defaultConvoMakeStageName,
            this.target.out
        )).replace(/~/g,'~~').replace(/\*/g,'~star~');
        this.metaOutBase=metaOutBase;
        this.cacheFile=metaOutBase+'.~.convo-hash';
        this.convoFile=metaOutBase+'.~.convo';
        this.imageFile=metaOutBase+'.~.convo-screenshot.png';
        this.conversation=new Conversation({disableAutoFlatten:true});
        this.conversation.unregisteredVars[convoVars.__cwd]=getDirectoryName(this.outPath);
        this.conversation.unregisteredVars[convoVars.__mainFile]=this.outPath;
        this.appRef=makeCtrl.getAppRef(target);

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
        this.buildPromiseSource.resolve();
        this.disposables.dispose();
        if(this.state!=='complete'){
            this._state.next('cancelled');
        }
    }

    public async appendAsync(append:Append|Append[]){
        if(Array.isArray(append)){
            for(const a of append){
                this.conversation.append(a.content,a.options);
            }
        }else{
            this.conversation.append(append.content,append.options);
        }
        if(!this.isDisposed && !this.makeCtrl.options.dryRun && !this.makeCtrl.options.echoMode){
            await this.writeConvoOutputAsync(this.conversation.convo);
        }
    }

    private async writeConvoOutputAsync(outConvo:string){
        console.log('hio 👋 👋 👋 write convo out',this.convoFile);
        await this.makeCtrl.options.vfsCtrl.writeStringAsync(this.convoFile,outConvo);
    }

    public async checkReadyAsync()
    {
        if(!this.target.in.every(i=>i.ready) || this.contentReady){
            return;
        }
        const ready=await this.isUpToDateAsync();
        if(ready){
            this._contentReady.next(true);
        }
    }

    private buildPromiseSource=createPromiseSource<void>();

    public buildAsync():Promise<void>{
        this.tryBuildAsync();
        return this.buildPromiseSource.promise;
    }

    private isBuilding=false;

    private getListOutput()
    {
        const listIns=this.target.in.filter(t=>t.listIndex!==undefined && t.ready);
        if(listIns.length===0){
            return undefined;
        }
        return listIns.map(t=>t.hash??'').join('\n');
    }

    private async tryBuildAsync(){

        if(this.isBuilding || this.isDisposed){
            return;
        }

        if(this.target.in.some(i=>!i.ready || (i.path && !this.makeCtrl.areTargetDepsReady(this.target.stage,i.path)))){
            this.commit('skipped',{addSkipCount:1});
            return;
        }

        this.isBuilding=true;
        this._state.next('building');

        if(this.target.outFromList){
            const children=this.makeCtrl.targets.filter(t=>t.parent===this);
            await Promise.all(children.map(t=>t.buildAsync()));
            this.writeOutputAsync(this.getListOutput()??'');
            this.commit('complete',{addForked:1});
            return;
        }

        const upToDateContent=await this.isUpToDateAsync();
        let continueConvo:string|undefined;
        if(upToDateContent){
            console.log('hio 👋 👋 👋 NO changes ',this.outPath);
            if(this.makeCtrl.options.continueReview && this.target.review){
                try{
                    continueConvo=await this.makeCtrl.options.vfsCtrl.readStringAsync(this.convoFile);
                }catch{}
            }
            if(!continueConvo){
                continueConvo=undefined;
            }

            if(continueConvo===undefined){
                this.commit('complete',{addCachedCount:1});
                return;
            }
        }
        console.log('hio 👋 👋 👋 start build ',this.outPath);

        if(this.makeCtrl.options.echoMode){
            const output=this.target.in.map(t=>t.convo??'').join('\n\n');
            await this.writeOutputAsync(output);
            this.commit('complete',{addGenCount:1});
            return;
        }

        const initConvo:Append[]=[];

        if(this.target.model){
            initConvo.push({content:`> define\n__model=${JSON.stringify(this.target.model)}`.trim()})
        }

        if(this.target.outType){
            initConvo.push({content:(
                `> define\n${convoMakeOutputTypeName}=${this.target.outType}\n${
                convoVars.__defaultResponseType}="${convoMakeOutputTypeName}"`
            )})
        }

        initConvo.push({
            content:getDefaultConvoMakeTargetSystemMessage(this.target),
        });
        for(const i of this.target.in){
            if(!i.convo){
                continue;
            }
            initConvo.push({content:i.convo,options:{filePath:i.path?normalizePath(joinPaths(this.makeCtrl.options.dir,i.path)):undefined}});
        }
        if(continueConvo){
            continueConvo=continueConvo.substring(this.conversation.convo.length);
            if(continueConvo.trim()){
                initConvo.push({content:continueConvo});
            }
        }

        await this.appendAsync(initConvo);
        let viewer:ConvoMakeAppViewer|undefined;
        try{

            while(!this.isDisposed){

                let output:string|false|undefined;
                if(!continueConvo){
                    const r=await this.conversation.completeAsync();
                    if(this.isDisposed){
                        return;
                    }
                    output=r.message?.content;
                    await Promise.all([
                        this.writeOutputAsync(r.message?.content??''),
                        this.writeConvoOutputAsync(this.conversation.convo),
                    ]);
                }else{
                    continueConvo=undefined;
                    output=false;
                }

                let feedback:string|undefined;

                if(this.target.review && this.appRef){
                    const appCtrl=this.makeCtrl.getAppCtrl(this.appRef.app.name);
                    if(appCtrl){
                        if(this.appRef.app.reloadOnChange && viewer){
                            viewer.dispose();
                            viewer=undefined;
                        }
                        if(!viewer){
                            viewer=await appCtrl.getViewerAsync(this.appRef);
                        }
                        const review=await viewer.reviewAsync();
                        if(this.isDisposed){
                            return;
                        }
                        if(review.screenshot){
                            await this.makeCtrl.options.vfsCtrl.writeBufferAsync(this.imageFile,review.screenshot);
                        }
                        if(!review.approved){
                            feedback=review.message;
                            if(review.error){
                                feedback=(feedback?feedback+'\n\n':'')+`<error>\n${review.error}\n</error>`;
                            }
                            if(review.screenshotBase64Url){
                                feedback=`${
                                    feedback?feedback+'\n\n':''
                                }${review.message?.trim()?
                                    'Use the following screenshot for additional context:':
                                    'Follow the instructions in the following screenshot:'
                                }\n![screenshot](${
                                    review.screenshotBase64Url
                                })`
                            }
                        }
                    }
                }

                if(feedback){
                    await this.appendAsync({content:`> user\n${escapeConvo(feedback)}`})
                }else{
                    if(output!==false){
                        this.commit('complete',{addGenCount:1});
                    }
                    break;
                }
            }
        }finally{
            viewer?.dispose();
        }
    }

    private upToDatePromise:Promise<boolean>|null=null;
    public async isUpToDateAsync():Promise<boolean>{
        return this.upToDatePromise??(this.upToDatePromise=this._isUpToDateAsync())
    }
    private async _isUpToDateAsync():Promise<boolean>{
        try{
            const [content,hash]=await Promise.all([
                this.target.outFromList?this.getListOutput():this.makeCtrl.options.vfsCtrl.readStringAsync(this.outPath),
                this.makeCtrl.options.vfsCtrl.readStringAsync(this.cacheFile),
            ]);

            if(content===undefined || content===null || !hash){
                return false;
            }
            return getConvoMakeTargetInHash(hash)===this.getHash();

        }catch{
            return false;
        }
    }

    private commit(state:ConvoMakeTargetState,passUpdate:ConvoMakePassUpdate){

        this._state.next(state);
        this.buildPromiseSource.resolve();
        this.makeCtrl.updatePass(passUpdate);
    }

    private async writeOutputAsync(output:string){
        if(this.makeCtrl.options.dryRun){
            console.log(`mock write ${this.outPath}`);
            if(!this.target.outFromList){
                this.makeCtrl.insertIntoCache(this.target.out,output);
            }
        }else{
            if(!this.target.outFromList){
                this.makeCtrl.insertIntoCache(this.target.out,output);
            }
            await Promise.all([
                this.target.outFromList?null:this.makeCtrl.options.vfsCtrl.writeStringAsync(this.outPath,output),
                this.makeCtrl.options.vfsCtrl.writeStringAsync(
                    this.cacheFile,
                    this.getHash(output)
                )
            ])
        }

        this._output.next(output);
    }

    public getHash(output?:string):string{
        const hasProps:Record<string,any>[]=[];
        for(const prop of convoMakeTargetHasProps){
            const value=this.target[prop];
            if(value!==undefined){
                hasProps.push({[prop]:value});
            }
        }
        return (
            '[in]\n'+
            (hasProps.length?`?hash-props:${JSON.stringify(hasProps)}\n`:'')+
            this.target.in.map(t=>`${getConvoMakeInputSortKey(t)}:${t.hash??''}`).join('\n')+
            (output?`\n[out]\n${this.target.out}:${strHashBase64Fs(output)}`:'')
        )
    }
}
