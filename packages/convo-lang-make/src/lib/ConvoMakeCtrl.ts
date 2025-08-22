import { Conversation, ConvoBrowserInf, convoVars, escapeConvo, insertConvoContentIntoSlot } from "@convo-lang/convo-lang";
import { asArray, getDirectoryName, getFileExt, getFileNameNoExt, InternalOptions, joinPaths, normalizePath, parseCsvRows, pushBehaviorSubjectAry, ReadonlySubject, starStringToRegex, strHashBase64Fs } from "@iyio/common";
import { vfs, VfsCtrl } from "@iyio/vfs";
import { BehaviorSubject } from "rxjs";
import { convoMakeOutputTypeName, defaultConvoMakePreviewPort, getConvoMakeTargetOutType } from "./convo-make-lib";
import { ConvoMakeApp, ConvoMakeAppTargetRef, ConvoMakeContentTemplate, ConvoMakeExplicitReviewType, ConvoMakeInput, ConvoMakeShell, ConvoMakeTarget, ConvoMakeTargetDeclaration } from "./convo-make-types";
import { ConvoMakeAppCtrl } from "./ConvoMakeAppCtrl";
import { ConvoMakeTargetCtrl } from "./ConvoMakeTargetCtrl";

export interface ConvoMakeCtrlOptions
{
    vfsCtrl?:VfsCtrl;
    shell?:ConvoMakeShell;
    browserInf?:ConvoBrowserInf;
    targets:ConvoMakeTargetDeclaration[];
    apps?:ConvoMakeApp[];
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
}

export class ConvoMakeCtrl
{

    public readonly options:InternalOptions<ConvoMakeCtrlOptions,'shell'|'browserInf'>;

    private readonly _targets:BehaviorSubject<ConvoMakeTargetCtrl[]>=new BehaviorSubject<ConvoMakeTargetCtrl[]>([]);
    public get targetsSubject():ReadonlySubject<ConvoMakeTargetCtrl[]>{return this._targets}
    public get targets(){return this._targets.value}

    private readonly _apps:BehaviorSubject<ConvoMakeAppCtrl[]>=new BehaviorSubject<ConvoMakeAppCtrl[]>([]);
    public get appsSubject():ReadonlySubject<ConvoMakeAppCtrl[]>{return this._apps}
    public get apps(){return this._apps.value}

    public constructor({
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
    }:ConvoMakeCtrlOptions){
        this.options={
            vfsCtrl,
            targets,
            dir,
            echoMode,
            dryRun,
            apps,
            shell,
            browserInf,
            previewPort,
            continueReview,
        }
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
    }

    private buildPromise:Promise<void>|undefined;
    public buildAsync()
    {
        return this.buildPromise??(this.buildPromise=this._buildAsync());
    }

    private async _buildAsync()
    {

        const targets=await this.getTargetsAsync();
        if(this.isDisposed){
            return;
        }

        const ctrls=targets.map(target=>new ConvoMakeTargetCtrl({
            target,
            makeCtrl:this,
        }));

        this._targets.next(ctrls);

        console.log('hio 👋 👋 👋 targets',targets,ctrls);

        await Promise.all(ctrls.map(t=>t.buildAsync()));

        console.log('hio 👋 👋 👋 DONE',);
    }

    public forkTargetList(parent:ConvoMakeTargetCtrl,listInput:ConvoMakeInput,index:number):ConvoMakeTargetCtrl
    {
        console.log('hio 👋 👋 👋 fork input',listInput);
        if(!parent.target.outIsList){
            throw new Error('Only targets that outIsList is true should be forked')
        }
        const target:ConvoMakeTarget={...parent.target,in:[]};
        delete target.outIsList;
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
            makeCtrl:this,
            parent,
        });
        pushBehaviorSubjectAry(this._targets,targetCtrl);
        return targetCtrl;
    }

    public async getTargetsAsync():Promise<ConvoMakeTarget[]>{

        const targets:ConvoMakeTarget[]=[];

        await Promise.all(this.options.targets.map(t=>this.resolveTargetAsync(t,targets)));

        return targets;
    }

    private async resolveTargetAsync(dec:ConvoMakeTargetDeclaration,targets:ConvoMakeTarget[]){
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
                const items=await this.options.vfsCtrl.readDirAsync({path:input});
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
            outIsList:dec.inList?true:undefined,
        }

        if(multiOut && !sharedProps.outIsList){
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
                    in:await this.createInputAryAsync({...input,path:removeDir(input.path,cwd)},dir,cwd,dec),
                    out:removeDir(output,cwd),
                }
                if(isDynamic){
                    target.dynamicOutReg=starStringToRegex(output);
                }
                targets.push(target)

            }
        }else{
            for(const out of outputs){
                const target:ConvoMakeTarget={
                    ...sharedProps,
                    in:await this.createInputAryAsync(inputs.map(i=>({...i,path:removeDir(i.path,cwd)})),dir,cwd,dec),
                    out:removeDir(out,cwd),
                }

                targets.push(target);
            }
        }
    }

    private async createInputAryAsync(inputFile:PathAndStarPath|PathAndStarPath[]|undefined,dir:string,cwd:string,dec:ConvoMakeTargetDeclaration):Promise<ConvoMakeInput[]>{
        const inputAry:ConvoMakeInput[]=[];

        if(dec.instructions){
            inputAry.push(...await this.contentToConvoAsync(
                undefined,undefined,dec,false,true,
                `${dec.outType || dec.outListType?`@json = ${convoMakeOutputTypeName}\n`:''}> user\n${escapeConvo(dec.instructions)}`,true)
            );
        }

        if(dec.context){
            const ary=asArray(dec.context);
            for(const c of ary){
                const path=removeDir(normalizePath(joinPaths(dir,c)),cwd);
                const content=await this.loadFileAsync(path);
                inputAry.push(...await this.contentToConvoAsync(path,undefined,dec,true,false,content))
            }
        }

        if(Array.isArray(inputFile)){
            for(const f of inputFile){
                const content=await this.loadFileAsync(f.path);
                inputAry.push(...await this.contentToConvoAsync(f.path,f.isList,dec,false,undefined,content))
            }
        }else if(inputFile){
            const content=await this.loadFileAsync(inputFile.path);
            inputAry.push(...await this.contentToConvoAsync(inputFile.path,inputFile.isList,dec,false,undefined,content));
        }

        return inputAry;
    }

    private fileCache:Record<string,Promise<string|undefined>>={};
    private loadFileAsync(relPath:string):Promise<string|undefined>
    {
        const path=normalizePath(joinPaths(this.options.dir,relPath));
        return this.fileCache[relPath]??(this.fileCache[relPath]=(async ()=>{
            try{
                return await this.options.vfsCtrl.readStringAsync(path);
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

    public getDynamicDependencies(relPath:string):ConvoMakeTargetCtrl[]
    {
        const deps:ConvoMakeTargetCtrl[]=[];
        for(const ctrl of this.targets){
            if(ctrl.target.dynamicOutReg?.test(relPath) && ctrl.target.in.some(t=>!t.ready)){
                deps.push(ctrl);
            }
        }
        return deps;
    }

    public areDynamicDependenciesReady(relPath:string):boolean{
        const deps=this.getDynamicDependencies(relPath);
        return !deps.length || deps.every(d=>d.target.in.every(i=>i.ready))
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

        if(isConvoFile && content){
            content=content.trim();
        }

        if(isConvoFile && relPath && content && importReg.test(content)){
            const conversation=this.createConversation(relPath);
            const imports:string[]=[];
            const sub=conversation.onImportSource.subscribe(i=>imports.push(i.trim()));
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
        console.log('hio 👋 👋 👋 convo',conversation);
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
}

interface StarPath
{
    start:string;
    end:string;
}

interface PathAndStarPath
{
    path:string;
    star?:StarPath;
    isList?:boolean;
}

const parseStarPath=(path:string):StarPath|undefined=>{
    const parts=path.split(/\*+/);
    if(parts.length!==2){
        return undefined;
    }
    return {
        start:parts[0] as string,
        end:parts[1] as string,
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
