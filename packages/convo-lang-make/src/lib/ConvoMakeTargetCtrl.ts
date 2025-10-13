import { AppendConvoOptions, Conversation, ConvoMakeActivePass, convoMakeStateDir, ConvoMakeTarget, convoMakeTargetConvoInputEnd, convoMakeTargetConvoInputEndReg, ConvoMakeTargetDeclaration, ConvoMakeTargetRebuild, ConvoMessage, convoRoles, convoVars, escapeConvo, parseConvoCode } from "@convo-lang/convo-lang";
import { asArray, createPromiseSource, delayAsync, DisposeContainer, getContentType, getDirectoryName, getFileName, joinPaths, normalizePath, parseMarkdownImages, ReadonlySubject, strHashBase64Fs } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { convoMakeOutputTypeName, convoMakeTargetHasProps, getConvoMakeInputSortKey, getConvoMakeTargetInHash, getConvoMakeTargetOutHash, insertConvoMakeTargetShellInputs } from "./convo-make-lib.js";
import { getDefaultConvoMakeTargetSystemMessage } from "./convo-make-prmopts.js";
import { ConvoMakeAppTargetRef, ConvoMakeOutputReview, ConvoMakePassUpdate, ConvoMakeTargetState } from "./convo-make-types.js";
import { ConvoMakeAppViewer } from "./ConvoMakeAppViewer.js";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl.js";

export interface ConvoMakeTargetCtrlOptions
{
    makeCtrl:ConvoMakeCtrl;
    target:ConvoMakeTarget;
    outExists:boolean;
    targetDeclaration:ConvoMakeTargetDeclaration;
    parent?:ConvoMakeTargetCtrl;
    pass?:ConvoMakeActivePass;
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
    public readonly outExists:boolean;
    public readonly pass?:ConvoMakeActivePass;
    private _convoExists?:boolean;
    public get convoExists(){return this._convoExists};
    public readonly isMedia:boolean;

    private readonly _output:BehaviorSubject<string|undefined>=new BehaviorSubject<string|undefined>(undefined);
    public get outputSubject():ReadonlySubject<string|undefined>{return this._output}
    public get output(){return this._output.value}

    private readonly _state:BehaviorSubject<ConvoMakeTargetState>=new BehaviorSubject<ConvoMakeTargetState>('waiting');
    public get stateSubject():ReadonlySubject<ConvoMakeTargetState>{return this._state}
    public get state(){return this._state.value}

    private readonly _contentReady:BehaviorSubject<boolean|undefined>=new BehaviorSubject<boolean|undefined>(undefined);
    public get contentReadySubject():ReadonlySubject<boolean|undefined>{return this._contentReady}
    public get contentReady(){return this._contentReady.value}

    private readonly _reviewing:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get reviewingSubject():ReadonlySubject<boolean>{return this._reviewing}
    public get reviewing(){return this._reviewing.value}

    public constructor({
        makeCtrl,
        target,
        targetDeclaration,
        parent,
        outExists,
        pass,
    }:ConvoMakeTargetCtrlOptions){
        this.makeCtrl=makeCtrl;
        this.pass=pass;
        this.target=target;
        this.targetDeclaration=targetDeclaration;
        this.parent=parent;
        this.outPath=normalizePath(joinPaths(this.makeCtrl.options.dir,this.target.out));
        this.outExists=outExists;
        const metaOutBase=normalizePath(joinPaths(
            this.makeCtrl.options.dir,
            convoMakeStateDir,
            this.target.out
        )).replace(/~/g,'~~').replace(/\*/g,'~star~');
        this.metaOutBase=metaOutBase;
        this.cacheFile=metaOutBase+'.~.convo-hash';
        this.convoFile=metaOutBase+'.~.convo-make-target';
        this.imageFile=metaOutBase+'.~.convo-screenshot.png';
        this.conversation=new Conversation(makeCtrl.getDefaultConversationOptions());
        this.conversation.unregisteredVars[convoVars.__cwd]=getDirectoryName(this.outPath);
        this.conversation.unregisteredVars[convoVars.__mainFile]=this.outPath;
        const contentType=getContentType(this.outPath);
        this.isMedia=contentType.startsWith('image/') || contentType.startsWith('video/');
        this.appRef=makeCtrl.getAppRef(target);
        this.log('new');

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
            this.setState('cancelled');
        }
        this.makeCtrl.triggerBuildEvent({
            type:'target-dispose',
            target:this,
            eventTarget:this,
            ctrl:this.makeCtrl,
        });
        this.log('dispose');
    }

    public log(...args:any[]){
        this.makeCtrl.log(`[target ${this.target.out} ${this.pass?.index??'(no-pass)'}]`,...args);
    }

    public async appendAsync(append:Append|Append[],writeConvo:boolean){
        if(Array.isArray(append)){
            for(const a of append){
                this.conversation.append(a.content,a.options);
            }
        }else{
            this.conversation.append(append.content,append.options);
        }
        if(writeConvo && !this.isDisposed && !this.makeCtrl.options.dryRun && !this.makeCtrl.options.echoMode){
            await this.writeConvoOutputAsync(this.conversation.convo);
        }
    }

    private async writeConvoOutputAsync(outConvo:string){
        await this.makeCtrl.options.vfsCtrl.writeStringAsync(this.convoFile,outConvo);
    }

    public async checkReadyAsync()
    {
        this._convoExists=(await this.makeCtrl.options.vfsCtrl.getItemAsync(this.convoFile))?true:false;
        const inputsReady=this.target.in.every(i=>i.ready);
        this.log('checkReady',{inputsReady,contentReady:this.contentReady});
        if(!inputsReady || this.contentReady){
            return;
        }
        const ready=await this.isUpToDateAsync();
        if(ready.input){
            this._contentReady.next(true);
            if(this.makeCtrl.preview){
                this.commit('complete',{addCachedCount:1})
            }
        }
    }

    private buildPromiseSource=createPromiseSource<void>();

    public async buildAsync():Promise<void>{
        try{
            await this.tryBuildAsync();
            await this.buildPromiseSource.promise;
        }catch(ex){
            this.log('target build failed',ex);
            throw ex;
        }
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

    private setState(state:ConvoMakeTargetState){
        this._state.next(state);
        this.makeCtrl.triggerBuildEvent({
            type:'target-state-change',
            target:this,
            eventTarget:this,
            state,
            ctrl:this.makeCtrl,
        })
    }

    public getRebuildInfo(skipBuilt=false):ConvoMakeTargetRebuild|undefined
    {
        if(skipBuilt && this.makeCtrl._builtOutputs.includes(this.outPath)){
            return undefined;
        }
        return this.makeCtrl.getTargetRebuildInfo(this.outPath);
    }

    public shouldSkipBuild():boolean
    {
        return this.makeCtrl.options.rebuild!==false && !this.getRebuildInfo(true);
    }

    private loadIniConvo(initConvo:Append[]){
        const defineStatements:string[]=[];

        defineStatements.push(`${convoVars.__makeRoot}=${JSON.stringify(this.target.out.split('/').map(p=>'..').join('/'))}`);
        defineStatements.push(`${convoVars.__makeFile}=${JSON.stringify(getFileName(this.makeCtrl.options.filePath))}`);
        defineStatements.push(`${convoVars.__makeOut}=${JSON.stringify(this.target.out)}`);

        if(this.target.model){
            defineStatements.push(`__model=${JSON.stringify(this.target.model)}`);
        }

        if(this.target.outType){
            defineStatements.push(
                `${convoMakeOutputTypeName}=${this.target.outType}\n${
                convoVars.__defaultResponseType}="${convoMakeOutputTypeName}"`
            );
        }

        initConvo.push({content:`> define\n${defineStatements.join('\n')}`});

        initConvo.push({
            content:getDefaultConvoMakeTargetSystemMessage(this.target),
        });
        for(const i of this.target.in){
            if(!i.convo){
                continue;
            }
            initConvo.push({content:i.convo,options:{filePath:i.path?normalizePath(joinPaths(this.makeCtrl.options.dir,i.path)):undefined}});
        }
        initConvo.push({content:`> nop\n${convoMakeTargetConvoInputEnd}\n`});
    }

    private async tryBuildAsync(){

        if(this.isBuilding || this.isDisposed){
            return;
        }

        if(!this.makeCtrl.isTargetReady(this.target)){
            this.log('Not ready');
            this.commit('skipped',{addSkipCount:1});
            return;
        }

        if(this.shouldSkipBuild()){
            this.log('Skip build');
            this.commit('complete',{})
            return;
        }

        this.isBuilding=true;
        this.setState('building');

        if(this.target.outFromList){
            this.log('wait for list outputs');
            const children=this.makeCtrl.targets.filter(t=>t.parent===this);
            await Promise.all(children.map(t=>t.buildAsync()));
            this.writeOutputAsync(this.getListOutput()??'');
            this.commit('complete',{addForked:1});
            return;
        }

        const rebuildInfo=this.getRebuildInfo(true);
        let continueConvo:string|undefined;
        if(rebuildInfo?.continueConversation || (rebuildInfo && this.target.review)){
            try{
                continueConvo=await this.makeCtrl.options.vfsCtrl.readStringAsync(this.convoFile);
            }catch(ex){
                this.log('Error reading exiting convo file',ex);
            }

            if(!continueConvo){
                continueConvo=undefined;
            }
        }
        if(!rebuildInfo && (await this.isUpToDateAsync()).input){
            this.log('cached');
            this.commit('complete',{addCachedCount:1});
            return;
        }

        if(this.makeCtrl.options.echoMode){
            this.log('echo input');
            const output=this.target.in.map(t=>t.convo??'').join('\n\n');
            await this.writeOutputAsync(output);
            this.commit('complete',{addGenCount:1});
            return;
        }

        this.log('Start generation');

        if(rebuildInfo?.continueConversation && continueConvo){
            this.log('Continue conversation as-is')
            await this.appendAsync({content:continueConvo},false);
            continueConvo=undefined;
        }else{
            const initConvo:Append[]=[];
            this.loadIniConvo(initConvo);

            if(continueConvo){
                const match=convoMakeTargetConvoInputEndReg.exec(continueConvo);
                if(match){
                    const content=continueConvo.substring(match.index+match[0].length).trim();
                    if(content){
                        initConvo.push({content});
                    }
                }
            }

            await this.appendAsync(initConvo,true);
        }
        let viewer:ConvoMakeAppViewer|undefined;
        try{

            while(!this.isDisposed){

                if(!continueConvo){
                    const r=this.target.shell?await this.runShellCommandAsync():(await this.conversation.completeAsync()).message?.content;
                    if(this.isDisposed){
                        return;
                    }
                    this.log('result:',r===undefined?'undefined':(r.length>200?r.substring(0,200)+'...':r));
                    await Promise.all([
                        this.writeOutputAsync(r??'',(this.target.shell && !this.target.pipeShell)?true:false),
                        this.writeConvoOutputAsync(this.conversation.convo),
                    ]);
                }else{
                    continueConvo=undefined;
                }
                if(this.appRef?.hostFile){
                    await this.writeAppHostFileAsync(this.appRef);
                }

                let feedback:string|undefined;

                if(this.target.review && this.appRef){
                    this.log('review',this.appRef);
                    await delayAsync(1000);
                    const appCtrl=this.makeCtrl.getAppCtrl(this.appRef.app.name);
                    if(appCtrl){
                        if(this.appRef.app.reloadOnChange && viewer){
                            viewer.dispose();
                            viewer=undefined;
                        }
                        if(!viewer){
                            viewer=await appCtrl.getViewerAsync(this.appRef);
                        }
                        this._reviewing.next(true);
                        let review:ConvoMakeOutputReview|undefined;
                        try{
                            review=await viewer.reviewAsync();
                        }finally{
                            this._reviewing.next(false);
                        }
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
                                    'Follow the instructions in the following screenshot. The instructions can include markup drawn by the user.:'
                                }\n![screenshot](${
                                    review.screenshotBase64Url
                                })`
                            }
                        }
                    }
                }

                if(feedback){
                    this.log('feedback',feedback.length>200?feedback.substring(0,200)+'...':feedback);
                    await this.appendAsync({content:`> user\n${escapeConvo(feedback)}`},true);
                }else{
                    await this.appendAsync({content:'\n> user\n'},true);
                    this.makeCtrl._builtOutputs.push(this.outPath);
                    this.makeCtrl.activePass?.generated.push(this.target.out);
                    this.commit('complete',{addGenCount:1});
                    break;
                }
            }
        }finally{
            viewer?.dispose();
        }
    }

    private async runShellCommandAsync():Promise<string|undefined>
    {
        if(!this.target.shell || !this.makeCtrl.options.shell){
            return undefined;
        }
        const output:string[]=[];
        const err:string[]=[];

        const shell=asArray(this.target.shell);
        for(const s of shell){
            const cmd=insertConvoMakeTargetShellInputs(s,this.target,this.makeCtrl.dir);
            this.log('run shell command',`${this.target.shellCwd??'.'}> ${cmd}`);
            const proc=this.makeCtrl.options.shell.exec(cmd,{cwd:this.target.shellCwd});
            const sub=proc.onOutput.subscribe(v=>{
                output.push(v);
            });
            const sub2=proc.onErr.subscribe(v=>{
                err.push(v);
            });
            try{
                const code=await proc.exitPromise;
                if(code!==0 && !this.target.ignoreShellExitCode){
                    const out=output.join('');
                    const errOut=err.join('');
                    this.log('Shell exit with error',code,'output:',out,'err:',errOut);
                    throw new Error(`shell command existed with code ${code}`);
                }
            }finally{
                sub.unsubscribe();
                sub2.unsubscribe();
            }
        }

        if(this.target.pipeShell){
            const out=output.join('');
            return this.target.disableShellPipeTrimming?out:out.trim();
        }else{
            return await this.makeCtrl.readFileAsync(this.outPath);
        }
    }

    private _outputInSync?:boolean;
    public get outputInSync(){return this._outputInSync}

    private upToDatePromise:Promise<ConvoMakeTargetHashStatus>|null=null;
    public async isUpToDateAsync():Promise<ConvoMakeTargetHashStatus>{
        return this.upToDatePromise??(this.upToDatePromise=this._isUpToDateAsync()) // todo - clear promise on written to input
    }
    private async _isUpToDateAsync():Promise<ConvoMakeTargetHashStatus>{
        try{
            const [content,hash]=await Promise.all([
                this.target.outFromList?this.getListOutput():this.makeCtrl.readFileAsync(this.outPath),
                this.makeCtrl.options.vfsCtrl.tryReadStringAsync(this.cacheFile),
            ]);

            if(content===undefined || content===null || !hash){
                this.log('Not up-to-date',{noContent:content===undefined || content===null,noHash:!hash});
                return {
                    input:false,
                    output:false,
                };
            }
            const h=this.getHash(content);
            const r={
                input:getConvoMakeTargetInHash(hash)===getConvoMakeTargetInHash(h),
                output:this._outputInSync=(getConvoMakeTargetOutHash(hash)===getConvoMakeTargetOutHash(h)),
            }

            this.log('up-to-date',r);

            return r;
        }catch(ex){
            this.log('up-to-date error',ex);
            return {
                input:false,
                output:false,
            };
        }
    }

    public onInputChange(relPath:string){
        this.log('input changed',relPath);
        this.upToDatePromise=null;
        this._contentReady.next(false);
    }

    private commit(state:ConvoMakeTargetState,passUpdate:ConvoMakePassUpdate){

        this.log('commit',{state,passUpdate})
        this.setState(state);
        this.makeCtrl.updatePass(passUpdate);

        // Should always be the last line
        this.buildPromiseSource.resolve();
    }

    private async writeAppHostFileAsync(appRef:ConvoMakeAppTargetRef){
        const content=this.getAppHostFileContent(appRef);
        if(!content || !appRef.app.httpRoot || !appRef.hostFile){
            return;
        }
        const appOut=joinPaths(appRef.app.httpRoot,appRef.hostFile);
        await this.makeCtrl.options.vfsCtrl.writeStringAsync(appOut,content)
    }

    private getAppHostFileContent(appRef:ConvoMakeAppTargetRef):string|undefined{
        switch(appRef.hostMode??'react-page'){

            case 'react-page':
                return `
import { useEffect, useState } from "react";

export default function ComponentPreview(){

    const [error,setError]=useState('');
    const [Component,setComponent]=useState<{Comp:((...props:any[])=>any)|null}>({Comp:null});

    useEffect(()=>{
        setError('');
        let m=true;
        (async ()=>{
            try{
                const mod:any=await import('${appRef.importPath}');
                if(!m){
                    return;
                }
                let found=false;
                for(const e in mod){
                    const c=mod[e];
                    if(typeof c === 'function'){
                        found=true;
                        setComponent({Comp:c});
                        break;
                    }
                }
                if(!found){
                    setError('No component found in import - ${appRef.importPath}')
                }
            }catch(ex){
                if(m){
                    setError(\`Unable to load component - \${(ex as any)?.message}\`);
                }
            }
        })();
    },[]);

    return error?error:Component.Comp?<Component.Comp/>:'...Loading Component';

}

`


            default:
                return undefined;

        }
    }

    public async syncCacheAsync():Promise<boolean>
    {
        const isList=this.target.outFromList??false;
        if(!isList && !await this.makeCtrl.options.vfsCtrl.getItemAsync(this.outPath)){
            return false;
        }

        const content=isList?this.getListOutput():await this.makeCtrl.readFileAsync(this.outPath);

        if(!isList){
            try{
                const initConvo:Append[]=[];
                this.loadIniConvo(initConvo);

                let lastAssistant:ConvoMessage|undefined;
                let convoContent:string|undefined;
                let lastIsUser=false;
                if(await this.makeCtrl.options.vfsCtrl.getItemAsync(this.convoFile)){
                    convoContent=await this.makeCtrl.options.vfsCtrl.readStringAsync(this.convoFile);
                    const match=convoMakeTargetConvoInputEndReg.exec(convoContent);
                    if(match){
                        convoContent=convoContent.substring(match.index+match[0].length).trim();
                        const parsed=parseConvoCode(convoContent);
                        if(!parsed.result){
                            throw new Error(parsed.error?.message??'Unable to parse convo code');
                        }
                        lastIsUser=parsed.result[parsed.result.length-1]?.role===convoRoles.user;
                        for(let i=parsed.result.length-1;i>=0;i--){
                            const msg=parsed.result[i];
                            if(msg?.role===convoRoles.assistant && msg.content!==undefined){
                                lastAssistant=msg;
                                break;
                            }
                        }
                    }else{
                        convoContent=undefined;
                    }
                }
                if(convoContent===undefined || lastAssistant?.content===undefined || lastAssistant.content.trim()!==content?.trim()){
                    initConvo.push({content:`> ${convoRoles.assistant}\n${escapeConvo(content)}`});
                }else{
                    initConvo.push({content:convoContent})
                }
                if(!lastIsUser){
                    initConvo.push({content:`> ${convoRoles.user}\n`});
                }
                await this.makeCtrl.options.vfsCtrl.writeStringAsync(this.convoFile,initConvo.map(c=>c.content).join('\n\n'));
            }catch(ex){
                console.error('Failed to check for up to day output in target convo',this.outPath,ex);
            }
        }

        if(!content && !isList){
            return false;
        }

        await this.writeOutputAsync(content??'',true);

        return true;
    }

    private async writeOutputAsync(output:string,writeCacheOnly=false){
        let mediaBase64:string|undefined;
        this._outputInSync=true;
        if(this.isMedia){
            output=output.trim();
            const md=parseMarkdownImages(output);
            mediaBase64=md.find(m=>m.image)?.image?.url;
        }
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
                (this.target.outFromList || writeCacheOnly)?
                    null
                :mediaBase64?
                    this.makeCtrl.options.vfsCtrl.writeBase64Async(this.outPath,mediaBase64)
                :
                    this.makeCtrl.options.vfsCtrl.writeStringAsync(this.outPath,output)
                ,
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
        if(this.isMedia && output){
            output=output.replace(/^.*;base64,/,'');
        }
        return (
            '[in]\n'+
            (hasProps.length?`?hash-props:${JSON.stringify(hasProps)}\n`:'')+
            this.target.in.map(t=>`${getConvoMakeInputSortKey(t)}:${t.hash??''}`).join('\n')+
            (output?`\n[out]\n${this.target.out}:${strHashBase64Fs(output)}`:'')
        )
    }
}

export interface ConvoMakeTargetHashStatus
{
    input:boolean;
    output:boolean;
}
