import type { ConvoTuiCtrl } from "./ConvoTuiCtrl.js";


///// Screen /////


/**
 * Represents the entire display area of the terminal while active.
 */
export interface Screen
{
    id:string;

    /**
     * Id of a sprite to set as the active sprite when the screen is shown for the first time.
     */
    defaultSprite?:string;

    /**
     * The root sprite of the screen that will be used to draw the screen. The root sprite will
     * be given a layout size that matches the size of the terminal window.
     */
    root:Sprite;

    /**
     * If true the state of the screen will be cleared each time the screen is deactivated
     */
    transient?:boolean;

    onActivate?:(evt:ScreenEvt)=>void;

    onDeactivate?:(evt:ScreenEvt)=>void;

    /**
     * Arbitrary data that can be used by application code.
     */
    data?:Record<string,any>;

    /**
     * Current state of the screen. `state` is a mutable object.
     */
    state?:ScreenState;
}

/**
 * A definition of a screen. When loaded the `ScreenDef` will be converted into a `Screen`.
 */
export interface ScreenDef extends Omit<Screen,'root'|'id'>
{
    id?:string;
    root:SpriteDef;
}

export interface ScreenState
{
    activeSpriteId?:string;
}

export type ScreenEvtType='activate'|'deactivate';

export interface ScreenEvt
{
    type:ScreenEvtType;
    screen:Screen;
    ctrl:ConvoTuiCtrl;
}


///// Sprite /////


export interface Sprite{

    /**
     * ID of the sprite. Mostly used by inputs and buttons
     */
    id:string;

    /**
     * Controls how the sprite is displayed. The default layout type is `inline` and will draw
     * the text of the sprite on a single line. All other layout types will cause the text of the
     * sprite to be ignored and render the children of the sprite.
     * @default 'inline'
     */
    layout?:SpriteLayoutType;

    /**
     * If defined the sprite will be positioned absolutely to its parent screen and removed from the
     * layout of its parent sprite.
     */
    absolutePosition?:SpriteAbsolutePosition;

    /**
     * Discreet width of the sprite. Width will override flex values when the sprite is a child in a row.
     */
    width?:number;

    /**
     * Discreet width of the sprite. Height will override flex values when the sprite is a child in a column.
     */
    height?:number;

    /**
     * Margin placed around the outside edge of the sprite.
     */
    margin?:number|SpriteSides;

    /**
     * Padding placed around the inside of the sprite. When the sprite is given a width or height padding
     * is applied inside of the given size and shrinks the content area.
     */
    padding?:number|SpriteSides;

    /**
     * Gap applied between children children when the sprite uses a `row`, `col` or `grid` layout.
     */
    gap?:number|SpriteGap;

    /**
     * Used to render custom inline content. The natural layout size of the sprite is still
     * determined by inline content of the sprite but instead of rendering the inline content
     * `inlineRenderer.render` is called to do the rendering. The renderer can only render to
     * area defined by the layout size of the sprite and rendering outside of that area is ignored.
     */
    inlineRenderer?:SpriteInlineRenderer;

    /**
     * Text displayed by the sprite.
     * @note Text is only displayed when a sprite uses the `inline` layout type.
     */
    text?:string;

    /**
     * Rich inline content displayed by the sprite. If defined, `richText` is used instead of `text`
     * for non-input inline sprites.
     * @note Rich text is only displayed when a sprite uses the `inline` layout type.
     */
    richText?:SpriteTextSpan[];

    /**
     * Controls the alignment of inline text. Text alignment also consols the alignment of images.
     * If undefined textAlignment is inherited.
     * @inherited
     */
    textAlign?:SpriteTextAlignment;

    /**
     * Controls the vertical alignment of inline text. Vertical text alignment also consols the
     * alignment of images. If undefined textAlignment is NOT inherited, this contrasts from the
     * textAlign property.
     */
    vTextAlign?:SpriteTextAlignment;

    /**
     * Controls how inline text is wrapped.
     * @default 'wrap'
     */
    textWrap?:SpriteTextWrap;

    /**
     * Controls the style that is used to clip text with.
     * @default 'ellipses'
     */
    textClipStyle?:SpriteTextClipStyle;

    /**
     * An image displayed by the sprite. When an image is defined the natural layout size is 
     * determined by the image size. The `text` property can be used with an image but the
     * text will not effect the layout size of the sprite.
     * @note Images are only displayed when a sprite uses the `inline` layout type.
     */
    image?:SpriteImage;

    /**
     * Foreground color. Can be a hex color or the name of a theme variable.
     */
    color?:string;
    /**
     * Foreground color used when the sprite is active
     */
    activeColor?:string;

    /**
     * If defined getColor will be used in place of color when drawing inline text. `getColor` is
     * commonly used for syntax highlighting.
     */
    getColor?:(char:string,charIndex:number,sprite:Sprite)=>string;

    /**
     * Background color. Can be a hex color or the name of a theme variable.
     */
    bg?:string;

    /**
     * If defined the sprite will have a 1 character wide border drawn around it using the given color.
     * `border` can either be a string that represents all 4 sides of the sprite or a SpriteBorder
     * object where each side can be set to individual colors or left undefined to not draw a border
     * on that side.
     */
    border?:string|SpriteBorder;


    /**
     * Background color used when the sprite is active
     */
    activeBg?:string;

    /**
     * Controls what set of characters are used to draw borders
     * @default 'normal'
     */
    borderStyle?:SpriteBorderStyle;

    /**
     * Border used when the sprite is active
     */
    activeBorder?:string|SpriteBorder;

    /**
     * Id of screen or other sprite to link to. When resolving link targets first the local
     * sprites in the screen of the linking sprite are checked for a matching id. Then if a local
     * match is not found all screens are checked for a matching id. And if no matching screen
     * is found all sprites of all screens are searched.
     *
     * When a sprite links to a screen the target screen will be set to the active screen.
     * And when a sprite is linked to it will be set as the active sprite of its screen.
     * If a sprite in a non-local screen is linked to the screen will be activated and the target
     * sprite will be set as the active sprite of its screen.
     */
    link?:string;

    /**
     * Discrete tab index. Inputs, buttons and links will automatically be assigned a tab index 
     * based on their order in the sprite tree.
     */
    tabIndex?:number;

    /**
     * If true children of the sprite will be able to scroll when their layout size is larger than
     * the available layout area.
     */
    scrollable?:boolean;

    /**
     * If true the sprite will act as a text input. Will automatically be set to true
     * when the sprite is loaded if `onInput` is defined.
     */
    isInput?:boolean;

    /**
     * If true and isInput is true the input will span multiple lines and its natural layout size
     * should be determined by the value of the input. Enter inserts new lines and Ctrl+Enter submits.
     */
    multiLineInput?:boolean;

    /**
     * Placeholder text to display for inputs when value is empty
     */
    placeholder?:string;

    /**
     * Color to use for placeholder text. If undefined the current color darkened by 40% should be used.
     */
    placeholderColor?:string;

    /**
     * If true the sprite will be treated as a clickable button. Will automatically be set to true
     * when the sprite is loaded if `onClick` is defined.
     */
    isButton?:boolean;

    /**
     * Called when the sprite is clicked. A sprite can be clicked by the user with the mouse or
     * tabbed to and clicked by pressing the enter or space key.
     */
    onClick?:(evt:SpriteClickEvt)=>void;

    /**
     * Called when a mouse button is released over the sprite.
     */
    onMouseRelease?:(evt:SpriteMouseReleaseEvt)=>void;

    /**
     * Called when the mouse is dragged over the sprite.
     */
    onMouseDrag?:(evt:SpriteMouseDragEvt)=>void;

    /**
     * Called when the mouse wheel is scrolled over the sprite.
     */
    onMouseWheel?:(evt:SpriteMouseWheelEvt)=>void;

    /**
     * Called when input is received from the keyboard while the sprite is active. The current
     * input value of the sprite is stored in `state.inputValue` and is updated before calling
     * onInput.
     */
    onInput?:(evt:SpriteInputEvt)=>void;

    /**
     * Called when an input is submitted. Single-line inputs submit with Enter. Multiline inputs
     * insert new lines with Enter and submit with Ctrl+Enter when the terminal emits a distinct
     * Ctrl+Enter escape sequence.
     */
    onSubmit?:(evt:SpriteSubmitEvt)=>void;

    /**
     * A flex layout value. After calculating the remaining display size of the sprites parent the
     * remaining area is shared by the sprite and its siblings based on their flex value.
     */
    flex?:number;


    /**
     * Column sizes to use with grid layout. Defaults to a single column where all children stack
     * vertically.
     * @default ['1fr']
     */
    gridCols?:SpriteGridColSize[];

    /**
     * Children of the sprite.
     * @note children are not displayed if the sprite uses the `inline` layout type.
     */
    children?:Sprite[];

    /**
     * Arbitrary data that can be used by application code.
     */
    data?:Record<string,any>;

    /**
     * Current state of the sprite. The state of a sprite is a mutable object.
     */
    state?:SpriteState;
}

/**
 * The definition of a sprite. When loaded the `SpriteDef` will be converted into a `Sprite`.
 */
export interface SpriteDef extends Omit<Sprite,'id'|'children'|'isActive'|'image'>
{
    id?:string;
    children?:SpriteDef[];
    /**
     * Base64 encoded image.
     * Data layout:
     * [header - 4 bytes][width - 4 bytes][bytesPerByte - 4 bytes][height - 4 bytes][reserved - 16 bytes][pixel data - (width*bytesPerByte*height) bytes]
     * header = x43 x6f x6e x76
     */
    image?:string;

    /**
     * Options used to convert the image into pixel data
     */
    imageOptions?:TuiImageConversionOptions;
}

export interface SpriteUpdate extends Partial<Omit<Sprite,'id'|'children'>>
{
    id:string;
    children?:SpriteDef[];
}

/**
 * A rich inline text span.
 */
export interface SpriteTextSpan
{
    /**
     * Plain text content of the span.
     */
    text:string;

    /**
     * Foreground color. Can be a hex color or the name of a theme variable.
     */
    color?:string;

    /**
     * Background color. Can be a hex color or the name of a theme variable.
     */
    bg?:string;
}

export interface SpriteState
{

    /**
     * True when the sprite is active.
     */
    active?:boolean;

    /**
     * Current input value of the sprite
     */
    inputValue?:string;

    /**
     * Zero-based caret index within the current input value. Defaults to the end of the input value.
     */
    inputCaret?:number;

    /**
     * Horizontal scroll offset of the sprite
     */
    scrollX?:number;

    /**
     * Vertical scroll offset of the sprite
     */
    scrollY?:number;
}

/**
 * - `wrap`: Text wraps to span multiple lines and breaks at whitespace. If unable to break at whitespace a hard break will be used where words are split across lines.
 * - `wrap-hard`: Text wraps to span multiple lines and breaks at the end of available space regardless where at in a word.
 * - `clip`: Text is clipped at the end of available space
 */
export type SpriteTextWrap='wrap'|'wrap-hard'|'clip';

/**
 * - `none`: Text is clipped at the last visible character
 * - `ellipses`: The last visible character of clipped text is replaced with the ellipses characters (…)
 */
export type SpriteTextClipStyle='none'|'ellipses';


export type SpriteEvtType=SpriteEvt['type'];

export interface SpriteEvtBase
{
    sprite:Sprite;
    screen:Screen;
    ctrl:ConvoTuiCtrl;
}

export interface SpriteClickEvt extends SpriteEvtBase
{
    type:'click';

    /**
     * Terminal-relative x coordinate of the click
     */
    x:number;

    /**
     * Terminal-relative y coordinate of the click
     */
    y:number;
}

export interface SpriteInputEvt extends SpriteEvtBase
{
    type:'input';
    value:string;
}

export interface SpriteSubmitEvt extends SpriteEvtBase
{
    type:'submit';
    value:string;
}

export type SpriteMouseButton='left'|'middle'|'right'|'unknown';

export interface SpriteMouseModifiers
{
    shift:boolean;
    alt:boolean;
    ctrl:boolean;
}

export interface SpriteMouseEvtBase extends SpriteEvtBase
{
    /**
     * Terminal-relative x coordinate of the mouse event
     */
    x:number;

    /**
     * Terminal-relative y coordinate of the mouse event
     */
    y:number;

    modifiers:SpriteMouseModifiers;
}

export interface SpriteMouseReleaseEvt extends SpriteMouseEvtBase
{
    type:'mouse-release';
    button:SpriteMouseButton;
}

export interface SpriteMouseDragEvt extends SpriteMouseEvtBase
{
    type:'mouse-drag';
    button:SpriteMouseButton;
}

export type SpriteMouseWheelDirection='up'|'down';

export interface SpriteMouseWheelEvt extends SpriteMouseEvtBase
{
    type:'mouse-wheel';
    direction:SpriteMouseWheelDirection;

    /**
     * Vertical wheel delta. Negative values scroll up and positive values scroll down.
     */
    deltaY:number;
}

export type SpriteEvt=SpriteClickEvt|SpriteInputEvt|SpriteSubmitEvt|SpriteMouseReleaseEvt|SpriteMouseDragEvt|SpriteMouseWheelEvt;

export type SpriteTextAlignment='start'|'center'|'end';


/**
 * The absolute positioning of a sprite.
 */
export interface SpriteAbsolutePosition
{
    left:number;
    top:number;
    right?:number;
    bottom?:number;

    /**
     * If undefined will fallback to the discreet width property of the sprite and if the discreet width
     * of the sprite is undefined the value of width will be calculated by subtracting the left and right
     * values from the width of the terminal and if right is undefined, right will default to 0.
     */
    width?:number;

    /**
     * If undefined will fallback to the discreet height property of the sprite and if the discreet height
     * of the sprite is undefined the value of height will be calculated by subtracting the top and bottom
     * values from the height of the terminal and if bottom is undefined, bottom will default to 0.
     */
    height?:number;
}
/**
 * normal:
 * ┌───┐
 * │   │
 * └───┘
 * 
 * thick:
 * ┏━━━┓
 * ┃   ┃
 * ┗━━━┛
 * 
 * rounded:
 * ╭───╮
 * │   │
 * ╰───╯
 * 
 * double:
 * ╔═══╗
 * ║   ║
 * ╚═══╝
 *
 * classic:
 * +---+
 * |   |
 * +---+
 *
 */
export type SpriteBorderStyle='normal'|'thick'|'rounded'|'double'|'classic';

/**
 * Represents the color of each side of the border of a sprite. Undefined sides represent a 
 * border-less side.
 */
export interface SpriteBorder
{
    top?:string;
    bottom?:string;
    left?:string;
    right?:string;
}

/**
 * Represents the 4 sides of a sprite. Primarily used with padding and margins. Undefined values
 * default to 0
 */
export interface SpriteSides
{
    top?:number;
    bottom?:number;
    left?:number;
    right?:number;
}

/**
 * Used to apply gap values to axis independently
 */
export interface SpriteGap
{
    x?:number;
    y?:number;
}

/**
 * Similar to the CSS display property.
 *
 * - `inline`: Renders the text of a sprite on a single line. Overflowing text is clipped
 * - `row`: Children of the sprite are displayed in a row. Similar to css `display:flex`, `flex-direction:row`
 * - `column`: Children of the sprite are displayed in a column. Similar to css `display:flex`, `flex-direction:column`
 * - `grid`: Children of the sprite are displayed in a grid. Similar to css `display:grid`
 */
export type SpriteLayoutType='inline'|'row'|'column'|'grid';

/**
 * Unit type used for grid columns
 * - cr: Character, width of a single character
 * - fr: Fractional unit, same as CSS fr unit type
 */
export type SpriteGridColUnit='cr'|'fr';

/**
 * Represents the size of a column in a grid. Format = "{number}{cr|fr}"
 */
export type SpriteGridColSize=`${number}${SpriteGridColUnit}`;


///// Custom sprite rendering /////

export interface SpriteInlineRenderer
{
    /**
     * Will render the inline content of a sprite instead of rendering the actual content.
     */
    render:(ctx:SpriteInlineRenderCtx)=>void;

    /**
     * If defined `render` will be called at the specified internal to allow efficient animations.
     * The render function is only called when the screen that contains the sprite is active.
     */
    intervalMs?:number;

    /**
     * If true the layout area give to the render function will overlay the bounds of the inline content.
     */
    overlayContent?:boolean;
}

export interface SpriteInlineRenderCtx
{
    /**
     * X position of layout area on screen;
     */
    x:number;

    /**
     * Y position of layout area on screen
     */
    y:number;

    /**
     * Width of the layout area of the sprite
     */
    width:number;

    /**
     * Height of the layout area of the sprite
     */
    height:number;

    /**
     * The sprite being rendered
     */
    sprite:Sprite;

    /**
     * TUI Controller
     */
    ctrl:ConvoTuiCtrl;

    /**
     * The number of times the renderer has been called. The current call is part of the count so
     * the first call with see a count of 1. This count tracks both the number of times the
     * callback was called due to an interval and normal renders. Use `ivCount` to track
     * the number of times an interval has been called.
     */
    count:number;

    /**
     * The number of times the renderer has been called due to a interval.
     */
    ivCount:number;

    delta:number;

    lastCall:number;

    renderBounds:TuiRect;
    
    clip:TuiRect;

    /**
     * Sets a character or a string of characters at the give position relative to layout area of
     * the sprites content. False is returned if an attempt to set a character outside of the
     * bounds of the inline content is made.
     */
    setChar(x:number,y:number,c:string,f?:string,b?:string):boolean;

    /**
     * Interval reference
     */
    iv?:any;
}


///// Image /////
export interface SpriteImage
{
    /**
     * Width in pixels
     */
    width:number;

    /**
     * Height in pixels
     */
    height:number;

    /**
     * Number of bytes per pixel. For RGB should be 3
     */
    bytesPerPixel:number;

    /**
     * Raw pixel data. Size = width * bytesPerPixel * height
     */
    pixelData:Uint8Array;

    /**
     * Parsing error encounter when creating the image.
     */
    error?:string;
}

export interface TuiImageConversionOptions
{
    /**
     * If true, pixels that border a transparent pixel will also be made transparent.
     * Is true for images with an alpha channel
     */
    cleanEdges?:boolean;

    /**
     * Target image width in pixels. If height is not defined it will be calculated using
     * the source image aspect ratio.
     */
    width?:number;

    /**
     * Target image height in pixels. If width is not defined it will be calculated using
     * the source image aspect ratio.
     */
    height?:number;
}


///// Char /////

export interface Char
{
    /**
     * The character to draw. Should always be a string with a length of 1.
     */
    c:string;

    /**
     * Foreground color of the character. Should match the color defined by the sprite of the char.
     * If undefined the default foreground color will be used.
     */
    f?:string;

    /**
     * Background color of the character. Should match the color defined by the sprite of the char.
     * If undefined the default background color will be used.
     */
    b?:string;

    /**
     * Sprite ID
     */
    i:string;
}


/**
 * 2 Dimensional array of `Char`s that represent the characters on screen. The buffer is an array
 * of character rows `buffer[y][x]`.
 * 
 * @example
 * declare const buffer:ScreenBuffer;
 * const y=5;
 * const x=10;
 * const charAtPos=buffer[y][x];
 */
export type ScreenBuffer=Char[][];

export interface ScreenBufferState
{
    /**
     * Width of the buffers. This should match the current width of the terminal
     */
    width:number;

    /**
     * Height of the buffers. This should match the current height of the terminal
     */
    height:number;

    /**
     * The buffer displayed in the terminal (display buffer)
     */
    front:ScreenBuffer;

    /**
     * The buffer updated by application code (off-screen buffer)
     */
    back:ScreenBuffer;
}

///// Other /////

/**
 * Theme color variables
 */
export interface TuiTheme
{
    foreground:string;
    background:string;
    [varName:string]:string;
}

export type TuiStreamListener=(...args:any[])=>void;

export interface TuiWriteStream
{
    columns?:number;
    rows?:number;
    write:(buffer:string|Uint8Array, cb?:(err?:Error|null)=>void)=>boolean;
    on?:(event:string, listener:TuiStreamListener)=>this;
    off?:(event:string, listener:TuiStreamListener)=>this;
}
export interface TuiReadStream
{
    isTTY?:boolean;
    setRawMode?:(mode:boolean)=>this;
    resume?:()=>this;
    pause?:()=>this;
    on?:(event:string, listener:TuiStreamListener)=>this;
    off?:(event:string, listener:TuiStreamListener)=>this;
}

/**
 * An interface that covers the minimum set of APIs of the Node console to implement the functionality
 * of `ConvoTuiCtrl`. The interface should be compatible with Node's console class
 */
export interface TuiConsole
{
    stdout:TuiWriteStream;
    stdin:TuiReadStream;
}

export interface TuiSize
{
    width:number;
    height:number;
}

export interface TuiRect extends TuiSize
{
    x:number;
    y:number;
}

export type TuiColorMode='truecolor'|'256';