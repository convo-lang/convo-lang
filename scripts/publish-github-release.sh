#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."


package_json="./packages/cli/package.json"

if ! command -v gh >/dev/null 2>&1; then
    echo "Error: GitHub CLI (gh) is required." >&2
    exit 1
fi

version="$(node -p "require('$package_json').version")"
tag="v$version"
title="Convo-Lang CLI $tag"

staging_dir="./dist/git-hub-release"
rm -rf "$staging_dir"
mkdir -p "$staging_dir"

copy_asset()
{
    local source="$1"
    local name="$2"
    local target="$staging_dir/$name"

    if [[ ! -f "$source" ]]; then
        echo "Error: binary not found: $source" >&2
        exit 1
    fi

    cp "$source" "$target"
    chmod +x "$target"
}

copy_asset "./packages/cli-darwin-arm64/bin/convo" "convo-darwin-arm64"
copy_asset "./packages/cli-darwin-x64/bin/convo" "convo-darwin-x64"
copy_asset "./packages/cli-linux-arm64/bin/convo" "convo-linux-arm64"
copy_asset "./packages/cli-linux-arm64-musl/bin/convo" "convo-linux-arm64-musl"
copy_asset "./packages/cli-linux-x64/bin/convo" "convo-linux-x64"
copy_asset "./packages/cli-linux-x64-musl/bin/convo" "convo-linux-x64-musl"
copy_asset "./packages/cli-windows-arm64/bin/convo.exe" "convo-windows-arm64.exe"
copy_asset "./packages/cli-windows-x64/bin/convo.exe" "convo-windows-x64.exe"

assets=(
    "$staging_dir/convo-darwin-arm64"
    "$staging_dir/convo-darwin-x64"
    "$staging_dir/convo-linux-arm64"
    "$staging_dir/convo-linux-arm64-musl"
    "$staging_dir/convo-linux-x64"
    "$staging_dir/convo-linux-x64-musl"
    "$staging_dir/convo-windows-arm64.exe"
    "$staging_dir/convo-windows-x64.exe"
)

if gh release view "$tag" >/dev/null 2>&1; then
    echo "Release $tag already exists. Uploading assets with --clobber."
    gh release upload "$tag" "${assets[@]}" --clobber
else
    echo "Creating release $tag."
    gh release create "$tag" "${assets[@]}" \
        --title "$title"
fi

echo "Published GitHub release $tag."
