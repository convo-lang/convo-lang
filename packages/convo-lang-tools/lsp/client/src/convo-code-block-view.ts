import * as path from 'path';
import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, Uri, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { getParsedOutputTagGroups, OutputTagCodeLensArgs, ParsedOutputTagGroup, ParsedOutputTagInfo, showOutputDiffAsync, writeOutputTagAsync } from './code-block-lib.js';

export const registerConvoCodeBlockView=(context:ExtensionContext,ext:ConvoExt)=>{

    const provider=new ConvoCodeBlockTreeProvider(context,ext);
    const tree=window.createTreeView('convoCodeBlocks',{
        treeDataProvider:provider,
    });

    context.subscriptions.push(tree);

    context.subscriptions.push(commands.registerCommand('convo.code-blocks-refresh',async ()=>{
        provider.refresh();
    }));

    context.subscriptions.push(commands.registerCommand('convo.code-block-group-apply-all',async (item?:ConvoCodeBlockGroupItem)=>{
        await provider.applyAllAsync(item);
    }));

    context.subscriptions.push(window.onDidChangeActiveTextEditor(()=>{
        provider.refresh();
    }));

    context.subscriptions.push(workspace.onDidChangeTextDocument((e)=>{
        const active=window.activeTextEditor?.document;
        if(active && e.document.uri.toString()===active.uri.toString()){
            provider.refresh();
        }
    }));

    context.subscriptions.push(workspace.onDidSaveTextDocument((document)=>{
        const active=window.activeTextEditor?.document;
        if(active && document.uri.toString()===active.uri.toString()){
            provider.refresh();
        }
    }));
}

class ConvoCodeBlockTreeProvider implements vscode.TreeDataProvider<ConvoCodeBlockTreeItem>
{
    private readonly onDidChangeTreeDataEmitter=new vscode.EventEmitter<ConvoCodeBlockTreeItem|undefined|void>();
    public readonly onDidChangeTreeData=this.onDidChangeTreeDataEmitter.event;

    public constructor(
        private readonly context:ExtensionContext,
        private readonly ext:ConvoExt,
    ){
    }

    public refresh():void
    {
        this.onDidChangeTreeDataEmitter.fire();
    }

    public getTreeItem(element:ConvoCodeBlockTreeItem):TreeItem
    {
        return element;
    }

    public async getChildren(element?:ConvoCodeBlockTreeItem):Promise<ConvoCodeBlockTreeItem[]>
    {
        if(element){
            return element.getChildren?.() ?? [];
        }

        const document=window.activeTextEditor?.document;
        if(!document || document.languageId!=='source.convo'){
            return [];
        }

        const groups=getParsedOutputTagGroups(document);
        return groups.map(group=>new ConvoCodeBlockGroupItem(group));
    }

    public async applyAllAsync(item?:ConvoCodeBlockGroupItem):Promise<void>
    {
        const target=item ?? await this.getActiveGroupAsync();
        if(!target){
            return;
        }

        const fileTags=target.group.tags.filter(t=>t.type==='file');
        const shellTags=target.group.tags.filter(t=>t.type==='shell');

        if(!fileTags.length && !shellTags.length){
            return;
        }

        if(fileTags.length){
            const action=await window.showWarningMessage(
                `Apply ${fileTags.length} file output${fileTags.length===1?'':'s'} from this message?`,
                {modal:true},
                'Apply All',
                'View First Diff',
            );

            if(action==='View First Diff'){
                const first=fileTags[0];
                if(first){
                    await showOutputDiffAsync(first.targetPath,first.content);
                }
                return;
            }

            if(action!=='Apply All'){
                return;
            }

            for(const tag of fileTags){
                await writeOutputTagAsync(tag.targetPath,tag.content);
            }
        }

        for(const tag of shellTags){
            await commands.executeCommand('convo.output-tag-execute-shell',{
                targetPath:tag.targetPath,
                index:tag.index,
                cwd:tag.cwd,
            } satisfies OutputTagCodeLensArgs);
        }
    }

    private async getActiveGroupAsync():Promise<ConvoCodeBlockGroupItem|undefined>
    {
        const roots=await this.getChildren();
        return roots[0] as ConvoCodeBlockGroupItem|undefined;
    }
}

abstract class ConvoCodeBlockTreeItem extends TreeItem
{
    public getChildren?():Promise<ConvoCodeBlockTreeItem[]>;
}

class ConvoCodeBlockGroupItem extends ConvoCodeBlockTreeItem
{
    public constructor(
        public readonly group:ParsedOutputTagGroup,
    ){
        super(getGroupLabel(group),TreeItemCollapsibleState.Expanded);
        this.description=`${group.tags.length} block${group.tags.length===1?'':'s'}`;
        this.contextValue='code-block-group';
        this.iconPath=new vscode.ThemeIcon('comment-discussion');
    }

    public override async getChildren():Promise<ConvoCodeBlockTreeItem[]>
    {
        return this.group.tags.map(tag=>new ConvoCodeBlockItem(tag));
    }
}

class ConvoCodeBlockItem extends ConvoCodeBlockTreeItem
{
    public constructor(
        public readonly tag:ParsedOutputTagInfo,
    ){
        super(getItemLabel(tag),TreeItemCollapsibleState.None);

        this.description=getItemDescription(tag);
        this.tooltip=getItemTooltip(tag);
        this.contextValue=`code-block-${tag.type}/${tag.codeBlock.lang || 'text'}`;
        this.iconPath=new vscode.ThemeIcon(tag.type==='shell'?'terminal':'file-code');

        if(tag.type==='file'){
            this.command={
                title:'Open Output',
                command:'convo.output-tag-open',
                arguments:[{targetPath:tag.targetPath,index:tag.index} satisfies OutputTagCodeLensArgs],
            };
            this.resourceUri=Uri.file(tag.targetPath);
        }
    }
}

const getGroupLabel=(group:ParsedOutputTagGroup):string=>{
    const role=group.message.role ?? 'message';
    const head=group.message.head?.trim();
    return head?`> ${role} ${head}`:`> ${role}`;
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
