#!/usr/bin/env node

const fs=require('fs');
const path=require('path');
const childProcess=require('child_process');

function isMusl()
{
    if(process.platform!=='linux'){
        return false;
    }

    try{
        if(process.report && typeof process.report.getReport==='function'){
            const report=process.report.getReport();
            const header=report.header || {};
            const sharedObjects=report.sharedObjects || [];

            if(header.glibcVersionRuntime){
                return false;
            }

            if(sharedObjects.some(item=>item.includes('libc.musl') || item.includes('ld-musl'))){
                return true;
            }
        }
    }catch{
        // ignore
    }

    try{
        const result=childProcess.spawnSync('ldd',['--version'],{encoding:'utf8'});
        const output=`${result.stdout || ''}${result.stderr || ''}`.toLowerCase();

        if(output.includes('musl')){
            return true;
        }

        if(output.includes('glibc') || output.includes('gnu libc')){
            return false;
        }
    }catch{
        // ignore
    }

    return fs.existsSync('/lib/ld-musl-x86_64.so.1') ||
        fs.existsSync('/lib/ld-musl-aarch64.so.1') ||
        fs.existsSync('/usr/lib/ld-musl-x86_64.so.1') ||
        fs.existsSync('/usr/lib/ld-musl-aarch64.so.1');
}

function getTargetPackageName()
{
    const osNames={
        linux:'linux',
        darwin:'darwin',
        win32:'windows',
    };
    const archNames={
        x64:'x64',
        arm64:'arm64',
    };

    const osName=osNames[process.platform];
    const archName=archNames[process.arch];

    if(!osName || !archName){
        throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`);
    }

    const libcSuffix=process.platform==='linux' && isMusl()?'-musl':'';

    return `@convo-lang/cli-${osName}-${archName}${libcSuffix}`;
}

function getBinaryPath(packageName)
{
    const packageJsonPath=require.resolve(`${packageName}/package.json`);
    const packageDir=path.dirname(packageJsonPath);
    const binaryName=process.platform==='win32'?'convo.exe':'convo';

    return path.join(packageDir,'bin',binaryName);
}

function main()
{
    let packageName;
    let binaryPath;

    try{
        packageName=getTargetPackageName();
        binaryPath=getBinaryPath(packageName);
    }catch(error){
        console.error(`Unable to find a compatible Convo-Lang CLI binary for ${process.platform}-${process.arch}.`);
        console.error('Make sure optional dependencies were installed for @convo-lang/cli.');
        console.error(error.message);
        process.exit(1);
    }

    const child=childProcess.spawn(binaryPath,process.argv.slice(2),{stdio:'inherit'});

    child.on('error',error=>{
        console.error(`Failed to start Convo-Lang CLI from ${packageName}.`);
        console.error(error.message);
        process.exit(1);
    });

    for(const signal of ['SIGINT','SIGTERM','SIGHUP']){
        process.on(signal,()=>{
            if(!child.killed){
                child.kill(signal);
            }
        });
    }

    child.on('exit',(code,signal)=>{
        if(signal){
            process.kill(process.pid,signal);
            return;
        }

        process.exit(code===null?1:code);
    });
}

main();
