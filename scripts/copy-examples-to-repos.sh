#!/bin/bash
set -e
cd "$(dirname "$0")/.."

rootDir=$(pwd)

echo ""
echo ""

listRepos () {
    for d in ./examples/*/ ; do
        cd $rootDir
        name=$(basename $d)
        dir=$(realpath "../convo-lang-examples/convo-lang-$name-example")
        echo $dir
        echo "### GIT status - $name ###"
        echo ""
        cd $dir
        git status
        echo ""
        echo "##########################"
        echo ""
    done
}

listRepos

if [ "$1" != "--yes" ]; then
    echo "All changes in the listed repos will be lost"
    echo "Do you want to continue [y/N]"
    read continueWithUpdate
    if [ "$continueWithUpdate" != "y" ]; then
        echo "Copy canceled"
        exit 0
    fi
fi

cd $rootDir
for d in ./examples/*/ ; do
    cd $rootDir
    name=$(basename $d)
    dir=$(realpath "../convo-lang-examples/convo-lang-$name-example")
    echo "$d -> $dir"
    cd $dir
    rm -rf ./*
    cd $rootDir
    cp -r $d/* $dir
done

listRepos

echo "Examples copied"
