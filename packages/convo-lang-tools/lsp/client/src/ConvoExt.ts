import { convoDefaultModelParam, openAiApiKeyParam, openAiBaseUrlParam, openRouterApiKeyParam, openRouterBaseUrlParam } from "@convo-lang/convo-lang";
import { awsBedrockApiKeyParam, awsBedrockProfileParam, awsBedrockRegionParam } from "@convo-lang/convo-lang-bedrock";
import { ConvoBrowserCtrl } from "@convo-lang/convo-lang-browser";
import { ConvoCliConfig, createConvoCliAsync } from "@convo-lang/convo-lang-cli";
import { ConvoMakeBuildEvt, ConvoMakeCtrl, ConvoMakeCtrlOptions, getConvoMakeOptionsFromVars } from "@convo-lang/convo-lang-make";
import { deleteUndefined, getDirectoryName, normalizePath, ReadonlySubject } from "@iyio/common";
import { vfs } from "@iyio/vfs";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { RelativePattern, workspace } from "vscode";
import { isIgnoredAsync } from "./git-helper.js";

export class ConvoExt
{
    private readonly _makeCtrls:BehaviorSubject<ConvoMakeCtrl[]>=new BehaviorSubject<ConvoMakeCtrl[]>([]);
    public get makeCtrlsSubject():ReadonlySubject<ConvoMakeCtrl[]>{return this._makeCtrls}
    public get makeCtrls(){return this._makeCtrls.value}
    public set makeCtrls(value:ConvoMakeCtrl[]){
        if(value==this._makeCtrls.value){
            return;
        }
        value=[...value];
        value.sort((a,b)=>a.filePath.localeCompare(b.filePath));
        this._makeCtrls.next(value);
    }

    private readonly _onBuildEvent=new Subject<ConvoMakeBuildEvt>();
        public get onBuildEvent():Observable<ConvoMakeBuildEvt>{return this._onBuildEvent}

    public addMakeCtrl(ctrl:ConvoMakeCtrl)
    {
        const update=[...this._makeCtrls.value];
        for(let i=0;i<update.length;i++){
            const m=update[i];
            if(m?.filePath===ctrl.filePath){
                m.dispose();
                update.splice(i,1);
                i--;
            }
        }
        update.push(ctrl);
        update.sort((a,b)=>a.filePath.localeCompare(b.filePath));
        this._makeCtrls.next(update);
        this.bindMakeCtrl(ctrl);
    }

    public async scanMakeCtrlsAsync()
    {
        const folder=workspace.workspaceFolders?.[0];
        if(!folder){
            return;
        }
        const glob=new RelativePattern(folder,'**/*make.convo')
        const makeFiles=await workspace.findFiles(glob);
        if(!makeFiles.length){
            return;
        }

        const all=await Promise.all(makeFiles.map(f=>this.createMakeCtrlAsync({
            filePath:f.path,
            preview:true,
            autoAdd:true,
            skipActiveBuild:true,
            startBuild:true,
        })));

        this._makeCtrls.next(all.filter(c=>c) as ConvoMakeCtrl[]);

    }

    public async createMakeCtrlAsync(opts:ConvoExtCreateMakeCtrlOptions):Promise<ConvoMakeCtrl|undefined>{
        const {
            filePath:_filePath,
            startBuild,
            autoAdd,
            skipActiveBuild,
            ...ctrlOptions
        }=opts;
        try{

            if(await isIgnoredAsync(_filePath)){
                return undefined;
            }

            const filePath=normalizePath(_filePath);

            if(skipActiveBuild){
                const active=this.makeCtrls.find(c=>!c.preview && !c.isDisposed && c.filePath===filePath);
                if(active){
                    return active;
                }
            }

            const cwd=getDirectoryName(filePath);
            const cli=await createConvoCliAsync({
                config:this.getCliConfig(),
                bufferOutput:true,
                exeCwd:cwd,
                sourcePath:filePath,
            });

            const convo=cli.convo;
            convo.append(await vfs().readStringAsync(filePath),{disableAutoFlatten:true,filePath});
            const flat=await convo.flattenAsync();

            const options=getConvoMakeOptionsFromVars(
                filePath,
                cwd,
                flat.exe.sharedVars
            );
            if(!options){
                return;
            }
            const ctrl=new ConvoMakeCtrl({
                ...options,
                ...ctrlOptions,
                //echoMode:true,
                //rebuild:true,
                browserInf:new ConvoBrowserCtrl(),
            });
            if(autoAdd){
                this.addMakeCtrl(ctrl);
            }
            if(startBuild){
                ctrl.buildAsync();
            }
            return ctrl;
        }catch(ex){
            console.error('Failed to create ctrl',opts,'error',ex);
            return undefined;
        }
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

    public getCliConfig():ConvoCliConfig{

        const config=workspace.getConfiguration('convo');

        return {
            overrideEnv:true,
            defaultModel:config.get<string>('defaultModel')?.trim()||undefined,
            env:deleteUndefined({
                [openAiApiKeyParam.typeName]:config.get<string>('openAiApiKey')?.trim()||undefined,
                [openAiBaseUrlParam.typeName]:config.get<string>('openAiBaseUrl')?.trim()||undefined,

                [awsBedrockProfileParam.typeName]:config.get<string>('awsBedrockProfile')?.trim()||undefined,
                [awsBedrockRegionParam.typeName]:config.get<string>('awsBedrockRegion')?.trim()||undefined,
                [awsBedrockApiKeyParam.typeName]:config.get<string>('awsBedrockApiKey')?.trim()||undefined,

                [convoDefaultModelParam.typeName]:config.get<string>('defaultModel')?.trim()||undefined,

                [openRouterApiKeyParam.typeName]:config.get<string>('openRouterApiKey')?.trim()||undefined,
                [openRouterBaseUrlParam.typeName]:config.get<string>('openRouterBaseUrl')?.trim()||undefined,

            }) as Record<string,string>
        };
    }
}

export interface ConvoExtCreateMakeCtrlOptions extends Omit<Partial<ConvoMakeCtrlOptions>,'filePath'>
{
    startBuild?:boolean;
    autoAdd?:boolean;
    skipActiveBuild?:boolean;
    filePath:string
}
