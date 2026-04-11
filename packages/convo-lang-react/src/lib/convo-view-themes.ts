import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { ArrowUpIcon, BrainIcon, DatabaseSearchIcon, Loader2Icon, MemoryStickIcon, MenuIcon, UserIcon, VariableIcon } from 'lucide-react';
import { mergeConvoViewThemes } from "./convo-theme-lib.js";

export type ConvoViewThemeName='default'|'default-layout'|'default-icons'|'default-style';

let defaultTheme:ConvoViewTheme|undefined;
export const getDefaultConvoViewTheme=():ConvoViewTheme=>{
    if(defaultTheme){
        return defaultTheme;
    }
    defaultTheme=getConvoViewTheme('default');
    Object.freeze(defaultTheme);
    return defaultTheme;
}

export const getConvoViewTheme=(name:ConvoViewThemeName):ConvoViewTheme=>{

    switch(name){

        case 'default-icons':
            return {
                userIcon:UserIcon,
                assistantIcon:BrainIcon,
                systemIcon:MemoryStickIcon,
                assignmentIcon:VariableIcon,
                //functionCallIcon:VariableIcon,
                loaderIcon:Loader2Icon,
                inputSubmitButtonIcon:ArrowUpIcon,
                suggestionTitleIcon:MenuIcon,
                ragIcon:DatabaseSearchIcon,
                functionIcon:VariableIcon,
                inputTranscribeIcon:Loader2Icon,
                inputAudioRecorderLiveTranscribeIcon:Loader2Icon,
            };

        case 'default-layout': return {
            convoViewClassName:'relative flex flex-col',
            iconClassName:'size-4 shrink-0 opacity-50 group-disabled:opacity-25',
            iconButtonClassName:'group cursor-pointer relative',


            userIconClassName:'mt-2 -mr-2',
            assistantIconClassName:'mt-2 -ml-2',

            markdownClassName:'prose dark:prose-invert',
            plainTextClassName:'whitespace-pre-line',

            messageListContainerClassName:'flex flex-col flex-1',
            messageListClassName:'flex flex-col gap-4 p-4',
            messageListContainerScrollDisabledClassName:'',
            scrollViewClassName:'flex-1',
            scrollContentClassName:'',

            messageClassName:'p-3',
            userMessageClassName:'',
            assistantMessageClassName:'',
            resultMessageClassName:'',
            ragMessageClassName:'text-sm py-2 px-3 flex gap-1 items-center',
            systemMessageClassName:'text-sm whitespace-pre-line',

            callMessageClassName:'whitespace-pre-wrap',
            functionMessageClassName:'whitespace-pre-wrap',

            rowClassName:'flex items-start gap-2',
            userRowClassName:'justify-end ml-8',
            assistantRowClassName:'mr-8',
            resultRowClassName:'',
            ragRowClassName:'',
            systemRowClassName:'',
            callRowClassName:'',
            functionRowClassName:'',
            suggestionRowClassName:'',
            componentRowClassName:'',

            assignmentListClassName:'flex flex-col gap-2',
            assignmentValueClassName:'whitespace-pre-wrap',
            assignmentFunctionCallClassName:'whitespace-pre-wrap',
            assignmentWindowClassName:'line-clamp-6 overflow-clip',
            assignmentStreamingFunctionCallClassName:'flex items-center justify-between',

            imageClassName:'max-w-[50%] mx-4',
            userImageClassName:'',
            assistantImageClassName:'',

            statusIndicatorRowClassName:'',

            loaderIconClassName:'animate-spin',

            inputSuggestionButtonClassName:'text-left py-1 px-2 text-sm cursor-pointer flex items-center gap-1',

            inputAreaClassName:'absolute left-0 bottom-0 right-0 flex flex-col gap-2 pl-4 pb-4 pr-4',

            beforeInputContainerClassName:'flex items-end gap-2 flex-wrap',
            afterInputContainerClassName:'flex items-start gap-2 flex-wrap',

            inputContainerClassName:'relative flex flex-col gap-2',
            inputContainerReadyClassName:'',
            inputMainContentClassName:'flex items-center px-2',
            inputClassName:'flex-1 p-2 pl-0 flex-1 resize-none min-h-0 max-h-80 field-sizing-content',
            inputClassWrapperName:'relative flex flex-1',
            inputReadyClassName:'',
            inputSubmitButtonClassName:'size-7 flex justify-center items-center',
            inputSubmitReadyButtonClassName:'',
            inputAttachmentsContainer:'flex items-end gap-2 pl-4 pr-4 pt-4',
            inputAttachmentButton:'relative overflow-clip size-7 flex justify-center items-center cursor-pointer',
            inputAttachmentInputOverlay:'absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer',
            inputAudioRecorderButtonClassName:'p-2 cursor-pointer',
            inputRecordingVisualizerCanvasClassName:'absolute left-0 top-0 w-full h-full',
            inputAudioRecorderCancelButtonClassName:'size-7 flex justify-center items-center',
            inputMessageContainerClassName:'pointer-events-none absolute left-0 top-0 w-full h-full flex items-center gap-2 justify-end',
            inputAudioRecorderLiveTranscribeIconClassName:'w-full h-full animate-spin',
            inputAudioRecorderLiveTranscribeIconContainerClassName:'absolute size-10 left-[50%] top-[50%] transform-[translate(-50%,-50%)]',


            inputImageContainerClassName:'max-w-50 relative',
            inputImageClassName:'w-full',
            inputImageRemoveButton:'absolute right-2 top-2 p-1 cursor-pointer',

            modelSelectorClassName:'ml-auto field-sizing-content text-sm',

            suggestionContainerClassName:'flex flex-col pl-6',
            suggestionMessageClassName:'flex flex-col gap-1 items-start p-0',
            suggestionTitleContainerClassName:'flex items-center gap-1 mb-1',

            suggestionTitleIconClassName:'size-3',
            suggestionTitleClassName:'text-xs',
            suggestionButtonClassName:'text-left py-1.5 pl-3 pr-4 cursor-pointer flex items-center gap-1 text-sm',

            taskClassName:'',
            taskNameClassName:'',
            taskLinkClassName:'',
            taskProgressBarClassName:'',
            taskStatusClassName:'',
            taskRowClassName:'',

            sourceViewContainerClassName:'flex-1 relative flex flex-col',
            sourceViewContainerScrollDisabledClassName:'[flex:unset]',
            sourceViewScrollViewClassName:'flex-1',
            sourceViewBusyContainer:'absolute right-4 bottom-4 pointer-events-none',
            sourceViewSubmitButtonClassName:'absolute left-[50%] bottom-2 transform-[translateX(-50%)] flex flex-col items-center p-2',
            sourceViewSubmitButtonShortcutClassName:'text-xs',

            sourceViewTextareaClassName:'[caret-color:var(--foreground)]!'
        };

        case 'default-style': return {

            messageClassName:'border rounded-xl',


            ragMessageClassName:'bg-foreground text-background',
            systemMessageClassName:'font-mono',
            functionMessageClassName:'font-mono',

            inputSuggestionButtonClassName:'border rounded-full flex bg-background hover:bg-foreground/30 transition-[background-color]',

            inputAreaClassName:'bg-gradient-to-t from-background/100 to-background/0 [&>*]:drop-shadow-sm',
            inputContainerClassName:'rounded-3xl border border-border bg-background focus-within:shadow-[0_0_3px_oklch(from_var(--primary)_l_c_h_/_0.3)] focus-within:border-border transition-[border-color]',
            inputContainerReadyClassName:'border-border',
            inputClassName:'outline-none',
            inputReadyClassName:'',
            inputSubmitButtonClassName:
                'rounded-full bg-primary text-primary-foreground '+
                'transition-opacity opacity-50',
            inputSubmitReadyButtonClassName:'opacity-100',
            inputMessageContainerClassName:'text-muted-foreground',
            inputTranscribeIconClassName:'animate-spin',
            inputLiveModeVisualizerActiveVarName:'--primary',
            inputAudioRecorderLiveTranscribeIconClassName:'stroke-[0.3px]',

            inputImageClassName:'rounded-lg border',
            inputImageRemoveButton:'rounded border bg-background/80',
            imageClassName:'rounded-lg',

            functionCallClassName:'py-2 mx-1 relative font-mono bg-muted text-muted-foreground text-sm flex items-center mb-5',
            functionCallOpenClassName:'flex-col items-start',
            functionCallOpenHeaderClassName:'flex items-start gap-2 self-stretch mt-1',
            functionCallArgsClassName:'border rounded cursor-pointer p-1 max-w-70 whitespace-pre overflow-clip text-ellipsis',
            functionCallArgsOpenClassName:'p-1 pl-4 whitespace-pre-wrap',
            functionCallTokensClassName:'absolute text-muted-foreground text-xs right-0 bottom-0 transform-[translateY(calc(100%+0.5rem))]',
            functionCallJsonButtonClassName:'ml-auto',

            suggestionMessageClassName:'border-none',
            suggestionTitleClassName:'text-foreground/50',

            assignmentMessageClassName:'font-mono',
            suggestionButtonClassName:'border rounded-full bg-background hover:bg-foreground/30 transition-[background-color]',
            assignmentFunctionCallClassName:'border-b pb-2',
            assignmentStreamingFunctionTokenCountCallClassName:'opacity-50 text-sm',
            assignmentWindowClassName:'border rounded p-2 font-mono mt-2',

            sourceViewLineNumberClassName:'border-r',
            sourceViewErrorClassName:'color-destructive',
            sourceViewErrorMessageClassName:'color-destructive bg-destructive/30',
            sourceViewErrorHighlightMessageClassName:'bg-destructive/20',

        };

        case 'default':
        default:
            return mergeConvoViewThemes(
                getConvoViewTheme('default-layout'),'merge',
                getConvoViewTheme('default-icons'),
                getConvoViewTheme('default-style'),
            )
    }

}
