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

// ../../packages/tui/src/tui-lib.ts
var getEnvValue = (env, name) => {
  return env[name] ?? env[name.toLowerCase()] ?? "";
};
var hasEnvValue = (env, name, pattern) => {
  return pattern.test(getEnvValue(env, name));
};
var detectColorMode = (env = globalThis.process?.env) => {
  if (!env) {
    return "256";
  }
  const term = getEnvValue(env, "TERM").toLowerCase();
  const termProgram = getEnvValue(env, "TERM_PROGRAM").toLowerCase();
  if (termProgram === "apple_terminal") {
    return "256";
  }
  if (hasEnvValue(env, "COLORTERM", /^(truecolor|24bit)$/i)) {
    return "truecolor";
  }
  if (/^(iterm\.app|wezterm|kitty|ghostty|hyper|vscode|rio)$/i.test(termProgram)) {
    return "truecolor";
  }
  if (/(truecolor|24bit|direct)/i.test(term)) {
    return "truecolor";
  }
  if (/256color/i.test(term)) {
    return "256";
  }
  return "256";
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
  colorMode;
  env;
  _activeScreen;
  get activeScreen() {
    return this._activeScreen;
  }
  constructor({
    screens,
    console: console2,
    theme,
    defaultScreen,
    log = globalThis.console.log,
    env,
    colorMode
  }) {
    this.log = log;
    this.console = console2;
    this.theme = theme;
    this.colorMode = !colorMode || colorMode === "auto" ? detectColorMode(env) : colorMode;
    this.env = env ?? {};
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
          this.setChar(cx, cy, char.c, sprite.getColor?.(char.c, 1, sprite) ?? char.f, char.b, sprite.id);
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
    const position = this.getInputCaretDisplayPosition(sprite, rect, value, caret, textWrap, textClipStyle, textAlign, vTextAlign, scrollX, scrollY, true);
    if (!position) {
      return;
    }
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
    if (position.x < visibleRect.x || position.y < visibleRect.y || position.x >= visibleRect.x + visibleRect.width || position.y >= visibleRect.y + visibleRect.height) {
      return;
    }
    this.inputCursor = position;
  }
  getInputCaretDisplayPosition(sprite, rect, value, caret, textWrap, textClipStyle, textAlign, vTextAlign, scrollX, scrollY, clamp) {
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    caret = this.clampNumber(caret, 0, value.length);
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
    const rawX = rect.x + xOffset + col - offset;
    const rawY = rect.y + yOffset + lineIndex - Math.max(0, scrollY);
    if (!clamp && (rawY < rect.y || rawY >= rect.y + rect.height)) {
      return;
    }
    return {
      x: clamp ? this.clampNumber(rawX, rect.x, rect.x + rect.width - 1) : this.clampNumber(rawX, rect.x, rect.x + rect.width - 1),
      y: clamp ? this.clampNumber(rawY, rect.y, rect.y + rect.height - 1) : rawY
    };
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
        const text = this.getInlineSpriteLayoutText(sprite);
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
      const text = this.getInlineSpriteLayoutText(sprite);
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
      return this.getInputSpriteValue(sprite);
    }
    return sprite.richText?.length ? sprite.richText.map((span) => span.text).join("") : sprite.text ?? "";
  }
  getInlineSpriteLayoutText(sprite) {
    const text = this.getInlineSpriteText(sprite);
    return sprite.isInput && text === "" && sprite.placeholder ? sprite.placeholder : text;
  }
  getInputSpriteValue(sprite) {
    return sprite.state?.inputValue ?? sprite.text ?? "";
  }
  getInlineSpriteChars(sprite, style) {
    if (sprite.isInput) {
      const value = this.getInputSpriteValue(sprite);
      if (value || !sprite.placeholder) {
        return this.createInlineChars(value, style);
      }
      return this.createInlineChars(sprite.placeholder, this.getPlaceholderStyle(sprite, style));
    }
    if (!sprite.richText?.length) {
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
  getPlaceholderStyle(sprite, style) {
    return {
      f: this.resolveColor(sprite.placeholderColor) ?? this.darkenColor(style.f, 0.4) ?? style.f,
      b: style.b
    };
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
  darkenColor(color, amount) {
    const rgb = this.hexToRgb(color);
    if (!rgb) {
      return;
    }
    const factor = this.clampNumber(1 - amount, 0, 1);
    return this.rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
  }
  getFgAnsi(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) {
      return "\x1B[39m";
    }
    switch (this.colorMode) {
      case "256":
        return `\x1B[38;5;${this.rgbToAnsi256(rgb.r, rgb.g, rgb.b)}m`;
      case "truecolor":
      default:
        return `\x1B[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
    }
  }
  getBgAnsi(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) {
      return "\x1B[49m";
    }
    switch (this.colorMode) {
      case "256":
        return `\x1B[48;5;${this.rgbToAnsi256(rgb.r, rgb.g, rgb.b)}m`;
      case "truecolor":
      default:
        return `\x1B[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
    }
  }
  rgbToAnsi256(r, g, b) {
    if (r === g && g === b) {
      if (r < 8) {
        return 16;
      }
      if (r > 248) {
        return 231;
      }
      return Math.round((r - 8) / 247 * 24) + 232;
    }
    const rc = Math.round(this.clampNumber(r, 0, 255) / 255 * 5);
    const gc = Math.round(this.clampNumber(g, 0, 255) / 255 * 5);
    const bc = Math.round(this.clampNumber(b, 0, 255) / 255 * 5);
    return 16 + 36 * rc + 6 * gc + bc;
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
      this.insertActiveInputText(input.slice(pasteStart.length, endIndex), true);
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
    const ctrlEnterSequence = this.getMatchedInputSequence(input, [
      "\x1B[13;5u",
      "\x1B[10;5u",
      "\x1B[27;5;13~",
      "\x1B[27;5;10~"
    ]);
    if (ctrlEnterSequence) {
      if (!this.submitActiveInput()) {
        this.activateCurrentSprite();
      }
      return ctrlEnterSequence.length;
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
      if (!this.moveActiveInputCaretLine(-1)) {
        this.scrollActiveSprite(0, -1);
      }
      return 3;
    }
    if (input.startsWith("\x1B[B")) {
      if (!this.moveActiveInputCaretLine(1)) {
        this.scrollActiveSprite(0, 1);
      }
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
        this.handleEnterKey();
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
  getPrintableInputText(text, preserveNewLines = false) {
    const withoutEsc = text.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[@-_]/g, "").replace(/\r\n/g, `
`).replace(/\r/g, `
`);
    return Array.from(withoutEsc).filter((char) => char >= " " && char !== "" || preserveNewLines && char === `
`).join("");
  }
  handleEnterKey() {
    const sprite = this.getActiveSprite();
    if (sprite?.isInput) {
      if (sprite.multiLineInput) {
        return this.insertActiveInputText(`
`, true);
      }
      return this.submitActiveInput();
    }
    return this.activateCurrentSprite();
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
    if (sprite.isInput) {
      this.setInputCaretFromMouse(sprite, target.path, x, y);
    }
    if (sprite.isButton || sprite.link || sprite.onClick) {
      this.clickSprite(sprite, x, y);
    }
    this.render();
  }
  setInputCaretFromMouse(sprite, path, x, y) {
    if (!sprite.isInput) {
      return false;
    }
    const rect = this.spriteContentRects.get(sprite.id);
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    const value = this.getInputSpriteValue(sprite);
    const textWrap = sprite.textWrap ?? "wrap";
    const textClipStyle = sprite.textClipStyle ?? "ellipses";
    const textAlign = this.getResolvedTextAlign(path);
    const vTextAlign = sprite.vTextAlign ?? "start";
    const scrollX = sprite.scrollable ? sprite.state?.scrollX ?? 0 : 0;
    const scrollY = sprite.scrollable ? sprite.state?.scrollY ?? 0 : 0;
    let bestCaret = this.getInputCaret(sprite, value);
    let bestDistance = Number.MAX_SAFE_INTEGER;
    for (let caret = 0;caret <= value.length; caret++) {
      const position = this.getInputCaretDisplayPosition(sprite, rect, value, caret, textWrap, textClipStyle, textAlign, vTextAlign, scrollX, scrollY, false);
      if (!position) {
        continue;
      }
      const distance = Math.abs(position.y - y) * 1e4 + Math.abs(position.x - x);
      if (distance < bestDistance || distance === bestDistance && x >= position.x && caret > bestCaret) {
        bestDistance = distance;
        bestCaret = caret;
      }
    }
    return this.setActiveInputCaret(bestCaret);
  }
  getResolvedTextAlign(path) {
    let textAlign;
    for (const sprite of path) {
      textAlign = sprite.textAlign ?? textAlign;
    }
    return textAlign ?? "start";
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
    const value = this.getInputSpriteValue(sprite);
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
  insertActiveInputText(text, preserveNewLines = false) {
    const sprite = this.getActiveSprite();
    const value = this.getPrintableInputText(text, preserveNewLines && sprite?.multiLineInput === true);
    if (!value) {
      return this.getActiveSprite()?.isInput === true;
    }
    return this.editActiveInput((current, caret) => ({
      value: `${current.slice(0, caret)}${value}${current.slice(caret)}`,
      caret: caret + value.length
    }));
  }
  submitActiveInput() {
    const sprite = this.getActiveSprite();
    const screen = this._activeScreen;
    if (!sprite?.isInput || !screen) {
      return false;
    }
    sprite.state ??= {};
    const value = this.getInputSpriteValue(sprite);
    const caret = this.getInputCaret(sprite, value);
    sprite.state.inputValue = value;
    sprite.state.inputCaret = caret;
    sprite.onSubmit?.({
      type: "submit",
      sprite,
      screen,
      ctrl: this,
      value
    });
    this.render();
    return true;
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
    const value = this.getInputSpriteValue(sprite);
    const caret = this.getInputCaret(sprite, value);
    return this.setActiveInputCaret(caret + offset);
  }
  moveActiveInputCaretLine(offset) {
    const sprite = this.getActiveSprite();
    if (!sprite?.isInput || !sprite.multiLineInput) {
      return false;
    }
    const value = sprite.state?.inputValue ?? sprite.text ?? "";
    const caret = this.getInputCaret(sprite, value);
    const ranges = this.getInputLineRanges(value);
    const lineIndex = Math.max(0, ranges.findIndex((range) => caret >= range.start && caret <= range.end));
    const line = ranges[lineIndex] ?? ranges[0];
    if (!line) {
      return true;
    }
    const targetIndex = this.clampNumber(lineIndex + offset, 0, ranges.length - 1);
    const target = ranges[targetIndex];
    const column = caret - line.start;
    const nextCaret = this.clampNumber(target.start + column, target.start, target.end);
    this.setActiveInputCaret(nextCaret);
    return true;
  }
  getInputLineRanges(value) {
    const ranges = [];
    let start = 0;
    for (let i = 0;i < value.length; i++) {
      if (value[i] === `
`) {
        ranges.push({ start, end: i });
        start = i + 1;
      }
    }
    ranges.push({ start, end: value.length });
    return ranges;
  }
  setActiveInputCaretToEnd() {
    const sprite = this.getActiveSprite();
    if (!sprite?.isInput) {
      return false;
    }
    return this.setActiveInputCaret(this.getInputSpriteValue(sprite).length);
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

// convo-tui.ts
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
  background: "#222222",
  muted: "#555555",
  panel: "#1c1c1c",
  panelAlt: "#242424",
  accent: "#60a5fa",
  active: "#facc15",
  activeBg: "#3f3f1f",
  success: "#22c55e",
  danger: "#ef4444"
};
var homeRoot = {
  bg: "background",
  border: "muted",
  layout: "column",
  children: [
    {
      isInput: true,
      multiLineInput: true,
      flex: 1,
      text: "Lets play a game",
      getColor: () => "#ff00ff"
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
    }
  ]
});
proc.on("exit", () => ctrl.dispose());
proc.on("SIGTERM", () => {
  ctrl.dispose();
  proc.exit(0);
});
ctrl.init();
