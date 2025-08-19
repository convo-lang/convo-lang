import { Conversation, ConvoBrowserInf, convoVars, escapeConvo, insertConvoContentIntoSlot } from "@convo-lang/convo-lang";
import { asArray, getDirectoryName, getFileNameNoExt, InternalOptions, joinPaths, normalizePath, pushBehaviorSubjectAry, ReadonlySubject, strHashBase64Fs } from "@iyio/common";
import { vfs, VfsCtrl } from "@iyio/vfs";
import { BehaviorSubject } from "rxjs";
import { defaultConvoMakePreviewPort } from "./convo-make-lib";
import { ConvoMakeApp, ConvoMakeAppTargetRef, ConvoMakeContentTemplate, ConvoMakeExplicitReviewType, ConvoMakeInput, ConvoMakeShell, ConvoMakeTarget, ConvoMakeTargetAppProps, ConvoMakeTargetDeclaration } from "./convo-make-types";
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
        previewPort=defaultConvoMakePreviewPort
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
            parent:this,
        }));

        this._targets.next(ctrls);

        console.log('hio 👋 👋 👋 targets',targets);

        await Promise.all(ctrls.map(t=>t.buildAsync()));

        console.log('hio 👋 👋 👋 DONE',);
    }

    public async getTargetsAsync():Promise<ConvoMakeTarget[]>{

        const targets:ConvoMakeTarget[]=[];

        await Promise.all(this.options.targets.map(t=>this.evalTargetAsync(t,targets)));

        return targets;
    }

    private async evalTargetAsync(dec:ConvoMakeTargetDeclaration,targets:ConvoMakeTarget[]){
        if(!dec.out){
            return;
        }
        const decInputs=dec.in?asArray(dec.in):[];

        const dir=normalizePath(dec.dir??'.');
        const cwd=normalizePath(this.options.dir);
        const outputs=asArray(dec.out).map(o=>normalizePath(joinPaths(dir,o)));
        const multiOut=outputs.length>1 || outputs.some(o=>o.includes('*'));
        if(!outputs.length){
            return;
        }

        const inGroups=await Promise.all(decInputs.map<Promise<PathAndStarPath[]>>(async input=>{
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
                return [{path:input}];
            }
        }))

        const inputs:PathAndStarPath[]=[];
        for(const g of inGroups){
            inputs.push(...g);
        }

        const appProps:ConvoMakeTargetAppProps={
            review:dec.review,
            app:dec.app,
            appPath:dec.appPath,
            keepAppPathExt:dec.keepAppPathExt,
        }


        if(multiOut){
            for(let i=0;i<inputs.length;i++){
                const input=inputs[i];
                let output=outputs[i%outputs.length];
                if(!output || !input){
                    continue;
                }
                const outStar=parseStarPath(output);
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
                targets.push({
                    ...appProps,
                    in:await this.createInputAryAsync(removeDir(input.path,cwd),dir,cwd,dec),
                    out:removeDir(output,cwd),
                })

            }
        }else{
            for(const out of outputs){
                targets.push({
                    ...appProps,
                    in:await this.createInputAryAsync(inputs.map(i=>removeDir(i.path,cwd)),dir,cwd,dec),
                    out:removeDir(out,cwd),
                })
            }
        }
    }

    private async createInputAryAsync(inputFile:string|string[]|undefined,dir:string,cwd:string,dec:ConvoMakeTargetDeclaration):Promise<ConvoMakeInput[]>{
        const inputAry:ConvoMakeInput[]=[];

        if(dec.instructions){
            inputAry.push(await this.contentToConvoAsync(undefined,dec,false,`> system\n${escapeConvo(dec.instructions)}`,true))
        }

        if(dec.context){
            const ary=asArray(dec.context);
            for(const c of ary){
                const path=removeDir(normalizePath(joinPaths(dir,c)),cwd);
                const content=await this.loadFileAsync(path);
                inputAry.push(await this.contentToConvoAsync(path,dec,true,content))
            }
        }

        if(Array.isArray(inputFile)){
            for(const f of inputFile){
                const content=await this.loadFileAsync(f);
                inputAry.push(await this.contentToConvoAsync(f,dec,false,content))
            }
        }else if(inputFile){
            const content=await this.loadFileAsync(inputFile);
            inputAry.push(await this.contentToConvoAsync(inputFile,dec,false,content));
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

    public async contentToConvoAsync(
        relPath:string|undefined,
        tmpl:ConvoMakeContentTemplate,
        isContext:boolean,
        content:string|null|undefined,
        isConvoFile?:boolean
    ):Promise<ConvoMakeInput>{

        const ready=content!==null && content!==undefined;

        if(isConvoFile===undefined){
            isConvoFile=relPath?.toLowerCase().endsWith('.convo')??false;
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
                console.log('hio 👋 👋 👋 before flat',);
                await conversation.flattenAsync(undefined,{importOnly:true});
                console.log('hio 👋 👋 👋 flattned',);
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
            convo:content?isConvoFile?content:applyTemplate(content,isContext,tmpl):undefined,
            ready,
            hash,
            isConvoFile,
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

const applyTemplate=(content:string,isContext:boolean,inputTemplate:ConvoMakeContentTemplate)=>{
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

    return `> system\n${escapeConvo(content)}`;
}
