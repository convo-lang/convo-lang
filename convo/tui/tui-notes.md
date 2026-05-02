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
  2. copy the back buffer to the front buffer
  3. write the full front buffer to stdout using ANSI escape sequences
- First render implementation can redraw the entire screen. Diff rendering is deferred.
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
- Added full redraw rendering:
  - clears the back buffer
  - draws active screen root
  - draws absolute sprites
  - copies back buffer to front buffer
  - writes ANSI truecolor output to stdout
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
- Added keyboard input:
  - Tab / Shift+Tab focus navigation
  - Enter / Space click activation
  - printable character input
  - Backspace
  - arrow key scrolling for active scrollable sprites
  - Ctrl+C dispose
- Added mouse click support using SGR mouse mode.
- Added resize support:
  - listens to stdout `resize`
  - recreates buffers
  - re-renders automatically

## Deferred / future work

- Diff rendering to reduce terminal output.
- Cursor display/positioning for active input sprites.
- Rich text wrapping and multiline text.
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
