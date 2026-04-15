import { PromiseResultType } from "../result-type.js";

export type GitRevisionType='working'|'branch'|'tag'|'commit';

export interface GitStatusRevision
{
    /**
     * The type of revision to inspect.
     */
    type:GitRevisionType;

    /**
     * The branch name, tag name, or commit hash depending on the revision type.
     * Not required when type is working.
     */
    value?:string;
}

export interface ConvoGitFileStatus
{
    /**
     * Name of the file.
     */
    path:string;

    isTracked?:boolean;

    isIgnored?:boolean;

    /**
     * True when the file has any working tree or staged/index changes.
     */
    isDirty?:boolean;

    /**
     * True when the working tree version differs from the target revision.
     */
    isModifiedInWorkingTree?:boolean;

    /**
     * True when the staged/index version differs from the target revision.
     */
    isModifiedInIndex?:boolean;

    /**
     * True when the file exists in the target revision.
     */
    existsInRevision?:boolean;

    /**
     * The resolved hash of the revision used for comparison.
     */
    revisionHash?:string;

    /**
     * The most recent commit in history that changed the file relative to HEAD or the selected revision.
     */
    lastCommit?:string;

    fileHash?:string;
}

export interface GitStatusRequestBase
{
    /**
     * If true returned status items should include a file hash. If equals 'if-dirty' items should
     * include a file hash only if the item isDirty.
     */
    includeFileHash?:boolean|'if-dirty';

    /**
     * The revision to inspect. Defaults to the working tree.
     */
    revision?:GitStatusRevision;
}

/**
 * Request the status of a single file.
 */
export interface GitStatusSingleRequest extends GitStatusRequestBase
{
    /**
     * Path to the file.
     */
    path:string;
}

/**
 * Request the status of multiple files.
 */
export interface GitStatusRequest extends GitStatusRequestBase
{
    /**
     * Paths of files to get status for. Paths can include globs.
     */
    paths:string|string[];
}

/**
 * Handles git integration.
 */
export interface ConvoGitService
{
    /**
     * Returns the git status of a single file. Will return a 404 if the target file does not exist.
     */
    gitStatusSingleAsync(request:GitStatusSingleRequest):PromiseResultType<ConvoGitFileStatus>;

    /**
     * Returns the git status for all target files. Requested paths can include globs.
     * If no files exist at the target path or paths an empty array will be returned.
     */
    gitStatusAsync(request:GitStatusRequest):PromiseResultType<ConvoGitFileStatus[]>;
}
