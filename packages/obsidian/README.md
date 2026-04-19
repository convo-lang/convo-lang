# Convo-Lang Obsidian Plugin

This plugin adds basic Obsidian editor syntax highlighting for:

- `.convo` files
- fenced markdown code blocks using `convo`

## Notes

This is a CodeMirror 6 based Obsidian plugin implementation.

It is intentionally simplified from the VSCode TextMate grammars and focuses on:

- top-level `>` roles
- tags like `@condition`, `@json`, `@import`, `@to`, `@from`
- strings
- inline code
- heredoc-like sections
- function-like calls
- type names
- constants
- comments

## Expected plugin structure

Build output should produce the standard Obsidian plugin artifacts in this folder:

- `manifest.json`
- `main.js`
- `styles.css`

## Development

This source currently ships as a simple direct plugin entry file in `main.js`.

If you want, I can next convert this into a proper TypeScript + esbuild-based Obsidian plugin scaffold with:

- `src/main.ts`
- `esbuild.config.mjs`
- `tsconfig.json`

which is closer to the usual Obsidian plugin development convention.
