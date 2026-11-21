import { ConvoBlockReplaceRange, mapConvoBlockReplaceIndex, replaceConvoBlockContent } from '@convo-lang/convo-lang';
import { getErrorMessage } from '@iyio/common';
import * as path from 'path';
import { CodeLens, CodeLensProvider, ConfigurationTarget, Disposable, EventEmitter, ExtensionContext, Position, Range, Selection, StatusBarAlignment, Tab, TabInputText, TabInputTextDiff, TextDocument, TextEditor, TextEditorRevealType, ThemeColor, Uri, commands, languages, window, workspace } from 'vscode';
import { ConvoExt } from './ConvoExt.js';
import { MessageTagGroup, OutputTagCodeLensArgs, ParsedOutputTagInfo, getParsedOutputTagGroups, outputPreviewChangeEmitter, outputPreviewContent, readFileContentAsync, writeFileContentAsync } from './code-block-lib.js';
import { applyFileOpAsync, getFileOpPreviewText, resolveFileOpAsync } from './file-op-lib.js';

const reviewContextKey='convo.codeBlockReviewActive';

/**
 * Key of the review page that lists the file operations of a message
 */
const fileOpsPageKey='::file-ops::';

type ReviewStatus='pending'|'accepted'|'rejected';

interface ReviewStep
{
    tag:ParsedOutputTagInfo;
    status:ReviewStatus;
}

interface BlockRange
{
    start:number;
    end:number;
}

interface BlockLabel
{
    step:ReviewStep;
    ranges:BlockRange[];
}

interface PagePreview
{
    content:string;
    labels:BlockLabel[];
}

interface FilePreview extends PagePreview
{
    notFound:ReviewStep[];
}

/**
 * A single navigable change in the preview of a file
 */
interface ReviewChange
{
    step:ReviewStep;
    /**
     * Range of the change in the preview. Undefined if the block has nothing to show in the preview.
     */
    range?:BlockRange;
}

interface DiffCodeLensRestore
{
    value:boolean|undefined;
}

interface ReviewSession
{
    documentUri:Uri;
    steps:ReviewStep[];
    scripts:ParsedOutputTagInfo[];
    /**
     * Target paths of reviewed files. Ends with fileOpsPageKey if the message contains file operations.
     */
    targetPaths:string[];
    fileIndex:number;
    changeIndex:number;
    changes:ReviewChange[];
    previewUri?:Uri;
    diffCodeLens?:DiffCodeLensRestore;
}

/**
 * Registers the `convo.code-block-group-review` command and its navigation commands. The review
 * steps through the file blocks of a message one file at a time using a single reused diff tab.
 * File operations are reviewed on a final page listing each operation and the files it matches.
 * Each change is labeled with a code lens that lets the user accept or reject its block and
 * navigate between changes.
 */
export const registerCodeBlockReview=(context:ExtensionContext,ext:ConvoExt)=>{
    const review=new CodeBlockReview();
    context.subscriptions.push(
        review,
        languages.registerCodeLensProvider({scheme:'convo-output'},review),
        commands.registerCommand('convo.code-block-group-review',(item?:{group?:MessageTagGroup})=>review.startAsync(item?.group)),
        commands.registerCommand('convo.code-block-review-next',()=>review.nextAsync()),
        commands.registerCommand('convo.code-block-review-previous',()=>review.previousAsync()),
        commands.registerCommand('convo.code-block-review-skip-file',()=>review.skipFileAsync()),
        commands.registerCommand('convo.code-block-review-toggle-accept',()=>review.toggleAccept()),
        commands.registerCommand('convo.code-block-review-set-status',(stepIndex:number,status:ReviewStatus)=>review.setStatus(stepIndex,status)),
        commands.registerCommand('convo.code-block-review-goto',(changeIndex:number)=>review.gotoChange(changeIndex)),
        commands.registerCommand('convo.code-block-review-finish',()=>review.finishAsync()),
        commands.registerCommand('convo.code-block-review-cancel',()=>review.endAsync()),
        window.onDidChangeVisibleTextEditors(()=>review.decorate()),
    );
}

class CodeBlockReview implements CodeLensProvider, Disposable
{
    private session:ReviewSession|undefined;

    private readonly lensChangeEmitter=new EventEmitter<void>();
    public readonly onDidChangeCodeLenses=this.lensChangeEmitter.event;

    private readonly statusBar=window.createStatusBarItem(StatusBarAlignment.Left,100);

    private readonly labelType=window.createTextEditorDecorationType({
        isWholeLine:true,
        borderWidth:'1px 0 0 0',
        borderStyle:'dashed',
        borderColor:new ThemeColor('editorCodeLens.foreground'),
    });

    private readonly currentLabelType=window.createTextEditorDecorationType({
        isWholeLine:true,
        borderWidth:'2px 0 0 0',
        borderStyle:'solid',
        borderColor:new ThemeColor('focusBorder'),
    });

    private readonly currentRangeType=window.createTextEditorDecorationType({
        isWholeLine:true,
        backgroundColor:new ThemeColor('editor.rangeHighlightBackground'),
    });

    public dispose():void
    {
        void restoreDiffCodeLensAsync(this.session?.diffCodeLens);
        this.session=undefined;
        this.lensChangeEmitter.dispose();
        this.statusBar.dispose();
        this.labelType.dispose();
        this.currentLabelType.dispose();
        this.currentRangeType.dispose();
    }

    public provideCodeLenses(document:TextDocument):CodeLens[]
    {
        const s=this.session;
        if(!s || document.uri.toString()!==s.previewUri?.toString()){
            return [];
        }

        const canFinish=!s.steps.some(st=>st.status==='pending');
        const lenses:CodeLens[]=[];

        for(let i=0;i<s.changes.length;i++){
            const change=s.changes[i];
            if(!change){
                continue;
            }
            const step=change.step;
            const isCurrent=i===s.changeIndex;
            const stepIndex=s.steps.indexOf(step);
            const line=change.range?document.positionAt(change.range.start).line:0;
            const range=new Range(line,0,line,0);
            const add=(title:string,command:string,...args:any[])=>{
                lenses.push(new CodeLens(range,{title,command,arguments:args}));
            };

            add(getLabelText(change,isCurrent),'');
            if(step.status!=='accepted'){
                add('✓ Accept','convo.code-block-review-set-status',stepIndex,'accepted');
            }
            if(step.status!=='rejected'){
                add('✗ Reject','convo.code-block-review-set-status',stepIndex,'rejected');
            }

            if(!isCurrent){
                add('Go to','convo.code-block-review-goto',i);
                continue;
            }

            add('◀ Previous','convo.code-block-review-previous');
            add('Next ▶','convo.code-block-review-next');
            add('Skip File','convo.code-block-review-skip-file');
            if(canFinish){
                add('Finish','convo.code-block-review-finish');
            }
            add('Cancel','convo.code-block-review-cancel');
        }

        return lenses;
    }

    public async startAsync(group?:MessageTagGroup):Promise<void>
    {
        if(!group){
            void window.showInformationMessage('Start a review from a message in the Code Blocks view');
            return;
        }

        await this.endAsync();

        const doc=await workspace.openTextDocument(group.messageUri);
        const tags=(getParsedOutputTagGroups(doc).find(g=>g.messageIndex===group.messageIndex)??group).tags;
        const files=tags.filter(t=>t.type==='file');
        const ops=tags.filter(t=>t.type==='op');
        if(!files.length && !ops.length){
            void window.showInformationMessage('No file blocks or file operations found in message');
            return;
        }

        const order=[...new Set(files.map(t=>t.targetPath))];
        files.sort((a,b)=>order.indexOf(a.targetPath)-order.indexOf(b.targetPath) || a.index-b.index);
        if(ops.length){
            order.push(fileOpsPageKey);
        }

        const diffCodeLens=await enableDiffCodeLensAsync();

        this.session={
            documentUri:group.messageUri,
            steps:[...files,...ops].map(tag=>({tag,status:'pending'})),
            scripts:tags.filter(t=>t.type==='shell'),
            targetPaths:order,
            fileIndex:0,
            changeIndex:0,
            changes:[],
            diffCodeLens,
        };
        await commands.executeCommand('setContext',reviewContextKey,true);
        await this.showFileAsync(0,0);
    }

    public async nextAsync():Promise<void>
    {
        const s=this.session;
        if(!s){
            return;
        }
        if(s.changeIndex<s.changes.length-1){
            s.changeIndex++;
            this.showChange();
        }else if(s.fileIndex<s.targetPaths.length-1){
            await this.showFileAsync(s.fileIndex+1,0);
        }else{
            await this.finishAsync();
        }
    }

    public async previousAsync():Promise<void>
    {
        const s=this.session;
        if(!s){
            return;
        }
        if(s.changeIndex>0){
            s.changeIndex--;
            this.showChange();
        }else if(s.fileIndex>0){
            await this.showFileAsync(s.fileIndex-1,'last');
        }
    }

    public async skipFileAsync():Promise<void>
    {
        const s=this.session;
        if(!s){
            return;
        }
        if(s.fileIndex<s.targetPaths.length-1){
            await this.showFileAsync(s.fileIndex+1,0);
        }else{
            await this.finishAsync();
        }
    }

    public gotoChange(changeIndex:number):void
    {
        const s=this.session;
        if(!s || !s.changes[changeIndex]){
            return;
        }
        s.changeIndex=changeIndex;
        this.showChange();
    }

    public setStatus(stepIndex:number,status:ReviewStatus):void
    {
        const step=this.session?.steps[stepIndex];
        if(!step){
            return;
        }
        step.status=status;
        this.refresh();
    }

    public toggleAccept():void
    {
        const s=this.session;
        const step=s?.changes[s.changeIndex]?.step;
        if(!step){
            return;
        }
        step.status=step.status==='accepted'?'rejected':'accepted';
        this.refresh();
    }

    public async endAsync():Promise<void>
    {
        const s=this.session;
        if(!s){
            return;
        }
        for(const editor of this.getPreviewEditors()){
            editor.setDecorations(this.labelType,[]);
            editor.setDecorations(this.currentLabelType,[]);
            editor.setDecorations(this.currentRangeType,[]);
        }
        this.session=undefined;
        this.statusBar.hide();
        this.lensChangeEmitter.fire();
        await commands.executeCommand('setContext',reviewContextKey,false);
        if(s.previewUri){
            outputPreviewContent.delete(s.previewUri.toString());
            await closePreviewTabsAsync(s.previewUri);
        }
        await restoreDiffCodeLensAsync(s.diffCodeLens);
    }

    public decorate():void
    {
        const s=this.session;
        if(!s){
            return;
        }
        const current=s.changes[s.changeIndex]?.step;
        for(const editor of this.getPreviewEditors()){
            const doc=editor.document;
            const labels:Range[]=[];
            const currentLabels:Range[]=[];
            const currentRanges:Range[]=[];
            for(const change of s.changes){
                if(!change.range){
                    continue;
                }
                const lineRange=getLineRange(doc,change.range);
                const labelRange=doc.lineAt(lineRange.start.line).range;
                if(change.step===current){
                    currentLabels.push(labelRange);
                    currentRanges.push(lineRange);
                }else{
                    labels.push(labelRange);
                }
            }
            editor.setDecorations(this.labelType,labels);
            editor.setDecorations(this.currentLabelType,currentLabels);
            editor.setDecorations(this.currentRangeType,currentRanges);
        }
    }

    public async finishAsync():Promise<void>
    {
        const s=this.session;
        if(!s){
            return;
        }

        const pending=s.steps.filter(st=>st.status==='pending');
        const firstPending=pending[0];
        if(firstPending){
            void window.showInformationMessage(`${pending.length} block${pending.length===1?' is':'s are'} still pending. Accept or reject every block to finish.`);
            await this.showFileAsync(s.targetPaths.indexOf(getStepPageKey(firstPending)),firstPending);
            return;
        }

        const accepted=s.steps.filter(st=>st.status==='accepted');
        const fileLines=s.targetPaths.map(f=>{
            const blocks=getPageSteps(s.steps,f).map(st=>`#${st.tag.index+1} ${getStatusIcon(st.status)}`);
            return `${f===fileOpsPageKey?'File operations':path.basename(f)}: ${blocks.join(', ')}`;
        });
        const scriptLine=s.scripts.length?`\n\n${s.scripts.length} script${s.scripts.length===1?'':'s'} in message`:'';

        const applyFiles='Apply Accepted Files';
        const applyAll='Apply Files and Run Scripts';
        const restart='Restart Review';
        const action=await window.showInformationMessage(
            `${accepted.length} of ${s.steps.length} blocks accepted. Apply changes?`,
            {modal:true,detail:`${fileLines.join('\n')}${scriptLine}`},
            ...(s.scripts.length?[applyFiles,applyAll,restart]:[applyFiles,restart]),
        );
        if(this.session!==s){
            return;
        }

        if(action===restart){
            await this.showFileAsync(0,0);
            return;
        }

        if(action!==applyFiles && action!==applyAll){
            return;
        }

        await this.endAsync();
        await applyAcceptedAsync(accepted);

        if(action===applyAll){
            for(const tag of s.scripts){
                await commands.executeCommand('convo.output-tag-execute-shell',{
                    targetPath:tag.targetPath,
                    index:tag.index,
                    cwd:tag.cwd,
                    codeBlock:tag.codeBlock,
                    documentUri:s.documentUri,
                    autoConfirm:true,
                } satisfies OutputTagCodeLensArgs);
            }
        }
    }

    /**
     * Shows the page at the given index. File pages show a diff with all blocks of the file
     * applied. The file operations page lists each operation and the files it matches. The change
     * to select can be an index, the last change or the first change of a step.
     */
    private async showFileAsync(fileIndex:number,change:number|'last'|ReviewStep):Promise<void>
    {
        const s=this.session;
        const pageKey=s?.targetPaths[fileIndex];
        if(!s || !pageKey){
            return;
        }

        const isOps=pageKey===fileOpsPageKey;
        const pageSteps=getPageSteps(s.steps,pageKey);
        const base=isOps?undefined:await readFileContentAsync(pageKey);
        const preview:PagePreview=isOps?await buildOpsPreviewAsync(pageSteps):buildFilePreview(base??'',pageSteps);
        if(this.session!==s){
            return;
        }

        const changes=getChanges(preview.labels,s.steps);
        const previewUri=(isOps?
            Uri.from({scheme:'convo-output',path:'/File Operations',query:'review'})
        :
            Uri.file(pageKey).with({scheme:'convo-output',query:'review'})
        );
        const prevUri=s.previewUri;

        s.fileIndex=fileIndex;
        s.changes=changes;
        s.previewUri=previewUri;
        s.changeIndex=(
            change==='last'?
                Math.max(0,changes.length-1)
            :typeof change==='number'?
                change
            :
                Math.max(0,changes.findIndex(c=>c.step===change))
        );

        outputPreviewContent.set(previewUri.toString(),preview.content);
        outputPreviewChangeEmitter.fire(previewUri);

        if(prevUri && prevUri.toString()!==previewUri.toString()){
            outputPreviewContent.delete(prevUri.toString());
            await closePreviewTabsAsync(prevUri);
        }

        if(!getPreviewTabs(previewUri).length){
            if(isOps){
                await window.showTextDocument(previewUri,{preview:false});
            }else{
                await commands.executeCommand(
                    'vscode.diff',
                    base===undefined?Uri.parse(`untitled:${pageKey}`):Uri.file(pageKey),
                    previewUri,
                    `Review: ${path.basename(pageKey)}`,
                    {preview:false},
                );
            }
        }

        await waitForContentAsync(previewUri,preview.content);
        if(this.session!==s){
            return;
        }

        this.showChange();
    }

    private showChange():void
    {
        const s=this.session;
        if(!s){
            return;
        }
        const r=s.changes[s.changeIndex]?.range;
        for(const editor of this.getPreviewEditors()){
            const pos=r?editor.document.positionAt(r.start):new Position(0,0);
            editor.selection=new Selection(pos,pos);
            editor.revealRange(new Range(pos,pos),TextEditorRevealType.InCenter);
        }
        this.refresh();
    }

    private refresh():void
    {
        this.decorate();
        this.updateStatusBar();
        this.lensChangeEmitter.fire();
    }

    private updateStatusBar():void
    {
        const s=this.session;
        const current=s?.changes[s.changeIndex];
        if(!s || !current){
            return;
        }
        const step=current.step;
        const change=current.range?`Change ${s.changeIndex+1}/${s.changes.length}`:'Not found';
        this.statusBar.text=`$(diff) File ${s.fileIndex+1}/${s.targetPaths.length} · Block ${s.steps.indexOf(step)+1}/${s.steps.length} ${getStatusIcon(step.status)} · ${change}`;
        this.statusBar.tooltip=`${step.tag.targetPath}\nClick to ${step.status==='accepted'?'reject':'accept'} block #${step.tag.index+1}`;
        this.statusBar.command='convo.code-block-review-toggle-accept';
        this.statusBar.show();
    }

    private getPreviewEditors():TextEditor[]
    {
        const key=this.session?.previewUri?.toString();
        return key?window.visibleTextEditors.filter(e=>e.document.uri.toString()===key):[];
    }
}

/**
 * Applies the given steps to the base content in order. Labels of previous steps are remapped as
 * each find-replace block is applied. Full file blocks replace the content and clear the ranges of
 * all previous labels.
 */
const buildFilePreview=(base:string,steps:ReviewStep[]):FilePreview=>{
    let content=base;
    let labels:BlockLabel[]=[];
    const notFound:ReviewStep[]=[];

    for(const step of steps){
        const block=step.tag.codeBlock;
        if(!block.findReplace){
            content=block.content;
            labels=[...labels.map(l=>({step:l.step,ranges:[]})),{step,ranges:[{start:0,end:content.length}]}];
            continue;
        }

        const result=replaceConvoBlockContent(content,block);
        if(!result.replaceCount){
            notFound.push(step);
            labels.push({step,ranges:[]});
            continue;
        }

        labels=labels.map(l=>({step:l.step,ranges:l.ranges.map(r=>mapRange(r,result.ranges))}));
        labels.push({step,ranges:result.ranges.map(({start,end})=>({start,end}))});
        content=result.content;
    }

    return {content,labels,notFound};
}

/**
 * Builds a page listing each file operation followed by the files it matches
 */
const buildOpsPreviewAsync=async (steps:ReviewStep[]):Promise<PagePreview>=>{
    const plans=await Promise.all(steps.map(st=>resolveFileOpAsync(st.tag)));
    let content='';
    const labels:BlockLabel[]=[];
    for(let i=0;i<steps.length;i++){
        const step=steps[i];
        const plan=plans[i];
        if(!step || !plan){
            continue;
        }
        const start=content.length;
        content+=`${getFileOpPreviewText(plan)}\n`;
        labels.push({step,ranges:[{start,end:content.length}]});
        content+='\n';
    }
    return {content,labels};
}

/**
 * Returns the changes of the given labels ordered by position in the file. Labels without ranges
 * produce a single change placed at the top of the file.
 */
const getChanges=(labels:BlockLabel[],steps:ReviewStep[]):ReviewChange[]=>{
    const changes:ReviewChange[]=labels.flatMap(l=>l.ranges.length?l.ranges.map(range=>({step:l.step,range})):[{step:l.step}]);
    return changes.sort((a,b)=>(a.range?.start??0)-(b.range?.start??0) || steps.indexOf(a.step)-steps.indexOf(b.step));
}

const mapRange=(range:BlockRange,ranges:ConvoBlockReplaceRange[]):BlockRange=>({
    start:mapConvoBlockReplaceIndex(range.start,ranges),
    end:mapConvoBlockReplaceIndex(range.end,ranges),
});

const getPageSteps=(steps:ReviewStep[],pageKey:string):ReviewStep[]=>(
    pageKey===fileOpsPageKey?
        steps.filter(st=>st.tag.type==='op')
    :
        steps.filter(st=>st.tag.type==='file' && st.tag.targetPath===pageKey)
);

const getStepPageKey=(step:ReviewStep):string=>step.tag.type==='op'?fileOpsPageKey:step.tag.targetPath;

/**
 * Applies accepted file blocks and file operations in the order they appear in the message. All
 * accepted blocks of a file are combined into a single write at the first block of the file.
 */
const applyAcceptedAsync=async (steps:ReviewStep[]):Promise<void>=>{
    const errors:string[]=[];
    const handled=new Set<string>();
    let written=0;
    let ops=0;

    for(const st of [...steps].sort((a,b)=>a.tag.index-b.tag.index)){
        const tag=st.tag;
        if(tag.type==='op'){
            if(await applyFileOpAsync(tag,{autoConfirm:true})){
                ops++;
            }
            continue;
        }

        const targetPath=tag.targetPath;
        if(handled.has(targetPath)){
            continue;
        }
        handled.add(targetPath);

        try{
            const base=await readFileContentAsync(targetPath);
            const preview=buildFilePreview(base??'',getPageSteps(steps,targetPath));
            for(const nf of preview.notFound){
                errors.push(`find-replace target not found. path:${targetPath}, block:#${nf.tag.index+1}`);
            }
            if(preview.content===base || (base===undefined && !preview.labels.some(l=>l.ranges.length))){
                continue;
            }
            if(await writeFileContentAsync(targetPath,preview.content)){
                written++;
            }else{
                errors.push(`Failed to write output to ${targetPath}`);
            }
        }catch(ex){
            errors.push(`Failed to write output to ${targetPath}. Error:${getErrorMessage(ex)}`);
        }
    }

    if(errors.length){
        void window.showErrorMessage(errors.join('\n'));
    }
    void window.showInformationMessage(`Wrote ${written} file${written===1?'':'s'}${ops?` · applied ${ops} file operation${ops===1?'':'s'}`:''}`);
}

const getStatusIcon=(status:ReviewStatus):string=>(
    status==='accepted'?
        '✓'
    :status==='rejected'?
        '✗'
    :
        '○'
);

const getLabelText=(change:ReviewChange,isCurrent:boolean):string=>{
    const step=change.step;
    const block=step.tag.codeBlock;
    const kind=(
        step.tag.type==='op'?
            (block.fileOp??'file op')
        :block.findReplace?
            'find-replace'
        :
            'full file'
    );
    return `${isCurrent?'▶ ':''}block #${step.tag.index+1} · ${kind} · ${getStatusIcon(step.status)} ${step.status}${change.range?'':' · not found'}`;
}

/**
 * Turns on `diffEditor.codeLens` in user settings if it is off. Returns the previous user setting
 * value so it can be restored, or undefined if nothing was changed.
 */
const enableDiffCodeLensAsync=async ():Promise<DiffCodeLensRestore|undefined>=>{
    const config=workspace.getConfiguration('diffEditor');
    if(config.get<boolean>('codeLens')){
        return undefined;
    }
    const value=config.inspect<boolean>('codeLens')?.globalValue;
    await config.update('codeLens',true,ConfigurationTarget.Global);
    return {value};
}

const restoreDiffCodeLensAsync=async (restore:DiffCodeLensRestore|undefined):Promise<void>=>{
    if(restore){
        await workspace.getConfiguration('diffEditor').update('codeLens',restore.value,ConfigurationTarget.Global);
    }
}

/**
 * Returns a whole line range covering the given content range. A range ending at the start of a
 * line does not include that line.
 */
const getLineRange=(doc:TextDocument,r:BlockRange):Range=>{
    const start=doc.positionAt(r.start);
    const end=doc.positionAt(r.end);
    const endLine=(end.character===0 && end.line>start.line)?end.line-1:end.line;
    return new Range(start.line,0,endLine,0);
}

/**
 * Returns diff tabs modifying the given uri and text tabs showing the given uri
 */
const getPreviewTabs=(uri:Uri):Tab[]=>{
    const key=uri.toString();
    return window.tabGroups.all.flatMap(g=>g.tabs).filter(t=>(
        (t.input instanceof TabInputTextDiff && t.input.modified.toString()===key) ||
        (t.input instanceof TabInputText && t.input.uri.toString()===key)
    ));
}

const closePreviewTabsAsync=async (uri:Uri):Promise<void>=>{
    const tabs=getPreviewTabs(uri);
    if(tabs.length){
        await window.tabGroups.close(tabs);
    }
}

/**
 * Waits for the preview document to contain the given content so decorations and code lenses line up
 */
const waitForContentAsync=async (uri:Uri,content:string):Promise<void>=>{
    const key=uri.toString();
    for(let i=0;i<40;i++){
        if(workspace.textDocuments.find(d=>d.uri.toString()===key)?.getText()===content){
            return;
        }
        await new Promise(r=>setTimeout(r,25));
    }
}
