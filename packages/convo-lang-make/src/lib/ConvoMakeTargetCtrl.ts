import { Conversation, ConvoAppend, convoVars } from "@convo-lang/convo-lang";
import { createPromiseSource, delayAsync, DisposeContainer, getDirectoryName, joinPaths, normalizePath, ReadonlySubject, strHashBase64Fs } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { convoMakeStateDir, convoMakeTargetHasProps, getConvoMakeTargetInHash } from "./convo-make-lib";
import { ConvoMakeAppTargetRef, ConvoMakeTarget } from "./convo-make-types";
import { ConvoMakeAppViewer } from "./ConvoMakeAppViewer";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl";

export interface ConvoMakeTargetCtrlOptions
{
    parent:ConvoMakeCtrl;
    target:ConvoMakeTarget;
}


export class ConvoMakeTargetCtrl
{
    public readonly parent:ConvoMakeCtrl;
    public readonly target:ConvoMakeTarget;
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

    public constructor({
        parent,
        target,
    }:ConvoMakeTargetCtrlOptions){
        this.parent=parent;
        this.target=target;
        this.outPath=normalizePath(joinPaths(this.parent.options.dir,this.target.out));
        const metaOutBase=normalizePath(joinPaths(this.parent.options.dir,convoMakeStateDir,this.target.out));
        this.metaOutBase=metaOutBase;
        this.cacheFile=metaOutBase+'.~.convo-hash';
        this.convoFile=metaOutBase+'.~.convo';
        this.imageFile=metaOutBase+'.~.convo-screenshot.png';
        this.conversation=new Conversation({disableAutoFlatten:true});
        this.conversation.unregisteredVars[convoVars.__cwd]=getDirectoryName(this.outPath);
        this.conversation.unregisteredVars[convoVars.__mainFile]=this.outPath;
        this.disposables.addSub(this.conversation.onAppend.subscribe(this.onConvoAppend));
        this.appRef=parent.getAppRef(target);

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
    }

    private readonly onConvoAppend=(append:ConvoAppend)=>{
        if(this.isDisposed || this.parent.options.dryRun || this.parent.options.echoMode){
            return;
        }
        this.writeConvoOutputAsync(this.conversation.convo);
    }

    private writingConvoOut=false;
    private nextConvoOut:string|undefined;
    private async writeConvoOutputAsync(outConvo:string){
        if(this.writingConvoOut){
            this.nextConvoOut=outConvo;
            return;
        }
        try{
            this.writingConvoOut=true;
            await delayAsync(200);

            if(this.nextConvoOut){
                outConvo=this.nextConvoOut;
                this.nextConvoOut=undefined;
            }

            await this.parent.options.vfsCtrl.writeStringAsync(this.convoFile,outConvo);

        }finally{
            this.writingConvoOut=false;
            if(this.nextConvoOut){
                outConvo=this.nextConvoOut;
                this.nextConvoOut=undefined;
                this.writeConvoOutputAsync(outConvo);
            }
        }
    }

    private buildPromiseSource=createPromiseSource<void>();

    public buildAsync():Promise<void>{
        this.tryBuildAsync();
        return this.buildPromiseSource.promise;
    }

    private isBuilding=false;

    private async tryBuildAsync(){

        if(this.isBuilding || this.isDisposed || this.target.in.some(i=>!i.ready)){
            return;
        }

        this.isBuilding=true;

        const upToDateContent=await this.getUpToDateContent();
        if(upToDateContent!==undefined){
            console.log('hio 👋 👋 👋 NO changes ',this.outPath);
            this.commitOutputAsync(upToDateContent,false);
            return;
        }

        if(this.parent.options.echoMode){
            await this.commitOutputAsync(this.target.in.map(t=>t.convo??'').join('\n\n'),true);
            return;
        }

        for(const i of this.target.in){
            if(!i.convo){
                continue;
            }
            this.conversation.append(
                i.convo,
                {filePath:i.path?normalizePath(joinPaths(this.parent.options.dir,i.path)):undefined}
            );
        }
        let viewer:ConvoMakeAppViewer|undefined;
        try{

            while(true){

                const r=await this.conversation.completeAsync();

                this.writeOutputAsync(r.message?.content??'')

                let feedback:string|undefined;

                if(this.target.review && this.appRef){
                    const appCtrl=this.parent.getAppCtrl(this.appRef.app.name);
                    if(appCtrl){
                        if(this.appRef.app.reloadOnChange && viewer){
                            viewer.dispose();
                            viewer=undefined;
                        }
                        if(!viewer){
                            viewer=await appCtrl.getViewerAsync(this.appRef);
                        }
                        const review=await viewer.reviewAsync();
                        if(review.screenshot){
                            await this.parent.options.vfsCtrl.writeBufferAsync(this.imageFile,review.screenshot);
                        }
                        if(!review.approved){
                            feedback=review.message;
                            if(review.error){
                                feedback=(feedback?feedback+'\n\n':'')+`<error>\n${review.error}\n</error>`;
                            }
                            if(review.screenshotBase64Url){
                                feedback=(feedback?feedback+'\n\n':'')+`\n\nScreenshot:\n![screenshot](${review.screenshotBase64Url})`
                            }
                        }
                    }
                }

                if(feedback){
                    this.conversation.appendUserMessage(feedback);
                }else{
                    await this.commitOutputAsync(r.message?.content??'',false);
                    break;
                }
            }
        }finally{
            viewer?.dispose();
        }
    }

    public async getUpToDateContent():Promise<string|undefined>{
        try{
            const [content,hash]=await Promise.all([
                this.parent.options.vfsCtrl.readStringAsync(this.outPath),
                this.parent.options.vfsCtrl.readStringAsync(this.cacheFile),
            ]);

            if(content===undefined || content===null || !hash){
                return undefined;
            }
            return getConvoMakeTargetInHash(hash)===this.getHash()?content:undefined;

        }catch{
            return undefined;
        }
    }

    private async commitOutputAsync(output:string,writeOutput:boolean){

        if(writeOutput){
            await this.writeOutputAsync(output);
        }

        this.buildPromiseSource.resolve();

        for(const t of this.parent.targets){
            if(t.target.in.some(t=>t.path===this.target.out)){
                t.onInputWrittenAsync(this.target.out,output);
            }
        }
    }

    private async writeOutputAsync(output:string){
        if(this.parent.options.dryRun){
            console.log(`mock write ${this.outPath}`);
            this.parent.insertIntoCache(this.target.out,output);
        }else{
            this.parent.insertIntoCache(this.target.out,output);
            await Promise.all([
                this.parent.options.vfsCtrl.writeStringAsync(this.outPath,output),
                this.parent.options.vfsCtrl.writeStringAsync(
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
            this.target.in.map(t=>`${t.path??''}:${t.hash??''}`).join('\n')+
            (output?`\n[out]\n${this.target.out}:${strHashBase64Fs(output)}`:'')
        )
    }

    private async onInputWrittenAsync(relPath:string,content:string){
        if(this.isBuilding){
            return;
        }
        for(let i=0;i<this.target.in.length;i++){
            const input=this.target.in[i];
            if(input?.path!==relPath){
                continue;
            }
            const updated=await this.parent.contentToConvoAsync(relPath,input,input.isContext??false,content,input.isConvoFile);
            this.target.in[i]=updated;
            this.tryBuildAsync();
        }
    }
}
