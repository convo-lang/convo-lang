export const convoGrammarInjections={
    "fileTypes": [
        "js",
        "jsx",
        "ts",
        "tsx"
    ],
    embeddedLangs: ['typescript', 'javascript'],
    name: 'convo-js-injection',
    "injectionSelector": "L:source -comment -string",
    "injectTo": [
                    'javascript',
                    'typescript',
                    'tsx',
                    'jsx',
                    "source.js",
                    "source.ts",
                    "source.jsx",
                    "source.js.jsx",
                    "source.tsx"
                ],
    "scopeName": "convo-js",
    "patterns": [
        {
            "begin": "/\\*convo\\*/\\s*`",
            "beginCaptures": {
                "0":{
                    "name": "support.type"
                }
            },
            "end": "`",
            "endCaptures":{
                "0":{
                    "name": "support.type"
                }
            },
            "patterns": [
                {
                    "include": "source.ts#template-substitution-element"
                },
                {
                    "include": "source.convo"
                }
            ]
        },
        {
            "begin": "([cC]onvo\\w*)\\s*(/\\*.*\\*/\\s*)?(`)",
            "beginCaptures": {
                "1":{
                    "name": "support.type"
                },
                "2":{
                    "name":"comment"
                }
            },
            "end": "`",
            "endCaptures":{
                "0":{
                    "name": "support.type"
                }
            },
            "patterns": [
                {
                    "include": "source.ts#template-substitution-element"
                },
                {
                    "include": "source.convo"
                }
            ]
        },
        {
            "include": "source.ts#template-substitution-element"
        }
    ]

} as any