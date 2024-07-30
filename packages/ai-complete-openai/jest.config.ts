/* eslint-disable */
export default {
    displayName: 'ai-complete-openai',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\.[tj]s$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.spec.json' },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/packages/ai-complete-openai',
};
