import { EventEmitter, ExtensionContext, commands, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { ParsedOutputTagInfo } from './code-block-lib.js';

const stateKey='convo.codeBlocks.treeView';
const contextKey='convo.codeBlocksTreeView';
const globReg=/[*?{}[\]]/;

let treeMode=true;

/**
 * Fires when the Code Blocks view switches between the tree and list layouts
 */
export const codeBlockTreeModeChangeEmitter=new EventEmitter<boolean>();

/**
 * A folder in the code block tree of a message
 */
export interface CodeBlockTreeFolder
{
    /**
     * Display name. Compacted folder chains are joined with a slash.
     */
    name:string;
    /**
     * Path of the folder relative to the workspace
     */
    path:string;
    folders:CodeBlockTreeFolder[];
    tags:ParsedOutputTagInfo[];
}

/**
 * Registers the `convo.code-blocks-view-tree` and `convo.code-blocks-view-flat` commands used to
 * switch the Code Blocks view between tree and list layouts. The layout is saved in workspace
 * state and defaults to tree.
 */
export const registerCodeBlockTreeMode=(context:ExtensionContext,ext:ConvoExt)=>{
    treeMode=context.workspaceState.get<boolean>(stateKey)??true;
    void commands.executeCommand('setContext',contextKey,treeMode);

    const setTreeModeAsync=async (value:boolean)=>{
        treeMode=value;
        await context.workspaceState.update(stateKey,value);
        await commands.executeCommand('setContext',contextKey,value);
        codeBlockTreeModeChangeEmitter.fire(value);
    }

    context.subscriptions.push(
        codeBlockTreeModeChangeEmitter,
        commands.registerCommand('convo.code-blocks-view-tree',()=>setTreeModeAsync(true)),
        commands.registerCommand('convo.code-blocks-view-flat',()=>setTreeModeAsync(false)),
    );
}

/**
 * Returns true if the Code Blocks view uses the tree layout
 */
export const isCodeBlockTreeMode=():boolean=>treeMode;

/**
 * Builds a folder tree of the given blocks based on their target paths relative to the workspace.
 * Scripts are placed at the root. Single child folder chains are compacted. Folders are sorted
 * alphabetically, blocks are sorted alphabetically using the given label function.
 */
export const buildCodeBlockTree=(tags:ParsedOutputTagInfo[],getLabel:(tag:ParsedOutputTagInfo)=>string):CodeBlockTreeFolder=>{
    const root:CodeBlockTreeFolder={name:'',path:'',folders:[],tags:[]};
    for(const tag of tags){
        let folder=root;
        for(const name of getTagFolderSegments(tag)){
            let child=folder.folders.find(f=>f.name===name);
            if(!child){
                child={name,path:folder.path?`${folder.path}/${name}`:name,folders:[],tags:[]};
                folder.folders.push(child);
            }
            folder=child;
        }
        folder.tags.push(tag);
    }
    root.folders=root.folders.map(compactFolder);
    sortFolder(root,getLabel);
    return root;
}

/**
 * Returns all blocks under the given folder in apply order
 */
export const getCodeBlockTreeFolderTags=(folder:CodeBlockTreeFolder):ParsedOutputTagInfo[]=>{
    const tags:ParsedOutputTagInfo[]=[];
    const collect=(f:CodeBlockTreeFolder)=>{
        tags.push(...f.tags);
        f.folders.forEach(collect);
    }
    collect(folder);
    return tags.sort((a,b)=>a.index-b.index);
}

/**
 * Returns the folder segments of a block. File blocks and file operations use the directory of
 * their target path. Glob paths use the segments before the first glob segment.
 */
const getTagFolderSegments=(tag:ParsedOutputTagInfo):string[]=>{
    if(tag.type!=='file' && tag.type!=='op'){
        return [];
    }
    const rel=workspace.asRelativePath(tag.targetPath);
    const parts=rel.split(/[\\/]+/);
    const globIndex=parts.findIndex(p=>globReg.test(p));
    const segments=(globIndex===-1?parts.slice(0,-1):parts.slice(0,globIndex)).filter(Boolean);
    if(segments[0] && /^[\\/]/.test(rel)){
        segments[0]=`/${segments[0]}`;
    }
    return segments;
}

const compactFolder=(folder:CodeBlockTreeFolder):CodeBlockTreeFolder=>{
    folder.folders=folder.folders.map(compactFolder);
    const only=folder.folders[0];
    if(only && folder.folders.length===1 && !folder.tags.length){
        return {...only,name:`${folder.name}/${only.name}`};
    }
    return folder;
}

const sortFolder=(folder:CodeBlockTreeFolder,getLabel:(tag:ParsedOutputTagInfo)=>string):void=>{
    folder.folders.sort((a,b)=>a.name.localeCompare(b.name));
    folder.tags.sort((a,b)=>getLabel(a).localeCompare(getLabel(b)) || a.index-b.index);
    for(const f of folder.folders){
        sortFolder(f,getLabel);
    }
}
