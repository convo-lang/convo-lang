import { ConvoBrowserInf, ConvoBrowserPage } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { createPromiseSource, delayAsync, DisposeContainer, getUriProtocol, PromiseSource } from "@iyio/common";
import { ConvoMakeAppTargetRef, ConvoMakeOutputReview } from "./convo-make-types.js";
import { ConvoMakeAppCtrl } from "./ConvoMakeAppCtrl.js";
import { checkIcon, colorPickerIcon, downIcon, drawIcon, eraserIcon, loadingIcon, noteIcon, sendIcon, textIcon, trashIcon, upIcon, xIcon } from "./icons.js";

const defaultColor='#ff0000'

export class ConvoMakeAppViewer
{
    public readonly appCtrl:ConvoMakeAppCtrl;

    public readonly reviewRequest:ConvoMakeAppTargetRef;

    public readonly instName:string;

    public constructor(appCtrl:ConvoMakeAppCtrl,reviewRequest:ConvoMakeAppTargetRef){
        this.appCtrl=appCtrl;
        this.reviewRequest=reviewRequest;
        this.instName=`CONVO_MAKE_${Date.now()}_${Math.round(Math.random()*100000)}`
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
        this.disposables.dispose();
        this.pagePromise?.then(p=>p.dispose());
    }

    private pagePromise?:Promise<ConvoBrowserPage>|undefined;

    private async openPageAsync(page:ConvoBrowserPage){
        if(this.reviewRequest.reviewType==='http'){
            const url=((this.reviewRequest.appPath && getUriProtocol(this.reviewRequest.appPath))?
                this.reviewRequest.appPath
            :
                `http://${this.appCtrl.app.host??'localhost'}:${this.appCtrl.app.port}/${this.reviewRequest.appPath}`
            );
            await page.openUrlAsync(url);
        }else{
            await page.openSourceAsync('')// todo
        }
    }

    private async getPageAsync(browser:ConvoBrowserInf){
        const page=await browser.createPageAsync();
        try{
            await this.openPageAsync(page);

            if(this.isDisposed){
                page.dispose();
                return page;
            }

            await this.injectAsync(page);

            // do not await
            this.monitorInjectAsync(page);

            return page;
        }catch(ex){
            page.dispose();
            throw ex;
        }
    }

    private firstView=true;
    private reviewSource?:PromiseSource<ConvoMakeOutputReview>;
    public async reviewAsync():Promise<ConvoMakeOutputReview>{
        const browser=this.appCtrl.parent.options.browserInf;
        if(!browser || (!this.appCtrl.app.port && !(this.reviewRequest.appPath && getUriProtocol(this.reviewRequest.appPath)))){
            return {approved:true};
        }

        const ctrl=`window.${this.instName}_ctrl`;

        const page=await (this.pagePromise??(this.pagePromise=this.getPageAsync(browser)));

        try{

            if(this.firstView){
                this.firstView=false;
            }else{
                await this.openPageAsync(page);
            }

            while(true){
                try{
                    await page.evalAsync(`${ctrl}.reset()`);
                    break;
                }catch{}
                await delayAsync(30);
            }

            const reviewSource=createPromiseSource<ConvoMakeOutputReview>();
            this.reviewSource=reviewSource;

            const review=await reviewSource.promise;

            await page.evalAsync(`${ctrl}.hideMenu()`);

            const s=await page.getScreenShotAsync({screenshotBase64Url:true,screenshot:true});
            review.screenshot=s?.screenshot;
            review.screenshotBase64Url=s?.screenshotBase64Url;

            await page.evalAsync(`${ctrl}.showBusy()`);

            return review;
        }finally{
            if(this.isDisposed){
                page.dispose();
            }
        }

    }

    private async monitorInjectAsync(page:ConvoBrowserPage)
    {
        const ctrl=`window.${this.instName}_ctrl`;
        while(!this.isDisposed){
            await delayAsync(2000);

            let mounted=false;
            try{
                mounted=await page.evalAsync(`${ctrl}.isMounted()`);
            }catch{}

            if(!mounted && !this.isDisposed){
                await this.injectAsync(page);
                await delayAsync(3000);
            }
        }
    }

    private async injectAsync(page:ConvoBrowserPage)
    {
        const ctrl=`window.${this.instName}_ctrl`;
        const instName=this.instName;

        await page.injectAsync({
            css:style.getParsed(),
            html:/*html*/`


<div id="${instName}" class="${style.root(null,'approveMode')}" style="${style.varsCss({
    color:'#d5d5d5',
    background:'#000000',
    borderColor:'#777777',
    borderColorActive:'#0a84ff',
    radius:'8px',
    fontSize:'16px',
    controlColor:'#252525',
    controlColorActive:'#444444',
    backgroundTrans:'#00000033',
    inputHeight:'140px',
    dangerColor:'#ed4545',
})}">
    <svg class="${style.canvas({hidden:true})}"></svg>
    <div class="${style.menu()}">
        <div class="${style.controls({editMode:true})}">

            <button class="${style.roundButton()}" onclick="
                ${ctrl}.setMode('approve');
            ">${xIcon(style.icon())}</button>

            <button class="${style.roundButton()}" onclick="
                ${ctrl}.clearCanvas();
            ">${trashIcon(style.icon())}</button>

            <button class="${style.roundButton(null,'eraseTool')}" onclick="
                ${ctrl}.setTool('erase');
            ">${eraserIcon(style.icon())}</button>

            <button class="${style.roundButton(null,'noteTool')}" onclick="
                ${ctrl}.setTool('note');
            ">${textIcon(style.icon())}</button>

            <button class="${style.roundButton(null,'drawTool')}" onclick="
                ${ctrl}.setTool('draw');
            ">${drawIcon(style.icon())}</button>

            <div class="${style.roundButton(null,style.colorPickerContainer())}" style="background-color:${defaultColor}">
                ${colorPickerIcon(style.icon())}
                <input value="${defaultColor}" type="color" class="${style.colorPicker()}" oninput="
                    ${ctrl}.setColor(event.target.value)
                "/>
            </div>
            <div class="${style.inputSlot()}">

                <div class="${style.inputContainer()}">

                    <textarea type="text" id="${instName}_change" placeholder="Enter change instructions" class="${style.input()}"></textarea>
                    <div class="${style.inputSideBar()}">
                        <button class="${style.minBtn(null,'upUiBtn')}" style="display:none" onclick="
                            ${ctrl}.setMinInput(false);
                        ">${upIcon(style.icon())}</button>
                        <button class="${style.minBtn(null,'downUiBtn')}" onclick="
                            ${ctrl}.setMinInput(true);
                        ">${downIcon(style.icon())}</button>
                        <button class="${style.roundButton()}" onclick="
                            ${ctrl}.submit(false,true);
                        ">${sendIcon(style.icon())}</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="${style.controls({approveMode:true})}">
            <button class="${style.roundButton()}" onclick="
                ${ctrl}.submit(true);
            ">${checkIcon(style.icon())}</button>
            <button class="${style.roundButton()}" onclick="
                ${ctrl}.setMode('edit');
            ">${noteIcon(style.icon())}</button>
        </div>

    </div>
    <div class="${style.overlay({hidden:true})}">
        Thinking ${loadingIcon(style.icon({spin:true,lg:true}))}
    </div>
</div>

                `,
                javascript:/*html*/`
<script>
(()=>{

    const select=(className)=>{
        return document.querySelector('#${this.instName} .'+className);
    }

    const root=document.querySelector('#${this.instName}');

    let canvasEnabled=false;
    let color='${defaultColor}';
    let canvasInited=false;
    const initCanvas=()=>{
        if(canvasInited){
            return;
        }
        canvasInited=true;
        const canvas=select('${style.canvas()}');
        console.log('canvas',canvas)
        if (!canvas) return;

        const updateSize=()=>{
            const w=Math.max(document.body.clientWidth,window.innerWidth);
            const h=Math.max(document.body.clientHeight,window.innerHeight);
            canvas.setAttribute('viewport','0 0 '+w+' '+h);
            canvas.style.width=w+'px';
            canvas.style.height=h+'px';
        }
        updateSize();
        setInterval(updateSize,2000);

        let dragging=false;
        let line='';
        let path=null;

        canvas.addEventListener('mousedown',e=>{
            if(dragging || tool!=='draw'){
                return;
            }
            dragging=true;
            line='M'+Math.round(e.clientX+window.scrollX)+' '+Math.round(e.clientY+window.scrollY);
            path=document.createElementNS('http://www.w3.org/2000/svg','path');
            path.classList.add('${style.canvasLine()}')
            path.setAttribute('fill','none');
            path.setAttribute('stroke',color);
            path.setAttribute('stroke-width','4');
            path.setAttribute('stroke-linecap','round');
            path.setAttribute('stroke-linejoin','round');
            path.addEventListener('click',()=>console.log('path click'))
            canvas.append(path);
        });

        canvas.addEventListener('mousemove',e=>{
            if(!dragging || tool!=='draw'){
                return;
            }
            line+=' L'+Math.round(e.clientX+window.scrollX)+' '+Math.round(e.clientY+window.scrollY);
            path.setAttribute('d',line);
        });

        canvas.addEventListener('mouseup',e=>{
            dragging=false;

            if(tool==='note'){
                let over=false;
                const x=e.clientX;
                const y=e.clientY;
                document.querySelectorAll('.${style.noteText()}').forEach(n=>{
                    const b=n.getBoundingClientRect();
                    if(x>=b.left && x<=b.right && y>=b.top && y<=b.bottom){
                        over=true;
                    }
                })
                if(over){
                    return;
                }
                const rect=document.createElementNS('http://www.w3.org/2000/svg','foreignObject');
                rect.classList.add('${style.noteObject()}')
                rect.setAttribute('x',Math.round(x+window.scrollX).toString())
                rect.setAttribute('y',Math.round(y+window.scrollY).toString())
                rect.innerHTML='<textarea class="${style.noteText()}" style="background-color:'+color+';color:'+getContrastTextColor(color)+'">Note</textarea>';
                canvas.append(rect);
            }else if(tool==='erase'){
                if(e.target.classList?.contains('${style.canvasLine()}')){
                    e.target.remove();
                }else if(e.target.classList?.contains('${style.noteText()}')){
                    e.target.parentElement?.remove();
                }
            }
        });
        canvas.addEventListener('mouseleave',()=>{
            dragging=false;
        });
    }

    const clearCanvas=()=>{
        const canvas=select('${style.canvas()}');
        if(canvas){
            canvas.innerHTML='';
        }
    }

    const modes=['approve','edit'];
    let mode='approve';
    const setMode=(_mode)=>{
        console.log('Mode',_mode,root)
        for(const m of modes){
            root.classList.remove(m+'Mode');
        }
        mode=_mode;
        root.classList.add(mode+'Mode');
        updateCanvasEnabled();
        if(mode==='edit' && tool==='none'){
            setTool('draw');
        }
        return mode;
    }

    const tools=['draw','note','erase'];
    let tool='none';
    const setTool=(_tool)=>{
        for(const t of tools){
            root.classList.remove(t+'Tool');
        }
        tool=_tool;
        root.classList.add(tool+'Tool');
        return tool;

    }
    const updateCanvasEnabled=()=>{
        setCanvasEnabled(mode==='edit');
    }
    const setCanvasEnabled=(enabled)=>{
        if(enabled===undefined){
            enabled=!canvasEnabled;
        }
        if(canvasEnabled===enabled){
            return;
        }
        canvasEnabled=enabled;
        if(enabled){
            initCanvas();
            select('${style.canvas()}').classList.remove('hidden');
        }else{
            select('${style.canvas()}').classList.add('hidden');
        }
        return enabled;
    }

    const submit=(approved,message,error)=>{
        if(message===true){
            message=document.getElementById('${instName}_change').value;
        }
        const review={
            approved:approved??true,
            message:message?.trim()||undefined,
            error:error?.trim()||undefined,
        }
        ${instName}_submit(review);
    }

    const reset=()=>{
        console.log('Reset')
        document.getElementById('${instName}_change').value='';
        clearCanvas();
        setMode('approve');
        setTool('draw');
        select('${style.menu()}').classList.remove('hidden');
        select('${style.overlay()}').classList.add('hidden');
    }

    const getContrastTextColor=(bgColor)=>{
        const r=parseInt(bgColor.substring(1,3),16);
        const g=parseInt(bgColor.substring(3,5),16);
        const b=parseInt(bgColor.substring(5,7),16);
        const luminance=(0.299*r+0.587*g+0.114*b)/255;
        return luminance>0.5?'#000000':'#ffffff';
    }

    window.${this.instName}_ctrl={
        initCanvas,
        clearCanvas,
        getCanvasEnabled:()=>canvasEnabled,
        setCanvasEnabled,
        select,
        setMode,
        getColor:()=>color,
        setColor:(c)=>{
            color=c;
            select('${style.colorPickerContainer()}').style.backgroundColor=color;
            return c;
        },
        getMode:()=>mode,
        setTool,
        getTool:()=>tool,
        setMinInput:(min)=>{
            select('${style.minBtn()}.upUiBtn').style.display=min?'block':'none';
            select('${style.minBtn()}.downUiBtn').style.display=!min?'block':'none';
            if(min){
                select('${style.inputContainer()}').classList.add('minUiInput');
                select('${style.inputSlot()}').classList.add('minUiInput');
            }else{
                select('${style.inputContainer()}').classList.remove('minUiInput');
                select('${style.inputSlot()}').classList.remove('minUiInput');

            }
        },
        hideMenu:()=>{
            select('${style.menu()}').classList.add('hidden');
        },
        showBusy:()=>{
            select('${style.overlay()}').classList.remove('hidden');

        },
        submit,
        reset,
        isMounted:()=>true,
    }

})()
</script>
                `,
                callback:[
                    {
                        name:instName+'_submit',
                        callback:(review:ConvoMakeOutputReview)=>{
                            this.reviewSource?.resolve(review);
                        }
                    }
                ]
            });
    }
}

const zIndexBase=2147483656;

const style=atDotCss({name:'ConvoMakeAppViewer',disableAutoInsert:true,css:`
    @.root{
        position:absolute;
        top:0;
        left:0;
        font-size:0;
        line-height:0;
    }
    @.root > *{
        font-size:@@fontSize;
        line-height:calc( @@fontSize * 1.2 );
    }
    @.root *{
        color:@@color;
    }
    @.menu{
        display:flex;
        color:@@color;
        position:fixed;
        right:8px;
        bottom:8px;
        align-items:center;
        z-index:${zIndexBase+2};
    }
    @.menu.hidden{
        display:none;
    }

    @.button{
        font-size:@@fontSize;
        border-radius:@@radius;
        border:none;
        padding:8px 12px;
        background:@@controlColor;
        outline:none;
        transition:background-color 0.2s ease-in-out;
    }
    @.button:hover{
        background:@@controlColorActive;
    }

    @.roundButton{
        display:flex;
        justify-content:center;
        align-items:center;
        border-radius:50%;
        border:1px solid @@borderColor;
        width:35px;
        height:35px;
        background:@@controlColor;
        outline:none;
        transition:background-color 0.2s ease-in-out;
        position:relative;
        cursor:pointer;
    }
    @.roundButton:hover{
        background:@@controlColorActive;
    }
    @.root.drawTool @.roundButton.drawTool{
        border-color:@@borderColorActive;
    }
    @.root.drawTool @.roundButton.drawTool svg{
        color:@@borderColorActive;
    }
    @.root.noteTool @.roundButton.noteTool{
        border-color:@@borderColorActive;
    }
    @.root.noteTool @.roundButton.noteTool svg{
        color:@@borderColorActive;
    }
    @.root.eraseTool @.roundButton.eraseTool{
        border-color:@@dangerColor;
    }
    @.root.eraseTool @.roundButton.eraseTool svg{
        color:@@dangerColor;
    }

    @.minBtn{
        border:none;
        background:transparent;
        outline:none;
        cursor:pointer;
    }

    @.icon{
        color:@@color;
        width:16px;
        position:relative;
    }
    @keyframes @@@spin{
        0%{transform:rotate(0deg)}
        100%{transform:rotate(360deg)}
    }
    @.icon.spin{
        animation:@@@spin 2s ease-in-out infinite;
    }
    @.icon.lg{
        width:32px;
        height:32px;
    }

    /*- Canvas -*/
    @.canvas{
        z-index:${zIndexBase+1};
        position:absolute;
        left:0;
        top:0;
        width:100%;
        height:100%;
        overflow:clip;
    }
    @.canvas.hidden{
        display:none;
    }
    @.colorPicker{
        position:absolute;
        cursor:pointer;
        left:0;
        right:0;
        width:100%;
        height:100%;
        opacity:0;
    }
    @.colorPickerContainer{
        position:relative;
    }

    @.root.drawTool @.canvas{
        cursor:crosshair;
    }
    @.root.noteTool @.canvas{
        cursor:text;
    }
    @.canvasLine{}
    @.root.eraseTool @.canvasLine:hover{
        stroke:@@dangerColor !important;
        cursor:not-allowed !important;
        outline:2px dashed @@dangerColor;
    }

    /*- Overlay -*/

    @.overlay{
        display:flex;
        justify-content:center;
        align-items:center;
        font-size:calc( @@fontSize * 2);
        position:fixed;
        left:0;
        top:0;
        width:100%;
        height:100%;
        background:@@backgroundTrans;
        backdrop-filter:blur(2px);
        z-index:${zIndexBase+3};
        gap:8px;
    }
    @.overlay.hidden{
        display:none;
    }

    /*- Controls stack -*/
    @.controls{
        display:none;
        flex-direction:column;
        gap:8px;
    }
    @.root.editMode @.controls.editMode{
        display:flex;
    }
    @.root.approveMode @.controls.approveMode{
        display:flex;
    }



    /*- input -*/
    @.inputSlot{
        position:relative;
        align-self:end;
        height:@@inputHeight;
    }
    @.inputSlot.minUiInput{
        height:auto;
    }
    @.inputContainer{
        position:absolute;
        display:flex;
        right:0;
        top:0;
        width:600px;
        max-width:95vw;
        height:@@inputHeight;
        color:@@color;
        background-color:@@background;
        border:1px solid @@borderColor;
        border-radius:@@radius;
        padding:8px;
        align-items:stretch;
        gap:8px;
    }
    @.inputContainer.minUiInput{
        width:auto;
        height:auto;
        border:none;
        padding:0;
        position:relative;
    }
    @.inputContainer.minUiInput @.input{
        display:none;
    }
    @.input{
        color:@@color;
        padding:0;
        font-size:@@fontSize;
        background-color:@@background;
        outline:none;
        transition:border-color 0.2s ease-in-out;
        flex:1;
        resize:none;
    }
    @.input:focus{
        border-color:@@borderColorActive;
    }
    @.inputSideBar{
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        align-items:center;
    }

    /*- note -*/
    @.noteObject{
        overflow:visible;
        pointer-events:none;
    }
    @.root.noteTool @.noteObject, @.root.eraseTool @.noteObject{
        pointer-events:auto;
    }
    @.noteText{
        font-size:14px;
        padding:8px;
        border-radius:@@radius;
        width:150px;
        height:80px;
    }
    @.root.eraseTool @.noteText:hover{
        outline:2px dashed @@dangerColor;
        outline-offset:4px;
        cursor:not-allowed !important;
    }

`});
