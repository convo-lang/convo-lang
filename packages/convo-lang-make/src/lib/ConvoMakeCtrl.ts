import { addConvoUsageTokens, contentHasConvoRole, Conversation, ConversationOptions, ConvoBrowserInf, ConvoMakeActivePass, ConvoMakeApp, ConvoMakeContextTemplate, ConvoMakeExplicitReviewType, ConvoMakeInput, ConvoMakePass, ConvoMakeStage, convoMakeStateDir, ConvoMakeStats, convoMakeStatsDir, ConvoMakeTarget, ConvoMakeTargetAttachment, ConvoMakeTargetContentTemplate, ConvoMakeTargetDeclaration, ConvoMakeTargetRebuild, ConvoMakeTargetSharedProps, ConvoTokenUsage, convoVars, createEmptyConvoTokenUsage, defaultConvoMakeAppContentHostMode, defaultConvoMakePreviewPort, defaultConvoMakeStageName, defaultConvoMakeTmpPagesDir, directUrlConvoMakeAppName, escapeConvo, insertConvoContentIntoSlot } from "@convo-lang/convo-lang";
import { asArray, base64EncodeMarkdownImage, delayAsync, getContentType, getDirectoryName, getFileExt, getFileName, getFileNameNoExt, getUriProtocol, InternalOptions, joinPaths, normalizePath, parseCsvRows, pushBehaviorSubjectAry, ReadonlySubject, starStringToRegex, strHashBase64Fs, uuid } from "@iyio/common";
import { parseJson5 } from "@iyio/json5";
import { vfs, VfsCtrl, VfsFilter, VfsItem } from "@iyio/vfs";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { applyConvoMakeContextTemplate, applyConvoMakeTargetSharedProps, getConvoMakeAppUrl, getConvoMakeStageDeps, getConvoMakeTargetOutType, getEscapeConvoMakePathName } from "./convo-make-lib.js";
import { ConvoMakeAppTargetRef, ConvoMakeBuildEvt, ConvoMakePassUpdate, ConvoMakeShell, ConvoMakeTargetPair } from "./convo-make-types.js";
import { ConvoMakeAppCtrl } from "./ConvoMakeAppCtrl.js";
import { ConvoMakeTargetCtrl } from "./ConvoMakeTargetCtrl.js";

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
    /**
     * Full path to the working directory
     */
    dir:string;
    /**
     * Full path to the convo make file the controller is building
     */
    filePath:string;
    /**
     * If true input content is echoed in to outputs instead of being generated
     */
    echoMode?:boolean;

    dryRun?:boolean;

    /**
     * If true, a path or paths to target outputs cached outputs will be rebuilt
     */
    rebuild?:boolean|ConvoMakeTargetRebuild|string|(string|ConvoMakeTargetRebuild)[];

    previewPort?:number;

    /**
     * If input inputs will not have their whitespace trimmed.
     */
    disableInputTrimming?:boolean;

    /**
     * If true the controller will be loaded as a preview when the build is tarted
     */
    preview?:boolean;

    /**
     * If true all targets will be forced to be reviewed
     */
    forceReview?:boolean;


}

export class ConvoMakeCtrl
{
    public readonly name:string;
    public readonly dir:string;
    public readonly filePath:string;
    public readonly statsPath:string;
    public readonly preview:boolean;

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

    private readonly _complete:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get completeSubject():ReadonlySubject<boolean>{return this._complete}
    public get complete(){return this._complete.value}

    private readonly _usage:BehaviorSubject<ConvoTokenUsage>=new BehaviorSubject<ConvoTokenUsage>(createEmptyConvoTokenUsage());
    public get usageSubject():ReadonlySubject<ConvoTokenUsage>{return this._usage}
    public get usage(){return this._usage.value}

    readonly _builtOutputs:string[]=[];

    public constructor({
        name,
        vfsCtrl=vfs(),
        targets,
        dir,
        filePath,
        echoMode=false,
        dryRun=false,
        shell,
        browserInf,
        apps=[],
        previewPort=defaultConvoMakePreviewPort,
        rebuild=false,
        disableInputTrimming=false,
        stages=[],
        targetDefaults,
        preview=false,
        forceReview=false,
    }:ConvoMakeCtrlOptions){
        this.options={
            name,
            vfsCtrl,
            targets:applyConvoMakeTargetSharedProps(targets,stages,targetDefaults),
            dir,
            filePath,
            echoMode,
            dryRun,
            apps,
            shell,
            browserInf,
            previewPort,
            rebuild,
            disableInputTrimming,
            stages,
            targetDefaults,
            preview,
            forceReview,
        }
        this.id=uuid();
        this.name=name;
        this.dir=dir;
        this.statsPath=normalizePath(joinPaths(
                dir,
                convoMakeStateDir,
                convoMakeStatsDir,
                `${new Date().toISOString()}.json`
        ));
        this.filePath=filePath;
        this.preview=preview;
        console.log('ConvoMakeCtrl',this);
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

    public async syncAllTargetCachesWithOutput()
    {
        const ctrls=await this.getBuildTargetsAsync();
        this.clearTargets();
        this._targets.next(ctrls);

        ctrls.sort((a,b)=>(a.target.outFromList?1:0)-(b.target.outFromList?1:0));
        await Promise.all(ctrls.map(t=>t.syncCacheAsync()));
    }

    public async syncTargetCacheWithOutput(outPath:string){
        const ctrls=await this.getBuildTargetsAsync();
        this.clearTargets();
        this._targets.next(ctrls);

        const syncTargets=ctrls.filter(t=>t.outPath===outPath);
        await Promise.all(syncTargets.map(t=>t.syncCacheAsync()));
    }

    private buildPromise:Promise<void>|undefined;
    public buildAsync()
    {
        return this.buildPromise??(this.buildPromise=this._buildAsync());
    }

    private async _buildAsync()
    {
        if(this.preview){
            await this.loadAsPreviewAsync();
        }else{
            while(!this.isDisposed){

                await delayAsync(1);
                if(this.isDisposed){
                    break;
                }

                const pass=await this.makePassAsync();
                if(this.isDisposed){
                    pass.cancelled=true;
                }
                pushBehaviorSubjectAry(this._passes,pass);
                this.triggerBuildEvent({
                    type:'pass-end',
                    target:pass,
                    eventTarget:pass,
                    ctrl:this,
                });
                await this.options.vfsCtrl.writeStringAsync(this.statsPath,JSON.stringify(this.getStats(),null,4));
                if(pass.genCount<=0){
                    if(pass.skipCount<=0){
                        break;
                    }else{
                        throw new Error('No targets generated')
                    }
                }
            }
        }


        if(!this.isDisposed){
            this._complete.next(true);
            this.triggerBuildEvent({
                type:'ctrl-complete',
                target:this,
                eventTarget:this,
                ctrl:this,
            })
        }
        this._activePass.next(null);
        this.dispose();

        console.log('ConvoMakeCtrl done',this.filePath);
    }

    public getStats():ConvoMakeStats{
        return {
            usage:{...this.usage},
            passes:[...this.passes],
        }
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
        this.activePassRef=pass;
        this._activePass.next({...pass});
        this.triggerBuildEvent({
            type:'pass-start',
            target:pass,
            eventTarget:pass,
            ctrl:this,
        })

        const ctrls=await this.getBuildTargetsAsync();
        if(this.isDisposed){
            return {
                ...pass,
                endTime:Date.now(),
            };
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

    private async getBuildTargetsAsync(){
        const targets=await this.getTargetPairsAsync();
        if(this.isDisposed){
            return [];
        }

        const ctrls=await Promise.all(targets.map(async t=>new ConvoMakeTargetCtrl({
            target:t.target,
            targetDeclaration:t.declaration,
            makeCtrl:this,
            outExists:(await this.options.vfsCtrl.getItemAsync(joinPaths(this.options.dir,t.target.out)))?true:false,

        })));

        for(let i=0;i<ctrls.length;i++){
            const ctrl=ctrls[i];
            if(!ctrl?.target.outFromList || !ctrl.target.in.every(i=>i.ready)){
                continue;
            }

            const forked:ConvoMakeTargetCtrl[]=[];
            const filtered=ctrl.target.in.filter(i=>i.listIndex!==undefined);
            for(let index=0;index<filtered.length;index++){
                const input=filtered[index];
                if(!input){
                    continue;
                }
                forked.push(await this.forkTargetListAsync(ctrl,input,index))
            }

            ctrls.splice(i+1,0,...forked);
        }

        ctrls.sort((a,b)=>a.outPath.localeCompare(b.outPath))

        return ctrls;
    }

    private previewPromise:Promise<void>|undefined;
    public loadAsPreviewAsync()
    {
        return this.previewPromise??(this.previewPromise=this._loadAsPreviewAsync())
    }

    private async _loadAsPreviewAsync()
    {
        const ctrls=await this.getBuildTargetsAsync();
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
        this.triggerBuildEvent({
            type:'ctrl-preview',
            target:this,
            eventTarget:this,
            ctrl:this,
        })
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

    public async forkTargetListAsync(parent:ConvoMakeTargetCtrl,listInput:ConvoMakeInput,index:number):Promise<ConvoMakeTargetCtrl>
    {
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
        const outPath=normalizePath(joinPaths(this.options.dir,target.out));
        const targetCtrl=new ConvoMakeTargetCtrl({
            target:target,
            targetDeclaration:parent.targetDeclaration,
            makeCtrl:this,
            parent,
            outExists:(await this.options.vfsCtrl.getItemAsync(outPath))?true:false,
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
                const items=await this.readStarPathAsync(input);
                if(this.isDisposed){
                    return []
                }
                const star=parseStarPath(input);
                const inputs:PathAndStarPath[]=[];
                for(const item of items){
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
            review:(((dec.review===true || dec.review===undefined) && dec.reviewUrl)?'http':dec.review)||(this.options.forceReview||undefined),
            reviewUrl:dec.reviewUrl,
            app:dec.app,
            appPath:dec.appPath,
            keepAppPathExt:dec.keepAppPathExt,
            outType:getConvoMakeTargetOutType(dec),
            outNameProp:dec.outNameProp,
            outFromList:dec.inList?true:undefined,
            model:dec.model,
            deps:dec.deps?asArray(dec.deps):undefined,
            blocks:dec.blocks?asArray(dec.blocks):undefined,
            component:dec.component,
            appHostFile:dec.appHostFile,
            appHostMode:dec.appHostMode,
            appImportPath:dec.appImportPath,
        }

        if(multiOut && !sharedProps.outFromList){
            for(let i=0;i<inputs.length;i++){
                const input=inputs[i];
                let output=outputs[i%outputs.length];
                if(!output || !input){
                    continue;
                }
                const outStar=isDynamic?undefined:parseStarPath(output);
                let outMappedPart:string|undefined;
                if(outStar){
                    if(input.star){
                        outMappedPart=input.path.substring(
                            input.star.start.length,
                            input.path.length-input.star.end.length
                        );
                        output=`${outStar.start}${outMappedPart}${outStar.end}`
                    }else{
                        output=`${outStar.start}${getFileNameNoExt(input.path)}${outStar.end}`
                    }
                }
                const target:ConvoMakeTarget={
                    ...sharedProps,
                    reviewUrl:(outMappedPart && sharedProps.reviewUrl?.includes('*'))?sharedProps.reviewUrl.replace(/\*/g,outMappedPart):sharedProps.reviewUrl,
                    outMappedPart,
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

    private async readStarPathAsync(path:string):Promise<VfsItem[]>{
        const star=parseStarPath(path);
        const items=await (star?.recursiveBase?
            this.options.vfsCtrl.readDirRecursiveAsync({path:star.recursiveBase,filter:star.recursiveFilter}):
            this.options.vfsCtrl.readDirAsync({path})
        );
        return items.items;
    }

    private async createInputAryAsync(inputFile:PathAndStarPath|PathAndStarPath[]|undefined,dir:string,cwd:string,dec:ConvoMakeTargetDeclaration):Promise<ConvoMakeInput[]>{
        const inputAry:ConvoMakeInput[]=[];

        if(dec.context){
            const ary=asArray(dec.context);
            for(const c of ary){
                const context:ConvoMakeContextTemplate=(typeof c === 'string')?{path:c}:c;
                const path=removeDir(normalizePath(joinPaths(dir,context.path)),cwd);
                if(path.includes('*')){
                    const items=await this.readStarPathAsync(normalizePath(joinPaths(dir,context.path)));
                    if(this.isDisposed){
                        return [];
                    }
                    const contentList=await Promise.all(items.map(async item=>{
                        let content=await this.loadFileAsync(removeDir(item.path,cwd));
                        if(content!==undefined){
                            content=applyConvoMakeContextTemplate(content,context);
                        }
                        return {item,content}
                    }))
                    contentList.sort((a,b)=>a.item.path.localeCompare(b.item.path));
                    inputAry.push(...await this.contentToConvoAsync(path,undefined,{},true,false,contentList.filter(c=>c.content).map(c=>c.content).join('\n\n'),undefined,context.tags));
                }else{
                    let content=await this.loadFileAsync(path);
                    if(content!==undefined){
                        content=applyConvoMakeContextTemplate(content,context);
                    }
                    inputAry.push(...await this.contentToConvoAsync(path,undefined,{},true,false,content,undefined,context.tags));
                }
            }
        }

        const attachments=dec.attach?asArray(dec.attach).map(a=>(typeof a === 'string')?{path:a}:a):undefined;

        if(inputFile){
            const ary=asArray(inputFile);
            for(const f of ary){
                const content=await this.loadFileAsync(f.path);
                inputAry.push(...await this.contentToConvoAsync(f.path,f.isList,dec,false,undefined,content));

                if(attachments){
                    for(const attachment of attachments){
                        await this.loadAttachmentAsync(f.path,attachment,inputAry);
                    }
                }
            }
        }

        if(dec.instructions){
            const ary=asArray(dec.instructions);
            for(const i of ary){
                const instruction=this.options.disableInputTrimming?i:i.trim();
                inputAry.push(...await this.contentToConvoAsync(
                    undefined,
                    undefined,
                    {},
                    false,
                    true,
                    contentHasConvoRole(i)?instruction:`> appendUser\n${instruction}`,
                    true
                ));
            }
        }

        ///inputAry.sort((a,b)=>getConvoMakeInputSortKey(a).localeCompare(getConvoMakeInputSortKey(b)));

        return inputAry;
    }

    private async loadAttachmentAsync(inputPath:string,attachment:ConvoMakeTargetAttachment,inputAry:ConvoMakeInput[]){
        const name=getFileNameNoExt(inputPath);
        const srcPath=joinPaths(
            getDirectoryName(inputPath),
            attachment.path.includes('*')?attachment.path.replace(/\*/g,name):attachment.path
        );
        let content=await this.loadFileAsync(srcPath);
        if(content!==undefined){

            if(attachment.listLoadPath){
                const list=parseJson5(content);
                if(Array.isArray(list)){
                    const all=await Promise.all(list.map(async item=>{
                        const name=item+'';
                        const loadPath=attachment.listLoadPath?.replace(/\*/g,name)??'';
                        let value=await this.loadFileAsync(loadPath);
                        // todo - if no file loaded log error
                        if(value===undefined){
                            throw new Error(`No attachment list load file found at - ${loadPath}`)
                        }
                        if(attachment.item){
                            value=applyConvoMakeContextTemplate(value,attachment.item,{name});
                        }escapeConvo
                        return value;
                    }));
                    content=all.join('\n\n');
                }
            }

            content=applyConvoMakeContextTemplate(content,attachment);
        }
        inputAry.push(...await this.contentToConvoAsync(srcPath,false,{},true,false,content,false));

    }

    private fileCache:Record<string,Promise<string|undefined>>={};
    private loadFileAsync(relPath:string):Promise<string|undefined>
    {
        const path=normalizePath(joinPaths(this.options.dir,relPath));
        return this.fileCache[relPath]??(this.fileCache[relPath]=this.readFileAsync(path));
    }

    public async readFileAsync(path:string):Promise<string|undefined>{
        try{
            const contentType=getContentType(path);
            if(contentType.startsWith('image/')){
                const content=await this.options.vfsCtrl.readBufferAsync(path);
                return base64EncodeMarkdownImage('image',contentType,content);
            }else{
                const content=await this.options.vfsCtrl.readStringAsync(path);
                return this.options.disableInputTrimming?content:content?.trim();
            }
        }catch(ex){
            return undefined;
        }
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
        tmpl:ConvoMakeTargetContentTemplate,
        isContext:boolean,
        isCommand:boolean|undefined,
        content:string|null|undefined,
        isConvoFile?:boolean,
        tags?:Record<string,string|boolean>
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
                false,
                tags
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
                isConvoFile,
                tags
            )];
        }
    }

    private async _contentToConvoAsync(
        relPath:string|undefined,
        isList:boolean|undefined,
        listIndex:number|undefined,
        tmpl:ConvoMakeTargetContentTemplate,
        isContext:boolean,
        isCommand:boolean|undefined,
        content:string|null|undefined,
        jsonValue?:any,
        isConvoFile?:boolean,
        tags?:Record<string,string|boolean>
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
            convo:content?isConvoFile?content:applyTemplate(content,isContext,tmpl,tags):undefined,
            ready,
            hash,
            isConvoFile,
            isList,
            listIndex,
            jsonValue,
        };
    }

    public getDefaultConversationOptions():ConversationOptions{
        return {
            sandboxMode:this.preview,
            trackModel:true,
            trackTime:true,
            trackTokens:true,
            disableAutoFlatten:true,
            onTokenUsage:(usage)=>this.addTokenUsage(usage),
        }
    }

    public addTokenUsage(usage:ConvoTokenUsage){
        const update={...this.usage}
        addConvoUsageTokens(update,usage);
        this._usage.next(update);
    }

    private createConversation(relPath:string):Conversation{
        const conversation=new Conversation(this.getDefaultConversationOptions());
        const fullPath=normalizePath(joinPaths(this.options.dir,relPath));
        conversation.unregisteredVars[convoVars.__cwd]=getDirectoryName(fullPath);
        conversation.unregisteredVars[convoVars.__mainFile]=fullPath;
        return conversation;
    }

    public getAppRef(target:ConvoMakeTarget):ConvoMakeAppTargetRef|undefined{

        if(target.reviewUrl){
            let appPath=target.reviewUrl;
            if(!getUriProtocol(appPath)){
                const firstApp=this.options.apps?.[0];
                if(firstApp){
                    appPath=getConvoMakeAppUrl(firstApp,appPath);
                }
            }
            return {
                reviewType:'http',
                appPath,
                app:{name:directUrlConvoMakeAppName,dir:'./'}
            }
        }

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
                if(targetOut.startsWith(app.httpRoot) || target.component){
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

        let hostMode=target.appHostMode??app.componentHostMode??defaultConvoMakeAppContentHostMode;
        let hostFile=target.appHostFile;
        let importPath=target.appImportPath;

        if(reviewType && target.component && app.httpRoot){
            const pageFileName=getEscapeConvoMakePathName(target.out)+'.tsx'
            if(!hostFile){
                hostFile=joinPaths(app.tmpPagesDir??defaultConvoMakeTmpPagesDir,pageFileName);
            }
            if(!appPath){
                const ext=getFileExt(hostFile,true);
                appPath=ext?hostFile.substring(0,hostFile.length-ext.length):hostFile;
            }
            if(!importPath){
                importPath=targetOut.substring(app.dir.length);
                if(!importPath.startsWith('/')){
                    importPath='/'+importPath;
                }
                importPath='@'+importPath;
                const ext=getFileExt(importPath,true);
                if(ext){
                    importPath=importPath.substring(0,importPath.length-ext.length);
                }
            }
        }


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
            hostMode,
            hostFile,
            importPath,
        }
    }

    public getAppCtrl(name:string):ConvoMakeAppCtrl|undefined{
        const existing=this.apps.find(a=>a.app.name===name);
        if(existing){
            return existing;
        }
        const app=this.options.apps.find(a=>a.name==name);
        if(!app){
            if(name===directUrlConvoMakeAppName){
                const appCtrl=new ConvoMakeAppCtrl({app:{name:directUrlConvoMakeAppName,dir:'./'},parent:this});
                pushBehaviorSubjectAry(this._apps,appCtrl);
                return appCtrl;
            }
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

    public getTargetRebuildInfo(outPath:string):ConvoMakeTargetRebuild|undefined{
        if(!this.options.rebuild){
            return undefined;
        }else if(this.options.rebuild===true){
            return {
                path:outPath,
            }
        }
        const ary=asArray(this.options.rebuild);
        for(const r of ary){
            if(typeof r === 'string'){
                if(r===outPath){
                    return {
                        path:outPath
                    }
                }
            }else if(r.path===outPath){
                return r;
            }
        }

        return undefined;
    }
}

interface StarPath
{
    path:string;
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
        path,
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

const applyTemplate=(
    content:string,
    isContext:boolean,
    inputTemplate:ConvoMakeTargetContentTemplate,
    tags?:Record<string,string|boolean>
):string=>{
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

    let convo=`> appendUser\n${escapeConvo(content)}`;
    if(tags){
        for(const e in tags){
            let v=tags[e];
            if(v===false){
                continue;
            }else if(v===true){
                v='';
            }
            v=v?.trim();
            if(v){
                convo=`@${e} ${v}\n${convo}`
            }else{
                convo=`@${e}\n${convo}`
            }
        }
    }
    return convo;
}

const mdSplitReg=/(?=\n[ \t]*##[ \t])/
const splitMarkdown=(md:string):string[]=>{
    const parts=md.split(mdSplitReg).map(v=>v.trim())
    if(!parts[0]){
        parts.shift();
    }
    return parts;
}


