import { PromiseResultType } from "../result-type.js";

export interface ConvoGitFileStatus
{
    /**
     * Name of the file.
     */
    path:string;

    isTracked?:boolean;

    isIgnored?:boolean;

    /** */
    isDirty?:boolean;

    /**
     * The hash of the current commit
     */
    commit?:string;

    fileHash?:string;
}

export interface GitStatusRequestBase
{
    /**
     * If true the file has of return status items should include a file hash
     */
    includeFileHash?:boolean;
}

/**
 * Request the status of a single file.
 */
export interface GitStatusSingleRequest extends GitStatusRequestBase
{
    /**
     * Path to file.
     */
    path:string;
    
}

/**
 * Request the status of a multiple file.
 */
export interface GitStatusRequest extends GitStatusRequestBase
{
    /**
     * Paths to files to get status for. Paths can include globs
     */
    paths:string|string[];
    
}

/**
 * Handles git integration
 */
export interface ConvoGitService
{
    /**
     * Returns the git status of a single file. Will return a 404 if the target file does not exist
     */
    gitStatusSingleAsync(request:GitStatusSingleRequest):PromiseResultType<ConvoGitFileStatus>;

    /**
     * Returns the git status all target files. Requested paths can include blobs.
     * If no file or files exist at the target path or paths an empty array will be returned.
     */
    gitStatusAsync(request:GitStatusRequest):PromiseResultType<ConvoGitFileStatus[]>;
}