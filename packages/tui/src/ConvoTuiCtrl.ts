import { Char, Screen, ScreenBuffer, ScreenBufferState, ScreenDef, Sprite, SpriteBorderStyle, SpriteDef, SpriteGridColSize, SpriteMouseButton, SpriteMouseModifiers, SpriteMouseWheelDirection, SpriteTextAlignment, SpriteTextClipStyle, SpriteTextWrap, SpriteUpdate, TuiConsole, TuiTheme } from "./tui-types.js";

export interface ConvoTuiCtrlOptions
{
    screens:ScreenDef[];
    console:TuiConsole;
    theme:TuiTheme;

    /**
     * Id of the screen to activate by default. If undefined the first screen in `screens`
     * will be used.
     */
    defaultScreen?:string;
}

interface TuiSize
{
    width:number;
    height:number;
}

interface TuiRect extends TuiSize
{
    x:number;
    y:number;
}

interface TuiStyle
{
    f?:string;
    b?:string;
}

interface TuiInlineChar extends TuiStyle
{
    c:string;
}

interface TuiFocusableSprite
{
    sprite:Sprite;
    order:number;
}

interface TuiCursorPosition
{
    x:number;
    y:number;
}

interface TuiMouseTarget
{
    sprite:Sprite;
    screen:Screen;
    path:Sprite[];
}

type TuiSgrMouseAction='press'|'release'|'drag'|'wheel';

interface TuiSgrMouseEvt
{
    action:TuiSgrMouseAction;
    x:number;
    y:number;
    button:SpriteMouseButton;
    direction?:SpriteMouseWheelDirection;
    modifiers:SpriteMouseModifiers;
}

/**
 * Properties that are inherited from ancestors
 * Inherited properties are marked with the `@inherited` tag in the Sprite interface.
 */
interface TuiInheritedSpriteProps
{
    textAlign?:SpriteTextAlignment;
}

interface TuiAbsoluteSprite
{
    sprite:Sprite;
    inheritedProps:TuiInheritedSpriteProps;
}

export class ConvoTuiCtrl
{



    public readonly screens:Screen[]=[];
    public readonly console:TuiConsole;
    public readonly theme:TuiTheme;

    private readonly bufferState:ScreenBufferState={
        width:0,
        height:0,
        front:[],
        back:[],
    };

    private readonly cleanupCallbacks:(()=>void)[]=[];
    private readonly clipStack:TuiRect[]=[];
    private inputBuffer='';
    private inputCursor?:TuiCursorPosition;
    private isInitialized=false;
    private forceFullRender=true;

    private _activeScreen?:Screen;
    public get activeScreen(){return this._activeScreen}

    public constructor({
        screens,
        console,
        theme,
        defaultScreen,
    }:ConvoTuiCtrlOptions){
        this.console=console;
        this.theme=theme;
        this.screens=this.loadScreens(screens);
        this._activeScreen=this.getInitialScreen(defaultScreen);
        if(this._activeScreen){
            this.prepareActiveScreen(this._activeScreen);
        }
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;

        for(const cb of this.cleanupCallbacks.splice(0)){
            cb();
        }

        this.console.stdin.setRawMode?.(false);
        this.console.stdin.pause?.();

        this.writeAnsi('\x1b[0m\x1b[?1000l\x1b[?1006l\x1b[?2004l\x1b[?25h\x1b[?1049l');
    }

    public addDisposeCallback(callback:()=>void){
        if(this.isDisposed){
            callback();
            return;
        }
        this.cleanupCallbacks.push(callback);
    }
    

    private nextId:number=1;
    /**
     * Returns an id that can be used when converting screen and sprite definitions into 
     * screens and sprites.
     */
    private getNextId():string{
        return `_${this.nextId++}`;
    }

    /**
     * Intializes the terminal
     */
    public init(){
        if(this.isInitialized || this._isDisposed){
            return;
        }
        this.isInitialized=true;
        
        this.resizeBuffers();

        this.writeAnsi('\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h\x1b[?2004h\x1b[2J\x1b[H');

        this.console.stdin.setRawMode?.(true);
        this.console.stdin.resume?.();

        const onData=(data:any)=>this.handleInput(data);
        const onResize=()=>{
            this.resizeBuffers();
            this.render();
        };

        this.console.stdin.on?.('data', onData);
        this.console.stdout.on?.('resize', onResize);

        this.cleanupCallbacks.push(()=>{
            this.console.stdin.off?.('data', onData);
            this.console.stdout.off?.('resize', onResize);
        });

        this.render();
    }

    private loadScreens(defs:ScreenDef[]):Screen[]
    {
        return defs.map(def=>({
            ...def,
            id:def.id??this.getNextId(),
            root:this.loadSprite(def.root),
            state:def.state?{...def.state}:undefined,
        }));
    }

    private loadSprite(def:SpriteDef):Sprite
    {
        const sprite:Sprite={
            ...def,
            id:def.id??this.getNextId(),
            children:def.children?.map(child=>this.loadSprite(child)),
            state:def.state?{...def.state}:undefined,
        };

        if(sprite.onInput && sprite.isInput===undefined){
            sprite.isInput=true;
        }
        if(sprite.onClick && sprite.isButton===undefined){
            sprite.isButton=true;
        }

        return sprite;
    }

    private getInitialScreen(defaultScreen?:string):Screen|undefined
    {
        if(defaultScreen){
            return this.findScreen(defaultScreen)??this.screens[0];
        }
        return this.screens[0];
    }

    private prepareActiveScreen(screen:Screen)
    {
        screen.state??={};
        if(!screen.state.activeSpriteId && screen.defaultSprite){
            const sprite=this.findSpriteById(screen.defaultSprite, screen);
            if(sprite){
                screen.state.activeSpriteId=sprite.id;
            }
        }
        this.syncActiveSpriteStates(screen);
    }

    private syncActiveSpriteStates(screen:Screen)
    {
        const activeId=screen.state?.activeSpriteId;

        const visit=(sprite:Sprite)=>{
            const active=!!activeId && sprite.id===activeId;

            if(sprite.state || active){
                sprite.state??={};
                sprite.state.active=active;
            }

            for(const child of sprite.children??[]){
                visit(child);
            }
        };

        visit(screen.root);
    }

    public findScreen(id:string):Screen|undefined
    {
        return this.screens.find(screen=>screen.id===id);
    }

    public findSpriteById(id:string|null|undefined, screen?:Screen):Sprite|undefined
    {
        if(id==null || id===undefined){
            return undefined;
        }

        if(screen){
            return this.findSpriteInTree(screen.root, id);
        }

        for(const s of this.screens){
            const sprite=this.findSpriteInTree(s.root, id);
            if(sprite){
                return sprite;
            }
        }

        return undefined;
    }

    private findSpriteInTree(sprite:Sprite, id:string):Sprite|undefined
    {
        if(sprite.id===id){
            return sprite;
        }

        for(const child of sprite.children??[]){
            const found=this.findSpriteInTree(child, id);
            if(found){
                return found;
            }
        }

        return undefined;
    }

    private findSpritePathById(id:string, screen:Screen):Sprite[]|undefined
    {
        return this.findSpritePathInTree(screen.root, id);
    }

    private findSpritePathInTree(sprite:Sprite, id:string):Sprite[]|undefined
    {
        if(sprite.id===id){
            return [sprite];
        }

        for(const child of sprite.children??[]){
            const path=this.findSpritePathInTree(child, id);
            if(path){
                return [sprite, ...path];
            }
        }

        return undefined;
    }

    private findScreenContainingSprite(sprite:Sprite):Screen|undefined
    {
        for(const screen of this.screens){
            if(this.containsSprite(screen.root, sprite)){
                return screen;
            }
        }
        return undefined;
    }

    private containsSprite(root:Sprite, sprite:Sprite):boolean
    {
        if(root===sprite){
            return true;
        }

        for(const child of root.children??[]){
            if(this.containsSprite(child, sprite)){
                return true;
            }
        }

        return false;
    }

    public activateScreen(id:string):Screen|undefined
    {
        const screen=this.findScreen(id);
        if(!screen){
            return undefined;
        }

        if(this._activeScreen===screen){
            return screen;
        }

        const prev=this._activeScreen;
        if(prev){
            prev.onDeactivate?.({
                type:'deactivate',
                screen:prev,
                ctrl:this,
            });
            if(prev.transient){
                prev.state={};
            }
        }

        this._activeScreen=screen;
        this.prepareActiveScreen(screen);

        screen.onActivate?.({
            type:'activate',
            screen,
            ctrl:this,
        });

        this.render();

        return screen;
    }

    public activateSprite(id:string|undefined|null, screen?:Screen|string):Sprite|undefined
    {
        if(typeof id !== 'string'){
            return undefined;
        }
        const targetScreen=typeof screen==='string'?this.findScreen(screen):(screen??this._activeScreen);
        if(!targetScreen){
            return undefined;
        }

        const sprite=this.findSpriteById(id, targetScreen);
        if(!sprite){
            return undefined;
        }

        targetScreen.state??={};
        targetScreen.state.activeSpriteId=sprite.id;
        this.syncActiveSpriteStates(targetScreen);

        this.render();

        return sprite;
    }

    public activateLink(link:string, sourceScreen?:Screen|string):Screen|Sprite|undefined
    {
        const localScreen=typeof sourceScreen==='string'?this.findScreen(sourceScreen):sourceScreen;

        if(localScreen){
            const localSprite=this.findSpriteById(link, localScreen);
            if(localSprite){
                this.activateScreen(localScreen.id);
                this.activateSprite(localSprite.id, localScreen);
                return localSprite;
            }
        }

        const screen=this.findScreen(link);
        if(screen){
            return this.activateScreen(screen.id);
        }

        for(const s of this.screens){
            const sprite=this.findSpriteById(link, s);
            if(sprite){
                this.activateScreen(s.id);
                this.activateSprite(sprite.id, s);
                return sprite;
            }
        }

        return undefined;
    }

    public followLink(spriteOrId:Sprite|string):Screen|Sprite|undefined
    {
        const sprite=typeof spriteOrId==='string'?this.findSpriteById(spriteOrId):spriteOrId;
        if(!sprite?.link){
            return undefined;
        }

        return this.activateLink(sprite.link, this.findScreenContainingSprite(sprite));
    }

    private resizeBuffers():boolean
    {
        const width=this.console.stdout.columns??80;
        const height=this.console.stdout.rows??24;

        if(this.bufferState.width===width && this.bufferState.height===height){
            return false;
        }

        this.bufferState.width=width;
        this.bufferState.height=height;
        this.bufferState.front=this.createBuffer(width, height);
        this.bufferState.back=this.createBuffer(width, height);
        this.forceFullRender=true;

        return true;
    }

    private createBuffer(width:number, height:number):ScreenBuffer
    {
        return Array.from({length:height},()=>Array.from({length:width},()=>this.createChar()));
    }

    private createChar(char=' ', spriteId=''):Char
    {
        return {
            c:char,
            f:this.resolveColor(this.theme.foreground),
            b:this.resolveColor(this.theme.background),
            i:spriteId,
        };
    }

    public render()
    {
        if(this._isDisposed){
            return;
        }

        this.inputCursor=undefined;
        this.resizeBuffers();
        this.clearBuffer(this.bufferState.back);

        const screen=this._activeScreen;
        if(screen){
            this.syncActiveSpriteStates(screen);

            const rect:TuiRect={
                x:0,
                y:0,
                width:this.bufferState.width,
                height:this.bufferState.height,
            };
            this.drawSprite(screen.root, rect, {
                f:this.resolveColor(this.theme.foreground),
                b:this.resolveColor(this.theme.background),
            });
            this.drawAbsoluteSprites(screen.root);
        }

        const output=(
            this.forceFullRender?
                this.renderBufferAnsi(this.bufferState.back)
            :
                this.renderBufferDiffAnsi(this.bufferState.front, this.bufferState.back)
        );

        this.copyBackBufferToFront();
        this.forceFullRender=false;

        const cursorOutput=this.getCursorAnsi();
        if(output || cursorOutput){
            this.writeAnsi(`\x1b[?25l${output}${cursorOutput}`);
        }
    }

    private clearBuffer(buffer:ScreenBuffer)
    {
        for(let y=0;y<this.bufferState.height;y++){
            for(let x=0;x<this.bufferState.width;x++){
                buffer[y]![x]=this.createChar();
            }
        }
    }

    private copyBackBufferToFront()
    {
        this.bufferState.front=this.bufferState.back.map(row=>row.map(char=>({...char})));
    }

    private renderBufferAnsi(buffer:ScreenBuffer):string
    {
        let output='\x1b[0m\x1b[H';
        let activeF:string|undefined;
        let activeB:string|undefined;

        for(let y=0;y<buffer.length;y++){
            const row=buffer[y]!;
            for(let x=0;x<row.length;x++){
                const char=row[x]!;
                if(char.f!==activeF){
                    output+=this.getFgAnsi(char.f);
                    activeF=char.f;
                }
                if(char.b!==activeB){
                    output+=this.getBgAnsi(char.b);
                    activeB=char.b;
                }
                output+=char.c;
            }
            if(y<buffer.length-1){
                output+='\r\n';
            }
        }

        return `${output}\x1b[0m`;
    }

    private renderBufferDiffAnsi(front:ScreenBuffer, back:ScreenBuffer):string
    {
        let output='';
        let activeF:string|undefined;
        let activeB:string|undefined;

        for(let y=0;y<back.length;y++){
            const backRow=back[y]!;
            const frontRow=front[y]??[];

            let x=0;
            while(x<backRow.length){
                if(this.isSameRenderChar(frontRow[x], backRow[x])){
                    x++;
                    continue;
                }

                output+=this.getCursorPositionAnsi(x, y);

                while(x<backRow.length && !this.isSameRenderChar(frontRow[x], backRow[x])){
                    const char=backRow[x]!;
                    if(char.f!==activeF){
                        output+=this.getFgAnsi(char.f);
                        activeF=char.f;
                    }
                    if(char.b!==activeB){
                        output+=this.getBgAnsi(char.b);
                        activeB=char.b;
                    }
                    output+=char.c;
                    x++;
                }
            }
        }

        return output?`\x1b[0m${output}\x1b[0m`:'';
    }

    private isSameRenderChar(a:Char|undefined, b:Char|undefined):boolean
    {
        return a?.c===b?.c && a?.f===b?.f && a?.b===b?.b;
    }

    private getCursorPositionAnsi(x:number, y:number):string
    {
        return `\x1b[${y+1};${x+1}H`;
    }

    private getCursorAnsi():string
    {
        if(!this.inputCursor){
            return '\x1b[?25l';
        }

        return `${this.getCursorPositionAnsi(this.inputCursor.x, this.inputCursor.y)}\x1b[?25h`;
    }

    private drawSprite(sprite:Sprite, rect:TuiRect, parentStyle:TuiStyle, inheritedProps:TuiInheritedSpriteProps={})
    {
        rect=this.clampRect(rect);
        if(rect.width<=0 || rect.height<=0){
            return;
        }

        const active=this.isSpriteActive(sprite);
        const nextInheritedProps:TuiInheritedSpriteProps={
            ...inheritedProps,
            textAlign:sprite.textAlign??inheritedProps.textAlign,
        };
        const baseStyle:TuiStyle={
            f:this.resolveColor(sprite.color)??parentStyle.f,
            b:this.resolveColor(sprite.bg)??parentStyle.b,
        };
        const style:TuiStyle={
            f:(active?this.resolveColor(sprite.activeColor):undefined)??baseStyle.f,
            b:(active?this.resolveColor(sprite.activeBg):undefined)??baseStyle.b,
        };

        this.fillRect(rect, baseStyle, sprite.id);

        const border=this.getBorderColors(sprite, style.f);
        if(border.hasBorder){
            this.drawBorder(rect, border, sprite.borderStyle??'normal');
        }

        const contentRect=this.getContentRect(rect, border);
        if(contentRect.width<=0 || contentRect.height<=0){
            return;
        }

        this.fillRect(contentRect, style, sprite.id);

        const layout=sprite.layout??'inline';
        if(layout==='inline'){
            this.drawInlineSprite(sprite, contentRect, style, nextInheritedProps.textAlign??'start');
            return;
        }

        this.drawChildren(sprite, contentRect, style, nextInheritedProps);
    }

    private drawAbsoluteSprites(root:Sprite)
    {
        for(const item of this.getAbsoluteSprites(root)){
            const sprite=item.sprite;
            const pos=sprite.absolutePosition;
            if(!pos){
                continue;
            }

            const right=pos.right??0;
            const bottom=pos.bottom??0;
            const rect:TuiRect={
                x:pos.left,
                y:pos.top,
                width:pos.width??Math.max(0, this.bufferState.width-pos.left-right),
                height:pos.height??Math.max(0, this.bufferState.height-pos.top-bottom),
            };

            this.drawSprite(sprite, rect, {
                f:this.resolveColor(this.theme.foreground),
                b:this.resolveColor(this.theme.background),
            }, item.inheritedProps);
        }
    }

    private isSpriteActive(sprite:Sprite):boolean
    {
        return sprite.state?.active===true;
    }

    private getAbsoluteSprites(root:Sprite):TuiAbsoluteSprite[]
    {
        const sprites:TuiAbsoluteSprite[]=[];

        const visit=(sprite:Sprite, inheritedProps:TuiInheritedSpriteProps={})=>{
            const nextInheritedProps:TuiInheritedSpriteProps={
                ...inheritedProps,
                textAlign:sprite.textAlign??inheritedProps.textAlign,
            };

            for(const child of sprite.children??[]){
                if(child.absolutePosition){
                    sprites.push({sprite:child,inheritedProps:nextInheritedProps});
                }
                visit(child, nextInheritedProps);
            }
        };

        visit(root);

        return sprites;
    }

    private drawInlineSprite(sprite:Sprite, rect:TuiRect, style:TuiStyle, textAlign:SpriteTextAlignment)
    {
        const value=this.getInlineSpriteText(sprite);
        const chars=this.getInlineSpriteChars(sprite, style);
        const textWrap=sprite.textWrap??'wrap';
        const textClipStyle=sprite.textClipStyle??'ellipses';
        const scrollX=sprite.scrollable?(sprite.state?.scrollX??0):0;
        const scrollY=sprite.scrollable?(sprite.state?.scrollY??0):0;
        const lines=this.getInlineSpriteCharLines(chars, rect.width, textWrap);
        const visibleLines=lines.slice(Math.max(0, scrollY), Math.max(0, scrollY)+rect.height);

        if(sprite.isInput && this.isSpriteActive(sprite)){
            this.updateInputCursor(sprite, rect, value, textWrap, textClipStyle, textAlign, scrollX, scrollY);
        }

        for(let y=0;y<visibleLines.length && y<rect.height;y++){
            const line=visibleLines[y]??[];
            const offset=Math.max(0, scrollX);
            const scrolledLine=line.slice(offset);
            const clipped=scrolledLine.length>rect.width;
            const text=this.clipInlineChars(scrolledLine, rect.width, textClipStyle, clipped, style);
            const xOffset=scrollX>0?0:this.getTextAlignOffset(textAlign, text.length, rect.width);

            for(let i=0;i<text.length && i<rect.width;i++){
                const char=text[i]!;
                this.setChar(rect.x+xOffset+i, rect.y+y, {
                    c:char.c,
                    f:char.f,
                    b:char.b,
                    i:sprite.id,
                });
            }
        }
    }

    private updateInputCursor(
        sprite:Sprite,
        rect:TuiRect,
        value:string,
        textWrap:SpriteTextWrap,
        textClipStyle:SpriteTextClipStyle,
        textAlign:SpriteTextAlignment,
        scrollX:number,
        scrollY:number
    ){
        if(rect.width<=0 || rect.height<=0){
            return;
        }

        const caret=this.getInputCaret(sprite, value);
        const caretLines=this.getInlineSpriteLines(value.slice(0, caret), rect.width, textWrap);
        const lineIndex=Math.max(0, caretLines.length-1);
        const col=caretLines[lineIndex]?.length??0;
        const lines=this.getInlineSpriteLines(value, rect.width, textWrap);
        const line=lines[lineIndex]??'';
        const offset=Math.max(0, scrollX);
        const scrolledLine=line.slice(offset);
        const clipped=scrolledLine.length>rect.width;
        const text=this.clipText(scrolledLine, rect.width, textClipStyle, clipped);
        const xOffset=scrollX>0?0:this.getTextAlignOffset(textAlign, text.length, rect.width);
        const x=this.clampNumber(rect.x+xOffset+col-offset, rect.x, rect.x+rect.width-1);
        const y=this.clampNumber(rect.y+lineIndex-Math.max(0, scrollY), rect.y, rect.y+rect.height-1);

        this.inputCursor={x,y};
    }

    private getInputCaret(sprite:Sprite, value:string):number
    {
        const caret=sprite.state?.inputCaret;
        return this.clampNumber(
            typeof caret==='number' && Number.isFinite(caret)?
                Math.floor(caret)
            :
                value.length,
            0,
            value.length
        );
    }

    private drawChildren(sprite:Sprite, rect:TuiRect, style:TuiStyle, inheritedProps:TuiInheritedSpriteProps)
    {
        const children=(sprite.children??[]).filter(child=>!child.absolutePosition);
        if(!children.length){
            return;
        }

        const scrollX=sprite.scrollable?(sprite.state?.scrollX??0):0;
        const scrollY=sprite.scrollable?(sprite.state?.scrollY??0):0;
        const childRect={
            ...rect,
            x:rect.x-scrollX,
            y:rect.y-scrollY,
        };
        const draw=()=>{
            switch(sprite.layout){
                case 'row':
                    this.drawRowChildren(children, childRect, style, inheritedProps);
                    break;

                case 'grid':
                    this.drawGridChildren(sprite, children, childRect, style, inheritedProps);
                    break;

                case 'column':
                default:
                    this.drawColumnChildren(children, childRect, style, inheritedProps);
                    break;
            }
        };

        if(sprite.scrollable){
            this.withClip(rect, draw);
            return;
        }

        draw();
    }

    private drawRowChildren(children:Sprite[], rect:TuiRect, style:TuiStyle, inheritedProps:TuiInheritedSpriteProps)
    {
        const sizes=children.map(child=>this.getNaturalSize(child));
        const fixedWidth=children.reduce((sum, child, i)=>sum+((child.flex??0)>0?0:sizes[i]?.width??0), 0);
        const totalFlex=children.reduce((sum, child)=>sum+(child.flex??0), 0);
        const remaining=Math.max(0, rect.width-fixedWidth);
        let x=rect.x;
        let flexUsed=0;

        children.forEach((child, i)=>{
            const flex=child.flex??0;
            const width=(
                flex>0?
                    (
                        i===children.length-1?
                            remaining-flexUsed
                        :
                            Math.floor(remaining*(flex/totalFlex))
                    )
                :
                    sizes[i]?.width??0
            );

            if(flex>0){
                flexUsed+=width;
            }

            this.drawSprite(child, {
                x,
                y:rect.y,
                width,
                height:rect.height,
            }, style, inheritedProps);
            x+=width;
        });
    }

    private drawColumnChildren(children:Sprite[], rect:TuiRect, style:TuiStyle, inheritedProps:TuiInheritedSpriteProps)
    {
        const sizes=children.map(child=>this.getNaturalSize(child, rect.width));
        const fixedHeight=children.reduce((sum, child, i)=>sum+((child.flex??0)>0?0:sizes[i]?.height??0), 0);
        const totalFlex=children.reduce((sum, child)=>sum+(child.flex??0), 0);
        const remaining=Math.max(0, rect.height-fixedHeight);
        let y=rect.y;
        let flexUsed=0;

        children.forEach((child, i)=>{
            const flex=child.flex??0;
            const height=(
                flex>0?
                    (
                        i===children.length-1?
                            remaining-flexUsed
                        :
                            Math.floor(remaining*(flex/totalFlex))
                    )
                :
                    sizes[i]?.height??0
            );

            if(flex>0){
                flexUsed+=height;
            }

            this.drawSprite(child, {
                x:rect.x,
                y,
                width:rect.width,
                height,
            }, style, inheritedProps);
            y+=height;
        });
    }

    private drawGridChildren(sprite:Sprite, children:Sprite[], rect:TuiRect, style:TuiStyle, inheritedProps:TuiInheritedSpriteProps)
    {
        const cols=sprite.gridCols?.length?sprite.gridCols:['1fr'];
        const widths=this.getGridColWidths(cols as SpriteGridColSize[], rect.width);
        const colCount=Math.max(1, widths.length);
        const rowHeights:number[]=[];

        children.forEach((child, i)=>{
            const col=i%colCount;
            const row=Math.floor(i/colCount);
            rowHeights[row]=Math.max(rowHeights[row]??0, this.getNaturalSize(child, widths[col]??0).height);
        });

        let y=rect.y;
        for(let row=0;row<rowHeights.length;row++){
            let x=rect.x;
            for(let col=0;col<colCount;col++){
                const child=children[(row*colCount)+col];
                const width=widths[col]??0;
                if(child){
                    this.drawSprite(child, {
                        x,
                        y,
                        width,
                        height:rowHeights[row]??0,
                    }, style, inheritedProps);
                }
                x+=width;
            }
            y+=rowHeights[row]??0;
        }
    }

    private getNaturalSize(sprite:Sprite, width?:number):TuiSize
    {
        const border=this.getBorderColors(sprite);
        const borderWidth=(border.left?1:0)+(border.right?1:0);
        const borderHeight=(border.top?1:0)+(border.bottom?1:0);
        const contentWidth=width===undefined?undefined:Math.max(0, width-borderWidth);
        const children=(sprite.children??[]).filter(child=>!child.absolutePosition);
        const layout=sprite.layout??'inline';

        if(layout==='inline' || !children.length){
            const text=this.getInlineSpriteText(sprite);
            const textWrap=sprite.textWrap??'wrap';
            const lines=contentWidth===undefined?this.getTextLines(text):this.getInlineSpriteLines(text, Math.max(1, contentWidth), textWrap);
            return {
                width:(contentWidth===undefined?Math.max(1, ...lines.map(line=>line.length)):Math.max(1, contentWidth))+borderWidth,
                height:Math.max(1, lines.length)+borderHeight,
            };
        }

        if(layout==='row'){
            const sizes=children.map(child=>this.getNaturalSize(child));
            return {
                width:sizes.reduce((sum, size)=>sum+size.width, 0)+borderWidth,
                height:Math.max(1, ...sizes.map(size=>size.height))+borderHeight,
            };
        }

        if(layout==='grid'){
            const cols=sprite.gridCols?.length?sprite.gridCols:['1fr'];
            const colCount=Math.max(1, cols.length);

            if(contentWidth!==undefined){
                const widths=this.getGridColWidths(cols as SpriteGridColSize[], contentWidth);
                const rowHeights:number[]=[];

                children.forEach((child, i)=>{
                    const row=Math.floor(i/colCount);
                    const col=i%colCount;
                    rowHeights[row]=Math.max(rowHeights[row]??0, this.getNaturalSize(child, widths[col]??0).height);
                });

                return {
                    width:contentWidth+borderWidth,
                    height:rowHeights.reduce((sum, height)=>sum+height, 0)+borderHeight,
                };
            }

            const sizes=children.map(child=>this.getNaturalSize(child));
            let naturalWidth=0;
            let naturalHeight=0;

            for(let i=0;i<sizes.length;i+=colCount){
                const row=sizes.slice(i, i+colCount);
                naturalWidth=Math.max(naturalWidth, row.reduce((sum, size)=>sum+size.width, 0));
                naturalHeight+=Math.max(1, ...row.map(size=>size.height));
            }

            return {
                width:naturalWidth+borderWidth,
                height:naturalHeight+borderHeight,
            };
        }

        const sizes=children.map(child=>this.getNaturalSize(child, contentWidth));
        return {
            width:Math.max(1, ...sizes.map(size=>size.width))+borderWidth,
            height:sizes.reduce((sum, size)=>sum+size.height, 0)+borderHeight,
        };
    }

    private getInlineSpriteText(sprite:Sprite):string
    {
        if(sprite.isInput){
            return sprite.state?.inputValue??sprite.text??'';
        }
        return sprite.richText?.length?sprite.richText.map(span=>span.text).join(''):(sprite.text??'');
    }

    private getInlineSpriteChars(sprite:Sprite, style:TuiStyle):TuiInlineChar[]
    {
        if(sprite.isInput || !sprite.richText?.length){
            return this.createInlineChars(this.getInlineSpriteText(sprite), style);
        }

        const chars:TuiInlineChar[]=[];
        for(const span of sprite.richText){
            chars.push(...this.createInlineChars(span.text, {
                f:this.resolveColor(span.color)??style.f,
                b:this.resolveColor(span.bg)??style.b,
            }));
        }

        return chars;
    }

    private createInlineChars(text:string, style:TuiStyle):TuiInlineChar[]
    {
        return Array.from(text).map(c=>({
            c,
            f:style.f,
            b:style.b,
        }));
    }

    private getTextLines(text:string):string[]
    {
        return text.split(/\r?\n/);
    }

    private getInlineSpriteLines(text:string, width:number, textWrap:SpriteTextWrap):string[]
    {
        switch(textWrap){
            case 'clip':
                return this.getTextLines(text);

            case 'wrap-hard':
                return this.wrapTextHard(text, width);

            case 'wrap':
            default:
                return this.wrapText(text, width);
        }
    }

    private getInlineSpriteCharLines(chars:TuiInlineChar[], width:number, textWrap:SpriteTextWrap):TuiInlineChar[][]
    {
        switch(textWrap){
            case 'clip':
                return this.getInlineCharTextLines(chars);

            case 'wrap-hard':
                return this.wrapInlineCharsHard(chars, width);

            case 'wrap':
            default:
                return this.wrapInlineChars(chars, width);
        }
    }

    private getInlineCharTextLines(chars:TuiInlineChar[]):TuiInlineChar[][]
    {
        const lines:TuiInlineChar[][]=[[]];

        for(let i=0;i<chars.length;i++){
            const char=chars[i]!;
            if(char.c==='\r'){
                if(chars[i+1]?.c==='\n'){
                    i++;
                }
                lines.push([]);
            }else if(char.c==='\n'){
                lines.push([]);
            }else{
                lines[lines.length-1]!.push(char);
            }
        }

        return lines;
    }

    private wrapText(text:string, width:number):string[]
    {
        width=Math.max(1, Math.floor(width));

        const lines:string[]=[];
        const paragraphs=this.getTextLines(text);

        for(const paragraph of paragraphs){
            if(!paragraph){
                lines.push('');
                continue;
            }

            let remaining=paragraph;
            while(remaining.length>width){
                const nextChar=remaining[width];
                let breakIndex=nextChar && /\s/.test(nextChar)?width:-1;

                if(breakIndex<0){
                    for(let i=width-1;i>0;i--){
                        if(/\s/.test(remaining[i]??'')){
                            breakIndex=i;
                            break;
                        }
                    }
                }

                if(breakIndex<=0){
                    breakIndex=width;
                }

                lines.push(remaining.slice(0, breakIndex).replace(/[ \t]+$/,''));
                remaining=remaining.slice(breakIndex).replace(/^[ \t]+/,'');
            }

            lines.push(remaining);
        }

        return lines.length?lines:[''];
    }

    private wrapInlineChars(chars:TuiInlineChar[], width:number):TuiInlineChar[][]
    {
        width=Math.max(1, Math.floor(width));

        const lines:TuiInlineChar[][]=[];
        const paragraphs=this.getInlineCharTextLines(chars);

        for(const paragraph of paragraphs){
            if(!paragraph.length){
                lines.push([]);
                continue;
            }

            let remaining=paragraph;
            while(remaining.length>width){
                const nextChar=remaining[width];
                let breakIndex=nextChar && /\s/.test(nextChar.c)?width:-1;

                if(breakIndex<0){
                    for(let i=width-1;i>0;i--){
                        if(/\s/.test(remaining[i]?.c??'')){
                            breakIndex=i;
                            break;
                        }
                    }
                }

                if(breakIndex<=0){
                    breakIndex=width;
                }

                lines.push(this.trimInlineCharsEnd(remaining.slice(0, breakIndex)));
                remaining=this.trimInlineCharsStart(remaining.slice(breakIndex));
            }

            lines.push(remaining);
        }

        return lines.length?lines:[[]];
    }

    private wrapTextHard(text:string, width:number):string[]
    {
        width=Math.max(1, Math.floor(width));

        const lines:string[]=[];
        const paragraphs=this.getTextLines(text);

        for(const paragraph of paragraphs){
            if(!paragraph){
                lines.push('');
                continue;
            }

            for(let i=0;i<paragraph.length;i+=width){
                lines.push(paragraph.slice(i, i+width));
            }
        }

        return lines.length?lines:[''];
    }

    private wrapInlineCharsHard(chars:TuiInlineChar[], width:number):TuiInlineChar[][]
    {
        width=Math.max(1, Math.floor(width));

        const lines:TuiInlineChar[][]=[];
        const paragraphs=this.getInlineCharTextLines(chars);

        for(const paragraph of paragraphs){
            if(!paragraph.length){
                lines.push([]);
                continue;
            }

            for(let i=0;i<paragraph.length;i+=width){
                lines.push(paragraph.slice(i, i+width));
            }
        }

        return lines.length?lines:[[]];
    }

    private trimInlineCharsStart(chars:TuiInlineChar[]):TuiInlineChar[]
    {
        let index=0;
        while(index<chars.length && /[ \t]/.test(chars[index]?.c??'')){
            index++;
        }
        return chars.slice(index);
    }

    private trimInlineCharsEnd(chars:TuiInlineChar[]):TuiInlineChar[]
    {
        let index=chars.length;
        while(index>0 && /[ \t]/.test(chars[index-1]?.c??'')){
            index--;
        }
        return chars.slice(0, index);
    }

    private clipText(text:string, width:number, textClipStyle:SpriteTextClipStyle, clipped:boolean):string
    {
        width=Math.max(0, Math.floor(width));
        if(width<=0){
            return '';
        }

        if(!clipped || text.length<=width){
            return text.slice(0, width);
        }

        if(textClipStyle==='ellipses'){
            return width===1?'…':`${text.slice(0, width-1)}…`;
        }

        return text.slice(0, width);
    }

    private clipInlineChars(chars:TuiInlineChar[], width:number, textClipStyle:SpriteTextClipStyle, clipped:boolean, style:TuiStyle):TuiInlineChar[]
    {
        width=Math.max(0, Math.floor(width));
        if(width<=0){
            return [];
        }

        if(!clipped || chars.length<=width){
            return chars.slice(0, width);
        }

        if(textClipStyle==='ellipses'){
            const ellipsesStyle=chars[Math.min(chars.length-1, Math.max(0, width-1))]??style;
            if(width===1){
                return [{c:'…',f:ellipsesStyle.f,b:ellipsesStyle.b}];
            }
            return [
                ...chars.slice(0, width-1),
                {c:'…',f:ellipsesStyle.f,b:ellipsesStyle.b},
            ];
        }

        return chars.slice(0, width);
    }

    private getTextAlignOffset(textAlign:SpriteTextAlignment, textLength:number, width:number):number
    {
        switch(textAlign){
            case 'center':
                return Math.max(0, Math.floor((width-textLength)/2));

            case 'end':
                return Math.max(0, width-textLength);

            case 'start':
            default:
                return 0;
        }
    }

    private getGridColWidths(cols:SpriteGridColSize[]|undefined, width:number):number[]
    {
        if(!cols){
            return [0];
        }
        const parsed=cols.map(col=>{
            const match=/^(\d+(?:\.\d+)?)(cr|fr)$/.exec(col);
            return {
                value:match?Number(match[1]):1,
                unit:match?.[2]??'fr',
            };
        });

        const fixed=parsed.reduce((sum, col)=>sum+(col.unit==='cr'?col.value:0), 0);
        const totalFr=parsed.reduce((sum, col)=>sum+(col.unit==='fr'?col.value:0), 0);
        const remaining=Math.max(0, width-fixed);
        let used=0;

        return parsed.map((col, i)=>{
            const colWidth=(
                col.unit==='cr'?
                    Math.floor(col.value)
                :i===parsed.length-1?
                    Math.max(0, width-used)
                :
                    Math.floor(remaining*(col.value/totalFr))
            );

            used+=colWidth;
            return colWidth;
        });
    }

    private fillRect(rect:TuiRect, style:TuiStyle, spriteId:string)
    {
        for(let y=rect.y;y<rect.y+rect.height;y++){
            for(let x=rect.x;x<rect.x+rect.width;x++){
                this.setChar(x, y, {
                    c:' ',
                    f:style.f,
                    b:style.b,
                    i:spriteId,
                });
            }
        }
    }

    private drawBorder(rect:TuiRect, border:ReturnType<ConvoTuiCtrl['getBorderColors']>, style:SpriteBorderStyle)
    {
        const chars=this.getBorderChars(style);
        const x1=rect.x;
        const y1=rect.y;
        const x2=rect.x+rect.width-1;
        const y2=rect.y+rect.height-1;

        if(border.top){
            for(let x=x1;x<=x2;x++){
                this.setChar(x, y1, {c:chars.h, f:border.top, b:undefined, i:''});
            }
        }

        if(border.bottom){
            for(let x=x1;x<=x2;x++){
                this.setChar(x, y2, {c:chars.h, f:border.bottom, b:undefined, i:''});
            }
        }

        if(border.left){
            for(let y=y1;y<=y2;y++){
                this.setChar(x1, y, {c:chars.v, f:border.left, b:undefined, i:''});
            }
        }

        if(border.right){
            for(let y=y1;y<=y2;y++){
                this.setChar(x2, y, {c:chars.v, f:border.right, b:undefined, i:''});
            }
        }

        if(border.top && border.left){
            this.setChar(x1, y1, {c:chars.tl, f:border.top, b:undefined, i:''});
        }
        if(border.top && border.right){
            this.setChar(x2, y1, {c:chars.tr, f:border.top, b:undefined, i:''});
        }
        if(border.bottom && border.left){
            this.setChar(x1, y2, {c:chars.bl, f:border.bottom, b:undefined, i:''});
        }
        if(border.bottom && border.right){
            this.setChar(x2, y2, {c:chars.br, f:border.bottom, b:undefined, i:''});
        }
    }

    private getBorderColors(sprite:Sprite, fallback?:string)
    {
        const border=this.isSpriteActive(sprite)?(sprite.activeBorder??sprite.border):sprite.border;
        const empty={
            hasBorder:false,
            top:undefined as string|undefined,
            bottom:undefined as string|undefined,
            left:undefined as string|undefined,
            right:undefined as string|undefined,
        };

        if(!border){
            return empty;
        }

        if(typeof border==='string'){
            const color=this.resolveColor(border)??fallback;
            return {
                hasBorder:true,
                top:color,
                bottom:color,
                left:color,
                right:color,
            };
        }

        const top=this.resolveColor(border.top)??(border.top?fallback:undefined);
        const bottom=this.resolveColor(border.bottom)??(border.bottom?fallback:undefined);
        const left=this.resolveColor(border.left)??(border.left?fallback:undefined);
        const right=this.resolveColor(border.right)??(border.right?fallback:undefined);

        return {
            hasBorder:!!(top || bottom || left || right),
            top,
            bottom,
            left,
            right,
        };
    }

    private getContentRect(rect:TuiRect, border:ReturnType<ConvoTuiCtrl['getBorderColors']>):TuiRect
    {
        const left=border.left?1:0;
        const right=border.right?1:0;
        const top=border.top?1:0;
        const bottom=border.bottom?1:0;

        return {
            x:rect.x+left,
            y:rect.y+top,
            width:Math.max(0, rect.width-left-right),
            height:Math.max(0, rect.height-top-bottom),
        };
    }

    private getBorderChars(style:SpriteBorderStyle)
    {
        switch(style){
            case 'thick':
                return {tl:'┏',tr:'┓',bl:'┗',br:'┛',h:'━',v:'┃'};

            case 'rounded':
                return {tl:'╭',tr:'╮',bl:'╰',br:'╯',h:'─',v:'│'};

            case 'double':
                return {tl:'╔',tr:'╗',bl:'╚',br:'╝',h:'═',v:'║'};

            case 'classic':
                return {tl:'+',tr:'+',bl:'+',br:'+',h:'-',v:'|'};

            case 'normal':
            default:
                return {tl:'┌',tr:'┐',bl:'└',br:'┘',h:'─',v:'│'};
        }
    }

    private setChar(x:number, y:number, char:Char)
    {
        const clip=this.getCurrentClip();
        if(clip && (x<clip.x || y<clip.y || x>=clip.x+clip.width || y>=clip.y+clip.height)){
            return;
        }

        if(y<0 || y>=this.bufferState.height || x<0 || x>=this.bufferState.width){
            return;
        }

        const prev=this.bufferState.back[y]?.[x];
        if(!prev){
            return;
        }

        this.bufferState.back[y]![x]={
            c:char.c,
            f:char.f??prev.f,
            b:char.b??prev.b,
            i:char.i,
        };
    }

    private withClip<T>(clip:TuiRect, callback:()=>T):T
    {
        const current=this.getCurrentClip()??{
            x:0,
            y:0,
            width:this.bufferState.width,
            height:this.bufferState.height,
        };
        const next=this.intersectRects(current, clip);

        this.clipStack.push(next);
        try{
            return callback();
        }finally{
            this.clipStack.pop();
        }
    }

    private getCurrentClip():TuiRect|undefined
    {
        return this.clipStack[this.clipStack.length-1];
    }

    private intersectRects(a:TuiRect, b:TuiRect):TuiRect
    {
        const x=Math.max(a.x, b.x);
        const y=Math.max(a.y, b.y);
        const right=Math.min(a.x+Math.max(0, a.width), b.x+Math.max(0, b.width));
        const bottom=Math.min(a.y+Math.max(0, a.height), b.y+Math.max(0, b.height));

        return {
            x,
            y,
            width:Math.max(0, right-x),
            height:Math.max(0, bottom-y),
        };
    }

    private clampRect(rect:TuiRect):TuiRect
    {
        const x=Math.max(0, rect.x);
        const y=Math.max(0, rect.y);
        const right=Math.min(this.bufferState.width, rect.x+Math.max(0, rect.width));
        const bottom=Math.min(this.bufferState.height, rect.y+Math.max(0, rect.height));

        return {
            x,
            y,
            width:Math.max(0, right-x),
            height:Math.max(0, bottom-y),
        };
    }

    private clampNumber(value:number, min:number, max:number):number
    {
        return Math.max(min, Math.min(max, value));
    }

    private resolveColor(color?:string):string|undefined
    {
        if(!color){
            return undefined;
        }

        const value=color.startsWith('#')?color:this.theme[color];
        if(!value || !/^#[0-9a-fA-F]{6}$/.test(value)){
            return undefined;
        }

        return value.toLowerCase();
    }

    private getFgAnsi(color?:string):string
    {
        const rgb=this.hexToRgb(color);
        return rgb?`\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`:'\x1b[39m';
    }

    private getBgAnsi(color?:string):string
    {
        const rgb=this.hexToRgb(color);
        return rgb?`\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`:'\x1b[49m';
    }

    private hexToRgb(color?:string):{r:number;g:number;b:number}|undefined
    {
        if(!color || !/^#[0-9a-fA-F]{6}$/.test(color)){
            return undefined;
        }

        return {
            r:parseInt(color.slice(1, 3), 16),
            g:parseInt(color.slice(3, 5), 16),
            b:parseInt(color.slice(5, 7), 16),
        };
    }

    private handleInput(data:any)
    {
        if(this._isDisposed){
            return;
        }

        this.inputBuffer+=data?.toString?.()??String(data);

        while(this.inputBuffer.length){
            const consumed=this.consumeInput(this.inputBuffer);
            if(consumed<=0){
                break;
            }
            this.inputBuffer=this.inputBuffer.slice(consumed);
        }
    }

    private consumeInput(input:string):number
    {
        const pasteStart='\x1b[200~';
        const pasteEnd='\x1b[201~';

        if(input.startsWith(pasteStart)){
            const endIndex=input.indexOf(pasteEnd, pasteStart.length);
            if(endIndex<0){
                return 0;
            }

            this.insertActiveInputText(input.slice(pasteStart.length, endIndex));
            return endIndex+pasteEnd.length;
        }

        if(input.startsWith('\x1b[<')){
            const match=/^\x1b\[<(\d+);(\d+);(\d+)([mM])/.exec(input);
            if(!match){
                return 0;
            }

            const mouseEvt=this.parseSgrMouseEvent(
                Number(match[1]),
                Number(match[2])-1,
                Number(match[3])-1,
                match[4] as 'm'|'M'
            );

            this.handleMouseEvent(mouseEvt);

            return match[0].length;
        }

        const homeSequence=this.getMatchedInputSequence(input, ['\x1b[H','\x1b[1~','\x1b[7~','\x1bOH']);
        if(homeSequence){
            this.setActiveInputCaret(0);
            return homeSequence.length;
        }

        const endSequence=this.getMatchedInputSequence(input, ['\x1b[F','\x1b[4~','\x1b[8~','\x1bOF']);
        if(endSequence){
            this.setActiveInputCaretToEnd();
            return endSequence.length;
        }

        const deleteSequence=this.getMatchedInputSequence(input, ['\x1b[3~']);
        if(deleteSequence){
            this.deleteActiveInput();
            return deleteSequence.length;
        }

        if(input.startsWith('\x1b[Z')){
            this.focusPrev();
            return 3;
        }

        if(input.startsWith('\x1b[A')){
            this.scrollActiveSprite(0, -1);
            return 3;
        }

        if(input.startsWith('\x1b[B')){
            this.scrollActiveSprite(0, 1);
            return 3;
        }

        if(input.startsWith('\x1b[C')){
            if(!this.moveActiveInputCaret(1)){
                this.scrollActiveSprite(1, 0);
            }
            return 3;
        }

        if(input.startsWith('\x1b[D')){
            if(!this.moveActiveInputCaret(-1)){
                this.scrollActiveSprite(-1, 0);
            }
            return 3;
        }

        const printable=this.getPrintableInputPrefix(input);
        if(printable){
            if(this.getActiveSprite()?.isInput){
                this.insertActiveInputText(printable);
                return printable.length;
            }

            if(printable[0]===' '){
                this.activateCurrentSprite();
                return 1;
            }

            return printable.length;
        }

        const char=input[0]!;
        if(char==='\x1b'){
            const csi=/^\x1b\[[0-?]*[ -/]*[@-~]/.exec(input);
            if(csi){
                return csi[0].length;
            }

            const ss3=/^\x1bO./.exec(input);
            if(ss3){
                return ss3[0].length;
            }

            return (input.startsWith('\x1b[') || input.startsWith('\x1bO') || input.length<2)?0:2;
        }

        switch(char){
            case '\x01':
                this.setActiveInputCaret(0);
                return 1;

            case '\x03':
                this.dispose();
                return 1;

            case '\x05':
                this.setActiveInputCaretToEnd();
                return 1;

            case '\t':
                this.focusNext();
                return 1;

            case '\r':
            case '\n':
                this.activateCurrentSprite();
                return 1;

            case '\x7f':
            case '\b':
                this.backspaceActiveInput();
                return 1;

            default:
                return 1;
        }
    }

    private getMatchedInputSequence(input:string, sequences:string[]):string|undefined
    {
        return sequences.find(sequence=>input.startsWith(sequence));
    }

    private getPrintableInputPrefix(input:string):string
    {
        let value='';
        for(const char of input){
            if(char<' ' || char==='\x7f' || char==='\x1b'){
                break;
            }
            value+=char;
        }
        return value;
    }

    private getPrintableInputText(text:string):string
    {
        const withoutEsc=text
            .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g,'')
            .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')
            .replace(/\x1b[@-_]/g,'');

        return Array.from(withoutEsc).filter(char=>char>=' ' && char!=='\x7f').join('');
    }

    /**
     * Updates a sprite by merging the current sprite with the passed update.
     * @param update Sprite update to merged with current sprite
     * @param reRender If true or undefined the screen will be re-rendered
     * @returns Returns true if a sprite is found with a matching id
     */
    public updateSprite(update:SpriteUpdate,reRender?:boolean):boolean;
    /**
     * Updates a sprite using a callback function.
     * @param spriteId Id of sprite to update
     * @param update A callback function that will update the sprite in-place. If false is returned from the callback the screen will not be updated.
     * @returns Returns true if a sprite is found with a matching id
     */
    public updateSprite(spriteId:string,update:(sprite:Sprite)=>void|boolean):boolean;
    updateSprite(sprite:string|SpriteUpdate,update?:((sprite:Sprite)=>void|boolean)|boolean):boolean{
        let target:Sprite|undefined;
        if(typeof sprite === 'string'){
            target=this.findSpriteById(sprite);
        }else if(sprite){
            target=this.findSpriteById(sprite.id);
        }
        if(!target){
            return false;
        }

        let render:boolean;

        if(typeof sprite === 'object'){
            for(const e in sprite){
                if(e==='children'){
                    const defs=sprite.children;
                    if(defs){
                        target.children=defs.map(d=>this.loadSprite(d));
                    }
                }else{
                    (target as any)[e]=(sprite as any)[e];
                }
            }
        }

        if(typeof update === 'function'){
            const r=update(target);
            render=r!==false;
        }else{
            render=update!==false
        }

        if(render){
            this.render();
        }

        return true;
    }

    private parseSgrMouseEvent(code:number, x:number, y:number, suffix:'m'|'M'):TuiSgrMouseEvt
    {
        const isWheel=(code&64)!==0;
        const isDrag=(code&32)!==0;
        const isRelease=suffix==='m';

        return {
            action:(
                isWheel?
                    'wheel'
                :isRelease?
                    'release'
                :isDrag?
                    'drag'
                :
                    'press'
            ),
            x,
            y,
            button:this.getMouseButton(code),
            direction:isWheel?this.getMouseWheelDirection(code):undefined,
            modifiers:{
                shift:(code&4)!==0,
                alt:(code&8)!==0,
                ctrl:(code&16)!==0,
            },
        };
    }

    private getMouseButton(code:number):SpriteMouseButton
    {
        switch(code&3){
            case 0:
                return 'left';

            case 1:
                return 'middle';

            case 2:
                return 'right';

            default:
                return 'unknown';
        }
    }

    private getMouseWheelDirection(code:number):SpriteMouseWheelDirection|undefined
    {
        switch(code&3){
            case 0:
                return 'up';

            case 1:
                return 'down';

            default:
                return undefined;
        }
    }

    private handleMouseEvent(evt:TuiSgrMouseEvt)
    {
        switch(evt.action){
            case 'press':
                if(evt.button==='left'){
                    this.handleMouseClick(evt.x, evt.y);
                }
                break;

            case 'release':
                this.handleMouseRelease(evt);
                break;

            case 'drag':
                this.handleMouseDrag(evt);
                break;

            case 'wheel':
                this.handleMouseWheel(evt);
                break;
        }
    }

    private getMouseTarget(x:number, y:number):TuiMouseTarget|undefined
    {
        const id=this.bufferState.front[y]?.[x]?.i;
        const screen=this._activeScreen;
        if(!id || !screen){
            return undefined;
        }

        const path=this.findSpritePathById(id, screen);
        const sprite=path?.[path.length-1];
        if(!path || !sprite){
            return undefined;
        }

        return {sprite,screen,path};
    }

    private handleMouseClick(x:number, y:number)
    {
        const target=this.getMouseTarget(x, y);
        if(!target){
            return;
        }

        const sprite=target.sprite;
        const screen=target.screen;

        this.activateSprite(sprite.id, screen);

        if(sprite.isButton || sprite.link || sprite.onClick){
            this.clickSprite(sprite, x, y);
        }

        this.render();
    }

    private handleMouseRelease(evt:TuiSgrMouseEvt)
    {
        const target=this.getMouseTarget(evt.x, evt.y);
        if(!target?.sprite.onMouseRelease){
            return;
        }

        target.sprite.onMouseRelease({
            type:'mouse-release',
            sprite:target.sprite,
            screen:target.screen,
            ctrl:this,
            x:evt.x,
            y:evt.y,
            button:evt.button,
            modifiers:evt.modifiers,
        });

        this.render();
    }

    private handleMouseDrag(evt:TuiSgrMouseEvt)
    {
        const target=this.getMouseTarget(evt.x, evt.y);
        if(!target?.sprite.onMouseDrag){
            return;
        }

        target.sprite.onMouseDrag({
            type:'mouse-drag',
            sprite:target.sprite,
            screen:target.screen,
            ctrl:this,
            x:evt.x,
            y:evt.y,
            button:evt.button,
            modifiers:evt.modifiers,
        });

        this.render();
    }

    private handleMouseWheel(evt:TuiSgrMouseEvt)
    {
        if(!evt.direction){
            return;
        }

        const target=this.getMouseTarget(evt.x, evt.y);
        if(!target){
            return;
        }

        target.sprite.onMouseWheel?.({
            type:'mouse-wheel',
            sprite:target.sprite,
            screen:target.screen,
            ctrl:this,
            x:evt.x,
            y:evt.y,
            direction:evt.direction,
            deltaY:evt.direction==='up'?-1:1,
            modifiers:evt.modifiers,
        });

        const scrollTarget=[...target.path].reverse().find(sprite=>sprite.scrollable);
        const didScroll=scrollTarget?this.scrollSprite(scrollTarget, 0, evt.direction==='up'?-1:1, false):false;

        if(target.sprite.onMouseWheel || didScroll){
            this.render();
        }
    }

    private activateCurrentSprite():boolean
    {
        const sprite=this.getActiveSprite();
        if(!sprite || !(sprite.isButton || sprite.link || sprite.onClick)){
            return false;
        }

        this.clickSprite(sprite, 0, 0);
        this.render();
        return true;
    }

    private clickSprite(sprite:Sprite, x:number, y:number)
    {
        const screen=this.findScreenContainingSprite(sprite)??this._activeScreen;
        if(!screen){
            return;
        }

        sprite.onClick?.({
            type:'click',
            sprite,
            screen,
            ctrl:this,
            x,
            y,
        });

        if(sprite.link){
            this.followLink(sprite);
        }
    }

    private editActiveInput(update:(value:string, caret:number)=>{value:string;caret:number}):boolean
    {
        const sprite=this.getActiveSprite();
        const screen=this._activeScreen;
        if(!sprite?.isInput || !screen){
            return false;
        }

        sprite.state??={};

        const value=sprite.state.inputValue??'';
        const caret=this.getInputCaret(sprite, value);
        const next=update(value, caret);
        const nextValue=next.value;
        const nextCaret=this.clampNumber(
            typeof next.caret==='number' && Number.isFinite(next.caret)?
                Math.floor(next.caret)
            :
                nextValue.length,
            0,
            nextValue.length
        );
        const valueChanged=nextValue!==value;
        const caretChanged=nextCaret!==caret || sprite.state.inputCaret!==nextCaret;

        if(!valueChanged && !caretChanged){
            return true;
        }

        sprite.state.inputValue=nextValue;
        sprite.state.inputCaret=nextCaret;

        if(valueChanged){
            sprite.onInput?.({
                type:'input',
                sprite,
                screen,
                ctrl:this,
                value:nextValue,
            });
        }

        this.render();

        return true;
    }

    private insertActiveInputText(text:string):boolean
    {
        const value=this.getPrintableInputText(text);
        if(!value){
            return this.getActiveSprite()?.isInput===true;
        }

        return this.editActiveInput((current, caret)=>({
            value:`${current.slice(0, caret)}${value}${current.slice(caret)}`,
            caret:caret+value.length,
        }));
    }

    private backspaceActiveInput():boolean
    {
        return this.editActiveInput((value, caret)=>(
            caret<=0?
                {value,caret}
            :
                {
                    value:`${value.slice(0, caret-1)}${value.slice(caret)}`,
                    caret:caret-1,
                }
        ));
    }

    private deleteActiveInput():boolean
    {
        return this.editActiveInput((value, caret)=>(
            caret>=value.length?
                {value,caret}
            :
                {
                    value:`${value.slice(0, caret)}${value.slice(caret+1)}`,
                    caret,
                }
        ));
    }

    private moveActiveInputCaret(offset:number):boolean
    {
        const sprite=this.getActiveSprite();
        if(!sprite?.isInput){
            return false;
        }

        const value=sprite.state?.inputValue??'';
        const caret=this.getInputCaret(sprite, value);
        return this.setActiveInputCaret(caret+offset);
    }

    private setActiveInputCaretToEnd():boolean
    {
        const sprite=this.getActiveSprite();
        if(!sprite?.isInput){
            return false;
        }

        return this.setActiveInputCaret((sprite.state?.inputValue??'').length);
    }

    private setActiveInputCaret(caret:number):boolean
    {
        const sprite=this.getActiveSprite();
        if(!sprite?.isInput){
            return false;
        }

        return this.editActiveInput((value)=>({
            value,
            caret,
        }));
    }

    private scrollActiveSprite(x:number, y:number)
    {
        const sprite=this.getActiveSprite();
        if(!sprite){
            return;
        }

        this.scrollSprite(sprite, x, y);
    }

    private scrollSprite(sprite:Sprite, x:number, y:number, reRender=true):boolean
    {
        if(!sprite.scrollable){
            return false;
        }

        sprite.state??={};

        const nextX=Math.max(0, (sprite.state.scrollX??0)+x);
        const nextY=Math.max(0, (sprite.state.scrollY??0)+y);

        if(nextX===sprite.state.scrollX && nextY===sprite.state.scrollY){
            return false;
        }

        sprite.state.scrollX=nextX;
        sprite.state.scrollY=nextY;

        if(reRender){
            this.render();
        }

        return true;
    }

    private focusNext()
    {
        this.focusByOffset(1);
    }

    private focusPrev()
    {
        this.focusByOffset(-1);
    }

    private focusByOffset(offset:number)
    {
        const screen=this._activeScreen;
        if(!screen){
            return;
        }

        const sprites=this.getFocusableSprites(screen);
        if(!sprites.length){
            return;
        }

        const activeId=screen.state?.activeSpriteId;
        const activeIndex=Math.max(0, sprites.findIndex(item=>item.sprite.id===activeId));
        const index=(activeIndex+offset+sprites.length)%sprites.length;

        this.activateSprite(sprites[index]?.sprite.id??sprites[0]?.sprite.id, screen);
    }

    private getActiveSprite():Sprite|undefined
    {
        const screen=this._activeScreen;
        const id=screen?.state?.activeSpriteId;
        return id && screen?this.findSpriteById(id, screen):undefined;
    }

    private getFocusableSprites(screen:Screen):TuiFocusableSprite[]
    {
        const sprites:TuiFocusableSprite[]=[];
        let order=0;

        const visit=(sprite:Sprite)=>{
            if(sprite.tabIndex===undefined || sprite.tabIndex>=0){
                if(sprite.isInput || sprite.isButton || sprite.link){
                    sprites.push({sprite,order});
                }
            }
            order++;
            for(const child of sprite.children??[]){
                visit(child);
            }
        };

        visit(screen.root);

        return sprites.sort((a, b)=>{
            const ai=a.sprite.tabIndex??a.order;
            const bi=b.sprite.tabIndex??b.order;
            return ai-bi || a.order-b.order;
        });
    }

    private writeAnsi(value:string)
    {
        this.console.stdout.write(value);
    }
}


const wait=(ms=1000)=>{
    const end=Date.now()+ms;
    while(end>Date.now()){}
}
