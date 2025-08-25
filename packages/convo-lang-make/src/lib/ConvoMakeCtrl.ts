import { contentHasConvoRole, Conversation, ConvoBrowserInf, ConvoMakeActivePass, ConvoMakeApp, ConvoMakeContentTemplate, ConvoMakeExplicitReviewType, ConvoMakeInput, ConvoMakePass, ConvoMakeStage, ConvoMakeTarget, ConvoMakeTargetDeclaration, ConvoMakeTargetSharedProps, convoVars, defaultConvoMakePreviewPort, defaultConvoMakeStageName, escapeConvo, insertConvoContentIntoSlot } from "@convo-lang/convo-lang";
import { asArray, getDirectoryName, getFileExt, getFileName, getFileNameNoExt, InternalOptions, joinPaths, normalizePath, parseCsvRows, pushBehaviorSubjectAry, ReadonlySubject, starStringToRegex, strHashBase64Fs, uuid } from "@iyio/common";
import { vfs, VfsCtrl, VfsFilter } from "@iyio/vfs";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { applyConvoMakeTargetSharedProps, getConvoMakeInputSortKey, getConvoMakeStageDeps, getConvoMakeTargetOutType } from "./convo-make-lib";
import { ConvoMakeAppTargetRef, ConvoMakeBuildEvt, ConvoMakePassUpdate, ConvoMakeShell, ConvoMakeTargetPair } from "./convo-make-types";
import { ConvoMakeAppCtrl } from "./ConvoMakeAppCtrl";
import { ConvoMakeTargetCtrl } from "./ConvoMakeTargetCtrl";

export interface ConvoMakeCtrlOptions
{
    name:string;
    vfsCtrl?:VfsCtrl;
    shell?:ConvoMakeShell;
    browserInf?:ConvoBrowserInf;
    targets:ConvoMakeTargetDeclaration[];
    apps?:ConvoMakeApp[];
    stages?:ConvoMakeStage[];
    targetDefaults?:ConvoMakeTargetSharedProps;
    dir:string;
    /**
     * If true input content is echoed in to outputs instead of being generated
     */
    echoMode?:boolean;

    dryRun?:boolean;

    /**
     * If true cached outputs will be reviewed
     */
    continueReview?:boolean;

    previewPort?:number;

    /**
     * If input inputs will not have their whitespace trimmed.
     */
    disableInputTrimming?:boolean;
}

export class ConvoMakeCtrl
{
    public readonly name:string;

    public readonly id:string;

    public readonly options:InternalOptions<ConvoMakeCtrlOptions,'shell'|'browserInf'|'targetDefaults'>;

    private readonly _onBuildEvent=new Subject<ConvoMakeBuildEvt>();
    public get onBuildEvent():Observable<ConvoMakeBuildEvt>{return this._onBuildEvent}

    private readonly _targets:BehaviorSubject<ConvoMakeTargetCtrl[]>=new BehaviorSubject<ConvoMakeTargetCtrl[]>([]);
    public get targetsSubject():ReadonlySubject<ConvoMakeTargetCtrl[]>{return this._targets}
    public get targets(){return this._targets.value}

    private readonly _apps:BehaviorSubject<ConvoMakeAppCtrl[]>=new BehaviorSubject<ConvoMakeAppCtrl[]>([]);
    public get appsSubject():ReadonlySubject<ConvoMakeAppCtrl[]>{return this._apps}
    public get apps(){return this._apps.value}

    private activePassRef:ConvoMakeActivePass|null=null;
    private readonly _activePass:BehaviorSubject<ConvoMakeActivePass|null>=new BehaviorSubject<ConvoMakeActivePass|null>(null);
    public get activePassSubject():ReadonlySubject<ConvoMakeActivePass|null>{return this._activePass}
    public get activePass(){return this._activePass.value}

    private readonly _passes:BehaviorSubject<ConvoMakePass[]>=new BehaviorSubject<ConvoMakePass[]>([]);
    public get passesSubject():ReadonlySubject<ConvoMakePass[]>{return this._passes}
    public get passes(){return this._passes.value}

    public constructor({
        name,
        vfsCtrl=vfs(),
        targets,
        dir,
        echoMode=false,
        dryRun=false,
        shell,
        browserInf,
        apps=[],
        previewPort=defaultConvoMakePreviewPort,
        continueReview=false,
        disableInputTrimming=false,
        stages=[],
        targetDefaults,
    }:ConvoMakeCtrlOptions){
        this.options={
            name,
            vfsCtrl,
            targets:applyConvoMakeTargetSharedProps(targets,stages,targetDefaults),
            dir,
            echoMode,
            dryRun,
            apps,
            shell,
            browserInf,
            previewPort,
            continueReview,
            disableInputTrimming,
            stages,
            targetDefaults,
        }
        this.id=uuid();
        this.name=name;
        console.log('hio 👋 👋 👋 make ctrl',this);
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        for(const t of this.targets){
            t.dispose();
        }
        for(const a of this.apps){
            a.dispose();
        }
        this.options.browserInf?.dispose();
        this.triggerBuildEvent({
            type:'ctrl-dispose',
            target:this,
            eventTarget:this,
            ctrl:this,
        })
    }

    private buildPromise:Promise<void>|undefined;
    public buildAsync()
    {
        return this.buildPromise??(this.buildPromise=this._buildAsync());
    }

    private async _buildAsync()
    {

        while(!this.isDisposed){
            const pass=await this.makePassAsync();
            console.log('hio 👋 👋 👋 Pass complete',pass);
            pushBehaviorSubjectAry(this._passes,pass);
            this.triggerBuildEvent({
                type:'pass-end',
                target:pass,
                eventTarget:pass,
                ctrl:this,
            })
            if(pass.genCount<=0 && pass.skipCount<=0){
                break;
            }
        }

        console.log('hio 👋 👋 👋 DONE',);
        this._activePass.next(null);
        this.dispose();
    }

    private async makePassAsync():Promise<ConvoMakePass>
    {

        const pass:ConvoMakeActivePass={
            index:this.passes.length,
            startTime:Date.now(),
            genCount:0,
            skipCount:0,
            cachedCount:0,
            forkedCount:0,
        }
        console.log('hio 👋 👋 👋 start pass',pass);
        this.activePassRef=pass;
        this._activePass.next({...pass});
        this.triggerBuildEvent({
            type:'pass-start',
            target:pass,
            eventTarget:pass,
            ctrl:this,
        })
        //this._stages.next(this.options.stages.map(stage=>new ConvoMakeStageCtrl({makeCtrl:this,stage})));
        const targets=await this.getTargetPairsAsync();
        if(this.isDisposed){
            return {
                ...pass,
                endTime:Date.now(),
            };
        }

        // for(const stage of this.stages){
        //     stage.checkReady();
        // }

        const ctrls=targets.map(t=>new ConvoMakeTargetCtrl({
            target:t.target,
            targetDeclaration:t.declaration,
            makeCtrl:this,
        }));

        for(let i=0;i<ctrls.length;i++){
            const ctrl=ctrls[i];
            if(!ctrl?.target.outFromList || !ctrl.target.in.every(i=>i.ready)){
                continue;
            }

            const forked=ctrl.target.in.filter(i=>i.listIndex!==undefined).map((input,index)=>{
                return this.forkTargetList(ctrl,input,index);
            });

            ctrls.splice(i+1,0,...forked);
        }

        this.clearTargets();
        this._targets.next(ctrls);
        for(const ctrl of ctrls){
            this.triggerBuildEvent({
                type:'target-add',
                target:ctrl,
                eventTarget:ctrl,
                ctrl:this,
            })
        }

        await Promise.all(this.targets.map(t=>t.checkReadyAsync()));

        await Promise.all(this.targets.map(t=>t.buildAsync()));

        return {
            ...pass,
            endTime:Date.now(),
        };
    }

    private clearTargets(){
        const clearCtrls=this.targets;
        this._targets.next([]);
        for(const c of clearCtrls){
            c.dispose();
            this.triggerBuildEvent({
                type:'target-remove',
                target:c,
                eventTarget:c,
                ctrl:this,
            })
        }
    }

    public triggerBuildEvent(evt:ConvoMakeBuildEvt){
        this._onBuildEvent.next(evt);
    }

    public updatePass({
        addGenCount=0,
        addSkipCount=0,
        addCachedCount=0,
        addForked=0,
    }:ConvoMakePassUpdate){
        const update:ConvoMakeActivePass={
            index:this.activePassRef?.index??0,
            startTime:Date.now(),
            genCount:0,
            skipCount:0,
            cachedCount:0,
            forkedCount:0,
            ...this.activePassRef,
        }
        update.genCount+=addGenCount;
        update.skipCount+=addSkipCount;
        update.cachedCount+=addCachedCount;
        update.forkedCount+=addForked;
        if(this.activePassRef){
            this.activePassRef.genCount=update.genCount;
            this.activePassRef.skipCount=update.skipCount;
            this.activePassRef.cachedCount=update.cachedCount;
            this.activePassRef.forkedCount=update.forkedCount;
        }
        this._activePass.next(update);
        this.triggerBuildEvent({
                type:'pass-update',
                target:update,
                eventTarget:update,
                ctrl:this,
            })
    }

    public forkTargetList(parent:ConvoMakeTargetCtrl,listInput:ConvoMakeInput,index:number):ConvoMakeTargetCtrl
    {
        console.log(`hio 👋 👋 👋 fork input [${index}]`,listInput.path);
        if(!parent.target.outFromList){
            throw new Error('Only targets that outFromList is true should be forked')
        }
        const target:ConvoMakeTarget={...parent.target,in:[]};
        delete target.outFromList;
        delete target.dynamicOutReg;
        for(let i=0;i<parent.target.in.length;i++){
            const input=parent.target.in[i];
            if(!input || (input.listIndex!==undefined && input!==listInput)){
                continue;
            }
            target.in.push({...input});
        }
        const starPath=parseStarPath(target.out);
        if(starPath){
            let name:string|undefined;
            if(target.outNameProp){
                name=listInput.jsonValue?.[target.outNameProp]?.toString();
            }
            if(name===undefined){
                name='item-'+index.toString().padStart(5,'0');
            }
            name=name.trim()
            name=name.replace(/^[\/\\]+/,'');
            if(!name){
                name='index';
            }
            name=normalizePath(name);
            target.out=`${starPath.start}${name}${starPath.end}`;
        }
        const targetCtrl=new ConvoMakeTargetCtrl({
            target:target,
            targetDeclaration:parent.targetDeclaration,
            makeCtrl:this,
            parent,
        });
        return targetCtrl;
    }

    public async getTargetsAsync():Promise<ConvoMakeTarget[]>{

        return (await this.getTargetPairsAsync()).map(t=>t.target);
    }

    public async getTargetPairsAsync():Promise<ConvoMakeTargetPair[]>{

        const targets:ConvoMakeTargetPair[]=[];

        await Promise.all(this.options.targets.map(t=>this.resolveTargetAsync(t,targets)));

        return targets;
    }

    private async resolveTargetAsync(dec:ConvoMakeTargetDeclaration,targets:ConvoMakeTargetPair[]){
        if(!dec.out){
            return;
        }
        const decInAry=dec.in?asArray(dec.in).map(i=>({input:i,isList:undefined as boolean|undefined})):[];
        const decInputs=dec.inList?[...decInAry,...asArray(dec.inList).map(i=>({input:i,isList:true}))]:decInAry;

        const dir=normalizePath(dec.dir??'.');
        const cwd=normalizePath(this.options.dir);
        const outputs=asArray(dec.out).map(o=>normalizePath(joinPaths(dir,o)));
        const starOut=outputs.some(o=>o.includes('*'));
        const multiOut=outputs.length>1 || starOut;
        if(!outputs.length){
            return;
        }
        const isDynamic=(starOut && (dec.inList?.length || !decInAry.every(i=>i.input.includes('*'))))?true:false;

        const inGroups=await Promise.all(decInputs.map<Promise<PathAndStarPath[]>>(async ({input,isList})=>{
            input=normalizePath(joinPaths(dir,input));
            if(input.includes('*')){
                const star=parseStarPath(input);
                console.log('hio 👋 👋 👋 STAR',star);
                const items=await (star?.recursiveBase?
                    this.options.vfsCtrl.readDirRecursiveAsync({path:star.recursiveBase,filter:star.recursiveFilter}):
                    this.options.vfsCtrl.readDirAsync({path:input})
                );
                if(this.isDisposed){
                    return []
                }
                console.log('hio 👋 👋 👋 ITEMS',items);
                const inputs:PathAndStarPath[]=[];
                for(const item of items.items){
                    if(item.type==='file'){
                        inputs.push({path:item.path,star});
                    }
                }
                return inputs;
            }else{
                return [{path:input,isList}];
            }
        }))

        if(this.isDisposed){
            return;
        }

        const inputs:PathAndStarPath[]=[];
        for(const g of inGroups){
            inputs.push(...g);
        }

        const sharedProps:Partial<ConvoMakeTarget>={
            review:dec.review,
            app:dec.app,
            appPath:dec.appPath,
            keepAppPathExt:dec.keepAppPathExt,
            outType:getConvoMakeTargetOutType(dec),
            outNameProp:dec.outNameProp,
            outFromList:dec.inList?true:undefined,
            model:dec.model,
            deps:dec.deps?asArray(dec.deps):undefined,
            blocks:dec.blocks?asArray(dec.blocks):undefined,
        }

        if(multiOut && !sharedProps.outFromList){
            for(let i=0;i<inputs.length;i++){
                const input=inputs[i];
                let output=outputs[i%outputs.length];
                if(!output || !input){
                    continue;
                }
                const outStar=isDynamic?undefined:parseStarPath(output);
                if(outStar){
                    if(input.star){
                        output=`${outStar.start}${input.path.substring(
                            input.star.start.length,
                            input.path.length-input.star.end.length
                        )}${outStar.end}`
                    }else{
                        output=`${outStar.start}${getFileNameNoExt(input.path)}${outStar.end}`
                    }
                }
                const target:ConvoMakeTarget={
                    ...sharedProps,
                    stage:dec.stage??defaultConvoMakeStageName,
                    in:await this.createInputAryAsync({...input,path:removeDir(input.path,cwd)},dir,cwd,dec),
                    out:removeDir(output,cwd),
                }
                if(isDynamic){
                    target.dynamicOutReg=starStringToRegex(output);
                }
                targets.push({target,declaration:dec})

            }
        }else{
            for(const out of outputs){
                const target:ConvoMakeTarget={
                    ...sharedProps,
                    stage:dec.stage??defaultConvoMakeStageName,
                    in:await this.createInputAryAsync(inputs.map(i=>({...i,path:removeDir(i.path,cwd)})),dir,cwd,dec),
                    out:removeDir(out,cwd),
                }

                targets.push({target,declaration:dec});
            }
        }
    }

    private async createInputAryAsync(inputFile:PathAndStarPath|PathAndStarPath[]|undefined,dir:string,cwd:string,dec:ConvoMakeTargetDeclaration):Promise<ConvoMakeInput[]>{
        const inputAry:ConvoMakeInput[]=[];

        if(dec.instructions){
            const ary=asArray(dec.instructions);
            for(const i of ary){
                const instruction=this.options.disableInputTrimming?i:i.trim();
                inputAry.push(...await this.contentToConvoAsync(
                    undefined,
                    undefined,
                    dec,
                    false,
                    true,
                    contentHasConvoRole(i)?instruction:`> user\n${instruction}`,
                    true
                ));
            }
        }

        if(dec.context){
            const ary=asArray(dec.context);
            for(const c of ary){
                const path=removeDir(normalizePath(joinPaths(dir,c)),cwd);
                const content=await this.loadFileAsync(path);
                inputAry.push(...await this.contentToConvoAsync(path,undefined,dec,true,false,content))
            }
        }

        if(inputFile){
            const ary=asArray(inputFile);
            for(const f of ary){
                const content=await this.loadFileAsync(f.path);
                inputAry.push(...await this.contentToConvoAsync(f.path,f.isList,dec,false,undefined,content))
            }
        }

        inputAry.sort((a,b)=>getConvoMakeInputSortKey(a).localeCompare(getConvoMakeInputSortKey(b)));

        return inputAry;
    }

    private fileCache:Record<string,Promise<string|undefined>>={};
    private loadFileAsync(relPath:string):Promise<string|undefined>
    {
        const path=normalizePath(joinPaths(this.options.dir,relPath));
        return this.fileCache[relPath]??(this.fileCache[relPath]=(async ()=>{
            try{
                const content=await this.options.vfsCtrl.readStringAsync(path);
                return this.options.disableInputTrimming?content:content?.trim();
            }catch(ex){
                return undefined;
            }
        })())
    }

    public removeFromCache(relPath:string){
        delete this.fileCache[relPath];
    }

    public insertIntoCache(relPath:string,content:string){
        this.fileCache[relPath]=Promise.resolve(content);
    }

    /**
     * Returns targets that the path directly depends on.
     */
    public getDirectTargetDeps(relPath:string):ConvoMakeTargetCtrl[]
    {
        const deps:ConvoMakeTargetCtrl[]=[];
        for(const ctrl of this.targets){
            if(ctrl.target.dynamicOutReg?
                ctrl.target.dynamicOutReg.test(relPath):ctrl.target.out===relPath
            ){
                deps.push(ctrl);
            }
        }
        return deps;
    }

    private getStageDepsRecursive(stage:ConvoMakeStage,deps:ConvoMakeTargetCtrl[],checked:ConvoMakeStage[],skipTargets:boolean){
        if(checked.includes(stage)){
            return;
        }
        checked.push(stage);
        if(!skipTargets){
            for(const target of this.targets){
                if(!deps.includes(target) && target.target.stage===stage.name){
                    deps.push(target)
                }
            }
        }
        const depStages=getConvoMakeStageDeps(stage,this.options.stages);
        for(const s of depStages){
            this.getStageDepsRecursive(s,deps,checked,false);
        }

    }

    /**
     * Returns targets that the path depends on and any targets in stages that the path depends on.
     */
    public getTargetDeps(stage:string|undefined,relPath:string):ConvoMakeTargetCtrl[]{
        const deps=this.getDirectTargetDeps(relPath);
        const s=this.options.stages.find(s=>s.name===stage);
        if(s){
            this.getStageDepsRecursive(s,deps,[],true);
        }
        return deps;
    }

    public getTargetDepsRecursive(stage:string|undefined,relPath:string):ConvoMakeTargetCtrl[]{
        const deps:ConvoMakeTargetCtrl[]=[];
        this._getTargetDepsRecursive(stage,relPath,deps);
        return deps;
    }

    public _getTargetDepsRecursive(stage:string|undefined,relPath:string,deps:ConvoMakeTargetCtrl[]){

        const sub=this.getTargetDeps(stage,relPath);
        for(let i=0;i<sub.length;i++){
            const d=sub[i];
            if(!d || deps.includes(d)){
                sub.splice(i,1);
                i--;
            }else{
                deps.push(d);
            }
        }

        for(const d of sub){
            for(const i of d.target.in){
                if(i.path){
                    this._getTargetDepsRecursive(d.target.stage,i.path,deps);
                }
            }
        }

    }

    public isTargetReady(target:ConvoMakeTarget){
        return (
            !target.in.some(i=>!i.ready || (i.path && !this.isTargetDepsPathReady(target.stage,i.path))) &&
            this.isExplicitTargetDepsReady(target.name,target.deps)
        )
    }

    public isTargetDepsPathReady(stage:string|undefined,relPath:string):boolean{
        const deps=this.getTargetDepsRecursive(stage,relPath);
        console.log('hio 👋 👋 👋 \nDEPS ------------------------\n',relPath,'\n----------------\n',deps.map(d=>d.outPath).join('\n'),'-------------------');
        return !deps.length || deps.every(d=>d.contentReady && d.target.in.every(i=>i.ready))
    }

    /**
     * Checks if a targets explicit dependencies are ready
     */
    public isExplicitTargetDepsReady(targetName:string|undefined,deps:string[]|undefined):boolean{
        const chain=this.getNamedTargetDepChain(targetName,deps);
        for(const c of chain){
            for(const i of c.target.in){
                if(i.path && !this.isTargetDepsPathReady(c.target.stage,i.path)){
                    return false;
                }
            }
        }
        return true;
    }

    public getNamedTargetDepChain(targetName:string|undefined,deps:string[]|undefined):ConvoMakeTargetCtrl[]{
        const targets:ConvoMakeTargetCtrl[]=[];
        this._getNamedTargetDepChain(targetName,deps,targets,targetName);
        return targets;
    }


    private _getNamedTargetDepChain(targetName:string|undefined,deps:string[]|undefined,targets:ConvoMakeTargetCtrl[],exclude:string|undefined){
        if(!targetName && !deps?.length){
            return;
        }
        for(const t of this.targets){
            if(targets.includes(t) || (exclude && t.target.name===exclude)){
                continue;
            }

            if((t.target.name && deps?.includes(t.target.name)) || (targetName && t.target.blocks?.includes(targetName))){
                targets.push(t);

                this._getNamedTargetDepChain(t.target.name,t.target.deps,targets,exclude);
            }
        }
    }

    public async contentToConvoAsync(
        relPath:string|undefined,
        isList:boolean|undefined,
        tmpl:ConvoMakeContentTemplate,
        isContext:boolean,
        isCommand:boolean|undefined,
        content:string|null|undefined,
        isConvoFile?:boolean
    ):Promise<ConvoMakeInput[]>{

        if(isList && (typeof content === 'string')){
            content=content?.trim();
            const ext=getFileExt(relPath??'_.md',false,true);
            const items=content?(
                ext==='csv'?
                    parseCsvRows(content)
                :ext==='md'?
                    splitMarkdown(content)
                :
                    (asArray(JSON.parse(content))??[])
            ):[];
            return await Promise.all(items.map((value,index)=>this._contentToConvoAsync(
                relPath,
                false,
                index,
                tmpl,
                isContext,
                isCommand,
                (typeof value === 'string'?value:JSON.stringify(value,null,4)),
                value,
                false
            )))
        }else{
            return [await this._contentToConvoAsync(
                relPath,
                isList,
                undefined,
                tmpl,
                isContext,
                isCommand,
                content,
                undefined,
                isConvoFile
            )];
        }
    }

    private async _contentToConvoAsync(
        relPath:string|undefined,
        isList:boolean|undefined,
        listIndex:number|undefined,
        tmpl:ConvoMakeContentTemplate,
        isContext:boolean,
        isCommand:boolean|undefined,
        content:string|null|undefined,
        jsonValue?:any,
        isConvoFile?:boolean
    ):Promise<ConvoMakeInput>{

        const ready=content!==null && content!==undefined;

        if(isConvoFile===undefined){
            isConvoFile=relPath?.toLowerCase().endsWith('.convo')??false;
        }

        if(isCommand===undefined){
            isCommand=isConvoFile;
        }

        let hash:string|undefined;

        if(isConvoFile && relPath && content && importReg.test(content)){
            const conversation=this.createConversation(relPath);
            const imports:string[]=[];
            const sub=conversation.onImportSource.subscribe(i=>{
                if(!i.isSystemImport){
                    imports.push(i.source.trim());
                }
            });
            try{
                conversation.append(content,{filePath:normalizePath(joinPaths(this.options.dir,relPath))});
                await conversation.flattenAsync(undefined,{importOnly:true});
                hash=strHashBase64Fs(content+'\n'+imports.join('\n'));
            }finally{
                sub.unsubscribe();
            }
        }else if(ready){
            hash=strHashBase64Fs(content??'')
        }

        return {
            path:relPath,
            contextTag:tmpl.contextTag,
            contextTemplate:tmpl.contextTemplate,
            inputTag:tmpl.inputTag,
            inputTemplate:tmpl.inputTemplate,
            isContext,
            isCommand,
            convo:content?isConvoFile?content:applyTemplate(content,isContext,isCommand,tmpl):undefined,
            ready,
            hash,
            isConvoFile,
            isList,
            listIndex,
            jsonValue,
        };
    }

    private createConversation(relPath:string):Conversation{
        const conversation=new Conversation({disableAutoFlatten:true});
        const fullPath=normalizePath(joinPaths(this.options.dir,relPath));
        conversation.unregisteredVars[convoVars.__cwd]=getDirectoryName(fullPath);
        conversation.unregisteredVars[convoVars.__mainFile]=fullPath;
        return conversation;
    }

    public getAppRef(target:ConvoMakeTarget):ConvoMakeAppTargetRef|undefined{

        let app:ConvoMakeApp|undefined;

        const targetOut=normalizePath(joinPaths(this.options.dir,target.out));

        if(target.app){
            app=this.options.apps.find(a=>a.name===target.app);
        }else{
            const matches=this.options.apps.filter(a=>targetOut.startsWith(a.dir));
            matches.sort((a,b)=>b.dir.length-a.dir.length);
            app=matches[0];
        }

        if(!app){
            return undefined;
        }

        let reviewType:ConvoMakeExplicitReviewType|undefined;
        if(target.review){
            if(target.review==='http'){
                reviewType='http';
            }else if(target.review==='source'){
                reviewType='source';
            }else if(app.httpRoot){
                if(targetOut.startsWith(app.httpRoot)){
                    reviewType='http'
                }else{
                    reviewType='source';
                }

            }else{
                reviewType='source';
            }
        }else{
            reviewType='source';
        }

        let appPath=(
            target.appPath??
            ((app.httpRoot && targetOut.startsWith(app.httpRoot))?targetOut.substring(app.httpRoot.length-1):undefined)
        );


        if(!target.keepAppPathExt && appPath){
            const i=appPath.lastIndexOf('.');
            if(i!==-1){
                appPath=appPath.substring(0,i);
            }
        }

        if(appPath==='index' || !appPath){
            appPath='/'
        }else if(appPath?.endsWith('/index')){
            appPath=appPath.substring(0,appPath.length-'/index'.length);
            if(!appPath){
                appPath='/'
            }
        }


        return {
            app,
            reviewType,
            appPath,
        }
    }

    public getAppCtrl(name:string):ConvoMakeAppCtrl|undefined{
        const existing=this.apps.find(a=>a.app.name===name);
        if(existing){
            return existing;
        }
        const app=this.options.apps.find(a=>a.name==name);
        if(!app){
            return undefined;
        }
        const appCtrl=new ConvoMakeAppCtrl({app,parent:this});
        pushBehaviorSubjectAry(this._apps,appCtrl);
        return appCtrl;
    }

    // public getStage(name:string):ConvoMakeStageCtrl|undefined{
    //     return this.stages.find(s=>s.stage.name===name);
    // }

    public async getDebugOutputAsync(){
        const targets=await this.getTargetsAsync();
        return {
            apps:this.options.apps,
            stages:this.options.stages,
            targets,
            sourceTargets:this.options.targets
        }
    }
}

interface StarPath
{
    start:string;
    end:string;
    recursiveBase?:string;
    recursiveFilter?:VfsFilter;
}

interface PathAndStarPath
{
    path:string;
    star?:StarPath;
    /**
     * True if the path was created from an input from a list. (from the inList of a target)
     */
    isList?:boolean;
}

const parseStarPath=(path:string):StarPath|undefined=>{
    const parts=path.split(/\*+/);
    if(parts.length!==2){
        return undefined;
    }
    const recursive=path.includes('**');
    let recursiveFilter:VfsFilter|undefined;
    let recursiveBase:string|undefined;
    if(recursive){
        recursiveBase=parts[0];
        if(recursiveBase){
            if(recursiveBase.endsWith('/')){
                recursiveBase=recursiveBase.substring(0,recursiveBase.length-1);
            }else{
                const i=recursiveBase.lastIndexOf('/');
                if(i!==-1){
                    recursiveBase=recursiveBase.substring(0,i);
                }
            }
        }
        const name=getFileName(path).replace(/\*+/g,'*');
        recursiveFilter={match:starStringToRegex(name)}
    }
    return {
        start:parts[0] as string,
        end:parts[1] as string,
        recursiveBase,
        recursiveFilter,
    }
}

const removeDir=(path:string,dir:string)=>{
    if(path.startsWith(dir)){
        path=path.substring(dir.length);
        if(path.startsWith('/')){
            path=path.substring(1);
        }
    }
    return path;
}


const importReg=/(^|\n)[ \t]*@import\s/

const applyTemplate=(content:string,isContext:boolean,isCommand:boolean,inputTemplate:ConvoMakeContentTemplate)=>{
    if(isContext && content!==undefined && content!==null){

        if(inputTemplate.contextTag){
            content=`<${inputTemplate.contextTag}>\n${content}\n</${inputTemplate.contextTag}>`;
        }

        if(inputTemplate.contextTemplate){
            content=insertConvoContentIntoSlot(content,inputTemplate.contextTemplate);
        }
    }

    if(!isContext && content!==undefined && content!==null){

        if(inputTemplate.inputTag){
            content=`<${inputTemplate.inputTag}>\n${content}\n</${inputTemplate.inputTag}>`;
        }

        if(inputTemplate.inputTemplate){
            content=insertConvoContentIntoSlot(content,inputTemplate.inputTemplate);
        }
    }

    return `> ${isCommand?'user':'system'}\n${escapeConvo(content)}`;
}

const mdSplitReg=/(?=\n[ \t]*##[ \t])/
const splitMarkdown=(md:string):string[]=>{
    const parts=md.split(mdSplitReg).map(v=>v.trim())
    if(!parts[0]){
        parts.shift();
    }
    return parts;
}


