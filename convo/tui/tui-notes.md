# TUI Notes

## ConvoTuiCtrl first-pass decisions

- `ConvoTuiCtrlOptions` includes:
  - `theme:TuiTheme`
  - `defaultScreen?:string`
- A theme is required and theme colors are expected to be `#rrggbb`.
- Initial active screen is:
  1. `defaultScreen`, when provided and found
  2. otherwise the first screen in the `screens` array
- Public navigation API should include:
  - `activateScreen(id)`
  - `activateSprite(id, screen?)`
  - `activateLink(link, sourceScreen?)`
  - `followLink(spriteOrId)`
- Rendering flow for the first implementation pass:
  1. populate the back buffer
  2. compare the back buffer to the front buffer
  3. write changed runs to stdout using ANSI escape sequences
  4. copy the back buffer to the front buffer
- First render and resize render use a full redraw.
- Color handling should support theme variables and `#rrggbb` truecolor.
- Layout should be split into two passes:
  1. determine natural layout size of inline sprites
  2. share remaining layout space between row, column, grid, and flex children
- Default `flex` is `0`.
- Children without `flex` use natural size; remaining space is distributed by flex value.
- Borders draw inside the assigned sprite rectangle and inset content by 1.
- Input support planned:
  - Tab / Shift+Tab navigation
  - Enter / Space click activation
  - text input editing
  - Backspace
  - link activation
  - mouse support
- Resize support planned:
  - listen to stdout `resize`
  - recreate buffers
  - re-render automatically

## Current implementation status

- Added required controller options and public navigation API.
- Added screen/sprite loading with generated ids and copied state.
- Added active screen and active sprite state management.
- Added active sprite state syncing:
  - `state.active` is set on the active sprite
  - previous active sprites are reset to `false`
- Added active sprite visual properties:
  - `activeColor`
  - `activeBg`
  - `activeBorder`
- Added full-screen terminal initialization:
  - alternate screen buffer
  - hidden cursor
  - raw stdin mode
  - mouse reporting
- Added cleanup/dispose handling:
  - removes event listeners
  - disables raw mode
  - pauses stdin
  - disables mouse reporting
  - restores cursor and main screen buffer
- Added buffer resize/allocation helpers.
- Added rendering:
  - clears the back buffer
  - draws active screen root
  - draws absolute sprites
  - full redraws on first render and after resize
  - diff renders after the first render by comparing front/back buffers
  - emits changed character runs using cursor positioning escape sequences
  - preserves ANSI foreground/background style changes for changed runs
  - copies back buffer to front buffer after rendering
- Added color resolution for theme variables and `#rrggbb`.
- Added layouts:
  - inline
  - row
  - column
  - grid
  - flex distribution for row and column children
- Added sprite borders:
  - normal
  - thick
  - rounded
  - double
  - classic
  - per-side border colors
- Added scroll offsets for scrollable sprites.
- Added inline text wrapping:
  - `wrap` wraps on whitespace when possible and hard wraps words that exceed available width
  - `wrap-hard` wraps exactly at the available width
  - `clip` preserves explicit lines and clips horizontally
  - explicit newlines are preserved
  - `textClipStyle` supports no marker or ellipses for clipped text
  - natural inline height updates when a constrained width is known
- Added a manual text wrapping screen to `screen-test.ts` that demonstrates:
  - default wrapping
  - hard wrapping
  - clipping with ellipses
  - clipping without marker
  - explicit newlines
  - centered wrapped text
- Added inline text alignment:
  - `start`
  - `center`
  - `end`
  - inherited from nearest ancestor when undefined
  - applied only when drawing inline text
- Added keyboard input:
  - Tab / Shift+Tab focus navigation
  - Enter / Space click activation
  - printable character input
  - Backspace
  - arrow key scrolling for active scrollable sprites
  - Ctrl+C dispose
- Added active input cursor support:
  - `SpriteState.inputCaret` stores a minimal zero-based caret position
  - active input sprites show the terminal cursor
  - non-input active sprites hide the terminal cursor
  - cursor defaults to the end of the input value
  - cursor position respects sprite layout rect and sprite scroll offsets
- Added mouse click support using SGR mouse mode.
- Added resize support:
  - listens to stdout `resize`
  - recreates buffers
  - re-renders automatically
  - forces a full redraw after buffer size changes

## Deferred / future work

- Rich text support.
- Better clipping for scrollable containers so offscreen children cannot draw outside the parent content rect.
- More complete keyboard handling:
  - delete
  - home/end
  - cursor movement inside input
  - paste handling
- More robust mouse support:
  - drag
  - wheel scrolling
  - release events
- Layout sizing refinements for grid rows and flex edge cases.

## Planned implementation convo scripts

- `10_tui-rich-text.convo`: add first-pass rich inline text spans with per-span style.
- `11_tui-scroll-container-clipping.convo`: add drawing clip bounds for scrollable containers.
- `12_tui-keyboard-editing.convo`: add delete, home/end, caret movement, and paste-aware input editing.
- `13_tui-mouse-events.convo`: add release, drag, and wheel mouse handling.
- `14_tui-layout-refinements.convo`: refine grid/flex sizing edge cases.
