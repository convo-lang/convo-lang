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

- Added required controller options and public navigation skeleton.
- Added screen/sprite loading with generated ids and copied state.
- Added buffer resize/allocation helper.
- Full rendering, ANSI output, layout, input, mouse, and resize listeners are still TODO.
