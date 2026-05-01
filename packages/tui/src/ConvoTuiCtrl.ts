import { DisposeContainer } from "@iyio/common";
import { Screen, ScreenBuffer, ScreenBufferState, ScreenDef, Sprite, SpriteDef, TuiConsole, TuiTheme } from "./tui-types.js";

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
    }

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

        // todo - Exit the alternate screen (rmcup)
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
        
        this.resizeBuffers();

        // todo - Enter the alternate screen (smcup)

        // todo - enable raw mode and input listeners

        // todo - listen to terminal resize events and re-render automatically

        // todo - add any other required initialization code
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
    }

    public findScreen(id:string):Screen|undefined
    {
        return this.screens.find(screen=>screen.id===id);
    }

    public findSpriteById(id:string, screen?:Screen):Sprite|undefined
    {
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

        return screen;
    }

    public activateSprite(id:string, screen?:Screen|string):Sprite|undefined
    {
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

    private resizeBuffers()
    {
        const width=this.console.stdout.columns??80;
        const height=this.console.stdout.rows??24;

        if(this.bufferState.width===width && this.bufferState.height===height){
            return;
        }

        this.bufferState.width=width;
        this.bufferState.height=height;
        this.bufferState.front=this.createBuffer(width, height);
        this.bufferState.back=this.createBuffer(width, height);
    }

    private createBuffer(width:number, height:number):ScreenBuffer
    {
        return Array.from({length:height},()=>Array.from({length:width},()=>({
            c:' ',
            i:'',
        })));
    }

    public render()
    {
        this.resizeBuffers();

        // todo - calculate natural inline sizes

        // todo - layout row / column / grid sprites using flex and remaining space

        // todo - draw borders inside assigned sprite rectangles and inset content

        // todo - populate the back buffer

        // todo - copy the back buffer to the front buffer

        // todo - write the full front buffer as ANSI escape sequences directly to stdout
    }
}
