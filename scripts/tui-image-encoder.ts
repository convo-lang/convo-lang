#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import sharp from 'sharp';

interface Args
{
    in?:string;
    stdin?:boolean;
    out?:string;
    raw?:boolean;
    alpha?:boolean;
    width?:number;
    help?:boolean;
    export?:string;
}

const header=Buffer.from([0x43, 0x6f, 0x6e, 0x76]);
const headerSize=32;
const rgbBytesPerPixel=3;
const rgbaBytesPerPixel=4;

function printUsage()
{
    console.error([
        'Usage: tui-image-encoder --in <path> [--width <pixels>] [--out <path>] [--raw] [--alpha]',
        '       tui-image-encoder --stdin [--width <pixels>] [--out <path>] [--raw] [--alpha]',
        '',
        'Arguments:',
        '  --in <path>               Path to an image file',
        '  --stdin                   Read image data from stdin',
        '  --out <path>              File to write to. If omitted, writes to stdout',
        '  --raw                     Write raw Convo image bytes instead of base64 text',
        '  --alpha                   Include an alpha channel in the output image',
        '  --width <pixels>          Resize image to the given width while preserving aspect ratio',
        '  --export <export name>    Outputs the image as an exported variable with the given name',
    ].join('\n'));
}

function parsePositiveInteger(value:string|undefined, name:string):number
{
    if(!value){
        throw new Error(`Missing value for ${name}`);
    }

    const parsed=Number(value);
    if(!Number.isInteger(parsed) || parsed<1){
        throw new Error(`${name} must be an integer greater than or equal to 1`);
    }

    return parsed;
}

function parseArgs(argv:string[]):Args
{
    const args:Args={};

    for(let i=0;i<argv.length;i++){
        const arg=argv[i]!;

        if(arg==='--stdin'){
            args.stdin=true;
        }else if(arg==='--raw'){
            args.raw=true;
        }else if(arg==='--alpha'){
            args.alpha=true;
        }else if(arg==='--help' || arg==='-h'){
            args.help=true;
        }else if(arg==='--in'){
            args.in=argv[++i];
        }else if(arg.startsWith('--in=')){
            args.in=arg.slice('--in='.length);
        }else if(arg==='--out'){
            args.out=argv[++i];
        }else if(arg.startsWith('--out=')){
            args.out=arg.slice('--out='.length);
        }else if(arg==='--export'){
            args.export=argv[++i];
        }else if(arg.startsWith('--export=')){
            args.export=arg.slice('--export='.length);
        }else if(arg==='--width'){
            args.width=parsePositiveInteger(argv[++i], '--width');
        }else if(arg.startsWith('--width=')){
            args.width=parsePositiveInteger(arg.slice('--width='.length), '--width');
        }else{
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

async function readStdin():Promise<Buffer>
{
    const chunks:Buffer[]=[];

    for await(const chunk of process.stdin){
        chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
}

async function readInput(args:Args):Promise<Buffer>
{
    if(args.stdin && args.in){
        throw new Error('Use either --in or --stdin, not both');
    }

    if(args.stdin){
        return await readStdin();
    }

    if(args.in){
        return await readFile(args.in);
    }

    throw new Error('Missing input. Use --in <path> or --stdin');
}

async function encodeImage(input:Buffer, args:Args):Promise<Buffer>
{
    const bytesPerPixel=args.alpha?rgbaBytesPerPixel:rgbBytesPerPixel;
    const image=sharp(input)
        .rotate()
        .toColourspace('srgb');

    if(args.alpha){
        image.ensureAlpha();
    }else{
        image.removeAlpha();
    }

    if(args.width!==undefined){
        image.resize({width:args.width});
    }

    const {data, info}=await image
        .raw()
        .toBuffer({resolveWithObject:true});

    if(info.channels!==bytesPerPixel){
        throw new Error(`Expected ${bytesPerPixel} channels but received ${info.channels}`);
    }

    const meta=Buffer.alloc(headerSize);
    header.copy(meta, 0);
    meta.writeUInt32LE(info.width, 4);
    meta.writeUInt32LE(bytesPerPixel, 8);
    meta.writeUInt32LE(info.height, 12);

    return Buffer.concat([meta, data]);
}

async function writeOutput(data:Buffer, args:Args)
{
    if(args.raw){
        if(args.out){
            await writeFile(args.out, data);
        }else{
            process.stdout.write(data);
        }
        return;
    }

    let text=data.toString('base64');

    if(args.export){
        text=`export const ${args.export}=\`${text}\`;`
    }

    if(args.out){
        await writeFile(args.out, text, 'utf8');
    }else{
        process.stdout.write(`${text}\n`);
    }
}

async function main()
{
    const args=parseArgs(process.argv.slice(2));

    if(args.help){
        printUsage();
        return;
    }

    const input=await readInput(args);
    const output=await encodeImage(input, args);
    await writeOutput(output, args);
}

main().catch(error=>{
    console.error(error instanceof Error?error.message:error);
    process.exitCode=1;
});
