var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};

// ../../packages/tui/src/tui-image-lib.ts
var imageHeaderSize = 32;
var imageHeader = [67, 111, 110, 118];
var convertB64TuiImage = (b64, options) => {
  try {
    const data = decodeB64Bytes(b64);
    const error = validateTuiImageBytes(data);
    if (error) {
      return createDefaultTuiImage(error);
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let width = view.getUint32(4, true);
    const bytesPerPixel = view.getUint32(8, true);
    let height = view.getUint32(12, true);
    const pixelLength = width * bytesPerPixel * height;
    let pixelData = data.slice(imageHeaderSize, imageHeaderSize + pixelLength);
    if (options?.cleanEdges ?? (bytesPerPixel > 3 ? true : false)) {
      makeTransparentPixelBorders(pixelData, width, height, bytesPerPixel);
    }
    const targetSize = getTuiImageTargetSize(width, height, options);
    if (targetSize && (targetSize.width !== width || targetSize.height !== height)) {
      pixelData = resizeTuiImagePixels(pixelData, width, height, bytesPerPixel, targetSize.width, targetSize.height);
      width = targetSize.width;
      height = targetSize.height;
    }
    return {
      width,
      height,
      bytesPerPixel,
      pixelData
    };
  } catch (ex) {
    return createDefaultTuiImage(ex instanceof Error ? ex.message : "Unable to decode TUI image");
  }
};
var decodeB64Bytes = (b64) => {
  const normalized = normalizeB64(b64);
  if (!normalized) {
    throw new Error("Empty TUI image data");
  }
  const atobFn = globalThis.atob;
  let atobError;
  if (atobFn) {
    try {
      const binary = atobFn(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0;i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (ex) {
      atobError = ex;
    }
  }
  const BufferCtor = globalThis.Buffer;
  if (BufferCtor?.from) {
    return new Uint8Array(BufferCtor.from(normalized, "base64"));
  }
  throw atobError instanceof Error ? atobError : new Error("No base64 decoder available");
};
var normalizeB64 = (b64) => {
  const trimmed = b64.trim();
  const commaIndex = trimmed.indexOf(",");
  const value = trimmed.startsWith("data:") && commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
  return value.replace(/\s+/g, "");
};
var validateTuiImageBytes = (data) => {
  if (data.length < imageHeaderSize) {
    return `Invalid TUI image data. Expected at least ${imageHeaderSize} bytes.`;
  }
  for (let i = 0;i < imageHeader.length; i++) {
    if (data[i] !== imageHeader[i]) {
      return "Invalid TUI image header.";
    }
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(4, true);
  const bytesPerPixel = view.getUint32(8, true);
  const height = view.getUint32(12, true);
  if (!width || !height) {
    return "Invalid TUI image dimensions.";
  }
  if (!bytesPerPixel) {
    return "Invalid TUI image bytesPerPixel value.";
  }
  const pixelLength = width * bytesPerPixel * height;
  if (!Number.isSafeInteger(pixelLength)) {
    return "Invalid TUI image pixel data length.";
  }
  if (data.length < imageHeaderSize + pixelLength) {
    return `Invalid TUI image pixel data length. Expected ${pixelLength} bytes.`;
  }
  return;
};
var getTuiImageTargetSize = (width, height, options) => {
  const optionWidth = getTuiImageDimension(options?.width);
  const optionHeight = getTuiImageDimension(options?.height);
  if (!optionWidth && !optionHeight) {
    return;
  }
  const targetWidth = optionWidth ?? Math.max(1, Math.round(width * optionHeight / height));
  const targetHeight = optionHeight ?? Math.max(1, Math.round(height * optionWidth / width));
  return { width: targetWidth, height: targetHeight };
};
var getTuiImageDimension = (value) => {
  if (value === undefined) {
    return;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }
  return Math.max(1, Math.round(value));
};
var resizeTuiImagePixels = (pixelData, width, height, bytesPerPixel, targetWidth, targetHeight) => {
  const targetPixelLength = targetWidth * targetHeight * bytesPerPixel;
  if (!Number.isSafeInteger(targetPixelLength)) {
    throw new Error("Invalid TUI image target pixel data length.");
  }
  const resized = new Uint8Array(targetPixelLength);
  for (let y = 0;y < targetHeight; y++) {
    const sourceY = Math.min(height - 1, Math.floor(y * height / targetHeight));
    for (let x = 0;x < targetWidth; x++) {
      const sourceX = Math.min(width - 1, Math.floor(x * width / targetWidth));
      const sourceOffset = (sourceY * width + sourceX) * bytesPerPixel;
      const targetOffset = (y * targetWidth + x) * bytesPerPixel;
      for (let b = 0;b < bytesPerPixel; b++) {
        resized[targetOffset + b] = pixelData[sourceOffset + b];
      }
    }
  }
  return resized;
};
var makeTransparentPixelBorders = (pixelData, width, height, bytesPerPixel) => {
  if (bytesPerPixel < 4) {
    return;
  }
  const transparentPixels = new Uint8Array(width * height);
  for (let y = 0;y < height; y++) {
    for (let x = 0;x < width; x++) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * bytesPerPixel;
      transparentPixels[pixelIndex] = pixelData[offset + 3] === 0 ? 1 : 0;
    }
  }
  for (let y = 0;y < height; y++) {
    for (let x = 0;x < width; x++) {
      const pixelIndex = y * width + x;
      if (!transparentPixels[pixelIndex]) {
        continue;
      }
      for (let ny = Math.max(0, y - 1);ny <= Math.min(height - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1);nx <= Math.min(width - 1, x + 1); nx++) {
          const offset = (ny * width + nx) * bytesPerPixel;
          pixelData[offset + 3] = 0;
        }
      }
    }
  }
};
var createDefaultTuiImage = (error) => {
  const width = 8;
  const height = 8;
  const bytesPerPixel = 3;
  const pixelData = new Uint8Array(width * height * bytesPerPixel);
  for (let y = 0;y < height; y++) {
    for (let x = 0;x < width; x++) {
      const offset = (y * width + x) * bytesPerPixel;
      const isX = x === y || x === width - y - 1;
      pixelData[offset] = isX ? 255 : 32;
      pixelData[offset + 1] = isX ? 64 : 32;
      pixelData[offset + 2] = isX ? 64 : 32;
    }
  }
  return {
    width,
    height,
    bytesPerPixel,
    pixelData,
    error
  };
};

// ../../packages/tui/src/ConvoTuiCtrl.ts
class ConvoTuiCtrl {
  screens = [];
  console;
  theme;
  log;
  bufferState = {
    width: 0,
    height: 0,
    front: [],
    back: []
  };
  cleanupCallbacks = [];
  clipStack = [];
  spriteContentRects = new Map;
  inputBuffer = "";
  inputCursor;
  isInitialized = false;
  forceFullRender = true;
  _activeScreen;
  get activeScreen() {
    return this._activeScreen;
  }
  constructor({
    screens,
    console: console2,
    theme,
    defaultScreen,
    log = globalThis.console.log
  }) {
    this.log = log;
    this.console = console2;
    this.theme = theme;
    this.screens = this.loadScreens(screens);
    this._activeScreen = this.getInitialScreen(defaultScreen);
    if (this._activeScreen) {
      this.prepareActiveScreen(this._activeScreen);
    }
  }
  _isDisposed = false;
  get isDisposed() {
    return this._isDisposed;
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    for (const cb of this.cleanupCallbacks.splice(0)) {
      cb();
    }
    this.stopAnimations();
    this.console.stdin.setRawMode?.(false);
    this.console.stdin.pause?.();
    this.writeAnsi("\x1B[0m\x1B[?1000l\x1B[?1006l\x1B[?2004l\x1B[?25h\x1B[?1049l");
  }
  addDisposeCallback(callback) {
    if (this.isDisposed) {
      callback();
      return;
    }
    this.cleanupCallbacks.push(callback);
  }
  nextId = 1;
  getNextId() {
    return `_${this.nextId++}`;
  }
  init() {
    if (this.isInitialized || this._isDisposed) {
      return;
    }
    this.isInitialized = true;
    this.resizeBuffers();
    this.writeAnsi("\x1B[?1049h\x1B[?25l\x1B[?1000h\x1B[?1006h\x1B[?2004h\x1B[2J\x1B[H");
    this.console.stdin.setRawMode?.(true);
    this.console.stdin.resume?.();
    const onData = (data) => this.handleInput(data);
    const onResize = () => {
      this.resizeBuffers();
      this.render();
    };
    this.console.stdin.on?.("data", onData);
    this.console.stdout.on?.("resize", onResize);
    this.cleanupCallbacks.push(() => {
      this.console.stdin.off?.("data", onData);
      this.console.stdout.off?.("resize", onResize);
    });
    this.render();
  }
  loadScreens(defs) {
    return defs.map((def) => ({
      ...def,
      id: def.id ?? this.getNextId(),
      root: this.loadSprite(def.root),
      state: def.state ? { ...def.state } : undefined
    }));
  }
  loadSprite(def) {
    const sprite = {
      ...def,
      id: def.id ?? this.getNextId(),
      children: def.children?.map((child) => this.loadSprite(child)),
      state: def.state ? { ...def.state } : undefined,
      image: def.image ? convertB64TuiImage(def.image, def.imageOptions) : undefined
    };
    if (sprite.onInput && sprite.isInput === undefined) {
      sprite.isInput = true;
    }
    if (sprite.onClick && sprite.isButton === undefined) {
      sprite.isButton = true;
    }
    return sprite;
  }
  getInitialScreen(defaultScreen) {
    if (defaultScreen) {
      return this.findScreen(defaultScreen) ?? this.screens[0];
    }
    return this.screens[0];
  }
  prepareActiveScreen(screen) {
    screen.state ??= {};
    if (!screen.state.activeSpriteId && screen.defaultSprite) {
      const sprite = this.findSpriteById(screen.defaultSprite, screen);
      if (sprite) {
        screen.state.activeSpriteId = sprite.id;
      }
    }
    this.syncActiveSpriteStates(screen);
  }
  syncActiveSpriteStates(screen) {
    const activeId = screen.state?.activeSpriteId;
    const visit = (sprite) => {
      const active = !!activeId && sprite.id === activeId;
      if (sprite.state || active) {
        sprite.state ??= {};
        sprite.state.active = active;
      }
      for (const child of sprite.children ?? []) {
        visit(child);
      }
    };
    visit(screen.root);
  }
  findScreen(id) {
    return this.screens.find((screen) => screen.id === id);
  }
  findSpriteById(id, screen) {
    if (id == null || id === undefined) {
      return;
    }
    if (screen) {
      return this.findSpriteInTree(screen.root, id);
    }
    for (const s of this.screens) {
      const sprite = this.findSpriteInTree(s.root, id);
      if (sprite) {
        return sprite;
      }
    }
    return;
  }
  findSpriteInTree(sprite, id) {
    if (sprite.id === id) {
      return sprite;
    }
    for (const child of sprite.children ?? []) {
      const found = this.findSpriteInTree(child, id);
      if (found) {
        return found;
      }
    }
    return;
  }
  findSpritePathById(id, screen) {
    return this.findSpritePathInTree(screen.root, id);
  }
  findSpritePathInTree(sprite, id) {
    if (sprite.id === id) {
      return [sprite];
    }
    for (const child of sprite.children ?? []) {
      const path = this.findSpritePathInTree(child, id);
      if (path) {
        return [sprite, ...path];
      }
    }
    return;
  }
  findScreenContainingSprite(sprite) {
    for (const screen of this.screens) {
      if (this.containsSprite(screen.root, sprite)) {
        return screen;
      }
    }
    return;
  }
  containsSprite(root, sprite) {
    if (root === sprite) {
      return true;
    }
    for (const child of root.children ?? []) {
      if (this.containsSprite(child, sprite)) {
        return true;
      }
    }
    return false;
  }
  activateScreen(id) {
    const screen = this.findScreen(id);
    if (!screen) {
      return;
    }
    if (this._activeScreen === screen) {
      return screen;
    }
    this.stopAnimations();
    const prev = this._activeScreen;
    if (prev) {
      prev.onDeactivate?.({
        type: "deactivate",
        screen: prev,
        ctrl: this
      });
      if (prev.transient) {
        prev.state = {};
      }
    }
    this._activeScreen = screen;
    this.prepareActiveScreen(screen);
    screen.onActivate?.({
      type: "activate",
      screen,
      ctrl: this
    });
    this.render();
    return screen;
  }
  activateSprite(id, screen) {
    if (typeof id !== "string") {
      return;
    }
    const targetScreen = typeof screen === "string" ? this.findScreen(screen) : screen ?? this._activeScreen;
    if (!targetScreen) {
      return;
    }
    const sprite = this.findSpriteById(id, targetScreen);
    if (!sprite) {
      return;
    }
    targetScreen.state ??= {};
    targetScreen.state.activeSpriteId = sprite.id;
    this.syncActiveSpriteStates(targetScreen);
    this.render();
    return sprite;
  }
  activateLink(link, sourceScreen) {
    const localScreen = typeof sourceScreen === "string" ? this.findScreen(sourceScreen) : sourceScreen;
    if (localScreen) {
      const localSprite = this.findSpriteById(link, localScreen);
      if (localSprite) {
        this.activateScreen(localScreen.id);
        this.activateSprite(localSprite.id, localScreen);
        return localSprite;
      }
    }
    const screen = this.findScreen(link);
    if (screen) {
      return this.activateScreen(screen.id);
    }
    for (const s of this.screens) {
      const sprite = this.findSpriteById(link, s);
      if (sprite) {
        this.activateScreen(s.id);
        this.activateSprite(sprite.id, s);
        return sprite;
      }
    }
    return;
  }
  followLink(spriteOrId) {
    const sprite = typeof spriteOrId === "string" ? this.findSpriteById(spriteOrId) : spriteOrId;
    if (!sprite?.link) {
      return;
    }
    return this.activateLink(sprite.link, this.findScreenContainingSprite(sprite));
  }
  resizeBuffers() {
    const width = this.console.stdout.columns ?? 80;
    const height = this.console.stdout.rows ?? 24;
    if (this.bufferState.width === width && this.bufferState.height === height) {
      return false;
    }
    this.bufferState.width = width;
    this.bufferState.height = height;
    this.bufferState.front = this.createBuffer(width, height);
    this.bufferState.back = this.createBuffer(width, height);
    this.forceFullRender = true;
    return true;
  }
  createBuffer(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => this.createChar()));
  }
  createChar(char = " ", spriteId = "") {
    return {
      c: char,
      f: this.resolveColor(this.theme.foreground),
      b: this.resolveColor(this.theme.background),
      i: spriteId
    };
  }
  render() {
    if (this._isDisposed) {
      return;
    }
    this.inputCursor = undefined;
    this.resizeBuffers();
    this.clearBuffer(this.bufferState.back);
    this.spriteContentRects.clear();
    const screen = this._activeScreen;
    if (screen) {
      this.syncActiveSpriteStates(screen);
      const rect = {
        x: 0,
        y: 0,
        width: this.bufferState.width,
        height: this.bufferState.height
      };
      this.drawSprite(screen.root, rect, {
        f: this.resolveColor(this.theme.foreground),
        b: this.resolveColor(this.theme.background)
      });
      this.drawAbsoluteSprites(screen.root);
    }
    const output = this.forceFullRender ? this.renderBufferAnsi(this.bufferState.back) : this.renderBufferDiffAnsi(this.bufferState.front, this.bufferState.back, { x: 0, y: 0, width: this.bufferState.width, height: this.bufferState.height });
    this.copyBackBufferToFront();
    this.forceFullRender = false;
    const cursorOutput = this.getCursorAnsi();
    if (output || cursorOutput) {
      this.writeAnsi(`\x1B[?25l${output}${cursorOutput}`);
    }
  }
  clearBuffer(buffer) {
    const f = this.resolveColor(this.theme.foreground);
    const b = this.resolveColor(this.theme.background);
    for (let y = 0;y < this.bufferState.height; y++) {
      let row = buffer[y];
      if (!row) {
        row = [];
        buffer[y] = row;
      }
      for (let x = 0;x < this.bufferState.width; x++) {
        let c = row[x];
        if (!c) {
          c = this.createChar();
          row[x] = c;
        } else {
          c.c = " ";
          c.f = f;
          c.b = f;
          c.i = "";
        }
      }
    }
  }
  copyBackBufferToFront() {
    const bs = this.bufferState;
    if (bs.front.length === bs.back.length && bs.front[0]?.length === bs.back[0]?.length) {
      for (let y = 0;y <= bs.back.length; y++) {
        const br = bs.back[y];
        const fr = bs.front[y];
        if (!br || !fr) {
          continue;
        }
        for (let x = 0;x < br.length; x++) {
          const b = br[x];
          const f = fr[x];
          if (!b || !f) {
            continue;
          }
          f.c = b.c;
          f.f = b.f;
          f.b = b.b;
          f.i = b.i;
        }
      }
    } else {
      this.bufferState.front = this.bufferState.back.map((row) => row.map((char) => ({ ...char })));
    }
  }
  copyBackBufferToFrontBound(rect) {
    const bs = this.bufferState;
    const xl = rect.x + rect.width;
    const yl = rect.y + rect.height;
    for (let y = rect.y;y <= yl; y++) {
      const br = bs.back[y];
      const fr = bs.front[y];
      if (!br || !fr) {
        continue;
      }
      for (let x = rect.x;x < xl; x++) {
        const b = br[x];
        const f = fr[x];
        if (!b || !f) {
          continue;
        }
        f.c = b.c;
        f.f = b.f;
        f.b = b.b;
        f.i = b.i;
      }
    }
  }
  renderBufferAnsi(buffer) {
    let output = "\x1B[0m\x1B[H";
    let activeF;
    let activeB;
    for (let y = 0;y < buffer.length; y++) {
      const row = buffer[y];
      for (let x = 0;x < row.length; x++) {
        const char = row[x];
        if (char.f !== activeF) {
          output += this.getFgAnsi(char.f);
          activeF = char.f;
        }
        if (char.b !== activeB) {
          output += this.getBgAnsi(char.b);
          activeB = char.b;
        }
        output += char.c;
      }
      if (y < buffer.length - 1) {
        output += `\r
`;
      }
    }
    return `${output}\x1B[0m`;
  }
  renderBufferDiffAnsi(front, back, bounds) {
    let output = "";
    let activeF;
    let activeB;
    const yl = Math.min(bounds.y + bounds.height, back.length);
    for (let y = bounds.y;y < yl; y++) {
      const backRow = back[y];
      const frontRow = front[y] ?? [];
      const xl = Math.min(bounds.x + bounds.width, backRow.length);
      let x = bounds.x;
      while (x < xl) {
        if (this.isSameRenderChar(frontRow[x], backRow[x])) {
          x++;
          continue;
        }
        output += this.getCursorPositionAnsi(x, y);
        while (x < backRow.length && !this.isSameRenderChar(frontRow[x], backRow[x])) {
          const char = backRow[x];
          if (char.f !== activeF) {
            output += this.getFgAnsi(char.f);
            activeF = char.f;
          }
          if (char.b !== activeB) {
            output += this.getBgAnsi(char.b);
            activeB = char.b;
          }
          output += char.c;
          x++;
        }
      }
    }
    return output ? `\x1B[0m${output}\x1B[0m` : "";
  }
  isSameRenderChar(a, b) {
    return a?.c === b?.c && a?.f === b?.f && a?.b === b?.b;
  }
  getCursorPositionAnsi(x, y) {
    return `\x1B[${y + 1};${x + 1}H`;
  }
  getCursorAnsi() {
    if (!this.inputCursor) {
      return "\x1B[?25l";
    }
    return `${this.getCursorPositionAnsi(this.inputCursor.x, this.inputCursor.y)}\x1B[?25h`;
  }
  drawSprite(sprite, rect, parentStyle, inheritedProps = {}) {
    rect = this.normalizeRect(rect);
    const margin = this.getSpriteSides(sprite.margin);
    const spriteRect = this.normalizeRect(this.insetRect(rect, margin));
    if (spriteRect.width <= 0 || spriteRect.height <= 0) {
      return;
    }
    const active = this.isSpriteActive(sprite);
    const nextInheritedProps = {
      ...inheritedProps,
      textAlign: sprite.textAlign ?? inheritedProps.textAlign
    };
    const baseStyle = {
      f: this.resolveColor(sprite.color) ?? parentStyle.f,
      b: this.resolveColor(sprite.bg) ?? parentStyle.b
    };
    const style = {
      f: (active ? this.resolveColor(sprite.activeColor) : undefined) ?? baseStyle.f,
      b: (active ? this.resolveColor(sprite.activeBg) : undefined) ?? baseStyle.b
    };
    this.fillRect(spriteRect, baseStyle, sprite.id);
    const border = this.getBorderColors(sprite, style.f);
    if (border.hasBorder) {
      this.drawBorder(spriteRect, border, sprite.borderStyle ?? "normal", sprite.id);
    }
    const paddingBox = this.getContentRect(spriteRect, border);
    const contentRect = this.normalizeRect(this.insetRect(paddingBox, this.getSpriteSides(sprite.padding)));
    this.spriteContentRects.set(sprite.id, contentRect);
    if (paddingBox.width > 0 && paddingBox.height > 0) {
      this.fillRect(paddingBox, style, sprite.id);
    }
    if (sprite.scrollable) {
      this.clampSpriteScroll(sprite, contentRect);
    }
    if (contentRect.width <= 0 || contentRect.height <= 0) {
      return;
    }
    const layout = sprite.layout ?? "inline";
    if (layout === "inline") {
      this.drawInlineSprite(sprite, contentRect, style, nextInheritedProps.textAlign ?? "start");
      return;
    }
    this.drawChildren(sprite, contentRect, style, nextInheritedProps);
  }
  drawAbsoluteSprites(root) {
    for (const item of this.getAbsoluteSprites(root)) {
      const sprite = item.sprite;
      const pos = sprite.absolutePosition;
      if (!pos) {
        continue;
      }
      const margin = this.getSpriteSides(sprite.margin);
      const marginWidth = margin.left + margin.right;
      const marginHeight = margin.top + margin.bottom;
      const right = pos.right ?? 0;
      const bottom = pos.bottom ?? 0;
      const width = this.getSpriteDiscreteSize(pos.width) ?? this.getSpriteDiscreteSize(sprite.width);
      const height = this.getSpriteDiscreteSize(pos.height) ?? this.getSpriteDiscreteSize(sprite.height);
      const rect = {
        x: pos.left,
        y: pos.top,
        width: width === undefined ? Math.max(0, this.bufferState.width - pos.left - right) : width + marginWidth,
        height: height === undefined ? Math.max(0, this.bufferState.height - pos.top - bottom) : height + marginHeight
      };
      this.drawSprite(sprite, rect, {
        f: this.resolveColor(this.theme.foreground),
        b: this.resolveColor(this.theme.background)
      }, item.inheritedProps);
    }
  }
  isSpriteActive(sprite) {
    return sprite.state?.active === true;
  }
  getAbsoluteSprites(root) {
    const sprites = [];
    const visit = (sprite, inheritedProps = {}) => {
      const nextInheritedProps = {
        ...inheritedProps,
        textAlign: sprite.textAlign ?? inheritedProps.textAlign
      };
      for (const child of sprite.children ?? []) {
        if (child.absolutePosition) {
          sprites.push({ sprite: child, inheritedProps: nextInheritedProps });
        }
        visit(child, nextInheritedProps);
      }
    };
    visit(root);
    return sprites;
  }
  drawInlineSprite(sprite, rect, style, textAlign) {
    const value = this.getInlineSpriteText(sprite);
    const chars = this.getInlineSpriteChars(sprite, style);
    const textWrap = sprite.textWrap ?? "wrap";
    const textClipStyle = sprite.textClipStyle ?? "ellipses";
    const vTextAlign = sprite.vTextAlign ?? "start";
    const scrollX = sprite.scrollable ? sprite.state?.scrollX ?? 0 : 0;
    const scrollY = sprite.scrollable ? sprite.state?.scrollY ?? 0 : 0;
    const lines = this.getInlineSpriteCharLines(chars, rect.width, textWrap);
    const visibleLines = lines.slice(Math.max(0, scrollY), Math.max(0, scrollY) + rect.height);
    const yOffset = scrollY > 0 ? 0 : this.getTextAlignOffset(vTextAlign, Math.min(visibleLines.length, rect.height), rect.height);
    if (sprite.image) {
      this.drawInlineImage(sprite, rect, style, textAlign, vTextAlign, scrollX, scrollY);
    }
    if (sprite.isInput && this.isSpriteActive(sprite)) {
      this.updateInputCursor(sprite, rect, value, textWrap, textClipStyle, textAlign, vTextAlign, scrollX, scrollY);
    }
    let left = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;
    if (!sprite.inlineRenderer?.overlayContent) {
      left = rect.x;
      right = rect.x + rect.width - 1;
      top = rect.y;
      bottom = rect.y + rect.height - 1;
    }
    for (let y = 0;y < visibleLines.length && y < rect.height; y++) {
      const line = visibleLines[y] ?? [];
      const offset = Math.max(0, scrollX);
      const scrolledLine = line.slice(offset);
      const clipped = scrolledLine.length > rect.width;
      const text = this.clipInlineChars(scrolledLine, rect.width, textClipStyle, clipped, style);
      const xOffset = scrollX > 0 ? 0 : this.getTextAlignOffset(textAlign, text.length, rect.width);
      for (let i = 0;i < text.length && i < rect.width; i++) {
        const char = text[i];
        const cx = rect.x + xOffset + i;
        const cy = rect.y + yOffset + y;
        if (sprite.inlineRenderer) {
          if (sprite.inlineRenderer.overlayContent) {
            if (cx < left) {
              left = cx;
            }
            if (cy < top) {
              top = cy;
            }
            if (cx > right) {
              right = cx;
            }
            if (cy > bottom) {
              bottom = cy;
            }
          }
        } else {
          this.setChar(cx, cy, char.c, char.f, char.b, sprite.id);
        }
      }
    }
    if (sprite.inlineRenderer && left !== Number.MAX_SAFE_INTEGER && right !== Number.MIN_SAFE_INTEGER && top !== Number.MAX_SAFE_INTEGER && bottom !== Number.MIN_SAFE_INTEGER) {
      const renderRect = {
        x: left,
        y: top,
        width: Math.max(0, right - left + 1),
        height: Math.max(0, bottom - top + 1)
      };
      const clip = this.getCurrentClip() ?? {
        x: 0,
        y: 0,
        width: this.bufferState.width,
        height: this.bufferState.height
      };
      const renderBounds = this.intersectRects(renderRect, clip);
      const width = renderBounds.width;
      const height = renderBounds.height;
      const _self = this;
      const ctx = sprite[this.inlineRenderCtxKey] ?? (sprite[this.inlineRenderCtxKey] = {
        width,
        height,
        x: left,
        y: top,
        renderBounds,
        clip,
        count: 0,
        lastCall: Date.now(),
        delta: 0,
        ivCount: 0,
        sprite,
        ctrl: this,
        setChar(x, y, c, f, b) {
          if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
          }
          const set = (px, py, cc) => {
            const ax = this.x + px;
            const ay = this.y + py;
            if (this.clip && (ax < this.clip.x || ay < this.clip.y || ax >= this.clip.x + this.clip.width || ay >= this.clip.y + this.clip.height)) {
              return;
            }
            _self.setChar(ax, ay, cc, _self.resolveColor(f), _self.resolveColor(b), sprite.id);
          };
          if (c.length > 1) {
            for (let i = 0;i < c.length; i++) {
              let cc = c[i];
              if (cc === `
` || cc === "\r") {
                cc = " ";
              }
              if (x + i >= this.width) {
                break;
              }
              set(x + i, y, cc);
            }
          } else {
            set(x, y, c);
          }
          return true;
        }
      });
      ctx.count++;
      ctx.x = left;
      ctx.y = top;
      ctx.width = width;
      ctx.height = height;
      ctx.renderBounds = renderBounds;
      ctx.clip = clip;
      const now = Date.now();
      ctx.delta = Math.max(1, now - ctx.lastCall);
      ctx.lastCall = now;
      sprite.inlineRenderer.render?.(ctx);
      if (sprite.inlineRenderer.intervalMs !== undefined && !this.animationCtxList.includes(ctx)) {
        this.startAnimation(ctx);
      }
    }
  }
  inlineRenderCtxKey = Symbol("inlineRenderCtxKey");
  animationCtxList = [];
  startAnimation(ctx) {
    this.animationCtxList.push(ctx);
    clearInterval(ctx.iv);
    ctx.iv = setInterval(() => {
      ctx.count++;
      ctx.ivCount++;
      const now = Date.now();
      ctx.delta = Math.max(1, now - ctx.lastCall);
      ctx.lastCall = now;
      ctx.sprite.inlineRenderer?.render?.(ctx);
      const bounds = ctx.renderBounds;
      const output = bounds.width > 0 && bounds.height > 0 ? this.renderBufferDiffAnsi(this.bufferState.front, this.bufferState.back, bounds) : "";
      const cursorOutput = this.getCursorAnsi();
      if (bounds.width > 0 && bounds.height > 0) {
        this.copyBackBufferToFrontBound(bounds);
      }
      if (output || cursorOutput) {
        this.writeAnsi(`\x1B[?25l${output}${cursorOutput}`);
      }
    }, ctx.sprite.inlineRenderer?.intervalMs ?? 200);
  }
  stopAnimations() {
    if (!this.animationCtxList.length) {
      return;
    }
    for (const a of this.animationCtxList) {
      clearInterval(a.iv);
      delete a.iv;
    }
    this.animationCtxList = [];
  }
  drawInlineImage(sprite, rect, style, textAlign, vTextAlign, scrollX, scrollY) {
    const image = sprite.image;
    if (!image) {
      return;
    }
    const imageSize = this.getImageCellSize(image);
    const offsetX = Math.max(0, Math.floor(scrollX));
    const offsetY = Math.max(0, Math.floor(scrollY));
    const visibleWidth = Math.min(rect.width, Math.max(0, imageSize.width - offsetX));
    const visibleHeight = Math.min(rect.height, Math.max(0, imageSize.height - offsetY));
    const xOffset = offsetX > 0 ? 0 : this.getTextAlignOffset(textAlign, visibleWidth, rect.width);
    const yOffset = offsetY > 0 ? 0 : this.getTextAlignOffset(vTextAlign, visibleHeight, rect.height);
    for (let y = 0;y < visibleHeight; y++) {
      const imageCellY = y + offsetY;
      const topPixelY = imageCellY * 2;
      if (topPixelY >= image.height) {
        break;
      }
      for (let x = 0;x < visibleWidth && x + xOffset < rect.width; x++) {
        const imageX = x + offsetX;
        if (imageX >= image.width) {
          break;
        }
        const top = this.getImagePixelColor(image, imageX, topPixelY);
        const bottom = this.getImagePixelColor(image, imageX, topPixelY + 1);
        this.setChar(rect.x + xOffset + x, rect.y + yOffset + y, "▀", top ?? style.b, bottom ?? style.b, sprite.id);
      }
    }
  }
  getImageCellSize(image) {
    return {
      width: Math.max(1, image.width),
      height: Math.max(1, Math.ceil(image.height / 2))
    };
  }
  getImagePixelColor(image, x, y) {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height || image.bytesPerPixel <= 0) {
      return;
    }
    const offset = (y * image.width + x) * image.bytesPerPixel;
    if (offset < 0 || offset >= image.pixelData.length) {
      return;
    }
    if (image.bytesPerPixel >= 3) {
      const alpha = image.bytesPerPixel >= 4 ? image.pixelData[offset + 3] ?? 255 : 255;
      if (alpha <= 0) {
        return;
      }
      return this.rgbToHex(image.pixelData[offset] ?? 0, image.pixelData[offset + 1] ?? 0, image.pixelData[offset + 2] ?? 0);
    }
    const value = image.pixelData[offset] ?? 0;
    return this.rgbToHex(value, value, value);
  }
  rgbToHex(r, g, b) {
    return `#${this.toHexByte(r)}${this.toHexByte(g)}${this.toHexByte(b)}`;
  }
  toHexByte(value) {
    return this.clampNumber(Math.floor(value), 0, 255).toString(16).padStart(2, "0");
  }
  updateInputCursor(sprite, rect, value, textWrap, textClipStyle, textAlign, vTextAlign, scrollX, scrollY) {
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const caret = this.getInputCaret(sprite, value);
    const caretLines = this.getInlineSpriteLines(value.slice(0, caret), rect.width, textWrap);
    const lineIndex = Math.max(0, caretLines.length - 1);
    const col = caretLines[lineIndex]?.length ?? 0;
    const lines = this.getInlineSpriteLines(value, rect.width, textWrap);
    const line = lines[lineIndex] ?? "";
    const offset = Math.max(0, scrollX);
    const scrolledLine = line.slice(offset);
    const clipped = scrolledLine.length > rect.width;
    const text = this.clipText(scrolledLine, rect.width, textClipStyle, clipped);
    const xOffset = scrollX > 0 ? 0 : this.getTextAlignOffset(textAlign, text.length, rect.width);
    const yOffset = scrollY > 0 ? 0 : this.getTextAlignOffset(vTextAlign, Math.min(lines.length, rect.height), rect.height);
    const x = this.clampNumber(rect.x + xOffset + col - offset, rect.x, rect.x + rect.width - 1);
    const y = this.clampNumber(rect.y + yOffset + lineIndex - Math.max(0, scrollY), rect.y, rect.y + rect.height - 1);
    const visibleRect = this.intersectRects(this.getCurrentClip() ?? {
      x: 0,
      y: 0,
      width: this.bufferState.width,
      height: this.bufferState.height
    }, {
      x: 0,
      y: 0,
      width: this.bufferState.width,
      height: this.bufferState.height
    });
    if (x < visibleRect.x || y < visibleRect.y || x >= visibleRect.x + visibleRect.width || y >= visibleRect.y + visibleRect.height) {
      return;
    }
    this.inputCursor = { x, y };
  }
  getInputCaret(sprite, value) {
    const caret = sprite.state?.inputCaret;
    return this.clampNumber(typeof caret === "number" && Number.isFinite(caret) ? Math.floor(caret) : value.length, 0, value.length);
  }
  drawChildren(sprite, rect, style, inheritedProps) {
    const children = (sprite.children ?? []).filter((child) => !child.absolutePosition);
    if (!children.length) {
      return;
    }
    const scrollX = sprite.scrollable ? sprite.state?.scrollX ?? 0 : 0;
    const scrollY = sprite.scrollable ? sprite.state?.scrollY ?? 0 : 0;
    const childRect = {
      ...rect,
      x: rect.x - scrollX,
      y: rect.y - scrollY
    };
    const gap = this.getSpriteGap(sprite.gap);
    const draw = () => {
      switch (sprite.layout) {
        case "row":
          this.drawRowChildren(children, childRect, style, inheritedProps, gap.x);
          break;
        case "grid":
          this.drawGridChildren(sprite, children, childRect, style, inheritedProps);
          break;
        case "column":
        default:
          this.drawColumnChildren(children, childRect, style, inheritedProps, gap.y);
          break;
      }
    };
    if (sprite.scrollable) {
      this.withClip(rect, draw);
      return;
    }
    draw();
  }
  drawRowChildren(children, rect, style, inheritedProps, gap) {
    const sizes = children.map((child) => this.getNaturalSize(child));
    const totalGap = this.getTotalGap(children.length, gap);
    const widths = this.getFlexDistributedSizes(children, Math.max(0, rect.width - totalGap), sizes.map((size) => size.width), "width");
    let x = rect.x;
    children.forEach((child, i) => {
      const width = widths[i] ?? 0;
      this.drawSprite(child, {
        x,
        y: rect.y,
        width,
        height: this.getSpriteOuterDiscreteSize(child, "height") ?? rect.height
      }, style, inheritedProps);
      x += width + (i < children.length - 1 ? gap : 0);
    });
  }
  drawColumnChildren(children, rect, style, inheritedProps, gap) {
    const sizes = children.map((child) => this.getNaturalSize(child, rect.width));
    const totalGap = this.getTotalGap(children.length, gap);
    const heights = this.getFlexDistributedSizes(children, Math.max(0, rect.height - totalGap), sizes.map((size) => size.height), "height");
    let y = rect.y;
    children.forEach((child, i) => {
      const height = heights[i] ?? 0;
      this.drawSprite(child, {
        x: rect.x,
        y,
        width: this.getSpriteOuterDiscreteSize(child, "width") ?? rect.width,
        height
      }, style, inheritedProps);
      y += height + (i < children.length - 1 ? gap : 0);
    });
  }
  drawGridChildren(sprite, children, rect, style, inheritedProps) {
    const cols = sprite.gridCols?.length ? sprite.gridCols : ["1fr"];
    const gap = this.getSpriteGap(sprite.gap);
    const totalColGap = this.getTotalGap(cols.length, gap.x);
    const widths = this.getGridColWidths(cols, Math.max(0, rect.width - totalColGap));
    const colCount = Math.max(1, widths.length);
    const rowHeights = [];
    children.forEach((child, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, this.getNaturalSize(child, widths[col] ?? 0).height);
    });
    let y = rect.y;
    for (let row = 0;row < rowHeights.length; row++) {
      let x = rect.x;
      for (let col = 0;col < colCount; col++) {
        const child = children[row * colCount + col];
        const width = widths[col] ?? 0;
        if (child) {
          this.drawSprite(child, {
            x,
            y,
            width: this.getSpriteOuterDiscreteSize(child, "width") ?? width,
            height: this.getSpriteOuterDiscreteSize(child, "height") ?? (rowHeights[row] ?? 0)
          }, style, inheritedProps);
        }
        x += width + (col < colCount - 1 ? gap.x : 0);
      }
      y += (rowHeights[row] ?? 0) + (row < rowHeights.length - 1 ? gap.y : 0);
    }
  }
  getFlexDistributedSizes(children, totalSize, naturalSizes, axis) {
    totalSize = Math.max(0, Math.floor(totalSize));
    const explicitSizes = children.map((child) => this.getSpriteOuterDiscreteSize(child, axis));
    const flexes = children.map((child, i) => explicitSizes[i] === undefined ? Math.max(0, child.flex ?? 0) : 0);
    const totalFlex = flexes.reduce((sum, flex) => sum + flex, 0);
    const baseSizes = naturalSizes.map((size, i) => explicitSizes[i] ?? size);
    const fixedSize = baseSizes.reduce((sum, size, i) => sum + (flexes[i] > 0 ? 0 : Math.max(0, Math.floor(size))), 0);
    if (totalFlex <= 0) {
      return baseSizes.map((size) => Math.max(0, Math.floor(size)));
    }
    const remaining = Math.max(0, totalSize - fixedSize);
    let lastFlexIndex = -1;
    for (let i = 0;i < flexes.length; i++) {
      if (flexes[i] > 0) {
        lastFlexIndex = i;
      }
    }
    let flexUsed = 0;
    return children.map((_, i) => {
      const flex = flexes[i];
      if (flex <= 0) {
        return Math.max(0, Math.floor(baseSizes[i] ?? 0));
      }
      const size = i === lastFlexIndex ? remaining - flexUsed : Math.floor(remaining * (flex / totalFlex));
      flexUsed += size;
      return Math.max(0, size);
    });
  }
  getNaturalSize(sprite, width) {
    const margin = this.getSpriteSides(sprite.margin);
    const padding = this.getSpriteSides(sprite.padding);
    const gap = this.getSpriteGap(sprite.gap);
    const marginWidth = margin.left + margin.right;
    const marginHeight = margin.top + margin.bottom;
    const paddingWidth = padding.left + padding.right;
    const paddingHeight = padding.top + padding.bottom;
    const border = this.getBorderColors(sprite);
    const borderWidth = (border.left ? 1 : 0) + (border.right ? 1 : 0);
    const borderHeight = (border.top ? 1 : 0) + (border.bottom ? 1 : 0);
    const explicitWidth = this.getSpriteDiscreteSize(sprite.width);
    const explicitHeight = this.getSpriteDiscreteSize(sprite.height);
    const availableWidth = width === undefined ? undefined : Math.max(0, Math.floor(width) - marginWidth);
    const measuredWidth = explicitWidth ?? availableWidth;
    const contentWidth = measuredWidth === undefined ? undefined : Math.max(0, Math.floor(measuredWidth) - borderWidth - paddingWidth);
    const children = (sprite.children ?? []).filter((child) => !child.absolutePosition);
    const layout = sprite.layout ?? "inline";
    let size;
    if (layout === "inline" || !children.length) {
      if (sprite.image) {
        const imageSize = this.getImageCellSize(sprite.image);
        size = {
          width: (contentWidth === undefined ? imageSize.width : Math.max(1, contentWidth)) + paddingWidth + borderWidth,
          height: imageSize.height + paddingHeight + borderHeight
        };
      } else {
        const text = this.getInlineSpriteText(sprite);
        const textWrap = sprite.textWrap ?? "wrap";
        const lines = contentWidth === undefined ? this.getTextLines(text) : this.getInlineSpriteLines(text, Math.max(1, contentWidth), textWrap);
        size = {
          width: (contentWidth === undefined ? Math.max(1, ...lines.map((line) => line.length)) : Math.max(1, contentWidth)) + paddingWidth + borderWidth,
          height: Math.max(1, lines.length) + paddingHeight + borderHeight
        };
      }
      return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
    }
    if (layout === "row") {
      const sizes2 = children.map((child) => this.getNaturalSize(child));
      const totalGap = this.getTotalGap(children.length, gap.x);
      if (contentWidth !== undefined) {
        const widths = this.getFlexDistributedSizes(children, Math.max(0, contentWidth - totalGap), sizes2.map((size2) => size2.width), "width");
        size = {
          width: contentWidth + paddingWidth + borderWidth,
          height: Math.max(1, ...children.map((child, i) => this.getNaturalSize(child, widths[i] ?? 0).height)) + paddingHeight + borderHeight
        };
        return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
      }
      size = {
        width: sizes2.reduce((sum, size2) => sum + size2.width, 0) + totalGap + paddingWidth + borderWidth,
        height: Math.max(1, ...sizes2.map((size2) => size2.height)) + paddingHeight + borderHeight
      };
      return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
    }
    if (layout === "grid") {
      const cols = sprite.gridCols?.length ? sprite.gridCols : ["1fr"];
      const colCount = Math.max(1, cols.length);
      const totalColGap = this.getTotalGap(colCount, gap.x);
      if (contentWidth !== undefined) {
        const widths = this.getGridColWidths(cols, Math.max(0, contentWidth - totalColGap));
        const rowHeights = [];
        children.forEach((child, i) => {
          const row = Math.floor(i / colCount);
          const col = i % colCount;
          rowHeights[row] = Math.max(rowHeights[row] ?? 0, this.getNaturalSize(child, widths[col] ?? 0).height);
        });
        size = {
          width: contentWidth + paddingWidth + borderWidth,
          height: Math.max(1, rowHeights.reduce((sum, height) => sum + height, 0) + this.getTotalGap(rowHeights.length, gap.y)) + paddingHeight + borderHeight
        };
        return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
      }
      const sizes2 = children.map((child) => this.getNaturalSize(child));
      let naturalWidth = 0;
      let naturalHeight = 0;
      let rowCount = 0;
      for (let i = 0;i < sizes2.length; i += colCount) {
        const row = sizes2.slice(i, i + colCount);
        rowCount++;
        naturalWidth = Math.max(naturalWidth, row.reduce((sum, size2) => sum + size2.width, 0) + this.getTotalGap(row.length, gap.x));
        naturalHeight += Math.max(1, ...row.map((size2) => size2.height));
      }
      size = {
        width: naturalWidth + paddingWidth + borderWidth,
        height: Math.max(1, naturalHeight + this.getTotalGap(rowCount, gap.y)) + paddingHeight + borderHeight
      };
      return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
    }
    const sizes = children.map((child) => this.getNaturalSize(child, contentWidth));
    size = {
      width: Math.max(1, ...sizes.map((size2) => size2.width)) + paddingWidth + borderWidth,
      height: sizes.reduce((sum, size2) => sum + size2.height, 0) + this.getTotalGap(children.length, gap.y) + paddingHeight + borderHeight
    };
    return this.applySpriteOuterSize(size, explicitWidth, explicitHeight, margin);
  }
  getSpriteDiscreteSize(size) {
    return typeof size === "number" && Number.isFinite(size) ? Math.max(0, Math.floor(size)) : undefined;
  }
  getSpriteOuterDiscreteSize(sprite, axis) {
    const size = this.getSpriteDiscreteSize(axis === "width" ? sprite.width : sprite.height);
    if (size === undefined) {
      return;
    }
    const margin = this.getSpriteSides(sprite.margin);
    return size + (axis === "width" ? margin.left + margin.right : margin.top + margin.bottom);
  }
  applySpriteOuterSize(size, width, height, margin) {
    return {
      width: (width ?? size.width) + margin.left + margin.right,
      height: (height ?? size.height) + margin.top + margin.bottom
    };
  }
  getScrollableContentSize(sprite, viewport) {
    const children = (sprite.children ?? []).filter((child) => !child.absolutePosition);
    const layout = sprite.layout ?? "inline";
    if (layout === "inline" || !children.length) {
      if (sprite.image) {
        return this.getImageCellSize(sprite.image);
      }
      const text = this.getInlineSpriteText(sprite);
      const textWrap = sprite.textWrap ?? "wrap";
      const lines = textWrap === "clip" ? this.getTextLines(text) : this.getInlineSpriteLines(text, Math.max(1, viewport.width), textWrap);
      return {
        width: Math.max(1, ...lines.map((line) => line.length)),
        height: Math.max(1, lines.length)
      };
    }
    const gap = this.getSpriteGap(sprite.gap);
    if (layout === "row") {
      const sizes2 = children.map((child) => this.getNaturalSize(child));
      return {
        width: sizes2.reduce((sum, size) => sum + size.width, 0) + this.getTotalGap(children.length, gap.x),
        height: Math.max(1, ...sizes2.map((size) => size.height))
      };
    }
    if (layout === "grid") {
      const cols = sprite.gridCols?.length ? sprite.gridCols : ["1fr"];
      const totalColGap = this.getTotalGap(cols.length, gap.x);
      const widths = this.getGridColWidths(cols, Math.max(0, viewport.width - totalColGap));
      const colCount = Math.max(1, widths.length);
      const rowHeights = [];
      children.forEach((child, i) => {
        const row = Math.floor(i / colCount);
        const col = i % colCount;
        rowHeights[row] = Math.max(rowHeights[row] ?? 0, this.getNaturalSize(child, widths[col] ?? 0).height);
      });
      return {
        width: Math.max(viewport.width, widths.reduce((sum, width) => sum + width, 0) + this.getTotalGap(widths.length, gap.x)),
        height: Math.max(1, rowHeights.reduce((sum, height) => sum + height, 0) + this.getTotalGap(rowHeights.length, gap.y))
      };
    }
    const sizes = children.map((child) => this.getNaturalSize(child, viewport.width));
    return {
      width: Math.max(1, ...sizes.map((size) => size.width)),
      height: Math.max(1, sizes.reduce((sum, size) => sum + size.height, 0) + this.getTotalGap(children.length, gap.y))
    };
  }
  getSpriteMaxScroll(sprite, viewport) {
    const size = this.getScrollableContentSize(sprite, viewport);
    return {
      x: Math.max(0, size.width - viewport.width),
      y: Math.max(0, size.height - viewport.height)
    };
  }
  clampSpriteScroll(sprite, viewport) {
    if (!sprite.scrollable) {
      return;
    }
    const currentX = sprite.state?.scrollX ?? 0;
    const currentY = sprite.state?.scrollY ?? 0;
    const max = this.getSpriteMaxScroll(sprite, viewport);
    const nextX = this.clampNumber(currentX, 0, max.x);
    const nextY = this.clampNumber(currentY, 0, max.y);
    if (nextX === currentX && nextY === currentY) {
      return;
    }
    sprite.state ??= {};
    sprite.state.scrollX = nextX;
    sprite.state.scrollY = nextY;
  }
  getInlineSpriteText(sprite) {
    if (sprite.isInput) {
      return sprite.state?.inputValue ?? sprite.text ?? "";
    }
    return sprite.richText?.length ? sprite.richText.map((span) => span.text).join("") : sprite.text ?? "";
  }
  getInlineSpriteChars(sprite, style) {
    if (sprite.isInput || !sprite.richText?.length) {
      return this.createInlineChars(this.getInlineSpriteText(sprite), style);
    }
    const chars = [];
    for (const span of sprite.richText) {
      chars.push(...this.createInlineChars(span.text, {
        f: this.resolveColor(span.color) ?? style.f,
        b: this.resolveColor(span.bg) ?? style.b
      }));
    }
    return chars;
  }
  createInlineChars(text, style) {
    return Array.from(text).map((c) => ({
      c,
      f: style.f,
      b: style.b
    }));
  }
  getTextLines(text) {
    return text.split(/\r?\n/);
  }
  getInlineSpriteLines(text, width, textWrap) {
    switch (textWrap) {
      case "clip":
        return this.getTextLines(text);
      case "wrap-hard":
        return this.wrapTextHard(text, width);
      case "wrap":
      default:
        return this.wrapText(text, width);
    }
  }
  getInlineSpriteCharLines(chars, width, textWrap) {
    switch (textWrap) {
      case "clip":
        return this.getInlineCharTextLines(chars);
      case "wrap-hard":
        return this.wrapInlineCharsHard(chars, width);
      case "wrap":
      default:
        return this.wrapInlineChars(chars, width);
    }
  }
  getInlineCharTextLines(chars) {
    const lines = [[]];
    for (let i = 0;i < chars.length; i++) {
      const char = chars[i];
      if (char.c === "\r") {
        if (chars[i + 1]?.c === `
`) {
          i++;
        }
        lines.push([]);
      } else if (char.c === `
`) {
        lines.push([]);
      } else {
        lines[lines.length - 1].push(char);
      }
    }
    return lines;
  }
  wrapText(text, width) {
    width = Math.max(1, Math.floor(width));
    const lines = [];
    const paragraphs = this.getTextLines(text);
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push("");
        continue;
      }
      let remaining = paragraph;
      while (remaining.length > width) {
        const nextChar = remaining[width];
        let breakIndex = nextChar && /\s/.test(nextChar) ? width : -1;
        if (breakIndex < 0) {
          for (let i = width - 1;i > 0; i--) {
            if (/\s/.test(remaining[i] ?? "")) {
              breakIndex = i;
              break;
            }
          }
        }
        if (breakIndex <= 0) {
          breakIndex = width;
        }
        lines.push(remaining.slice(0, breakIndex).replace(/[ \t]+$/, ""));
        remaining = remaining.slice(breakIndex).replace(/^[ \t]+/, "");
      }
      lines.push(remaining);
    }
    return lines.length ? lines : [""];
  }
  wrapInlineChars(chars, width) {
    width = Math.max(1, Math.floor(width));
    const lines = [];
    const paragraphs = this.getInlineCharTextLines(chars);
    for (const paragraph of paragraphs) {
      if (!paragraph.length) {
        lines.push([]);
        continue;
      }
      let remaining = paragraph;
      while (remaining.length > width) {
        const nextChar = remaining[width];
        let breakIndex = nextChar && /\s/.test(nextChar.c) ? width : -1;
        if (breakIndex < 0) {
          for (let i = width - 1;i > 0; i--) {
            if (/\s/.test(remaining[i]?.c ?? "")) {
              breakIndex = i;
              break;
            }
          }
        }
        if (breakIndex <= 0) {
          breakIndex = width;
        }
        lines.push(this.trimInlineCharsEnd(remaining.slice(0, breakIndex)));
        remaining = this.trimInlineCharsStart(remaining.slice(breakIndex));
      }
      lines.push(remaining);
    }
    return lines.length ? lines : [[]];
  }
  wrapTextHard(text, width) {
    width = Math.max(1, Math.floor(width));
    const lines = [];
    const paragraphs = this.getTextLines(text);
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push("");
        continue;
      }
      for (let i = 0;i < paragraph.length; i += width) {
        lines.push(paragraph.slice(i, i + width));
      }
    }
    return lines.length ? lines : [""];
  }
  wrapInlineCharsHard(chars, width) {
    width = Math.max(1, Math.floor(width));
    const lines = [];
    const paragraphs = this.getInlineCharTextLines(chars);
    for (const paragraph of paragraphs) {
      if (!paragraph.length) {
        lines.push([]);
        continue;
      }
      for (let i = 0;i < paragraph.length; i += width) {
        lines.push(paragraph.slice(i, i + width));
      }
    }
    return lines.length ? lines : [[]];
  }
  trimInlineCharsStart(chars) {
    let index = 0;
    while (index < chars.length && /[ \t]/.test(chars[index]?.c ?? "")) {
      index++;
    }
    return chars.slice(index);
  }
  trimInlineCharsEnd(chars) {
    let index = chars.length;
    while (index > 0 && /[ \t]/.test(chars[index - 1]?.c ?? "")) {
      index--;
    }
    return chars.slice(0, index);
  }
  clipText(text, width, textClipStyle, clipped) {
    width = Math.max(0, Math.floor(width));
    if (width <= 0) {
      return "";
    }
    if (!clipped || text.length <= width) {
      return text.slice(0, width);
    }
    if (textClipStyle === "ellipses") {
      return width === 1 ? "…" : `${text.slice(0, width - 1)}…`;
    }
    return text.slice(0, width);
  }
  clipInlineChars(chars, width, textClipStyle, clipped, style) {
    width = Math.max(0, Math.floor(width));
    if (width <= 0) {
      return [];
    }
    if (!clipped || chars.length <= width) {
      return chars.slice(0, width);
    }
    if (textClipStyle === "ellipses") {
      const ellipsesStyle = chars[Math.min(chars.length - 1, Math.max(0, width - 1))] ?? style;
      if (width === 1) {
        return [{ c: "…", f: ellipsesStyle.f, b: ellipsesStyle.b }];
      }
      return [
        ...chars.slice(0, width - 1),
        { c: "…", f: ellipsesStyle.f, b: ellipsesStyle.b }
      ];
    }
    return chars.slice(0, width);
  }
  getTextAlignOffset(textAlign, textLength, width) {
    switch (textAlign) {
      case "center":
        return Math.max(0, Math.floor((width - textLength) / 2));
      case "end":
        return Math.max(0, width - textLength);
      case "start":
      default:
        return 0;
    }
  }
  getGridColWidths(cols, width) {
    if (!cols?.length) {
      return [Math.max(0, Math.floor(width))];
    }
    width = Math.max(0, Math.floor(width));
    const parsed = cols.map((col) => {
      const match = /^(\d+(?:\.\d+)?)(cr|fr)$/.exec(col);
      const value = match ? Number(match[1]) : 1;
      return {
        value: Number.isFinite(value) ? Math.max(0, value) : 1,
        unit: match?.[2] ?? "fr"
      };
    });
    const fixed = parsed.reduce((sum, col) => sum + (col.unit === "cr" ? Math.max(0, Math.floor(col.value)) : 0), 0);
    const totalFr = parsed.reduce((sum, col) => sum + (col.unit === "fr" ? col.value : 0), 0);
    const remaining = Math.max(0, width - fixed);
    let lastFrIndex = -1;
    for (let i = 0;i < parsed.length; i++) {
      const col = parsed[i];
      if (col.unit === "fr" && col.value > 0) {
        lastFrIndex = i;
      }
    }
    let usedFr = 0;
    return parsed.map((col, i) => {
      if (col.unit === "cr") {
        return Math.max(0, Math.floor(col.value));
      }
      if (totalFr <= 0 || col.value <= 0) {
        return 0;
      }
      const colWidth = i === lastFrIndex ? remaining - usedFr : Math.floor(remaining * (col.value / totalFr));
      usedFr += colWidth;
      return Math.max(0, colWidth);
    });
  }
  fillRect(rect, style, spriteId) {
    for (let y = rect.y;y < rect.y + rect.height; y++) {
      for (let x = rect.x;x < rect.x + rect.width; x++) {
        this.setChar(x, y, " ", style.f, style.b, spriteId);
      }
    }
  }
  drawBorder(rect, border, style, spriteId) {
    const chars = this.getBorderChars(style);
    const x1 = rect.x;
    const y1 = rect.y;
    const x2 = rect.x + rect.width - 1;
    const y2 = rect.y + rect.height - 1;
    if (border.top) {
      for (let x = x1;x <= x2; x++) {
        this.setChar(x, y1, chars.h, border.top, undefined, spriteId);
      }
    }
    if (border.bottom) {
      for (let x = x1;x <= x2; x++) {
        this.setChar(x, y2, chars.h, border.bottom, undefined, spriteId);
      }
    }
    if (border.left) {
      for (let y = y1;y <= y2; y++) {
        this.setChar(x1, y, chars.v, border.left, undefined, spriteId);
      }
    }
    if (border.right) {
      for (let y = y1;y <= y2; y++) {
        this.setChar(x2, y, chars.v, border.right, undefined, spriteId);
      }
    }
    if (border.top && border.left) {
      this.setChar(x1, y1, chars.tl, border.top, undefined, spriteId);
    }
    if (border.top && border.right) {
      this.setChar(x2, y1, chars.tr, border.top, undefined, spriteId);
    }
    if (border.bottom && border.left) {
      this.setChar(x1, y2, chars.bl, border.bottom, undefined, spriteId);
    }
    if (border.bottom && border.right) {
      this.setChar(x2, y2, chars.br, border.bottom, undefined, spriteId);
    }
  }
  getBorderColors(sprite, fallback) {
    const border = this.isSpriteActive(sprite) ? sprite.activeBorder ?? sprite.border : sprite.border;
    const empty = {
      hasBorder: false,
      top: undefined,
      bottom: undefined,
      left: undefined,
      right: undefined
    };
    if (!border) {
      return empty;
    }
    if (typeof border === "string") {
      const color = this.resolveColor(border) ?? fallback;
      return {
        hasBorder: true,
        top: color,
        bottom: color,
        left: color,
        right: color
      };
    }
    const top = this.resolveColor(border.top) ?? (border.top ? fallback : undefined);
    const bottom = this.resolveColor(border.bottom) ?? (border.bottom ? fallback : undefined);
    const left = this.resolveColor(border.left) ?? (border.left ? fallback : undefined);
    const right = this.resolveColor(border.right) ?? (border.right ? fallback : undefined);
    return {
      hasBorder: !!(top || bottom || left || right),
      top,
      bottom,
      left,
      right
    };
  }
  getContentRect(rect, border) {
    const left = border.left ? 1 : 0;
    const right = border.right ? 1 : 0;
    const top = border.top ? 1 : 0;
    const bottom = border.bottom ? 1 : 0;
    return {
      x: rect.x + left,
      y: rect.y + top,
      width: Math.max(0, rect.width - left - right),
      height: Math.max(0, rect.height - top - bottom)
    };
  }
  getBorderChars(style) {
    switch (style) {
      case "thick":
        return { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" };
      case "rounded":
        return { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };
      case "double":
        return { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" };
      case "classic":
        return { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" };
      case "normal":
      default:
        return { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" };
    }
  }
  setChar(x, y, c, f, b, i) {
    const clip = this.getCurrentClip();
    if (clip && (x < clip.x || y < clip.y || x >= clip.x + clip.width || y >= clip.y + clip.height)) {
      return;
    }
    if (y < 0 || y >= this.bufferState.height || x < 0 || x >= this.bufferState.width) {
      return;
    }
    const target = this.bufferState.back[y]?.[x];
    if (target) {
      target.c = c;
      target.f = f ?? target.f;
      target.b = b ?? target.b;
      target.i = i;
    }
  }
  withClip(clip, callback) {
    const current = this.getCurrentClip() ?? {
      x: 0,
      y: 0,
      width: this.bufferState.width,
      height: this.bufferState.height
    };
    const next = this.intersectRects(current, clip);
    this.clipStack.push(next);
    try {
      return callback();
    } finally {
      this.clipStack.pop();
    }
  }
  getCurrentClip() {
    return this.clipStack[this.clipStack.length - 1];
  }
  intersectRects(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + Math.max(0, a.width), b.x + Math.max(0, b.width));
    const bottom = Math.min(a.y + Math.max(0, a.height), b.y + Math.max(0, b.height));
    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y)
    };
  }
  normalizeRect(rect) {
    return {
      x: Math.floor(rect.x),
      y: Math.floor(rect.y),
      width: Math.max(0, Math.floor(rect.width)),
      height: Math.max(0, Math.floor(rect.height))
    };
  }
  insetRect(rect, sides) {
    return {
      x: rect.x + sides.left,
      y: rect.y + sides.top,
      width: Math.max(0, rect.width - sides.left - sides.right),
      height: Math.max(0, rect.height - sides.top - sides.bottom)
    };
  }
  getSpriteSides(sides) {
    if (typeof sides === "number") {
      const value = Number.isFinite(sides) ? Math.max(0, Math.floor(sides)) : 0;
      return {
        top: value,
        bottom: value,
        left: value,
        right: value
      };
    }
    return {
      top: this.getSpriteDiscreteSize(sides?.top) ?? 0,
      bottom: this.getSpriteDiscreteSize(sides?.bottom) ?? 0,
      left: this.getSpriteDiscreteSize(sides?.left) ?? 0,
      right: this.getSpriteDiscreteSize(sides?.right) ?? 0
    };
  }
  getSpriteGap(gap) {
    if (typeof gap === "number") {
      const value = Number.isFinite(gap) ? Math.max(0, Math.floor(gap)) : 0;
      return {
        x: value,
        y: value
      };
    }
    return {
      x: this.getSpriteDiscreteSize(gap?.x) ?? 0,
      y: this.getSpriteDiscreteSize(gap?.y) ?? 0
    };
  }
  getTotalGap(count, gap) {
    return Math.max(0, count - 1) * Math.max(0, Math.floor(gap));
  }
  clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  resolveColor(color) {
    if (!color) {
      return;
    }
    const value = color.startsWith("#") ? color : this.theme[color];
    if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      return;
    }
    return value.toLowerCase();
  }
  getFgAnsi(color) {
    const rgb = this.hexToRgb(color);
    return rgb ? `\x1B[38;2;${rgb.r};${rgb.g};${rgb.b}m` : "\x1B[39m";
  }
  getBgAnsi(color) {
    const rgb = this.hexToRgb(color);
    return rgb ? `\x1B[48;2;${rgb.r};${rgb.g};${rgb.b}m` : "\x1B[49m";
  }
  hexToRgb(color) {
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return;
    }
    return {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16)
    };
  }
  handleInput(data) {
    if (this._isDisposed) {
      return;
    }
    this.inputBuffer += data?.toString?.() ?? String(data);
    while (this.inputBuffer.length) {
      const consumed = this.consumeInput(this.inputBuffer);
      if (consumed <= 0) {
        break;
      }
      this.inputBuffer = this.inputBuffer.slice(consumed);
    }
  }
  consumeInput(input) {
    const pasteStart = "\x1B[200~";
    const pasteEnd = "\x1B[201~";
    if (input.startsWith(pasteStart)) {
      const endIndex = input.indexOf(pasteEnd, pasteStart.length);
      if (endIndex < 0) {
        return 0;
      }
      this.insertActiveInputText(input.slice(pasteStart.length, endIndex));
      return endIndex + pasteEnd.length;
    }
    if (input.startsWith("\x1B[<")) {
      const match = /^\x1b\[<(\d+);(\d+);(\d+)([mM])/.exec(input);
      if (!match) {
        return 0;
      }
      const mouseEvt = this.parseSgrMouseEvent(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - 1, match[4]);
      this.handleMouseEvent(mouseEvt);
      return match[0].length;
    }
    const homeSequence = this.getMatchedInputSequence(input, ["\x1B[H", "\x1B[1~", "\x1B[7~", "\x1BOH"]);
    if (homeSequence) {
      this.setActiveInputCaret(0);
      return homeSequence.length;
    }
    const endSequence = this.getMatchedInputSequence(input, ["\x1B[F", "\x1B[4~", "\x1B[8~", "\x1BOF"]);
    if (endSequence) {
      this.setActiveInputCaretToEnd();
      return endSequence.length;
    }
    const deleteSequence = this.getMatchedInputSequence(input, ["\x1B[3~"]);
    if (deleteSequence) {
      this.deleteActiveInput();
      return deleteSequence.length;
    }
    if (input.startsWith("\x1B[Z")) {
      this.focusPrev();
      return 3;
    }
    if (input.startsWith("\x1B[A")) {
      this.scrollActiveSprite(0, -1);
      return 3;
    }
    if (input.startsWith("\x1B[B")) {
      this.scrollActiveSprite(0, 1);
      return 3;
    }
    if (input.startsWith("\x1B[C")) {
      if (!this.moveActiveInputCaret(1)) {
        this.scrollActiveSprite(1, 0);
      }
      return 3;
    }
    if (input.startsWith("\x1B[D")) {
      if (!this.moveActiveInputCaret(-1)) {
        this.scrollActiveSprite(-1, 0);
      }
      return 3;
    }
    const printable = this.getPrintableInputPrefix(input);
    if (printable) {
      if (this.getActiveSprite()?.isInput) {
        this.insertActiveInputText(printable);
        return printable.length;
      }
      if (printable[0] === " ") {
        this.activateCurrentSprite();
        return 1;
      }
      return printable.length;
    }
    const char = input[0];
    if (char === "\x1B") {
      const csi = /^\x1b\[[0-?]*[ -/]*[@-~]/.exec(input);
      if (csi) {
        return csi[0].length;
      }
      const ss3 = /^\x1bO./.exec(input);
      if (ss3) {
        return ss3[0].length;
      }
      return input.startsWith("\x1B[") || input.startsWith("\x1BO") || input.length < 2 ? 0 : 2;
    }
    switch (char) {
      case "\x01":
        this.setActiveInputCaret(0);
        return 1;
      case "\x03":
        this.dispose();
        return 1;
      case "\x05":
        this.setActiveInputCaretToEnd();
        return 1;
      case "\t":
        this.focusNext();
        return 1;
      case "\r":
      case `
`:
        this.activateCurrentSprite();
        return 1;
      case "":
      case "\b":
        this.backspaceActiveInput();
        return 1;
      default:
        return 1;
    }
  }
  getMatchedInputSequence(input, sequences) {
    return sequences.find((sequence) => input.startsWith(sequence));
  }
  getPrintableInputPrefix(input) {
    let value = "";
    for (const char of input) {
      if (char < " " || char === "" || char === "\x1B") {
        break;
      }
      value += char;
    }
    return value;
  }
  getPrintableInputText(text) {
    const withoutEsc = text.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[@-_]/g, "");
    return Array.from(withoutEsc).filter((char) => char >= " " && char !== "").join("");
  }
  updateSprite(sprite, update) {
    let target;
    if (typeof sprite === "string") {
      target = this.findSpriteById(sprite);
    } else if (sprite) {
      target = this.findSpriteById(sprite.id);
    }
    if (!target) {
      return false;
    }
    let render;
    if (typeof sprite === "object") {
      for (const e in sprite) {
        if (e === "children") {
          const defs = sprite.children;
          if (defs) {
            target.children = defs.map((d) => this.loadSprite(d));
          }
        } else {
          target[e] = sprite[e];
        }
      }
    }
    if (typeof update === "function") {
      const r = update(target);
      render = r !== false;
    } else {
      render = update !== false;
    }
    if (render) {
      this.render();
    }
    return true;
  }
  parseSgrMouseEvent(code, x, y, suffix) {
    const isWheel = (code & 64) !== 0;
    const isDrag = (code & 32) !== 0;
    const isRelease = suffix === "m";
    return {
      action: isWheel ? "wheel" : isRelease ? "release" : isDrag ? "drag" : "press",
      x,
      y,
      button: this.getMouseButton(code),
      direction: isWheel ? this.getMouseWheelDirection(code) : undefined,
      modifiers: {
        shift: (code & 4) !== 0,
        alt: (code & 8) !== 0,
        ctrl: (code & 16) !== 0
      }
    };
  }
  getMouseButton(code) {
    switch (code & 3) {
      case 0:
        return "left";
      case 1:
        return "middle";
      case 2:
        return "right";
      default:
        return "unknown";
    }
  }
  getMouseWheelDirection(code) {
    switch (code & 3) {
      case 0:
        return "up";
      case 1:
        return "down";
      default:
        return;
    }
  }
  handleMouseEvent(evt) {
    switch (evt.action) {
      case "press":
        if (evt.button === "left") {
          this.handleMouseClick(evt.x, evt.y);
        }
        break;
      case "release":
        this.handleMouseRelease(evt);
        break;
      case "drag":
        this.handleMouseDrag(evt);
        break;
      case "wheel":
        this.handleMouseWheel(evt);
        break;
    }
  }
  logBuffer(buffer = this.bufferState.front) {
    this.log(`

__________________________________________________
`, buffer.map((r) => r.map((p) => p.i[0] || " ").join("")).join(`
`), `
__________________________________________________
`);
  }
  getMouseTarget(x, y) {
    const id = this.bufferState.front[y]?.[x]?.i;
    const screen = this._activeScreen;
    if (!id || !screen) {
      return;
    }
    const path = this.findSpritePathById(id, screen);
    const sprite = path?.[path.length - 1];
    if (!path || !sprite) {
      return;
    }
    return { sprite, screen, path };
  }
  handleMouseClick(x, y) {
    const target = this.getMouseTarget(x, y);
    if (!target) {
      return;
    }
    const sprite = target.sprite;
    const screen = target.screen;
    this.activateSprite(sprite.id, screen);
    if (sprite.isButton || sprite.link || sprite.onClick) {
      this.clickSprite(sprite, x, y);
    }
    this.render();
  }
  handleMouseRelease(evt) {
    const target = this.getMouseTarget(evt.x, evt.y);
    if (!target?.sprite.onMouseRelease) {
      return;
    }
    target.sprite.onMouseRelease({
      type: "mouse-release",
      sprite: target.sprite,
      screen: target.screen,
      ctrl: this,
      x: evt.x,
      y: evt.y,
      button: evt.button,
      modifiers: evt.modifiers
    });
    this.render();
  }
  handleMouseDrag(evt) {
    const target = this.getMouseTarget(evt.x, evt.y);
    if (!target?.sprite.onMouseDrag) {
      return;
    }
    target.sprite.onMouseDrag({
      type: "mouse-drag",
      sprite: target.sprite,
      screen: target.screen,
      ctrl: this,
      x: evt.x,
      y: evt.y,
      button: evt.button,
      modifiers: evt.modifiers
    });
    this.render();
  }
  handleMouseWheel(evt) {
    if (!evt.direction) {
      return;
    }
    const target = this.getMouseTarget(evt.x, evt.y);
    if (!target) {
      return;
    }
    const handlerTarget = [...target.path].reverse().find((sprite) => sprite.onMouseWheel);
    handlerTarget?.onMouseWheel?.({
      type: "mouse-wheel",
      sprite: handlerTarget,
      screen: target.screen,
      ctrl: this,
      x: evt.x,
      y: evt.y,
      direction: evt.direction,
      deltaY: evt.direction === "up" ? -1 : 1,
      modifiers: evt.modifiers
    });
    const scrollTarget = [...target.path].reverse().find((sprite) => sprite.scrollable);
    const didScroll = scrollTarget ? this.scrollSprite(scrollTarget, 0, evt.direction === "up" ? -1 : 1, false) : false;
    if (handlerTarget || didScroll) {
      this.render();
    }
  }
  activateCurrentSprite() {
    const sprite = this.getActiveSprite();
    if (!sprite || !(sprite.isButton || sprite.link || sprite.onClick)) {
      return false;
    }
    this.clickSprite(sprite, 0, 0);
    this.render();
    return true;
  }
  clickSprite(sprite, x, y) {
    const screen = this.findScreenContainingSprite(sprite) ?? this._activeScreen;
    if (!screen) {
      return;
    }
    sprite.onClick?.({
      type: "click",
      sprite,
      screen,
      ctrl: this,
      x,
      y
    });
    if (sprite.link) {
      this.followLink(sprite);
    }
  }
  editActiveInput(update) {
    const sprite = this.getActiveSprite();
    const screen = this._activeScreen;
    if (!sprite?.isInput || !screen) {
      return false;
    }
    sprite.state ??= {};
    const value = sprite.state.inputValue ?? "";
    const caret = this.getInputCaret(sprite, value);
    const next = update(value, caret);
    const nextValue = next.value;
    const nextCaret = this.clampNumber(typeof next.caret === "number" && Number.isFinite(next.caret) ? Math.floor(next.caret) : nextValue.length, 0, nextValue.length);
    const valueChanged = nextValue !== value;
    const caretChanged = nextCaret !== caret || sprite.state.inputCaret !== nextCaret;
    if (!valueChanged && !caretChanged) {
      return true;
    }
    sprite.state.inputValue = nextValue;
    sprite.state.inputCaret = nextCaret;
    if (valueChanged) {
      sprite.onInput?.({
        type: "input",
        sprite,
        screen,
        ctrl: this,
        value: nextValue
      });
    }
    this.render();
    return true;
  }
  insertActiveInputText(text) {
    const value = this.getPrintableInputText(text);
    if (!value) {
      return this.getActiveSprite()?.isInput === true;
    }
    return this.editActiveInput((current, caret) => ({
      value: `${current.slice(0, caret)}${value}${current.slice(caret)}`,
      caret: caret + value.length
    }));
  }
  backspaceActiveInput() {
    return this.editActiveInput((value, caret) => caret <= 0 ? { value, caret } : {
      value: `${value.slice(0, caret - 1)}${value.slice(caret)}`,
      caret: caret - 1
    });
  }
  deleteActiveInput() {
    return this.editActiveInput((value, caret) => caret >= value.length ? { value, caret } : {
      value: `${value.slice(0, caret)}${value.slice(caret + 1)}`,
      caret
    });
  }
  moveActiveInputCaret(offset) {
    const sprite = this.getActiveSprite();
    if (!sprite?.isInput) {
      return false;
    }
    const value = sprite.state?.inputValue ?? "";
    const caret = this.getInputCaret(sprite, value);
    return this.setActiveInputCaret(caret + offset);
  }
  setActiveInputCaretToEnd() {
    const sprite = this.getActiveSprite();
    if (!sprite?.isInput) {
      return false;
    }
    return this.setActiveInputCaret((sprite.state?.inputValue ?? "").length);
  }
  setActiveInputCaret(caret) {
    const sprite = this.getActiveSprite();
    if (!sprite?.isInput) {
      return false;
    }
    return this.editActiveInput((value) => ({
      value,
      caret
    }));
  }
  scrollActiveSprite(x, y) {
    const sprite = this.getActiveSprite();
    if (!sprite) {
      return;
    }
    this.scrollSprite(sprite, x, y);
  }
  scrollSprite(sprite, x, y, reRender = true) {
    if (!sprite.scrollable) {
      return false;
    }
    sprite.state ??= {};
    const currentX = sprite.state.scrollX ?? 0;
    const currentY = sprite.state.scrollY ?? 0;
    const rect = this.spriteContentRects.get(sprite.id);
    const max = rect ? this.getSpriteMaxScroll(sprite, rect) : undefined;
    const nextX = max ? this.clampNumber(currentX + x, 0, max.x) : Math.max(0, currentX + x);
    const nextY = max ? this.clampNumber(currentY + y, 0, max.y) : Math.max(0, currentY + y);
    if (nextX === currentX && nextY === currentY) {
      return false;
    }
    sprite.state.scrollX = nextX;
    sprite.state.scrollY = nextY;
    if (reRender) {
      this.render();
    }
    return true;
  }
  focusNext() {
    this.focusByOffset(1);
  }
  focusPrev() {
    this.focusByOffset(-1);
  }
  focusByOffset(offset) {
    const screen = this._activeScreen;
    if (!screen) {
      return;
    }
    const sprites = this.getFocusableSprites(screen);
    if (!sprites.length) {
      return;
    }
    const activeId = screen.state?.activeSpriteId;
    const activeIndex = Math.max(0, sprites.findIndex((item) => item.sprite.id === activeId));
    const index = (activeIndex + offset + sprites.length) % sprites.length;
    this.activateSprite(sprites[index]?.sprite.id ?? sprites[0]?.sprite.id, screen);
  }
  getActiveSprite() {
    const screen = this._activeScreen;
    const id = screen?.state?.activeSpriteId;
    return id && screen ? this.findSpriteById(id, screen) : undefined;
  }
  getFocusableSprites(screen) {
    const sprites = [];
    let order = 0;
    const visit = (sprite) => {
      if (sprite.tabIndex === undefined || sprite.tabIndex >= 0) {
        if (sprite.isInput || sprite.isButton || sprite.link) {
          sprites.push({ sprite, order });
        }
      }
      order++;
      for (const child of sprite.children ?? []) {
        visit(child);
      }
    };
    visit(screen.root);
    return sprites.sort((a, b) => {
      const ai = a.sprite.tabIndex ?? a.order;
      const bi = b.sprite.tabIndex ?? b.order;
      return ai - bi || a.order - b.order;
    });
  }
  writeAnsi(value) {
    this.console.stdout.write(value);
  }
}

// logger.ts
var import_promises = require("node:fs/promises");
var log = (...values) => {
  writeOutputAsync(values.map((v) => {
    try {
      if (typeof v === "string") {
        return v;
      }
      return JSON.stringify(v);
    } catch {
      return v + "";
    }
  }).join(" "));
};
var queue = [];
var writing = false;
var writeOutputAsync = async (value) => {
  if (writing) {
    queue.push(value);
    return;
  }
  try {
    writing = true;
    if (queue.length) {
      value = queue.splice(0, queue.length).join(`
`) + `
` + value;
    }
    await import_promises.appendFile("./log", value + `
`);
  } catch (ex) {
    process.stdout.write("Error writing to log");
  } finally {
    writing = false;
    if (queue.length) {
      const value2 = queue.splice(0, queue.length).join(`
`);
      writeOutputAsync(value2);
    }
  }
};

// logo.ts
var logoSrc = `Q29udl0AAAAEAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AWAeDm9pGQvxahYH/28WB/+qQyP/8aR6//zixv/+7sr//evF//315f////7///////7y4v/8wY3//bBt//yeW//+klL//45S//x5SP/sTSr/oh8O/2MOBf9WDgX/Vg0F/1gOBv9YDgX/Wg4E/2IQBv+ULBr/3W9Q//u6oP/858///eO3//3Ll//9rXj/+pxt//iAU//5YD7/+kw2//svJP/4KCH/9jUq//dFM//1RTL/ox0W/zwIB/81Bgf/NgcH/j4SDoD///8CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/gIAEXxwOlGATBv5kFAb/dhkK/9VnP//8z7H//N++//zguP/97tP//vnv///////////////////////+8OX/+bKR//iMX//9fE7//nRF//5sPf/+aT7//V85/+xEJf/NLhn/rCcV/54nFP+oMx3/yUcr/+p8XP/7yLD//OvU///nvf//1Z7//b+H//6dbP/9dE3/+oFd//hkRP/5UTr/+WZP//tKOv/7d1r/6zI2/+kRGv/uERX/9zIv/9EvJP9cCgj/NQgG/zQIBv8+EhKtTh0dGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wFfHRKmWhEF/14gE/+GPjP/5KqR//vYwf/53sX/+ubR//3y6P/+/fz//v////////////////////////////7//v78//zo4P/2xbL/9qiO//KIaf/1bUf/+145//1UNP/7cEv/+o1k//mfev/5tZP//Nq7//3z2//97c7//ei///7Vof/9o2//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7QcU/+kGE//mBRL/4gMQ/90CEf/WAQ//zgEP/8QBDv+/BA//sgIJ/7UCDP+6BA//uwQR/7MCDv+xAQz/ugEN/8YBDf/UAQ//3QIQ/+MDEv/nBBL/6QQT/+sEFf/qBRb/5wQU/+ICEv/aARD/0AIO/8UBDf+1AQv/pwEI/6QCDP+oBxL/rAkV/6cGEf+gAg3/lwAJ/5YACf+cAAr/pQEL/6oADP+tAQr/sAAK/7EBCv+vAQv/rQEK/6kBCf+mAAr/pAAK/6EBCv+bAQj/mAAI/5MBB/+LAQb/hAEG/38BBv+dAgj/qQkN/1sFCP8sBQX/KwcH/ysHB/8qBwf/LAsL5C4RD5o3HRpGqqqqAwAAAAAAAAAAAAAAAAAAAAA6EQ12NQYE/jYGBf83BAT/OAUF/00fHf+CWVT/tYR8/+GEgP/QHyb/1AIR/9wCEv/hAhT/5AMW/+UEFf/mBBX/5wMW/+MDFf/hAxT/3QMU/9oCEv/XAhH/0gEP/80CDf/IAAz/vwAM/7cBCf+0AQj/uQQM/7sKEv+hCxH/ig0Q/2wMD/9bCAz/YAgM/3gKEP+RCQ//ugoT/70GDv+xAQn/twAK/7wBDP/CAQ3/xQEN/8gBDf/GAQz/wgEM/7sBCf+wAQj/qAMM/6sOG/+zHi7/nB0q/4UZI/9mERb/WA0P/2AOEP96DhX/mQ0X/7YKGf+8CRb/pgQO/5cBCv+SAQf/lAAG/5cBCf+XAQv/lwEK/5cBCv+VAQr/lAEI/5MBCf+QAAj/jgEI/4wAB/+JAAf/gwAI/30ABv96AQb/ggEG/6EECf+XBgr/awUI/zkFB/8oBgX/KQYG/ycGBv8nBwj/Kw8OvAAAAAAAAAAAAAAAAAAAAAA3Cga1NQYF/zkKCv9sOjX/rmpl/89va//KPj//wQ0V/8MBDP/JAQ7/zgEP/9EBD//TABD/1AAQ/9IAD//QAQ//zgEP/8gBDf/DAQ3/vgEM/7gBC/+yAQr/rwAK/60BCf+0Agn/wQUP/8gLE/+wDRP/eQoO/0EFB/8lAQP/IgEC/yQCA/8nAgT/KgME/ysDBf8rAgX/OAME/2sGDP+tChT/yQkW/8QIEf+4BQ3/swMN/7EDDv+yAw3/tAcR/7kTH//EIjX/uCxH/48kOf9HDRP/JgEC/yUBAf8kAgH/JQIC/yUDA/8lAwL/JAMD/ywDBP9WBgr/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`;

// test-tui.ts
var proc = globalThis.process;
if (!proc) {
  console.error("globalThis.process not defined");
  throw new Error("exit 1");
}
if (!proc.stdin.isTTY) {
  console.error("screen-test requires an interactive terminal.");
  proc.exit(1);
}
var theme = {
  foreground: "#d7d7d7",
  background: "#111111",
  muted: "#555555",
  panel: "#1c1c1c",
  panelAlt: "#242424",
  accent: "#60a5fa",
  active: "#facc15",
  activeBg: "#3f3f1f",
  success: "#22c55e",
  danger: "#ef4444"
};
var status = {
  id: "status",
  text: "Status: ready",
  color: "success"
};
var clickCount = 0;
var mouseEventCount = 0;
var setMouseStatus = (evt, label) => {
  evt.ctrl.updateSprite("mouse-status", (s) => {
    const modifiers = [
      evt.modifiers?.shift ? "shift" : undefined,
      evt.modifiers?.alt ? "alt" : undefined,
      evt.modifiers?.ctrl ? "ctrl" : undefined
    ].filter(Boolean).join("+") || "none";
    s.text = `${++mouseEventCount}: ${label} @ ${evt.x},${evt.y} modifiers=${modifiers}`;
  });
};
var nameInput = {
  id: "name-input",
  text: "Type here...",
  border: "accent",
  activeColor: "active",
  activeBg: "activeBg",
  activeBorder: "active",
  bg: "panelAlt",
  isInput: true,
  onInput: (evt) => {
    evt.ctrl.updateSprite(status.id, (s) => {
      s.text = `input: ${evt.value}`;
    });
  }
};
var quitButton = {
  id: "quit-button",
  text: " Quit ",
  color: "danger",
  activeColor: "background",
  activeBg: "danger",
  border: "danger",
  activeBorder: "active",
  onClick: (evt) => evt.ctrl.dispose()
};
var homeRoot = {
  id: "home-root",
  layout: "column",
  bg: "background",
  children: [
    {
      id: "header",
      text: " Convo TUI screen test ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "main",
      layout: "row",
      flex: 1,
      children: [
        {
          id: "nav",
          layout: "column",
          border: "muted",
          bg: "panel",
          children: [
            {
              id: "nav-title",
              text: "Navigation",
              color: "accent"
            },
            {
              id: "help-link",
              text: " Help screen ",
              link: "help",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "wrap-link",
              text: " Text wrapping ",
              link: "wrap",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "rich-link",
              text: " Rich text ",
              link: "rich",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "animations-link",
              text: " Animations ",
              link: "animations",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "mouse-link",
              text: " Mouse events ",
              link: "mouse",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "scroll-link",
              text: " Scrolling ",
              link: "scroll",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "grid-link",
              text: " Grid layout ",
              link: "grid",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "flex-link",
              text: " Flex layout ",
              link: "flex",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            {
              id: "absolute-link",
              text: " Absolute positioning ",
              link: "absolute",
              border: "accent",
              activeColor: "active",
              activeBg: "activeBg",
              activeBorder: "active"
            },
            quitButton
          ]
        },
        {
          id: "content",
          layout: "column",
          flex: 1,
          border: "muted",
          bg: "panelAlt",
          children: [
            {
              id: "intro",
              text: "Use Tab / Shift+Tab to focus, Enter or Space to activate."
            },
            {
              id: "mouse-note",
              text: "Mouse clicks are enabled on interactive text. Use the mouse events screen to test release, drag, and wheel."
            },
            nameInput,
            {
              id: "set-status",
              text: " Set status ",
              border: "success",
              activeColor: "background",
              activeBg: "success",
              activeBorder: "active",
              onClick: (evt) => {
                evt.ctrl.updateSprite({
                  ...status,
                  text: `click: ${++clickCount}`
                });
              }
            },
            status,
            {
              id: "logo-image",
              image: logoSrc,
              imageOptions: { width: 75 },
              textAlign: "center",
              vTextAlign: "center",
              flex: 1
            },
            {
              text: "#  #  #  #  # ",
              inlineRenderer: {
                render: (ctx) => {
                  ctx.setChar(0, 0, spinChars[ctx.ivCount % spinChars.length] ?? " ", "accent");
                  ctx.setChar(3, 0, starChars[ctx.ivCount % starChars.length] ?? " ", "#ff00ff");
                  ctx.setChar(6, 0, clockChars[ctx.ivCount % clockChars.length] ?? " ", "success");
                  ctx.setChar(9, 0, bChars[ctx.ivCount % bChars.length] ?? " ", "danger");
                  ctx.setChar(12, 0, barChars[ctx.ivCount % barChars.length] ?? " ", "#ffff00");
                },
                intervalMs: 300,
                overlayContent: true
              },
              textAlign: "end"
            },
            {
              text: "[             ]",
              inlineRenderer: {
                render: (ctx) => {
                  ctx.setChar(0, 0, ctx.sprite.text ?? "", "muted");
                  ctx.setChar(1, 0, "=".repeat(ctx.ivCount % (ctx.width - 2) + 1), "muted");
                },
                intervalMs: 100,
                overlayContent: true
              },
              textAlign: "end"
            }
          ]
        }
      ]
    },
    {
      id: "footer",
      text: " Ctrl+C exits | Active sprites use activeColor, activeBg, and activeBorder ",
      color: "muted",
      bg: "panel"
    }
  ]
};
var spinChars = ["|", "/", "-", "\\"];
var starChars = ["·", "✻", "✽", "✶", "✳", "✢"];
var bChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
var clockChars = ["◴", "◷", "◶", "◵"];
var barChars = ["▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃"];
var colors = ["accent", "#ff00ff", "success", "danger", "#ffff00"];
var matrixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-/<>=";
var helpRoot = {
  id: "help-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "help-title",
      text: " Help ",
      color: "accent",
      bg: "panel"
    },
    {
      id: "help-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      border: "muted",
      bg: "panelAlt",
      children: [
        { text: "This screen verifies links, layout, borders, colors, input, and mouse clicks." },
        { text: "The text wrapping screen demonstrates wrap, wrap-hard, clipping, ellipses, and explicit newlines." },
        { text: "The rich text screen demonstrates inline spans with per-span foreground and background colors." },
        { text: "The animations screen demonstrates inline renderers with timed redraw intervals." },
        { text: "The mouse events screen demonstrates release, drag, and wheel event callbacks." },
        { text: "The scrolling screen demonstrates vertical and horizontal scroll clipping." },
        { text: "The grid layout screen demonstrates fixed and flexible grid columns plus row height sizing." },
        { text: "The flex layout screen demonstrates no-flex, all-flex, and mixed flex sizing." },
        { text: "The absolute positioning screen demonstrates sprites removed from normal layout and placed by terminal coordinates." },
        { text: "Tab moves focus forward." },
        { text: "Shift+Tab moves focus backward." },
        { text: "Enter activates the active button/link." },
        { text: "Space activates buttons/links or types a space into inputs." },
        { text: "Backspace edits the active input." },
        { text: "Arrow keys scroll the active scrollable sprite." },
        { text: "Active sprites use activeColor, activeBg, and activeBorder." },
        { text: "Ctrl+C disposes the controller." }
      ]
    },
    {
      id: "back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var wrapRoot = {
  id: "wrap-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "wrap-title",
      text: " Text wrapping ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "wrap-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      border: "muted",
      bg: "panelAlt",
      children: [
        {
          text: "Resize the terminal to see each inline sprite recompute its wrapped lines.",
          color: "muted"
        },
        {
          text: "Default wrap",
          color: "accent"
        },
        {
          id: "wrap-default",
          text: "The default wrap mode breaks at whitespace when possible. If a word is too long, such as supercalifragilisticexpialidociouswhenneeded, it is hard wrapped so the text stays inside the available width.",
          border: "muted"
        },
        {
          text: "wrap-hard",
          color: "accent"
        },
        {
          id: "wrap-hard",
          text: "wrap-hard ignores word boundaries and slices text exactly at the available content width, even in the middle of words.",
          textWrap: "wrap-hard",
          border: "muted"
        },
        {
          text: "clip + ellipses",
          color: "accent"
        },
        {
          id: "clip-ellipses",
          text: "This line is intentionally too long for the available width and should be clipped with an ellipses marker at the right edge.",
          textWrap: "clip",
          textClipStyle: "ellipses",
          border: "muted"
        },
        {
          text: "clip + none",
          color: "accent"
        },
        {
          id: "clip-none",
          text: "This line is intentionally too long for the available width and should be clipped without adding a marker.",
          textWrap: "clip",
          textClipStyle: "none",
          border: "muted"
        },
        {
          text: "Explicit newlines with wrapping",
          color: "accent"
        },
        {
          id: "wrap-newlines",
          text: `Line one stays separate.
Line two is longer and wraps within its own paragraph when the content area is narrow enough to require wrapping.
Line three stays separate.`,
          border: "muted"
        },
        {
          text: "Explicit newlines with clip",
          color: "accent"
        },
        {
          id: "clip-newlines",
          text: `First clipped line is intentionally long and should clip independently.
Second clipped line is also intentionally long and should clip independently.`,
          textWrap: "clip",
          textClipStyle: "ellipses",
          border: "muted"
        },
        {
          text: "Centered wrapped text",
          color: "accent"
        },
        {
          id: "wrap-centered",
          text: "Each wrapped line can still use inline text alignment. These lines are centered after wrapping.",
          textAlign: "center",
          border: "muted"
        }
      ]
    },
    {
      id: "wrap-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var richRoot = {
  id: "rich-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "rich-title",
      richText: [
        { text: " Rich ", color: "background", bg: "accent" },
        { text: " text ", color: "accent", bg: "panel" },
        { text: " screen ", color: "success", bg: "panel" }
      ],
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "rich-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      border: "muted",
      bg: "panelAlt",
      children: [
        {
          text: "Plain text still renders normally.",
          border: "muted"
        },
        {
          text: "Per-span foreground colors",
          color: "accent"
        },
        {
          id: "rich-colors",
          richText: [
            { text: "This line mixes " },
            { text: "accent", color: "accent" },
            { text: ", " },
            { text: "success", color: "success" },
            { text: ", " },
            { text: "danger", color: "danger" },
            { text: ", and " },
            { text: "hex purple", color: "#c084fc" },
            { text: " foreground colors." }
          ],
          border: "muted"
        },
        {
          text: "Per-span backgrounds",
          color: "accent"
        },
        {
          id: "rich-backgrounds",
          richText: [
            { text: "Spans can also use " },
            { text: " panel ", bg: "panel" },
            { text: " " },
            { text: " active ", color: "background", bg: "active" },
            { text: " " },
            { text: " danger ", color: "background", bg: "danger" },
            { text: " backgrounds." }
          ],
          border: "muted"
        },
        {
          text: "Theme variables and hex colors",
          color: "accent"
        },
        {
          id: "rich-theme-hex",
          richText: [
            { text: "Theme variable ", color: "muted" },
            { text: "success", color: "success" },
            { text: " and direct hex ", color: "muted" },
            { text: "#fb7185", color: "#fb7185" },
            { text: " both resolve." }
          ],
          border: "muted"
        },
        {
          text: "Wrapping across spans",
          color: "accent"
        },
        {
          id: "rich-wrap",
          richText: [
            { text: "This rich text wraps using the same rules as plain text. ", color: "foreground" },
            { text: "Styled spans can cross line boundaries ", color: "accent" },
            { text: "and keep their foreground and background colors after wrapping.", color: "success" }
          ],
          border: "muted"
        },
        {
          text: "Clipping with ellipses",
          color: "accent"
        },
        {
          id: "rich-clip",
          richText: [
            { text: "This clipped rich text is intentionally too long and the ellipses should use the style near the clipped edge.", color: "active" }
          ],
          textWrap: "clip",
          textClipStyle: "ellipses",
          border: "muted"
        },
        {
          text: "Centered rich text",
          color: "accent"
        },
        {
          id: "rich-centered",
          richText: [
            { text: "Centered ", color: "accent" },
            { text: "rich ", color: "success" },
            { text: "text", color: "danger" }
          ],
          textAlign: "center",
          border: "muted"
        }
      ]
    },
    {
      id: "rich-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var animationsRoot = {
  id: "animations-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "animations-title",
      text: " Animations ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "animations-instructions",
      text: "These examples use inlineRenderer.intervalMs. Animations only redraw while this screen is active.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "animations-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      isButton: true,
      border: "muted",
      activeBorder: "active",
      bg: "panelAlt",
      children: [
        {
          text: "Spinner frames",
          color: "accent"
        },
        {
          id: "animation-spinners",
          text: "|  ·  ◴  ⠋  ▃",
          border: "muted",
          inlineRenderer: {
            render: (ctx) => {
              ctx.setChar(0, 0, spinChars[ctx.ivCount % spinChars.length] ?? " ", "accent");
              ctx.setChar(3, 0, starChars[ctx.ivCount % starChars.length] ?? " ", "#ff00ff");
              ctx.setChar(6, 0, clockChars[ctx.ivCount % clockChars.length] ?? " ", "success");
              ctx.setChar(9, 0, bChars[ctx.ivCount % bChars.length] ?? " ", "danger");
              ctx.setChar(12, 0, barChars[ctx.ivCount % barChars.length] ?? " ", "#ffff00");
            },
            intervalMs: 120,
            overlayContent: true
          },
          textAlign: "center"
        },
        {
          text: "Progress bar",
          color: "accent"
        },
        {
          id: "animation-progress",
          text: "[                                        ]",
          border: "muted",
          inlineRenderer: {
            render: (ctx) => {
              const width = Math.max(3, ctx.width);
              const innerWidth = width - 2;
              const value = ctx.ivCount % (innerWidth + 1);
              ctx.setChar(0, 0, "[" + " ".repeat(innerWidth) + "]", "muted");
              ctx.setChar(1, 0, "=".repeat(value), "success");
              if (value < innerWidth) {
                ctx.setChar(value + 1, 0, ">", "active");
              }
            },
            intervalMs: 80
          }
        },
        {
          text: "Bouncing dot",
          color: "accent"
        },
        {
          id: "animation-bounce",
          text: "                                        ",
          border: "muted",
          inlineRenderer: {
            render: (ctx) => {
              const width = Math.max(1, ctx.width);
              const span = Math.max(1, (width - 1) * 2);
              const pos = ctx.ivCount % span;
              const x = pos < width ? pos : span - pos;
              ctx.setChar(0, 0, " ".repeat(width));
              ctx.setChar(x, 0, "●", colors[ctx.ivCount % colors.length]);
            },
            intervalMs: 70,
            overlayContent: true
          }
        },
        {
          text: "Color wave",
          color: "accent"
        },
        {
          id: "animation-wave",
          text: "convo tui animation wave",
          border: "muted",
          inlineRenderer: {
            render: (ctx) => {
              const text = ctx.sprite.text ?? "";
              for (let i = 0;i < Math.min(text.length, ctx.width); i++) {
                ctx.setChar(i, 0, text[i] ?? " ", colors[(i + ctx.ivCount) % colors.length]);
              }
            },
            intervalMs: 140,
            overlayContent: true
          },
          textAlign: "center"
        },
        {
          text: "Multi-line rain",
          color: "accent"
        },
        {
          id: "animation-rain",
          text: `###########################################
#
#
#
#
#`,
          height: 5,
          border: "muted",
          bg: "panel",
          inlineRenderer: {
            render: (ctx) => {
              const chars = ["╵", "╷", "│", "╽", "╿"];
              for (let y = 0;y < ctx.height; y++) {
                ctx.setChar(0, y, " ".repeat(ctx.width));
                for (let x = 0;x < ctx.width; x += 4) {
                  const offset = (x + y + ctx.ivCount) % chars.length;
                  ctx.setChar(x, y, chars[offset] ?? "│", colors[(x + y + ctx.ivCount) % colors.length]);
                }
              }
            },
            intervalMs: 110
          }
        },
        {
          text: "Matrix digital rain",
          color: "accent"
        },
        {
          id: "animation-matrix-rain",
          height: 20,
          border: "success",
          bg: "#001100",
          inlineRenderer: {
            render: (ctx) => {
              for (let y = 0;y < ctx.height; y++) {
                ctx.setChar(0, y, " ".repeat(ctx.width));
              }
              for (let x = 0;x < ctx.width; x++) {
                const speed = x % 5 + 1;
                const head = Math.floor((ctx.ivCount * speed + x * 7) % (ctx.height + 12)) - 6;
                const tail = 6 + x % 4;
                for (let y = 0;y < ctx.height; y++) {
                  const distance = y - head;
                  if (distance >= 0 && distance < tail) {
                    const charIndex = (x * 13 + y * 17 + ctx.ivCount) % matrixChars.length;
                    const color = distance === 0 ? "#619561" : distance < 2 ? "#8fff8f" : "#22c55e";
                    ctx.setChar(x, y, matrixChars[charIndex] ?? "0", color);
                  }
                }
              }
            },
            intervalMs: 140
          }
        }
      ]
    },
    {
      id: "animations-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var mouseRoot = {
  id: "mouse-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "mouse-title",
      text: " Mouse events ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "mouse-instructions",
      text: "Click to focus a panel. Release and drag inside the left pad. Wheel over the right panel to scroll. Wheel over empty right-panel space also fires onMouseWheel.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "mouse-status",
      text: "Mouse status: waiting for release, drag, or wheel.",
      color: "success",
      bg: "panelAlt"
    },
    {
      id: "mouse-body",
      layout: "row",
      flex: 1,
      children: [
        {
          id: "mouse-pad",
          layout: "column",
          flex: 1,
          isButton: true,
          border: "success",
          activeBorder: "active",
          bg: "panelAlt",
          onMouseRelease: (evt) => setMouseStatus(evt, `release ${evt.button}`),
          onMouseDrag: (evt) => setMouseStatus(evt, `drag ${evt.button}`),
          onMouseWheel: (evt) => setMouseStatus(evt, `wheel ${evt.direction} deltaY=${evt.deltaY}`),
          children: [
            {
              text: "Drag/release pad",
              color: "success",
              textAlign: "center"
            },
            {
              text: "Hold a mouse button and move over this panel to test drag events.",
              border: "muted"
            },
            {
              text: "Release over this panel to test release events.",
              border: "muted"
            },
            {
              text: "The status line shows terminal-relative coordinates and modifiers.",
              border: "muted"
            }
          ]
        },
        {
          id: "mouse-wheel-panel",
          layout: "column",
          flex: 1,
          scrollable: true,
          isButton: true,
          border: "accent",
          activeBorder: "active",
          bg: "panelAlt",
          onMouseRelease: (evt) => setMouseStatus(evt, `release ${evt.button}`),
          onMouseDrag: (evt) => setMouseStatus(evt, `drag ${evt.button}`),
          onMouseWheel: (evt) => setMouseStatus(evt, `wheel ${evt.direction} deltaY=${evt.deltaY}`),
          children: [
            {
              text: "Wheel scroll panel",
              color: "accent",
              textAlign: "center"
            },
            {
              text: "Wheel Row 01 - scrolling should move this content vertically.",
              border: "muted"
            },
            {
              text: "Wheel Row 02 - scroll events also include terminal-relative coordinates.",
              border: "muted"
            },
            {
              text: "Wheel Row 03 - wheel up uses deltaY=-1.",
              border: "muted"
            },
            {
              text: "Wheel Row 04 - wheel down uses deltaY=1.",
              border: "muted"
            },
            {
              text: "Wheel Row 05 - modifier keys are included when reported by the terminal.",
              border: "muted"
            },
            {
              text: "Wheel Row 06 - the nearest scrollable sprite under the mouse path is scrolled.",
              border: "muted"
            },
            {
              text: "Wheel Row 07 - child rows may receive the hit target while the parent still scrolls.",
              border: "muted"
            },
            {
              text: "Wheel Row 08 - keep scrolling to verify clipping.",
              border: "muted"
            },
            {
              text: "Wheel Row 09 - parent borders should remain visible.",
              border: "muted"
            },
            {
              text: "Wheel Row 10 - release and drag handlers are also attached to this panel.",
              border: "muted"
            },
            {
              text: "Wheel Row 11 - final row.",
              border: "muted"
            }
          ]
        }
      ]
    },
    {
      id: "mouse-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var scrollRoot = {
  id: "scroll-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "scroll-title",
      text: " Scrolling and clipping ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "scroll-instructions",
      text: "Tab to focus a scrollable panel, then use arrow keys. Borders should remain visible and content should never draw outside them.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "scroll-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      isButton: true,
      border: "muted",
      activeBorder: "active",
      bg: "panelAlt",
      children: [
        {
          text: "Outer vertical scroll panel",
          color: "accent",
          textAlign: "center"
        },
        {
          text: "Rows above and below this panel should disappear cleanly at the content bounds while the border stays intact.",
          border: "muted"
        },
        {
          text: "Row 01 - This row is intentionally plain so clipping at the top edge is easy to see.",
          border: "muted"
        },
        {
          text: "Row 02 - Scroll down and this row should move behind the top border without overwriting it.",
          border: "muted"
        },
        {
          text: "Row 03 - The parent content rect is the only drawable area for scrolled children.",
          border: "muted"
        },
        {
          text: "Row 04 - Inline text clipping still applies inside each child sprite.",
          textWrap: "clip",
          textClipStyle: "ellipses",
          border: "muted"
        },
        {
          id: "scroll-horizontal",
          layout: "row",
          scrollable: true,
          isButton: true,
          border: "accent",
          activeBorder: "active",
          bg: "panel",
          children: [
            {
              text: "Horizontal A: use left and right arrows when this nested panel is active.",
              border: "success",
              color: "success"
            },
            {
              text: "Horizontal B: this child should clip at the right edge of the nested panel.",
              border: "accent",
              color: "accent"
            },
            {
              text: "Horizontal C: scroll right far enough and earlier children should not overwrite the left border.",
              border: "danger",
              color: "danger"
            },
            {
              text: "Horizontal D: nested clipping intersects with the outer scroll clipping.",
              border: "muted"
            }
          ]
        },
        {
          text: "Row 05 - The horizontal panel above is also inside the vertically scrollable parent.",
          border: "muted"
        },
        {
          text: "Row 06 - Nested scrollable containers should clip to the intersection of both content rects.",
          border: "muted"
        },
        {
          text: "Row 07 - Scroll this row partly above the viewport to check top clipping.",
          border: "muted"
        },
        {
          text: "Row 08 - Scroll this row partly below the viewport to check bottom clipping.",
          border: "muted"
        },
        {
          text: "Row 09 - Long clipped line: abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz",
          textWrap: "clip",
          textClipStyle: "ellipses",
          border: "muted"
        },
        {
          text: "Row 10 - Borders on this child should not leak outside the parent content rect.",
          border: "muted"
        },
        {
          text: "Row 11 - Keep scrolling down to verify the parent border remains visible.",
          border: "muted"
        },
        {
          text: "Row 12 - Bottom clipping should hide this row before it overwrites the footer link.",
          border: "muted"
        },
        {
          text: "Row 13 - Final row of the scroll clipping test.",
          border: "muted"
        }
      ]
    },
    {
      id: "scroll-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var gridRoot = {
  id: "grid-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "grid-title",
      text: " Grid layout ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "grid-instructions",
      text: "Resize the terminal to test fixed cr columns, flexible fr columns, mixed columns, and row heights based on constrained child widths.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "grid-body",
      layout: "column",
      flex: 1,
      scrollable: true,
      isButton: true,
      border: "muted",
      activeBorder: "active",
      bg: "panelAlt",
      children: [
        {
          text: "Fixed cr + flexible fr columns",
          color: "accent"
        },
        {
          id: "grid-fixed-flex",
          layout: "grid",
          gridCols: ["12cr", "1fr", "2fr"],
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "12cr",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "1fr column wraps this medium text based on the remaining width.",
              border: "muted"
            },
            {
              text: "2fr column receives twice the flexible space and should usually wrap less than the 1fr column.",
              border: "muted"
            },
            {
              text: "fixed",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Short cell",
              border: "muted"
            },
            {
              text: "A much longer cell in the wider flexible column makes this row taller only when constrained.",
              border: "muted"
            }
          ]
        },
        {
          text: "Equal fr columns",
          color: "accent"
        },
        {
          id: "grid-equal-fr",
          layout: "grid",
          gridCols: ["1fr", "1fr", "1fr"],
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "One",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Two columns can wrap independently when the terminal narrows.",
              border: "muted"
            },
            {
              text: "Three",
              color: "danger",
              border: "danger",
              textAlign: "center"
            },
            {
              text: "A longer first cell demonstrates that grid row height should be the max height of all cells in the row after column widths are known.",
              border: "muted"
            },
            {
              text: "Middle cell",
              border: "muted"
            },
            {
              text: "Right cell",
              border: "muted"
            }
          ]
        },
        {
          text: "Mostly fixed columns with remaining fr space",
          color: "accent"
        },
        {
          id: "grid-mostly-fixed",
          layout: "grid",
          gridCols: ["8cr", "14cr", "1fr"],
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "ID",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Name",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Description",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "001",
              border: "muted",
              textAlign: "center"
            },
            {
              text: "Alpha",
              border: "muted"
            },
            {
              text: "The description column uses remaining fr space and wraps if the fixed columns leave little room.",
              border: "muted"
            },
            {
              text: "002",
              border: "muted",
              textAlign: "center"
            },
            {
              text: "Beta item",
              border: "muted"
            },
            {
              text: "Another long description verifies row height calculation across multiple rows.",
              border: "muted"
            }
          ]
        },
        {
          text: "Narrow fixed columns and multiple rows",
          color: "accent"
        },
        {
          id: "grid-narrow",
          layout: "grid",
          gridCols: ["6cr", "1fr", "6cr"],
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "A",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Long middle content wraps between two narrow fixed columns.",
              border: "muted"
            },
            {
              text: "Z",
              color: "danger",
              border: "danger",
              textAlign: "center"
            },
            {
              text: "B",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "A second row with even longer middle content should expand only this row without forcing other rows to use the same height.",
              border: "muted"
            },
            {
              text: "Y",
              color: "danger",
              border: "danger",
              textAlign: "center"
            },
            {
              text: "C",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "Short middle",
              border: "muted"
            },
            {
              text: "X",
              color: "danger",
              border: "danger",
              textAlign: "center"
            }
          ]
        }
      ]
    },
    {
      id: "grid-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var flexRoot = {
  id: "flex-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "flex-title",
      text: " Flex layout ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "flex-instructions",
      text: "Resize the terminal to test row and column flex distribution. The main panels intentionally mix no-flex, all-flex, and fixed-plus-flex children.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "flex-body",
      layout: "column",
      flex: 1,
      border: "muted",
      bg: "panelAlt",
      children: [
        {
          text: "Row: no flex children use natural widths",
          color: "accent",
          bg: "panel"
        },
        {
          id: "flex-row-no-flex",
          layout: "row",
          flex: 1,
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "Natural A",
              color: "success",
              border: "success"
            },
            {
              text: "Natural child B is wider",
              border: "muted"
            },
            {
              text: "Natural C",
              color: "danger",
              border: "danger"
            },
            {
              text: "Discreet size (30x4)",
              color: "muted",
              border: "muted",
              width: 30,
              height: 4
            }
          ]
        },
        {
          text: "Row: all flex children share remaining width",
          color: "accent",
          bg: "panel"
        },
        {
          id: "flex-row-all-flex",
          layout: "row",
          flex: 1,
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "flex 1 padding 2",
              flex: 1,
              color: "success",
              border: "success",
              textAlign: "center",
              padding: 2
            },
            {
              text: "flex 2 receives about twice the width and margin of 2",
              flex: 2,
              border: "muted",
              textAlign: "center",
              margin: 2
            },
            {
              text: "flex 1 margin and padding right:4 top:1",
              flex: 1,
              color: "danger",
              border: "danger",
              textAlign: "end",
              padding: { right: 4, top: 1 },
              margin: { right: 4, top: 1 }
            }
          ]
        },
        {
          text: "Row: fixed natural children plus flex children",
          color: "accent",
          bg: "panel"
        },
        {
          id: "flex-row-mixed",
          layout: "row",
          flex: 1,
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "Fixed left",
              color: "success",
              border: "success"
            },
            {
              text: "flex 1 middle grows after fixed siblings keep natural width",
              flex: 1,
              border: "muted",
              textAlign: "center"
            },
            {
              text: "Fixed right",
              color: "danger",
              border: "danger"
            }
          ]
        },
        {
          text: "Column: all flex children share remaining height with gap of 2",
          color: "accent",
          bg: "panel"
        },
        {
          id: "flex-column-all-flex",
          layout: "column",
          flex: 2,
          border: "accent",
          bg: "panel",
          gap: 2,
          children: [
            {
              text: "flex 1 top",
              flex: 1,
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "flex 2 middle should receive more rows when space is available.",
              flex: 2,
              border: "muted",
              textAlign: "center"
            },
            {
              text: "flex 1 bottom",
              flex: 1,
              color: "danger",
              border: "danger",
              textAlign: "center"
            }
          ]
        },
        {
          text: "Column: fixed header/footer plus flex center",
          color: "accent",
          bg: "panel"
        },
        {
          id: "flex-column-mixed",
          layout: "column",
          flex: 2,
          border: "accent",
          bg: "panel",
          children: [
            {
              text: "Fixed header keeps natural height",
              color: "success",
              border: "success",
              textAlign: "center"
            },
            {
              text: "flex center fills remaining height between fixed rows",
              flex: 1,
              border: "muted",
              textAlign: "center",
              vTextAlign: "center"
            },
            {
              text: "Fixed footer keeps natural height",
              color: "danger",
              border: "danger",
              textAlign: "center"
            }
          ]
        }
      ]
    },
    {
      id: "flex-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var absoluteRoot = {
  id: "absolute-root",
  layout: "column",
  border: "accent",
  bg: "background",
  children: [
    {
      id: "absolute-title",
      text: " Absolute positioning ",
      color: "accent",
      bg: "panel",
      textAlign: "center"
    },
    {
      id: "absolute-instructions",
      text: "Resize the terminal. Absolute sprites are removed from normal layout and placed using left, top, right, bottom, width, and height.",
      color: "muted",
      bg: "panel"
    },
    {
      id: "absolute-body",
      layout: "column",
      flex: 1,
      border: "muted",
      bg: "panelAlt",
      children: [
        {
          text: "Normal layout content",
          color: "accent",
          textAlign: "center"
        },
        {
          text: "The bordered boxes on this screen are absolute children of the root and should overlay this normal layout area without changing its size.",
          border: "muted"
        },
        {
          text: "Top-left uses fixed left/top/width/height. The wide panel uses left/top/right/height. The bottom panel uses left/top/right/bottom.",
          border: "muted"
        },
        {
          text: "The back link remains in normal layout at the bottom.",
          border: "muted"
        }
      ]
    },
    {
      id: "absolute-fixed",
      layout: "column",
      absolutePosition: {
        left: 4,
        top: 6,
        height: 7
      },
      width: 30,
      border: "success",
      bg: "panel",
      children: [
        {
          text: "Fixed box",
          color: "success",
          textAlign: "center"
        },
        {
          text: "left:4 top:6 width:30 height:7",
          textAlign: "center"
        }
      ]
    },
    {
      id: "absolute-wide",
      layout: "column",
      absolutePosition: {
        left: 38,
        top: 6,
        right: 4,
        height: 7
      },
      border: "accent",
      bg: "panel",
      children: [
        {
          text: "Stretched width",
          color: "accent",
          textAlign: "center"
        },
        {
          text: "left:38 top:6 right:4 height:7",
          textAlign: "center"
        }
      ]
    },
    {
      id: "absolute-fill",
      layout: "column",
      absolutePosition: {
        left: 10,
        top: 15,
        right: 10,
        bottom: 5
      },
      border: "danger",
      bg: "panel",
      children: [
        {
          text: "Stretched width and height",
          color: "danger",
          textAlign: "center"
        },
        {
          text: "left:10 top:15 right:10 bottom:5",
          textAlign: "center"
        },
        {
          text: "This panel should resize with the terminal while keeping its offsets.",
          textAlign: "center",
          vTextAlign: "center",
          flex: 1
        }
      ]
    },
    {
      id: "absolute-back-link",
      text: " Back home ",
      link: "home",
      border: "accent",
      activeColor: "active",
      activeBg: "activeBg",
      activeBorder: "active"
    }
  ]
};
var tuiConsole = {
  stdout: proc.stdout,
  stdin: proc.stdin
};
var ctrl = new ConvoTuiCtrl({
  console: tuiConsole,
  theme,
  defaultScreen: "home",
  log,
  screens: [
    {
      id: "home",
      defaultSprite: "name-input",
      root: homeRoot
    },
    {
      id: "help",
      defaultSprite: "back-link",
      root: helpRoot
    },
    {
      id: "wrap",
      defaultSprite: "wrap-back-link",
      root: wrapRoot
    },
    {
      id: "rich",
      defaultSprite: "rich-back-link",
      root: richRoot
    },
    {
      id: "animations",
      defaultSprite: "animations-body",
      root: animationsRoot
    },
    {
      id: "mouse",
      defaultSprite: "mouse-pad",
      root: mouseRoot
    },
    {
      id: "scroll",
      defaultSprite: "scroll-body",
      root: scrollRoot
    },
    {
      id: "grid",
      defaultSprite: "grid-body",
      root: gridRoot
    },
    {
      id: "flex",
      defaultSprite: "flex-back-link",
      root: flexRoot
    },
    {
      id: "absolute",
      defaultSprite: "absolute-back-link",
      root: absoluteRoot
    }
  ]
});
proc.on("exit", () => ctrl.dispose());
proc.on("SIGTERM", () => {
  ctrl.dispose();
  proc.exit(0);
});
ctrl.init();
