import { Conversation, ConvoMessage, convoMessageToStringSafe, convoRoles, convoTags, convoVars, createConversationFromScope, escapeConvo, getConvoTag, getLastConvoMessageWithRole, parseConvoCode } from "@convo-lang/convo-lang";
import { DocCtrl } from "@convo-lang/studio/DocCtrl";
import type { StudioCtrl } from "@convo-lang/studio/StudioCtrl";
import type { ConvoTuiCtrl } from "@convo-lang/tui/ConvoTuiCtrl";
import { Sprite } from "@convo-lang/tui/tui-types";
import { CodeParsingResult, getDirectoryName, joinPaths, normalizePath, ReadonlySubject, rootScope, uuid } from "@iyio/common";
import { BehaviorSubject, Subscription } from "rxjs";

export interface ConvoTuiConvoCodeCtrlOptions
{
    id?:string;
    tui:ConvoTuiCtrl;
    studio:StudioCtrl;
    doc:DocCtrl;
}

export class ConvoTuiConvoCodeCtrl
{
    public readonly id:string;
    public readonly runOverlayBtnId:string;
    public readonly errorOverlayId:string;
    public readonly inputId:string;
    public readonly tui:ConvoTuiCtrl;
    public readonly isConvo:boolean;
    public readonly doc:DocCtrl;

    public constructor({
        doc,
        id=uuid(),
        tui,
    }:ConvoTuiConvoCodeCtrlOptions){
        this.id=id;
        this.inputId=id;
        this.runOverlayBtnId=`${id}::run`
        this.errorOverlayId=`${id}::error`
        this.doc=doc;
        this.isConvo=doc.uri.path.toLowerCase().endsWith('.convo');
        this._code=new BehaviorSubject<string>('');
        this.tui=tui;
        this.setCode(doc.obj.content??'');
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        clearTimeout(this.queuedParseIv);
    }

    private readonly _code:BehaviorSubject<string>;
    public get codeSubject():ReadonlySubject<string>{return this._code}
    public get code(){return this._code.value}

    private readonly _lineCount:BehaviorSubject<number>=new BehaviorSubject<number>(1);
    public get lineCountSubject():ReadonlySubject<number>{return this._lineCount}
    public get lineCount(){return this._lineCount.value}
    
    private readonly _isCompleting:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isCompletingSubject():ReadonlySubject<boolean>{return this._isCompleting}
    public get isCompleting(){return this._isCompleting.value}

    private readonly _parsed:BehaviorSubject<CodeParsingResult<ConvoMessage[]>|null>=new BehaviorSubject<CodeParsingResult<ConvoMessage[]>|null>(null);
    public get parsedSubject():ReadonlySubject<CodeParsingResult<ConvoMessage[]>|null>{return this._parsed}
    public get parsed(){return this._parsed.value}

    public async completeAsync()
    {
        if(this.isCompleting){
            return;
        }
        let c:Conversation|undefined;
        let sub:Subscription|undefined;
        try{
            this._isCompleting.next(true);
            c=createConversationFromScope(rootScope,{
                enableStreaming:true,
                disableAutoFlatten:true,
            });

            const path=normalizePath(
                this.doc.uri.pathIsAbsolute?
                    this.doc.uri.path
                :this.doc.uri.workspacePath?
                    joinPaths(this.doc.studio.workspacePath,this.doc.uri.path)
                :
                    ''
            )||undefined;

            c.unregisteredVars[convoVars.__mainFile]=path;
            c.unregisteredVars[convoVars.__cwd]=normalizePath(getDirectoryName(path));
            c.unregisteredVars['__projectRoot']=this.doc.studio.workspacePath;
            const r=c.append(this.code,{filePath:path});
            const lastUserMsg=getLastConvoMessageWithRole(r.result??[],convoRoles.user);
            const isJson=getConvoTag(lastUserMsg?.tags,convoTags.json)?true:false;

            const currentCode=this.code.trimEnd()+`\n\n> assistant\n${isJson?'``` json\n':''}`;
            let streamingCode='';
            const updateCode=()=>{
                this.setCode((currentCode+escapeConvo(streamingCode)).trim()+'\n\n',true,true);
            }
            sub=c.onChunk.subscribe((c)=>{
                if(c.chunk){
                    streamingCode+=c.chunk;
                    updateCode();
                }
            })
            
            updateCode();
            await c.completeAsync();
            streamingCode=c.convo;
            if(isJson){
                let i=streamingCode.lastIndexOf('\n> assistant');
                if(i!==-1){
                    i=streamingCode.indexOf('\n',i+1);
                    if(i!==-1){
                        streamingCode=streamingCode.substring(0,i+1)+'``` json\n'+streamingCode.substring(i+1)+'\n```'
                    }
                }
            }
            streamingCode+='\n\n> user\n';
            this._isCompleting.next(false);
            this.setCode(streamingCode,true,true);
            this.parseCode();
            this.tui.activateSprite(this.id,undefined,{inputCaret:streamingCode.length});
        }catch(ex){

        }finally{
            sub?.unsubscribe();
            c?.dispose();
            this._isCompleting.next(false);
        }
    }

    private updateOverlays(render:boolean)
    {
        const runBtn=this.tui.findSpriteById(this.runOverlayBtnId);
        const input=this.tui.findSpriteById(this.inputId);
        const error=this.tui.findSpriteById(this.errorOverlayId);
        const rect=input?.state.renderRect;
        if(!runBtn || !input || !error || !rect){
            return;
        }
        const parsed=this._parsed.value;
        let left=-200;
        let top=0;
        if(this.isCompleting){
            left=rect.x+1;
            top=rect.y+this.lineCount-(input.state.scrollY??0)-1;
        }else if(!parsed?.error && parsed?.result){
            const messages=parsed.result;
            const lastUserMsg=getLastConvoMessageWithRole(messages,convoRoles.user);
            if(lastUserMsg){
                const line=lastUserMsg.ln??1;
                const src=convoMessageToStringSafe(lastUserMsg);
                if(src){
                    const match=lineReg.exec(src);
                    if(match){
                        left=rect.x+2+(match?.groups?.['line']?.length??20);
                        top=rect.y+line-1-(input.state.scrollY??0);
                    }
                }
                
            }

        }
        if(top<rect.y || top>=rect.y+rect.height){
            left=-200;
        }
        runBtn.absolutePosition={
            left,
            top,
        };


        if(parsed?.error){
            const err=parsed.error;
            let top=rect.y-(input.state.scrollY??0)+err.lineNumber-1;
            let msg=` ⚠ ${err.message} `
            if(top>=rect.y+rect.height){
                top=rect.y+rect.height-1;
                msg=` ⬇ line ${err.lineNumber} ⬇ ${msg.trim()} `
            }else if(top<rect.y){
                top=rect.y;
                msg=` ⬆ line ${err.lineNumber} ⬆ ${msg.trim()} `
            }
            error.absolutePosition={left:rect.x+err.col+2,top};
            error.text=msg;
            error.width=error.text.length;
        }else{
            error.absolutePosition={left:-200,top:0};
        }

        if(render){
            this.tui.render();
        }
    }

    public beforeRenderInput(input:Sprite){
        this.updateOverlays(false);
    }

    public parseCode()
    {
        if(this.isDisposed || !this.isConvo){
            return;
        }
        clearTimeout(this.queuedParseIv);
        this.nextRequiredParse=0;
        const r=this.code.trim()?parseConvoCode(this.code):null
        this._parsed.next(r);
        this.updateOverlays(true);
    }

    private queuedParseIv:any;
    private nextRequiredParse=0;
    public queueParseCode()
    {
        if(this.isDisposed || !this.isConvo){
            return;
        }

        if(this._parsed.value){
            this._parsed.next(null);
            this.updateOverlays(false);
        }

        clearTimeout(this.queuedParseIv);

        if(this.nextRequiredParse){
            if(Date.now()>this.nextRequiredParse){
                this.nextRequiredParse=0;
                this.parseCode();
                return;
            }
        }else{
            this.nextRequiredParse=Date.now()+5000;
        }

        this.queuedParseIv=setTimeout(()=>{
            this.nextRequiredParse=0;
            this.parseCode();
        },1000);
    }

    public setCode(value:string,updateUi=true,moveCursorToEnd=false){
        this._code.next(value);
        this.updateLineCount();
        this.updateOverlays(false);

        if(updateUi){
            this.tui.updateSprite(this.inputId,sprite=>{
                sprite.text=this.code;
                sprite.state.inputValue=this.code;
                if(moveCursorToEnd){
                    sprite.state.inputCaret=this.code.length;
                    this.tui.setSpriteScrollEnd(sprite);
                }
            });
        }

        this.queueParseCode();
    }

    private updateLineCount(){
        let lineCount=1;
        const code=this.code;
        for(let i=0;i<code.length;i++){
            if(code.charCodeAt(i)===nlCharPoint){
                lineCount++;
            }
        }
        this._lineCount.next(lineCount);
    }
}

const nlCharPoint='\n'.charCodeAt(0);
const lineReg=/(^|\n)(?<line>[ \t]*>[ \t]*user.*?[\r\n])/;