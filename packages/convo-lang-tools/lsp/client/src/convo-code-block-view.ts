import { convoTags } from '@convo-lang/convo-lang';
import { DisposeContainer } from '@iyio/common';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { getFileBlockArgs, getParsedOutputTagGroups, HasArgs, MessageTagGroup, OutputTagCodeLensArgs, ParsedOutputTagInfo, showOutputDiffAsync, writeOutputTagAsync } from './code-block-lib.js';
import { timeSince, timeSinceNext } from './util.js';

const pinnedDocsStateKey='convo.codeBlocks.pinnedDocs';
const selectedDocStateKey='convo.codeBlocks.selectedDoc';

export const registerConvoCodeBlockView=(context:ExtensionContext,ext:ConvoExt)=>{

    const provider=new ConvoCodeBlockTreeProvider(context,ext);
    const tree=window.createTreeView('convoCodeBlocks',{
        treeDataProvider:provider,
    });

    context.subscriptions.push(tree);
    context.subscriptions.push(provider);

    context.subscriptions.push(commands.registerCommand('convo.code-block-open-message',async (uri:Uri,charIndex:number,block?:OutputTagCodeLensArgs|HasArgs)=>{
        const doc=await workspace.openTextDocument(uri);
        let range:vscode.Range;
        if(block){
            const args=getFileBlockArgs(block);
            const tag=await getTagFromArgsAsync(args);
            if(!tag){
                return;
            }
            const pos=doc.positionAt(tag.codeBlock.startIndex);
            range=new vscode.Range(pos,pos);
        }else{
            const txt=doc.getText();
            if(txt[charIndex]!=='>'){
                const reg=/((\n|^)[ \t]*)>/g;
                reg.lastIndex=charIndex;
                const match=reg.exec(txt);
                if(match){
                    charIndex=match.index+(match[1]?.length??0);
                }
            }
            const pos=doc.positionAt(charIndex);
            range=new vscode.Range(pos,pos);
        }
        await window.showTextDocument(doc,{preview:false,preserveFocus:false,selection:range});
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-blocks-refresh',async ()=>{
        provider.refresh();
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-group-apply-all',async (item?:ConvoCodeMessageItem)=>{
        await provider.applyAllAsync(item);
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-view-pin',async (item?:ConvoCodeBlockDocItem)=>{
        await provider.pinDocumentAsync(item?.doc.uri.fsPath);
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-view-unpin',async (item?:ConvoCodeBlockDocItem)=>{
        await provider.unpinDocumentAsync(item?.doc.uri.fsPath);
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-view-switch',async (item?:ConvoCodeBlockDocItem)=>{
        if(item){
            await provider.switchToDocumentAsync(item.doc.uri.fsPath,true);
        }else{
            await provider.pickAndSwitchDocumentAsync();
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-panel-tag-open',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
        if(args){
            await provider.openOutputTagAsync(getFileBlockArgs(args));
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-panel-tag-write',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
        if(args){
            await provider.writeOutputTagByArgsAsync(getFileBlockArgs(args));
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-panel-tag-diff',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
        if(args){
            await provider.diffOutputTagAsync(getFileBlockArgs(args));
        }
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-panel-tag-copy',async (args?:OutputTagCodeLensArgs|HasArgs)=>{
        if(args){
            await provider.copyOutputTagAsync(getFileBlockArgs(args));
        }
    }));

    context.subscriptions.push(window.onDidChangeActiveTextEditor((editor)=>{
        void provider.handleActiveEditorChangedAsync(editor);
    }));

    context.subscriptions.push(workspace.onDidChangeTextDocument((e)=>{
        provider.handleDocumentChanged(e.document);
    }));

    context.subscriptions.push(workspace.onDidSaveTextDocument((document)=>{
        provider.handleDocumentChanged(document);
    }));

    void provider.initializeAsync();
}

class ConvoCodeBlockTreeProvider implements vscode.TreeDataProvider<ConvoCodeBlockTreeItem>, vscode.FileDecorationProvider, vscode.Disposable
{
    public readonly onDidChangeTreeDataEmitter=new vscode.EventEmitter<ConvoCodeBlockTreeItem|undefined|void>();
    public readonly onDidChangeTreeData=this.onDidChangeTreeDataEmitter.event;

    private readonly onDidChangeFileDecorationsEmitter=new vscode.EventEmitter<Uri|Uri[]|undefined>();
    public readonly onDidChangeFileDecorations=this.onDidChangeFileDecorationsEmitter.event;

    private pinnedPaths:string[]=[];
    private selectedPath:string|undefined;
    private lastActiveConvoPath:string|undefined;

    public constructor(
        private readonly context:ExtensionContext,
        private readonly ext:ConvoExt,
    ){
    }

    public dispose():void
    {
        this.clearRefreshQueue();
        this.disposeContainer.dispose();
        this.onDidChangeTreeDataEmitter.dispose();
        this.onDidChangeFileDecorationsEmitter.dispose();
    }

    public async initializeAsync():Promise<void>
    {
        const savedPinned=this.context.workspaceState.get<string[]>(pinnedDocsStateKey);
        this.pinnedPaths=(savedPinned ?? []).map(p=>path.normalize(p));

        const savedSelected=this.context.workspaceState.get<string>(selectedDocStateKey);
        this.selectedPath=savedSelected?path.normalize(savedSelected):undefined;

        this.context.subscriptions.push(window.registerFileDecorationProvider(this));

        await this.cleanupStateAsync();
        await this.trySelectStartupDocumentAsync();
        this.refresh();
    }

    public disposeContainer=new DisposeContainer();

    private clearDisposeContainer()
    {
        const c=this.disposeContainer;
        this.disposeContainer=new DisposeContainer();
        c.dispose();
    }

    private refreshQueueIv?:any;
    public queueRefresh(){
        this.clearRefreshQueue();
        this.refreshQueueIv=setTimeout(()=>{
            this.refresh();
        },4000);
    }

    private clearRefreshQueue()
    {
        clearTimeout(this.refreshQueueIv);
    }

    public refresh():void
    {
        clearTimeout(this.refreshQueueIv);
        this.onDidChangeTreeDataEmitter.fire();
        this.onDidChangeFileDecorationsEmitter.fire(undefined);
    }

    public getTreeItem(element:ConvoCodeBlockTreeItem):TreeItem
    {
        return element;
    }

    public provideFileDecoration(uri:Uri):vscode.ProviderResult<vscode.FileDecoration>
    {
        switch(uri.scheme){

            case 'convo-code-message-group':{
                const indexText=uri.authority;
                const index=Number(indexText);
                if(!Number.isFinite(index)){
                    return undefined;
                }

                let data:MessageGroupUriData;
                try{
                    data=JSON.parse(uri.path.startsWith('/')?uri.path.substring(1):uri.path);
                }catch{
                    return undefined;
                }

                return {
                    badge:String(Math.max(0,Math.min(99,data.tagCount))),
                    tooltip:`${index} code block${index===1?'':'s'}`,
                    color:new vscode.ThemeColor(data.isLast?'notificationsInfoIcon.foreground':'disabledForeground'),
                    propagate:false,
                };
            }

            case 'convo-code-separator':{

                return {
                    color:new vscode.ThemeColor('disabledForeground'),
                    propagate:false,
                };
            }

            default:
                return undefined;
        }

        
    }

    public async getChildren(element?:ConvoCodeBlockTreeItem):Promise<ConvoCodeBlockTreeItem[]>
    {
        if(element){
            return element.getChildren?.() ?? [];
        }

        this.clearDisposeContainer();
        this.clearRefreshQueue();
        const docs=await this.getVisibleDocumentsAsync();
        return docs.map(doc=>new ConvoCodeBlockDocItem(
            this,
            doc,
            this.isPinned(doc.uri.fsPath),
            this.isSelected(doc.uri.fsPath),
            this.isActive(doc.uri.fsPath),
        ));
    }

    public async applyAllAsync(item?:ConvoCodeMessageItem):Promise<void>
    {
        const target=item;
        if(!target){
            return;
        }

        const tags=target.group.tags;

        if(!tags.length){
            return;
        }

        const action=await window.showWarningMessage(
            `Apply ${tags.length} code block action${tags.length===1?'':'s'} from this message?`,
            {modal:true},
            'Apply All',
            'View First Diff',
        );

        if(action==='View First Diff'){
            const first=tags[0];
            if(first){
                await showOutputDiffAsync(first.targetPath,first.content);
            }
            return;
        }

        if(action!=='Apply All'){
            return;
        }

        for(const tag of tags){
            const args:OutputTagCodeLensArgs={
                targetPath:tag.targetPath,
                index:tag.index,
                cwd:tag.cwd,
                documentUri:target.group.messageUri,
            }
            if(tag.type==='file'){
                await writeOutputTagAsync(args);
            }else if(tag.type==='shell'){
                await commands.executeCommand('convo.output-tag-execute-shell',args);
            }
        }
    }

    public async handleActiveEditorChangedAsync(editor:vscode.TextEditor|undefined):Promise<void>
    {
        const document=editor?.document;
        if(document?.languageId==='source.convo' && document.uri.scheme==='file'){
            this.lastActiveConvoPath=path.normalize(document.uri.fsPath);
            if(!this.selectedPath || !this.isPinned(this.selectedPath)){
                await this.selectDocumentAsync(document.uri.fsPath);
                return;
            }
        }

        this.refresh();
    }

    public handleDocumentChanged(document:vscode.TextDocument):void
    {
        if(document.uri.scheme!=='file'){
            return;
        }

        const normalized=path.normalize(document.uri.fsPath);
        if(this.selectedPath===normalized || this.lastActiveConvoPath===normalized || this.pinnedPaths.includes(normalized)){
            this.queueRefresh();
        }
    }

    public async pinDocumentAsync(fsPath?:string):Promise<void>
    {
        const targetPath=await this.resolveDocumentPathAsync(fsPath);
        if(!targetPath){
            return;
        }

        const normalized=path.normalize(targetPath);
        if(!this.pinnedPaths.includes(normalized)){
            this.pinnedPaths.push(normalized);
            await this.savePinnedPathsAsync();
        }

        await this.selectDocumentAsync(normalized);
    }

    public async unpinDocumentAsync(fsPath?:string):Promise<void>
    {
        const targetPath=await this.resolveDocumentPathAsync(fsPath);
        if(!targetPath){
            return;
        }

        const normalized=path.normalize(targetPath);
        const nextPinned=this.pinnedPaths.filter(p=>p!==normalized);
        if(nextPinned.length===this.pinnedPaths.length){
            return;
        }

        this.pinnedPaths=nextPinned;
        await this.savePinnedPathsAsync();

        if(this.selectedPath===normalized){
            const fallback=this.lastActiveConvoPath && this.lastActiveConvoPath!==normalized?
                this.lastActiveConvoPath
            :undefined;
            await this.selectDocumentAsync(fallback);
        }else{
            this.refresh();
        }
    }

    public async switchToDocumentAsync(fsPath:string|undefined,revealDocument:boolean):Promise<void>
    {
        const normalized=fsPath?path.normalize(fsPath):undefined;
        await this.selectDocumentAsync(normalized);

        if(revealDocument && normalized){
            const doc=await workspace.openTextDocument(Uri.file(normalized));
            await window.showTextDocument(doc,{preview:false,preserveFocus:false});
        }
    }

    public async pickAndSwitchDocumentAsync():Promise<void>
    {
        const docs=await this.getAvailableDocumentsAsync();
        if(!docs.length){
            void window.showInformationMessage('No Convo documents available.');
            return;
        }

        const items=docs.map(doc=>{
            const fsPath=doc.uri.fsPath;
            return {
                label:path.basename(fsPath),
                description:getDocDescription(
                    fsPath,
                    this.isPinned(fsPath),
                    this.isSelected(fsPath),
                    this.isActive(fsPath),
                ),
                detail:fsPath,
                doc,
            };
        });

        const picked=await window.showQuickPick(items,{
            placeHolder:'Select a Convo document for the Code Blocks view',
        });

        if(!picked){
            return;
        }

        await this.switchToDocumentAsync(picked.doc.uri.fsPath,true);
    }

    public async openOutputTagAsync(args:OutputTagCodeLensArgs):Promise<void>
    {
        const tag=await getTagFromArgsAsync(args);
        if(!tag || tag.type!=='file'){
            return;
        }

        try{
            const doc=await workspace.openTextDocument(Uri.file(tag.targetPath));
            await window.showTextDocument(doc,{preview:false});
        }catch{
            await this.writeOutputTagByArgsAsync(args);
            const doc=await workspace.openTextDocument(Uri.file(tag.targetPath));
            await window.showTextDocument(doc,{preview:false});
        }
    }

    public async writeOutputTagByArgsAsync(args:OutputTagCodeLensArgs):Promise<void>
    {
        const tag=await getTagFromArgsAsync(args);
        if(!tag){
            return;
        }

        const tArgs:OutputTagCodeLensArgs={
            targetPath:tag.targetPath,
            index:tag.index,
            cwd:tag.cwd,
            documentUri:args?.documentUri,
        }
        if(tag.type==='file'){
            await writeOutputTagAsync(tArgs);
        }else if(tag.type==='shell'){
            await commands.executeCommand('convo.output-tag-execute-shell', tArgs);
        }
    }

    public async diffOutputTagAsync(args?:OutputTagCodeLensArgs):Promise<void>
    {
        if(!args){
            return;
        }
        const tag=await getTagFromArgsAsync(args);
        if(!tag || tag.type!=='file'){
            return;
        }

        await showOutputDiffAsync(tag.targetPath,tag.content);
    }

    public async copyOutputTagAsync(args?:OutputTagCodeLensArgs):Promise<void>
    {
        if(!args){
            return;
        }
        const tag=await getTagFromArgsAsync(args);
        if(!tag){
            return;
        }

        await vscode.env.clipboard.writeText(tag.content);
        void window.showInformationMessage(`Copied ${getItemLabel(tag)}`);
    }

    private async cleanupStateAsync():Promise<void>
    {
        const kept:string[]=[];
        for(const p of this.pinnedPaths){
            if(await this.fileExistsAsync(p)){
                kept.push(p);
            }
        }
        this.pinnedPaths=kept;
        await this.savePinnedPathsAsync();

        if(this.selectedPath && !await this.fileExistsAsync(this.selectedPath)){
            this.selectedPath=undefined;
            await this.context.workspaceState.update(selectedDocStateKey,undefined);
        }
    }

    private async trySelectStartupDocumentAsync():Promise<void>
    {
        const active=window.activeTextEditor?.document;
        if(active?.languageId==='source.convo' && active.uri.scheme==='file'){
            this.lastActiveConvoPath=path.normalize(active.uri.fsPath);
            if(!this.selectedPath){
                await this.selectDocumentAsync(active.uri.fsPath);
                return;
            }
        }

        if(this.selectedPath){
            return;
        }

        const openConvo=workspace.textDocuments.find(d=>d.languageId==='source.convo' && d.uri.scheme==='file');
        if(openConvo){
            this.lastActiveConvoPath=path.normalize(openConvo.uri.fsPath);
            await this.selectDocumentAsync(openConvo.uri.fsPath);
            return;
        }

        if(this.pinnedPaths[0]){
            await this.selectDocumentAsync(this.pinnedPaths[0]);
        }
    }

    private async getVisibleDocumentsAsync():Promise<vscode.TextDocument[]>
    {
        const result:vscode.TextDocument[]=[];
        const added=new Set<string>();

        const active=await this.getDocumentByPathAsync(this.lastActiveConvoPath);
        if(active){
            const normalized=path.normalize(active.uri.fsPath);
            result.push(active);
            added.add(normalized);
        }

        for(const pinnedPath of this.pinnedPaths){
            const doc=await this.getDocumentByPathAsync(pinnedPath);
            if(!doc){
                continue;
            }

            const normalized=path.normalize(doc.uri.fsPath);
            if(added.has(normalized)){
                continue;
            }

            result.push(doc);
            added.add(normalized);
        }

        const selected=await this.getDocumentByPathAsync(this.selectedPath);
        if(selected){
            const normalized=path.normalize(selected.uri.fsPath);
            if(!added.has(normalized)){
                result.push(selected);
            }
        }

        return result;
    }

    private async getAvailableDocumentsAsync():Promise<vscode.TextDocument[]>
    {
        const docs:vscode.TextDocument[]=[];
        const added=new Set<string>();

        for(const doc of workspace.textDocuments){
            if(doc.languageId!=='source.convo' || doc.uri.scheme!=='file'){
                continue;
            }

            const normalized=path.normalize(doc.uri.fsPath);
            if(added.has(normalized)){
                continue;
            }

            docs.push(doc);
            added.add(normalized);
        }

        for(const fsPath of this.pinnedPaths){
            const doc=await this.getDocumentByPathAsync(fsPath);
            if(!doc){
                continue;
            }

            const normalized=path.normalize(doc.uri.fsPath);
            if(added.has(normalized)){
                continue;
            }

            docs.push(doc);
            added.add(normalized);
        }

        docs.sort((a,b)=>a.uri.fsPath.localeCompare(b.uri.fsPath));
        return docs;
    }

    private async getDocumentByPathAsync(fsPath:string|undefined):Promise<vscode.TextDocument|undefined>
    {
        if(!fsPath){
            return undefined;
        }

        const normalized=path.normalize(fsPath);
        const openDoc=workspace.textDocuments.find(d=>d.uri.scheme==='file' && path.normalize(d.uri.fsPath)===normalized);
        if(openDoc){
            return openDoc.languageId==='source.convo'?openDoc:undefined;
        }

        try{
            const doc=await workspace.openTextDocument(Uri.file(normalized));
            return doc.languageId==='source.convo'?doc:undefined;
        }catch{
            return undefined;
        }
    }

    private async resolveDocumentPathAsync(fsPath?:string):Promise<string|undefined>
    {
        if(fsPath){
            return fsPath;
        }

        const active=window.activeTextEditor?.document;
        if(active?.languageId==='source.convo' && active.uri.scheme==='file'){
            return active.uri.fsPath;
        }

        if(this.selectedPath){
            return this.selectedPath;
        }

        return this.lastActiveConvoPath;
    }

    private async selectDocumentAsync(fsPath:string|undefined):Promise<void>
    {
        const normalized=fsPath?path.normalize(fsPath):undefined;
        this.selectedPath=normalized;
        await this.context.workspaceState.update(selectedDocStateKey,normalized);
        this.refresh();
    }

    private isPinned(fsPath:string):boolean
    {
        return this.pinnedPaths.includes(path.normalize(fsPath));
    }

    private isSelected(fsPath:string):boolean
    {
        return this.selectedPath===path.normalize(fsPath);
    }

    private isActive(fsPath:string):boolean
    {
        return this.lastActiveConvoPath===path.normalize(fsPath);
    }

    private async savePinnedPathsAsync():Promise<void>
    {
        await this.context.workspaceState.update(pinnedDocsStateKey,this.pinnedPaths);
    }

    private async fileExistsAsync(fsPath:string):Promise<boolean>
    {
        try{
            await workspace.fs.stat(Uri.file(fsPath));
            return true;
        }catch{
            return false;
        }
    }
}

abstract class ConvoCodeBlockTreeItem extends TreeItem
{
    public readonly provider:ConvoCodeBlockTreeProvider;
    public constructor(provider:ConvoCodeBlockTreeProvider,label: string | vscode.TreeItemLabel|vscode.Uri, collapsibleState?: TreeItemCollapsibleState){
        super(label as any,collapsibleState);
        this.provider=provider;
    }
    public getChildren?():Promise<ConvoCodeBlockTreeItem[]>;
}

class ConvoCodeBlockDocItem extends ConvoCodeBlockTreeItem
{
    public constructor(
        provider:ConvoCodeBlockTreeProvider,
        public readonly doc:vscode.TextDocument,
        isPinned:boolean,
        isSelected:boolean,
        isActive:boolean,
    ){
        super(provider,path.basename(doc.uri.fsPath),TreeItemCollapsibleState.Expanded);
        this.description=getDocDescription(doc.uri.fsPath,isPinned,isSelected,isActive);
        this.tooltip=doc.uri.fsPath;
        this.contextValue=isPinned?'code-block-doc-pinned':'code-block-doc';
        this.iconPath=new vscode.ThemeIcon(
            isPinned?
                'pinned'
            :isActive?
                'file'
            :
                'symbol-file',
        );
        this.command={
            title:'Switch Code Block View',
            command:'convo.code-block-view-switch',
            arguments:[this],
        };
    }

    public override async getChildren():Promise<ConvoCodeBlockTreeItem[]>
    {
        const items:ConvoCodeBlockTreeItem[]=[];
        const groups=getParsedOutputTagGroups(this.doc);

        for(let i=0;i<groups.length;i++){
            const group=groups[i];
            if(!group){
                continue;
            }
            items.push(new ConvoCodeMessageItem(this.provider,group));
            for(const tag of group.tags){
                items.push(new ConvoCodeBlockItem(this.provider,group,tag))
            }
            items.push(new ConvoSeparatorItem(this.provider));
        }
        return items;
    }
}

class ConvoSeparatorItem extends ConvoCodeBlockTreeItem
{
    public constructor(
        provider:ConvoCodeBlockTreeProvider,
        title='----------------------',
    ){
        super(provider,title,TreeItemCollapsibleState.None);
        this.iconPath=new vscode.ThemeIcon('empty');
        this.resourceUri=Uri.parse(`convo-code-separator://separator`);
    }
}

class ConvoCodeMessageItem extends ConvoCodeBlockTreeItem
{

    public constructor(
        provider:ConvoCodeBlockTreeProvider,
        public readonly group:MessageTagGroup,
    ){
        
        super(provider,getGroupLabel(group),TreeItemCollapsibleState.None);
        this.description=`${group.tags.length} block${group.tags.length===1?'':'s'}`;
        this.contextValue='code-block-group';
        this.iconPath=new vscode.ThemeIcon('comment-discussion');
        this.resourceUri=Uri.parse(`convo-code-message-group://${group.messageIndex}/${encodeURIComponent(getGroupResourceKey(group))}`);

        this.command={
            title:'Goto Message',
            command:'convo.code-block-open-message',
            arguments:[group.messageUri,group.message.s??1],
        };

        const time=group.message.tags?.find(t=>t.name===convoTags.time)?.value
        if(time){
            let first=true;
            let iv:any;
            let active=true;
            const update=()=>{
                if(!active){
                    return;
                }
                const since=timeSinceNext(time);
                if(first){
                    first=false;
                }else{
                    this.label=getGroupLabel(group);
                    this.provider.onDidChangeTreeDataEmitter.fire(this);
                }
                if(since.nextInterval!==undefined){
                    iv=setTimeout(update,since.nextInterval);
                }
            }
            update();
            this.provider.disposeContainer.addCb(()=>{
                active=false;
                clearInterval(iv);
            })
        }
    }
}


class ConvoCodeBlockItem extends ConvoCodeBlockTreeItem
{

    public args?:OutputTagCodeLensArgs;

    public constructor(
        provider:ConvoCodeBlockTreeProvider,
        public readonly group:MessageTagGroup,
        public readonly tag:ParsedOutputTagInfo,
    ){
        super(provider,getItemLabel(tag),TreeItemCollapsibleState.None);

        this.description=getItemDescription(tag);
        this.tooltip=getItemTooltip(tag);
        this.contextValue=`code-block-${tag.type}/${tag.codeBlock.lang || 'text'}`;
        this.iconPath=new vscode.ThemeIcon(tag.type==='shell'?'terminal':'file-code');
        

        this.args={targetPath:tag.targetPath,index:tag.index,cwd:tag.cwd,documentUri:group.messageUri};

        this.command={
            title:'Open Block',
            command:'convo.code-block-open-message',
            arguments:[group.messageUri,group.message.s??1,this],
        };
    }
}

const getGroupLabel=(group:MessageTagGroup):string=>{
    const role=group.message.role ?? 'message';
    const time=group.message.tags?.find(t=>t.name===convoTags.time);
    return `> ${role}${time?.value?` ${timeSince(time.value)}`:''}`;
}

const getGroupResourceKey=(group:MessageTagGroup):string=>{
    const role=group.message.role ?? 'message';
    return JSON.stringify({
        role,
        tagCount:group.tags.length,
        messageIndex:group.messageIndex,
        isLast:group.isLast,
    } satisfies MessageGroupUriData);
}

interface MessageGroupUriData
{
    role:string;
    tagCount:number;
    messageIndex:number;
    isLast:boolean;
}

const getItemLabel=(tag:ParsedOutputTagInfo):string=>{
    if(tag.type==='shell'){
        return tag.codeBlock.attributes['script-name'] || 'script';
    }

    if(tag.type==='file'){
        return path.basename(tag.targetPath) || tag.targetPath;
    }

    return tag.codeBlock.tagName;
}

const getItemDescription=(tag:ParsedOutputTagInfo):string=>{
    const lang=tag.codeBlock.lang || 'text';
    return tag.type==='shell'?
        lang
    :tag.type==='file'?
        `${lang} • ${tag.targetPath}`
    :
        lang;
}

const getItemTooltip=(tag:ParsedOutputTagInfo):string=>{
    const lines=[
        `<${tag.codeBlock.tagName}>`,
        tag.type==='file'?`Path: ${tag.targetPath}`:undefined,
        tag.type==='shell'?`Script: ${tag.targetPath}`:undefined,
        tag.cwd?`CWD: ${tag.cwd}`:undefined,
        `Lang: ${tag.codeBlock.lang || 'text'}`,
    ].filter(Boolean);

    return lines.join('\n');
}

const getDocDescription=(fsPath:string,isPinned:boolean,isSelected:boolean,isActive:boolean):string=>{
    const parts:string[]=[];

    if(isSelected){
        parts.push('Selected');
    }
    if(isActive){
        parts.push('Active');
    }
    if(isPinned){
        parts.push('Pinned');
    }

    const dir=path.dirname(fsPath);
    if(dir){
        parts.push(dir);
    }

    return parts.join(' • ');
}


const getTagFromArgsAsync=async (args:OutputTagCodeLensArgs):Promise<ParsedOutputTagInfo|undefined>=>
{
    const targetPath=args.targetPath;
    const index=args.index;

    const doc=await workspace.openTextDocument(args.documentUri);
    if(!doc){
        return;
    }

    const groups=getParsedOutputTagGroups(doc);
    for(const group of groups){
        const match=group.tags.find(tag=>tag.index===index && tag.targetPath===targetPath);
        if(match){
            return match;
        }
    }

    return undefined;
}