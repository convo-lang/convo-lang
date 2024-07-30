import type { ExecutorOptions } from '@nx/js/src/utils/schema';
import { BuildOptions } from 'esbuild';

export interface EsbuildTarget
{
    srcDir:string;
    outDir:string;
    outputIndexAsIndex?:boolean;
    recursive?:boolean;
    filterReg?:string;
    filterRegFlags?:string;
    options:BuildOptions;
}

export interface LibBuilderExecutorSchema extends ExecutorOptions {

    noSideEffects?:boolean;
    passthrough?:boolean;
    approximatelyDeps?:string|null;
    compatibleDeps?:string|null;
    moreThanEqDeps?:boolean;


    commonJsTsConfig?:string;

    disableEsm?:boolean;
    esmDir?:string;
    esmTsConfig?:string;


    autoCreateEsmConfig?:boolean;
    esmModuleType?:string;

    esbuildTargets?:EsbuildTarget[];
}
