import { ConvoCodeBlock, ConvoFileOpType } from '@convo-lang/convo-lang';
import { getErrorMessage } from '@iyio/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtensionContext, RelativePattern, Uri, WorkspaceEdit, commands, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { markCodeBlocksApplied } from './code-block-applied.js';
import { HasArgs, OutputTagBase, OutputTagCodeLensArgs, getFileBlockArgs, getOutputTagFromArgsAsync } from './code-block-lib.js';

const globReg=/[*?{}[\]]/;
const maxDetailFiles=50;

/**
 * A file operation resolved against the file system
 */
export interface FileOpPlan
{
    op?:ConvoFileOpType;
    /**
     * Short description of the op as written in the block
     */
    label:string;
    /**
     * Files the op applies to. For rename this is the source file.
     */
    files:Uri[];
    from?:Uri;
    to?:Uri;
    mode?:string;
    error?:string;
}

export interface ApplyFileOpOptions
{
    /**
     * If true the op is applied without a confirmation prompt
     */
    autoConfirm?:boolean;
}

/**
 * Registers the `convo.file-op-apply` and `convo.file-op-preview` commands used by code lenses
 * and the Code Blocks view to apply and preview `FILE_OP` blocks.
 */
export const registerFileOpCommands=(context:ExtensionContext,ext:ConvoExt)=>{
    context.subscriptions.push(
        commands.registerCommand('convo.file-op-apply',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
            const tag=await getTagAsync(args);
            if(tag){
                await applyFileOpAsync(tag,{autoConfirm:tag.autoConfirm});
            }
        }),
        commands.registerCommand('convo.file-op-preview',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
            const tag=await getTagAsync(args);
            if(tag){
                await previewFileOpAsync(tag);
            }
        }),
    );
}

/**
 * Returns the most up to date version of the tag for the given args
 */
const getTagAsync=async (args?:OutputTagCodeLensArgs|HasArgs):Promise<OutputTagBase|undefined>=>{
    if(!args){
        return undefined;
    }
    const a=getFileBlockArgs(args);
    const tag=await getOutputTagFromArgsAsync(a);
    if(!tag){
        void window.showErrorMessage('Unable to find the file operation for the selected target.');
        return undefined;
    }
    return {...tag,autoConfirm:a.autoConfirm};
}

/**
 * Returns a short description of a FILE_OP block
 */
export const getFileOpLabel=(block:ConvoCodeBlock):string=>{
    const a=block.attributes;
    switch(block.fileOp){
        case 'rename':
            return `rename ${a['from']??''} → ${a['to']??''}`;
        case 'setMode':
            return `setMode ${a['mode']??''} ${a['path']??''}`;
        case 'delete':
            return `delete ${a['path']??''}`;
        default:
            return `${a['op']??'unknown'} file op`;
    }
}

/**
 * Resolves the paths of a FILE_OP block relative to the convo file it is defined in. Paths outside
 * of the workspace folder of the convo file are rejected.
 */
export const resolveFileOpAsync=async (tag:OutputTagBase):Promise<FileOpPlan>=>{
    const block=tag.codeBlock;
    const atts=block.attributes;
    const op=block.fileOp;
    const plan:FileOpPlan={op,label:getFileOpLabel(block),files:[]};
    const fail=(error:string):FileOpPlan=>({...plan,error});

    if(!op){
        return fail(`Unknown file operation - ${atts['op']??''}`);
    }

    const root=workspace.getWorkspaceFolder(tag.documentUri)?.uri.fsPath;
    if(!root || tag.documentUri.scheme!=='file'){
        return fail('File operations require a saved convo file inside of a workspace folder');
    }
    const dir=path.dirname(tag.documentUri.fsPath);

    if(op==='rename'){
        const from=atts['from'];
        const to=atts['to'];
        if(!from || !to){
            return fail('rename requires the from and to attributes');
        }
        if(globReg.test(from) || globReg.test(to)){
            return fail('rename does not support globs');
        }
        const fromPath=path.resolve(dir,from);
        const toPath=path.resolve(dir,to);
        if(!isInside(root,fromPath) || !isInside(root,toPath)){
            return fail('Paths must be inside of the workspace folder');
        }
        if(!await existsAsync(fromPath)){
            return fail(`File not found - ${from}`);
        }
        if(await existsAsync(toPath)){
            return fail(`Target already exists - ${to}`);
        }
        return {...plan,from:Uri.file(fromPath),to:Uri.file(toPath),files:[Uri.file(fromPath)]};
    }

    const target=atts['path'];
    if(!target){
        return fail(`${op} requires the path attribute`);
    }

    if(op==='setMode'){
        const mode=atts['mode'];
        if(!mode || !parseFileMode(mode)){
            return fail(`Invalid mode - ${mode??''}`);
        }
        plan.mode=mode;
    }

    const files=await matchFilesAsync(root,dir,target);
    if(typeof files === 'string'){
        return fail(files);
    }
    if(!files.length){
        return fail(`No files matched - ${target}`);
    }
    return {...plan,files};
}

/**
 * Applies a FILE_OP block. Returns true if the op was applied or skipped. Deleted files are moved
 * to the trash.
 */
export const applyFileOpAsync=async (tag:OutputTagBase,{autoConfirm}:ApplyFileOpOptions={}):Promise<boolean>=>{
    const plan=await resolveFileOpAsync(tag);
    if(plan.error){
        void window.showErrorMessage(`${plan.label}: ${plan.error}`);
        return false;
    }

    if(plan.op==='setMode' && process.platform==='win32'){
        void window.showWarningMessage(`${plan.label}: setMode is not supported on Windows and was skipped`);
        return true;
    }

    if(!autoConfirm && !await confirmFileOpAsync(plan)){
        return false;
    }

    try{
        switch(plan.op){

            case 'rename':{
                if(!plan.from || !plan.to){
                    return false;
                }
                await fs.mkdir(path.dirname(plan.to.fsPath),{recursive:true});
                const edit=new WorkspaceEdit();
                edit.renameFile(plan.from,plan.to,{overwrite:false});
                if(!await workspace.applyEdit(edit)){
                    void window.showErrorMessage(`${plan.label}: rename failed`);
                    return false;
                }
                break;
            }

            case 'delete':
                for(const f of plan.files){
                    await workspace.fs.delete(f,{recursive:true,useTrash:true});
                }
                break;

            case 'setMode':{
                const apply=parseFileMode(plan.mode??'');
                if(!apply){
                    return false;
                }
                for(const f of plan.files){
                    const stat=await fs.stat(f.fsPath);
                    await fs.chmod(f.fsPath,apply(stat.mode&0o7777));
                }
                break;
            }

            default:
                return false;
        }
    }catch(ex){
        void window.showErrorMessage(`${plan.label}: ${getErrorMessage(ex)}`);
        return false;
    }

    markCodeBlocksApplied([tag]);

    if(!autoConfirm){
        void window.showInformationMessage(`Applied ${plan.label}`);
    }
    return true;
}

/**
 * Displays the files matched by a FILE_OP block in a quick pick. Selecting a file opens it.
 */
export const previewFileOpAsync=async (tag:OutputTagBase):Promise<void>=>{
    const plan=await resolveFileOpAsync(tag);
    if(plan.error){
        void window.showErrorMessage(`${plan.label}: ${plan.error}`);
        return;
    }
    const count=plan.files.length;
    const items=getFileOpLines(plan).map((label,i)=>({label,uri:plan.files[i]}));
    const picked=await window.showQuickPick(items,{
        placeHolder:`${plan.label} · ${count} item${count===1?'':'s'}`,
    });
    if(!picked?.uri){
        return;
    }
    try{
        await window.showTextDocument(await workspace.openTextDocument(picked.uri),{preview:true});
    }catch{
        void window.showInformationMessage(`Unable to open ${picked.label}`);
    }
}

/**
 * Returns a line for each file of the plan relative to the workspace
 */
export const getFileOpLines=(plan:FileOpPlan,max=Number.MAX_SAFE_INTEGER):string[]=>{
    if(plan.error){
        return [`✗ ${plan.error}`];
    }
    if(plan.from && plan.to){
        return [`${toRel(plan.from)} → ${toRel(plan.to)}`];
    }
    const lines=plan.files.slice(0,max).map(toRel);
    if(plan.files.length>max){
        lines.push(`... and ${plan.files.length-max} more`);
    }
    return lines;
}

/**
 * Returns the label of the plan followed by an indented line for each file
 */
export const getFileOpPreviewText=(plan:FileOpPlan):string=>{
    return [plan.label,...getFileOpLines(plan).map(l=>`    ${l}`)].join('\n');
}

const confirmFileOpAsync=async (plan:FileOpPlan):Promise<boolean>=>{
    const count=plan.files.length;
    const lines=getFileOpLines(plan,maxDetailFiles);
    if(plan.op==='delete'){
        lines.push('',`${count} item${count===1?'':'s'} will be moved to the trash`);
    }
    const action=await window.showWarningMessage(
        `Apply ${plan.label}?`,
        {modal:true,detail:lines.join('\n')},
        'Apply',
    );
    return action==='Apply';
}

/**
 * Parses an octal mode or a simple symbolic mode such as `+x` or `-w`. Symbolic modes apply to
 * all users. Returns a function that converts the current mode into the new mode.
 */
const parseFileMode=(mode:string):((current:number)=>number)|undefined=>{
    if(/^[0-7]{3,4}$/.test(mode)){
        const value=parseInt(mode,8);
        return ()=>value;
    }
    const match=/^([+-])([rwx]+)$/.exec(mode);
    if(!match){
        return undefined;
    }
    let bits=0;
    for(const c of match[2]??''){
        bits|=c==='r'?0o444:c==='w'?0o222:0o111;
    }
    return match[1]==='+'?current=>current|bits:current=>current&~bits;
}

/**
 * Returns the files matching the target path. Globs are matched using `workspace.findFiles` with a
 * base directory of the static part of the path. `**.ts` is treated as `**\/*.ts`. Returns an
 * error message if the path is outside of the workspace.
 */
const matchFilesAsync=async (root:string,dir:string,target:string):Promise<Uri[]|string>=>{
    const full=path.resolve(dir,target);
    if(!globReg.test(target)){
        if(!isInside(root,full)){
            return 'Path must be inside of the workspace folder';
        }
        return await existsAsync(full)?[Uri.file(full)]:[];
    }

    const parts=full.split(path.sep).join('/').replace(/\*\*(?=[^/])/g,'**/*').split('/');
    const globStart=parts.findIndex(p=>globReg.test(p));
    const base=parts.slice(0,globStart).join('/')||'/';
    if(!isInside(root,base,true)){
        return 'Path must be inside of the workspace folder';
    }

    const files=await workspace.findFiles(new RelativePattern(Uri.file(base),parts.slice(globStart).join('/')));
    return files.filter(f=>isInside(root,f.fsPath)).sort((a,b)=>a.fsPath.localeCompare(b.fsPath));
}

const isInside=(root:string,p:string,allowRoot=false):boolean=>{
    const rel=path.relative(root,p);
    if(!rel){
        return allowRoot;
    }
    return rel.split(/[\\/]/)[0]!=='..' && !path.isAbsolute(rel);
}

const existsAsync=async (p:string):Promise<boolean>=>{
    try{
        await fs.stat(p);
        return true;
    }catch{
        return false;
    }
}

const toRel=(uri:Uri):string=>workspace.asRelativePath(uri,false);
