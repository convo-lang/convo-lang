#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Run this script before publishing.

grammarFile='packages/convo-lang-tools/syntaxes/convo.tmLanguage.json'
extGrammarFile='packages/convo-lang-tools/lsp/client/src/convoGrammar.ts'

grammarJson=$(cat $grammarFile)
grammarJson="${grammarJson#"${grammarJson%%[![:space:]]*}"}" # Trim start
grammarJson="${grammarJson%"${grammarJson##*[![:space:]]}"}" # Trim end

echo "export const convoLangGrammar=$grammarJson;" > "$extGrammarFile"
echo "Created $extGrammarFile"