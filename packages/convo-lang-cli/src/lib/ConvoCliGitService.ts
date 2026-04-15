import { ConvoGitFileStatus, ConvoGitService, GitStatusRequest, GitStatusSingleRequest, PromiseResultType } from "@convo-lang/convo-lang";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync=promisify(execFile);

/**
 * Options used to configure the git service.
 */
export interface ConvoCliGitServiceOptions
{
    /**
     * Root path used as the git working directory.
     * If not provided the service will search upward for the nearest `.git` folder.
     */
    rootPath?:string;
}

/**
 * Node CLI implementation of the git service using child processes.
 */
export class ConvoCliGitService implements ConvoGitService
{

    /**
     * Root path used for all git commands.
     */
    private readonly rootPath?:string;

    /**
     * Creates a new git service instance.
     */
    public constructor({
        rootPath
    }:ConvoCliGitServiceOptions={})
    {
        this.rootPath=rootPath;
    }

    /**
     * Returns the git status for a single file.
     */
    public async gitStatusSingleAsync(request:GitStatusSingleRequest):PromiseResultType<ConvoGitFileStatus>
    {
        const process=globalThis.process;
        if(!process){
            return {
                success:false,
                error:'globalThis.process not defined by runtime',
                statusCode:500,
            };
        }

        const rootPathResult=await this.resolveRootPathAsync(request.path);
        if(!rootPathResult.success){
            return rootPathResult;
        }

        const rootPath=rootPathResult.result;
        const normalizedPath=this.normalizePathForGit(rootPath,request.path);
        const filePath=isAbsolute(request.path)?request.path:resolve(rootPath,request.path);
        const existsOnDisk=await this.pathExistsAsync(filePath);

        if(!existsOnDisk){
            return {
                success:false,
                error:`File not found - ${request.path}`,
                statusCode:404,
            };
        }

        if(!normalizedPath){
            return {
                success:true,
                result:await this.createSingleFallbackStatusAsync(rootPath,request.path,request.includeFileHash,request.revision),
            };
        }

        return await this.getSingleStatusAsync(rootPath,normalizedPath,request.includeFileHash,request.revision);
    }

    /**
     * Returns the git status for one or more files or pathspecs.
     */
    public async gitStatusAsync(request:GitStatusRequest):PromiseResultType<ConvoGitFileStatus[]>
    {
        const process=globalThis.process;
        if(!process){
            return {
                success:false,
                error:'globalThis.process not defined by runtime',
                statusCode:500,
            };
        }

        const inputPaths=Array.isArray(request.paths)?request.paths:[request.paths];
        const rootPathResult=await this.resolveRootPathAsync(inputPaths[0]);
        if(!rootPathResult.success){
            return rootPathResult;
        }

        const rootPath=rootPathResult.result;
        const gitPaths:string[]=[];
        const outsideStatuses:ConvoGitFileStatus[]=[];

        for(const inputPath of inputPaths){
            const normalizedPath=this.normalizePathForGit(rootPath,inputPath);
            if(normalizedPath){
                gitPaths.push(normalizedPath);
            }else{
                outsideStatuses.push(await this.createSingleFallbackStatusAsync(rootPath,inputPath,request.includeFileHash,request.revision));
            }
        }

        if(!gitPaths.length){
            return {
                success:true,
                result:outsideStatuses,
            };
        }

        const result=await this.getMultiStatusAsync(rootPath,gitPaths,request.includeFileHash,request.revision);
        if(!result.success){
            return result;
        }

        return {
            success:true,
            result:[
                ...result.result,
                ...outsideStatuses,
            ],
        };
    }

    /**
     * Returns the git status for a single path by delegating to the multi-path implementation.
     */
    private async getSingleStatusAsync(
        rootPath:string,
        path:string,
        includeFileHash:boolean|'if-dirty'|undefined,
        revision:GitStatusSingleRequest['revision']
    ):PromiseResultType<ConvoGitFileStatus>
    {
        const multiResult=await this.getMultiStatusAsync(rootPath,[path],includeFileHash,revision);
        if(!multiResult.success){
            return multiResult;
        }

        const status=multiResult.result.find(s=>s.path===path)??await this.createSingleFallbackStatusAsync(rootPath,path,includeFileHash,revision);
        return {
            success:true,
            result:status,
        };
    }

    /**
     * Returns the git status for one or more paths.
     */
    private async getMultiStatusAsync(
        rootPath:string,
        paths:string|string[],
        includeFileHash:boolean|'if-dirty'|undefined,
        revision:GitStatusSingleRequest['revision']
    ):PromiseResultType<ConvoGitFileStatus[]>
    {
        const pathList=Array.isArray(paths)?paths:[paths];
        const revisionInfo=await this.resolveRevisionAsync(rootPath,revision);
        if(!revisionInfo.success){
            return revisionInfo;
        }

        const trackedPathsResult=await this.getTrackedPathsAsync(rootPath,pathList,revisionInfo.result.revisionSpec);
        if(!trackedPathsResult.success){
            return trackedPathsResult;
        }

        const trackedPathSet=new Set(trackedPathsResult.result);

        const statusMap=new Map<string,ConvoGitFileStatus>();
        for(const path of trackedPathSet){
            statusMap.set(path,{
                path,
                isTracked:true,
                existsInRevision:false,
                revisionHash:revisionInfo.result.revisionHash,
            });
        }

        if(!revision || revision.type==='working'){
            const untrackedResult=await this.getUntrackedPathsAsync(rootPath,pathList);
            if(!untrackedResult.success){
                return untrackedResult;
            }

            for(const path of untrackedResult.result){
                if(!statusMap.has(path)){
                    statusMap.set(path,{
                        path,
                        isTracked:false,
                        isIgnored:false,
                        isDirty:true,
                        isModifiedInWorkingTree:true,
                        isModifiedInIndex:false,
                        existsInRevision:false,
                        revisionHash:revisionInfo.result.revisionHash,
                    });
                }
            }

            const ignoredResult=await this.getIgnoredPathsAsync(rootPath,pathList);
            if(!ignoredResult.success){
                return ignoredResult;
            }

            for(const path of ignoredResult.result){
                const current=statusMap.get(path);
                if(current){
                    current.isIgnored=true;
                    current.isTracked=current.isTracked??false;
                }else{
                    statusMap.set(path,{
                        path,
                        isTracked:false,
                        isIgnored:true,
                        isDirty:false,
                        isModifiedInWorkingTree:false,
                        isModifiedInIndex:false,
                        existsInRevision:false,
                        revisionHash:revisionInfo.result.revisionHash,
                    });
                }
            }

            const trackedArray=[...trackedPathSet];
            if(trackedArray.length){
                const workingChangedResult=await this.getDiffNameOnlyAsync(rootPath,['diff','--name-only','--',...trackedArray]);
                if(!workingChangedResult.success){
                    return workingChangedResult;
                }
                const workingChangedSet=new Set(workingChangedResult.result);

                const indexChangedResult=await this.getDiffNameOnlyAsync(rootPath,['diff','--cached','--name-only','--',...trackedArray]);
                if(!indexChangedResult.success){
                    return indexChangedResult;
                }
                const indexChangedSet=new Set(indexChangedResult.result);

                for(const path of trackedArray){
                    const item=statusMap.get(path);
                    if(!item){
                        continue;
                    }

                    item.existsInRevision=true;
                    item.isModifiedInWorkingTree=workingChangedSet.has(path);
                    item.isModifiedInIndex=indexChangedSet.has(path);
                    item.isDirty=!!item.isModifiedInWorkingTree || !!item.isModifiedInIndex;
                }
            }
        }else{
            const trackedArray=[...trackedPathSet];
            if(trackedArray.length){
                const revisionChangedResult=await this.getDiffNameOnlyAsync(rootPath,['diff','--name-only',revisionInfo.result.revisionSpec??'','--',...trackedArray]);
                if(!revisionChangedResult.success){
                    return revisionChangedResult;
                }
                const revisionChangedSet=new Set(revisionChangedResult.result);

                for(const path of trackedArray){
                    const item=statusMap.get(path);
                    if(!item){
                        continue;
                    }

                    item.existsInRevision=true;
                    item.isModifiedInWorkingTree=revisionChangedSet.has(path);
                    item.isModifiedInIndex=false;
                    item.isDirty=!!item.isModifiedInWorkingTree;
                }
            }
        }

        await this.populateLastCommitAsync(rootPath,[...statusMap.values()],revisionInfo.result.revisionSpec);

        if(includeFileHash){
            for(const item of statusMap.values()){
                if(includeFileHash==='if-dirty' && !item.isDirty){
                    continue;
                }
                const absPath=resolve(rootPath,item.path);
                item.fileHash=await this.getDiskFileHashOrUndefinedAsync(absPath);
            }
        }

        return {
            success:true,
            result:[...statusMap.values()],
        };
    }

    /**
     * Creates a fallback status for a single existing file when git does not report it.
     */
    private async createSingleFallbackStatusAsync(
        rootPath:string,
        path:string,
        includeFileHash:boolean|'if-dirty'|undefined,
        revision:GitStatusSingleRequest['revision']
    ):Promise<ConvoGitFileStatus>
    {
        const isDirty=revision?.type==='working'?true:false;
        const revisionInfo=await this.resolveRevisionAsync(rootPath,revision);
        const filePath=isAbsolute(path)?path:resolve(rootPath,path);
        const fileHash=(includeFileHash===true || (includeFileHash==='if-dirty' && isDirty))?await this.getDiskFileHashOrUndefinedAsync(filePath):undefined;
        return {
            path,
            isTracked:false,
            isIgnored:false,
            isDirty,
            isModifiedInWorkingTree:revision?.type==='working'?true:false,
            isModifiedInIndex:false,
            existsInRevision:false,
            revisionHash:revisionInfo.success?revisionInfo.result.revisionHash:undefined,
            fileHash,
        };
    }

    /**
     * Resolves the root path to use for git commands.
     */
    private async resolveRootPathAsync(pathHint?:string):PromiseResultType<string>
    {
        if(this.rootPath){
            return {
                success:true,
                result:resolve(this.rootPath),
            };
        }

        const process=globalThis.process;
        if(!process){
            return {
                success:false,
                error:'globalThis.process not defined by runtime',
                statusCode:500,
            };
        }

        const startPath=pathHint?
            (
                isAbsolute(pathHint)?
                    pathHint
                :
                    resolve(process.cwd(),pathHint)
            )
        :
            process.cwd();

        const startDir=await this.getSearchStartDirectoryAsync(startPath);
        const rootPath=await this.findGitRootAsync(startDir);
        if(!rootPath){
            return {
                success:false,
                error:`Unable to find .git folder from ${startDir}`,
                statusCode:404,
            };
        }

        return {
            success:true,
            result:rootPath,
        };
    }

    /**
     * Resolves the directory to start searching from.
     */
    private async getSearchStartDirectoryAsync(path:string):Promise<string>
    {
        try{
            const stat=await fs.stat(path);
            return stat.isDirectory()?path:dirname(path);
        }catch{
            return dirname(path);
        }
    }

    /**
     * Searches upward for the first directory containing a `.git` entry.
     */
    private async findGitRootAsync(startDir:string):Promise<string|undefined>
    {
        let current=resolve(startDir);
        while(true){
            const gitPath=resolve(current,'.git');
            if(await this.pathExistsAsync(gitPath)){
                return current;
            }

            const parent=dirname(current);
            if(parent===current){
                return undefined;
            }

            current=parent;
        }
    }

    /**
     * Normalizes an input path to a git-relative path when possible.
     */
    private normalizePathForGit(rootPath:string,path:string):string|undefined
    {
        if(!isAbsolute(path)){
            return path;
        }

        const relativePath=relative(rootPath,path);
        if(relativePath.startsWith('..') || relativePath===''){
            return undefined;
        }

        return relativePath.replace(/\\/g,'/');
    }

    /**
     * Resolves the requested revision into a git revision spec and hash.
     */
    private async resolveRevisionAsync(
        rootPath:string,
        revision:GitStatusSingleRequest['revision']
    ):PromiseResultType<{revisionSpec?:string;revisionHash?:string}>
    {
        if(!revision){
            return {
                success:true,
                result:{},
            };
        }

        if(revision.type==='working'){
            try{
                const { stdout }=await execFileAsync('git',['rev-parse','HEAD'],{
                    cwd:rootPath,
                });
                return {
                    success:true,
                    result:{
                        revisionHash:stdout.trim()||undefined,
                    },
                };
            }catch(err){
                return {
                    success:false,
                    error:`Unable to resolve revision - HEAD${this.getExecErrorMessage(err)}`,
                    statusCode:404,
                };
            }
        }

        if(!revision.value){
            return {
                success:false,
                error:'revision.value is required when revision.type is not working',
                statusCode:400,
            };
        }

        const revisionSpec=revision.value;
        try{
            const { stdout }=await execFileAsync('git',['rev-parse',revisionSpec],{
                cwd:rootPath,
            });
            return {
                success:true,
                result:{
                    revisionSpec,
                    revisionHash:stdout.trim()||undefined,
                },
            };
        }catch(err){
            return {
                success:false,
                error:`Unable to resolve revision - ${revisionSpec}${this.getExecErrorMessage(err)}`,
                statusCode:404,
            };
        }
    }

    /**
     * Returns tracked paths for the current working tree or a specific revision.
     */
    private async getTrackedPathsAsync(
        rootPath:string,
        paths:string[],
        revisionSpec?:string
    ):PromiseResultType<string[]>
    {
        if(!paths.length){
            return {
                success:true,
                result:[],
            };
        }

        const args=revisionSpec?
            ['ls-tree','-r','--name-only',revisionSpec,'--',...paths]
        :
            ['ls-files','--',...paths];

        try{
            const { stdout }=await execFileAsync('git',args,{
                cwd:rootPath,
            });
            return {
                success:true,
                result:this.parseLines(stdout),
            };
        }catch(err){
            return {
                success:false,
                error:`Unable to get tracked paths${this.getExecErrorMessage(err)}`,
                statusCode:500,
            };
        }
    }

    /**
     * Returns untracked paths that match the provided pathspecs.
     */
    private async getUntrackedPathsAsync(
        rootPath:string,
        paths:string[]
    ):PromiseResultType<string[]>
    {
        if(!paths.length){
            return {
                success:true,
                result:[],
            };
        }

        try{
            const { stdout }=await execFileAsync('git',['ls-files','--others','--exclude-standard','--',...paths],{
                cwd:rootPath,
            });
            return {
                success:true,
                result:this.parseLines(stdout),
            };
        }catch(err){
            return {
                success:false,
                error:`Unable to get untracked paths${this.getExecErrorMessage(err)}`,
                statusCode:500,
            };
        }
    }

    /**
     * Returns ignored paths that match the provided pathspecs.
     */
    private async getIgnoredPathsAsync(
        rootPath:string,
        paths:string[]
    ):PromiseResultType<string[]>
    {
        if(!paths.length){
            return {
                success:true,
                result:[],
            };
        }

        try{
            const { stdout }=await execFileAsync('git',['ls-files','--others','--ignored','--exclude-standard','--',...paths],{
                cwd:rootPath,
            });
            return {
                success:true,
                result:this.parseLines(stdout),
            };
        }catch(err){
            return {
                success:false,
                error:`Unable to get ignored paths${this.getExecErrorMessage(err)}`,
                statusCode:500,
            };
        }
    }

    /**
     * Executes a git diff-style command and returns the changed paths.
     */
    private async getDiffNameOnlyAsync(
        rootPath:string,
        args:string[]
    ):PromiseResultType<string[]>
    {
        try{
            const { stdout }=await execFileAsync('git',args,{
                cwd:rootPath,
            });
            return {
                success:true,
                result:this.parseLines(stdout),
            };
        }catch(err){
            return {
                success:false,
                error:`Unable to get diff status${this.getExecErrorMessage(err)}`,
                statusCode:500,
            };
        }
    }

    /**
     * Populates the last commit that changed each tracked file relative to the selected revision.
     */
    private async populateLastCommitAsync(
        rootPath:string,
        items:ConvoGitFileStatus[],
        revisionSpec?:string
    ):Promise<void>
    {
        for(const item of items){
            if(!item.isTracked){
                continue;
            }
            item.lastCommit=await this.getLastCommitAsync(rootPath,item.path,revisionSpec);
        }
    }

    /**
     * Returns the last commit that changed the file at the selected revision.
     */
    private async getLastCommitAsync(
        rootPath:string,
        path:string,
        revisionSpec?:string
    ):Promise<string|undefined>
    {
        const args=revisionSpec?
            ['log','-n','1','--format=%H',revisionSpec,'--',path]
        :
            ['log','-n','1','--format=%H','HEAD','--',path];

        try{
            const { stdout }=await execFileAsync('git',args,{
                cwd:rootPath,
            });
            const value=stdout.trim();
            return value||undefined;
        }catch{
            return undefined;
        }
    }

    /**
     * Parses newline-delimited command output into a list of non-empty paths.
     */
    private parseLines(value:string):string[]
    {
        return value
            .split('\n')
            .map(v=>v.trim())
            .filter(v=>!!v);
    }

    /**
     * Returns true if the given path exists on disk.
     */
    private async pathExistsAsync(path:string):Promise<boolean>
    {
        try{
            await fs.access(path);
            return true;
        }catch{
            return false;
        }
    }

    /**
     * Returns the SHA-1 hash of the current file contents on disk.
     */
    private async getDiskFileHashOrUndefinedAsync(path:string):Promise<string|undefined>
    {
        try{
            const stat=await fs.stat(path);
            if(!stat.isFile()){
                return undefined;
            }
            const buffer=await fs.readFile(path);
            return createHash('sha1').update(buffer).digest('hex');
        }catch{
            return undefined;
        }
    }

    /**
     * Extracts a readable message from a child process execution error.
     */
    private getExecErrorMessage(err:unknown):string
    {
        const e=err as { stderr?:string; message?:string }|undefined;
        const message=e?.stderr?.trim()||e?.message?.trim();
        return message?` - ${message}`:'';
    }
}
