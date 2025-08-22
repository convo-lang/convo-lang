import { AppendConvoOptions, Conversation, convoVars, escapeConvo } from "@convo-lang/convo-lang";
import { createPromiseSource, DisposeContainer, getDirectoryName, joinPaths, normalizePath, ReadonlySubject, strHashBase64Fs } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { convoMakeOutputTypeName, convoMakeStateDir, convoMakeTargetHasProps, getConvoMakeTargetInHash } from "./convo-make-lib";
import { ConvoMakeAppTargetRef, ConvoMakeTarget } from "./convo-make-types";
import { ConvoMakeAppViewer } from "./ConvoMakeAppViewer";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl";

export interface ConvoMakeTargetCtrlOptions
{
    makeCtrl:ConvoMakeCtrl;
    target:ConvoMakeTarget;
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
        makeCtrl,
        target,
        parent,
    }:ConvoMakeTargetCtrlOptions){
        this.makeCtrl=makeCtrl;
        this.target=target;
        this.parent=parent;
        this.outPath=normalizePath(joinPaths(this.makeCtrl.options.dir,this.target.out));
        const metaOutBase=normalizePath(joinPaths(this.makeCtrl.options.dir,convoMakeStateDir,this.target.out));
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
        console.log('hio 👋 👋 👋 write convo out',this.convoFile,outConvo);
        await this.makeCtrl.options.vfsCtrl.writeStringAsync(this.convoFile,outConvo);
    }

    private buildPromiseSource=createPromiseSource<void>();

    public buildAsync():Promise<void>{
        this.tryBuildAsync();
        return this.buildPromiseSource.promise;
    }

    private isBuilding=false;

    private async tryBuildAsync(){

        if(this.isBuilding || this.isDisposed || this.target.in.some(i=>!i.ready || (i.path && !this.makeCtrl.areDynamicDependenciesReady(i.path)))){
            return;
        }

        this.isBuilding=true;

        if(this.target.outIsList){
            await Promise.all(this.target.in.filter(i=>i.listIndex!==undefined).map(async (input,index)=>{
                const ctrl=this.makeCtrl.forkTargetList(this,input,index);
                await ctrl.buildAsync();
            }))
            this.buildPromiseSource.resolve();
            return;
        }

        const upToDateContent=await this.getUpToDateContent();
        let continueConvo:string|undefined;
        if(upToDateContent!==undefined){
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
                this.commitOutputAsync(upToDateContent);
                return;
            }
        }

        if(this.makeCtrl.options.echoMode){
            const output=this.target.in.map(t=>t.convo??'').join('\n\n');
            await this.writeOutputAsync(output);
            await this.commitOutputAsync(output);
            return;
        }

        const initConvo:Append[]=[{
            content:/*convo*/`
> define
${convoMakeOutputTypeName}=${this.target.outType??'struct()'}

> system
You are generating content that will be directly written to "${escapeConvo(this.target.out)}".
DO NOT include a preamble or postamble.

            `.trim()
        }];
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

            while(true){

                let output:string|false|undefined;
                if(!continueConvo){
                    const r=await this.conversation.completeAsync();
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
                        await this.commitOutputAsync(output??'');
                    }
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
                this.makeCtrl.options.vfsCtrl.readStringAsync(this.outPath),
                this.makeCtrl.options.vfsCtrl.readStringAsync(this.cacheFile),
            ]);

            if(content===undefined || content===null || !hash){
                return undefined;
            }
            return getConvoMakeTargetInHash(hash)===this.getHash()?content:undefined;

        }catch{
            return undefined;
        }
    }

    private async commitOutputAsync(output:string){

        this.buildPromiseSource.resolve();

        for(const t of this.makeCtrl.targets){
            if(t.target.in.some(t=>t.path===this.target.out)){
                t.onInputWrittenAsync(this.target.out,this.target.dynamicOutReg,output);
            }
        }
    }

    private async writeOutputAsync(output:string){
        if(this.makeCtrl.options.dryRun){
            console.log(`mock write ${this.outPath}`);
            this.makeCtrl.insertIntoCache(this.target.out,output);
        }else{
            this.makeCtrl.insertIntoCache(this.target.out,output);
            await Promise.all([
                this.makeCtrl.options.vfsCtrl.writeStringAsync(this.outPath,output),
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
            this.target.in.map(t=>`${t.path??''}:${t.hash??''}`).join('\n')+
            (output?`\n[out]\n${this.target.out}:${strHashBase64Fs(output)}`:'')
        )
    }

    private async onInputWrittenAsync(relPath:string,pathReg:RegExp|undefined,content:string){
        if(this.isBuilding){
            return;
        }
        let tryBuild=false;
        for(let i=0;i<this.target.in.length;i++){
            const input=this.target.in[i];
            if(!(input?.path===relPath || (input?.path && pathReg?.test(input.path)))){
                continue;
            }
            const updated=await this.makeCtrl.contentToConvoAsync(relPath,input.isList,input,input.isContext??false,input.isCommand,content,input.isConvoFile);
            this.target.in.splice(i,1,...updated);
            tryBuild=true;
            if(updated.length){
                i+=updated.length-1;
            }else{
                i--;
            }
        }
        if(tryBuild){
            this.tryBuildAsync();
        }
    }
}
