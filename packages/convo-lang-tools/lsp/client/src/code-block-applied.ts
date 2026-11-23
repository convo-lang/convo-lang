import { EventEmitter, ExtensionContext, Uri, workspace } from 'vscode';
import type { OutputTagBase } from './code-block-lib.js';
import { ConvoExt } from './ConvoExt.js';

/**
 * Status of a code block that has been acted on. File blocks and file operations are `applied`,
 * scripts are `ran`.
 */
export type CodeBlockAppliedStatus='applied'|'ran';

type AppliedRef=Pick<OutputTagBase,'documentUri'|'index'|'codeBlock'>;

const stateKey='convo.codeBlocks.applied';
const persistConfigKey='persistAppliedCodeBlocks';

/**
 * Applied status of blocks keyed by document URI then by `{messageIndex}:{blockIndex}`
 */
let appliedState:Record<string,Record<string,CodeBlockAppliedStatus>>={};
let extContext:ExtensionContext|undefined;

/**
 * Fires with the URI of the convo document when the applied state of one of its blocks changes
 */
export const codeBlockAppliedChangeEmitter=new EventEmitter<Uri>();

/**
 * Registers tracking of applied code blocks. State is saved in workspace state unless
 * `convo.persistAppliedCodeBlocks` is false, in which case it is only kept in memory.
 */
export const registerCodeBlockAppliedState=(context:ExtensionContext,ext:ConvoExt)=>{
    extContext=context;
    if(isPersistEnabled()){
        appliedState={...context.workspaceState.get<typeof appliedState>(stateKey)};
    }
    context.subscriptions.push(
        codeBlockAppliedChangeEmitter,
        workspace.onDidChangeConfiguration(e=>{
            if(e.affectsConfiguration(`convo.${persistConfigKey}`)){
                void saveAsync();
            }
        }),
    );
}

/**
 * Marks the given blocks with the given status
 */
export const markCodeBlocksApplied=(tags:AppliedRef[],status:CodeBlockAppliedStatus='applied')=>{
    const uris=new Map<string,Uri>();
    for(const tag of tags){
        const key=tag.documentUri.toString();
        (appliedState[key]??={})[getBlockKey(tag)]=status;
        uris.set(key,tag.documentUri);
    }
    if(!uris.size){
        return;
    }
    void saveAsync();
    for(const uri of uris.values()){
        codeBlockAppliedChangeEmitter.fire(uri);
    }
}

/**
 * Returns the applied status of the given block or undefined if it has not been applied
 */
export const getCodeBlockAppliedStatus=(tag:AppliedRef):CodeBlockAppliedStatus|undefined=>{
    return appliedState[tag.documentUri.toString()]?.[getBlockKey(tag)];
}

const getBlockKey=(tag:AppliedRef):string=>`${tag.codeBlock.messageIndex}:${tag.index}`;

const isPersistEnabled=():boolean=>workspace.getConfiguration('convo').get<boolean>(persistConfigKey,true);

const saveAsync=async ():Promise<void>=>{
    await extContext?.workspaceState.update(stateKey,isPersistEnabled()?appliedState:undefined);
}
