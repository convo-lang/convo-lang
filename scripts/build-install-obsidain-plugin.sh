#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."


# define the Obsidian vault path directly
VAULT_PATH="/Users/scott/Library/Mobile Documents/iCloud~md~obsidian/Documents/Scott"

# define source and destination directories
PLUGIN_SRC="packages/obsidian"
PLUGIN_DIST="$PLUGIN_SRC/dist"
PLUGIN_DST="$VAULT_PATH/.obsidian/plugins/convo-lang"

# build the plugin using Bun with CommonJS output
bun "$PLUGIN_SRC/build-plugin.ts"

# ensure the bundle was created
if [ ! -f "$PLUGIN_DIST/main.js" ]; then
    echo "Built plugin bundle not found: $PLUGIN_DIST/main.js"
    exit 1
fi

# create the destination plugin directory
mkdir -p "$PLUGIN_DST"

# copy required plugin files
cp "$PLUGIN_SRC/manifest.json" "$PLUGIN_DST/manifest.json"
cp "$PLUGIN_DIST/main.js" "$PLUGIN_DST/main.js"
cp "$PLUGIN_SRC/styles.css" "$PLUGIN_DST/styles.css"

# optionally copy readme if present
if [ -f "$PLUGIN_SRC/README.md" ]; then
    cp "$PLUGIN_SRC/README.md" "$PLUGIN_DST/README.md"
fi

# report success
echo "Built and installed Convo-Lang plugin to:"
echo "  $PLUGIN_DST"
echo
echo "Next steps:"
echo "1. Open Obsidian"
echo "2. Go to Settings -> Community plugins"
echo "3. Click Reload plugins"
echo "4. Enable Convo-Lang"